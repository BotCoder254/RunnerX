package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"runnerx/middleware"
	"runnerx/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MonitorController struct {
	DB *gorm.DB
}

func NewMonitorController(db *gorm.DB) *MonitorController {
	return &MonitorController{DB: db}
}

type CreateMonitorRequest struct {
	Name            string   `json:"name" binding:"required"`
	Type            string   `json:"type" binding:"required,oneof=http ping tcp dns"`
	Endpoint        string   `json:"endpoint" binding:"required"`
	Method          string   `json:"method"`
	IntervalSeconds int      `json:"interval_seconds" binding:"required,min=10,max=86400"`
	Timeout         int      `json:"timeout" binding:"min=5,max=60"`
	HeadersJSON     string   `json:"headers_json"`
	Enabled         bool     `json:"enabled"`
	Tags            []string `json:"tags"`
}

type TestMonitorRequest struct {
	Type        string `json:"type" binding:"required,oneof=http ping tcp"`
	Endpoint    string `json:"endpoint" binding:"required"`
	Method      string `json:"method"`
	HeadersJSON string `json:"headers_json"`
}

func (mc *MonitorController) GetMonitors(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var monitors []models.Monitor
	if err := mc.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&monitors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch monitors"})
		return
	}

	c.JSON(http.StatusOK, monitors)
}

func (mc *MonitorController) GetMonitor(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	c.JSON(http.StatusOK, monitor)
}

// GetMonitorSnapshot returns last stored response snapshot for HTTP monitors
func (mc *MonitorController) GetMonitorSnapshot(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	var check models.Check
	// last successful HTTP check with snapshot fields (if present in model)
	if err := mc.DB.Where("monitor_id = ? AND status = ?", monitor.ID, "up").Order("created_at DESC").First(&check).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No snapshot available"})
		return
	}

	// For simplicity, reuse ErrorMsg if snapshot not yet stored; in real impl, separate fields
	c.JSON(http.StatusOK, gin.H{
		"status_code":  check.StatusCode,
		"latency_ms":   check.LatencyMs,
		"headers":      map[string]string{},
		"body_preview": check.ErrorMsg,
		"timestamp":    check.CreatedAt,
	})
}

// GetMonitorForecast returns recent forecast entries for a monitor
func (mc *MonitorController) GetMonitorForecast(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	limit := 24
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 168 { // up to 7 days hourly
			limit = v
		}
	}

	var forecasts []models.MonitorForecast
	if err := mc.DB.Where("monitor_id = ?", monitor.ID).
		Order("timestamp DESC").
		Limit(limit).
		Find(&forecasts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch forecast"})
		return
	}

	c.JSON(http.StatusOK, forecasts)
}

// GetRootCauseTimeline aggregates failed checks into cause timeline
func (mc *MonitorController) GetRootCauseTimeline(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	// Range: default 24h
	rng := c.DefaultQuery("range", "24h")
	dur, err := time.ParseDuration(rng)
	if err != nil {
		dur = 24 * time.Hour
	}
	since := time.Now().Add(-dur)

	var checks []models.Check
	if err := mc.DB.Where("monitor_id = ? AND created_at >= ? AND status = ?", monitor.ID, since, "down").
		Order("created_at ASC").
		Find(&checks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch checks"})
		return
	}

	// Build timeline
	type TimelineItem struct {
		Timestamp  time.Time `json:"timestamp"`
		CauseType  string    `json:"cause_type"`
		Detail     string    `json:"detail"`
		StatusCode int       `json:"status_code"`
	}
	items := make([]TimelineItem, 0, len(checks))
	for _, ch := range checks {
		items = append(items, TimelineItem{
			Timestamp:  ch.CreatedAt,
			CauseType:  ch.CauseType,
			Detail:     ch.CauseDetail,
			StatusCode: ch.StatusCode,
		})
	}

	// Heuristics summary
	type Summary struct {
		Trend string `json:"trend"`
	}
	trend := "inconclusive"
	if len(items) >= 3 {
		// crude heuristic: many http_error with 5xx -> backend issue
		http5xx := 0
		for _, it := range items {
			if it.CauseType == "http_error" && it.StatusCode >= 500 {
				http5xx++
			}
		}
		if http5xx >= 2 {
			trend = "backend_issue_suspected"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"items":   items,
		"summary": Summary{Trend: trend},
	})
}

func (mc *MonitorController) CreateMonitor(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var req CreateMonitorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate headers JSON if provided
	if req.HeadersJSON != "" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(req.HeadersJSON), &headers); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid headers JSON format"})
			return
		}
	}

	monitor := models.Monitor{
		UserID:          userID,
		Name:            req.Name,
		Type:            req.Type,
		Endpoint:        req.Endpoint,
		Method:          req.Method,
		IntervalSeconds: req.IntervalSeconds,
		Timeout:         req.Timeout,
		HeadersJSON:     req.HeadersJSON,
		Enabled:         req.Enabled,
		Tags:            req.Tags,
		Status:          "pending",
	}

	if monitor.Method == "" {
		monitor.Method = "GET"
	}

	if monitor.Timeout == 0 {
		monitor.Timeout = 10
	}

	if err := mc.DB.Create(&monitor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create monitor"})
		return
	}

	c.JSON(http.StatusCreated, monitor)
}

func (mc *MonitorController) UpdateMonitor(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	var req CreateMonitorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	monitor.Name = req.Name
	monitor.Type = req.Type
	monitor.Endpoint = req.Endpoint
	monitor.Method = req.Method
	monitor.IntervalSeconds = req.IntervalSeconds
	monitor.HeadersJSON = req.HeadersJSON
	monitor.Enabled = req.Enabled
	monitor.Tags = req.Tags

	if err := mc.DB.Save(&monitor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update monitor"})
		return
	}

	c.JSON(http.StatusOK, monitor)
}

func (mc *MonitorController) DeleteMonitor(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	result := mc.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Monitor{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete monitor"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Monitor deleted successfully"})
}

func (mc *MonitorController) ToggleMonitor(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	monitor.Enabled = req.Enabled
	if !req.Enabled {
		monitor.Status = "paused"
	} else if monitor.Status == "paused" {
		monitor.Status = "pending"
	}

	if err := mc.DB.Save(&monitor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle monitor"})
		return
	}

	c.JSON(http.StatusOK, monitor)
}

func (mc *MonitorController) GetMonitorStats(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	stats := gin.H{
		"total_checks":      monitor.TotalChecks,
		"successful_checks": monitor.SuccessfulChecks,
		"uptime_percent":    monitor.UptimePercent,
		"last_check_at":     monitor.LastCheckAt,
		"last_latency_ms":   monitor.LastLatencyMs,
		"status":            monitor.Status,
	}

	c.JSON(http.StatusOK, stats)
}

func (mc *MonitorController) GetMonitorHistory(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")
	daysStr := c.DefaultQuery("days", "7")
	days, _ := strconv.Atoi(daysStr)

	var monitor models.Monitor
	if err := mc.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Monitor not found"})
		return
	}

	var checks []models.Check
	since := time.Now().AddDate(0, 0, -days)
	if err := mc.DB.Where("monitor_id = ? AND created_at >= ?", id, since).
		Order("created_at DESC").
		Limit(100).
		Find(&checks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}

	c.JSON(http.StatusOK, checks)
}

func (mc *MonitorController) TestMonitor(c *gin.Context) {
	var req TestMonitorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Perform test check
	startTime := time.Now()
	var status string
	var statusCode int
	var errorMsg string

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	method := req.Method
	if method == "" {
		method = "GET"
	}

	httpReq, err := http.NewRequest(method, req.Endpoint, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  fmt.Sprintf("Invalid endpoint: %v", err),
		})
		return
	}

	// Add custom headers
	if req.HeadersJSON != "" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(req.HeadersJSON), &headers); err == nil {
			for key, value := range headers {
				httpReq.Header.Set(key, value)
			}
		}
	}

	httpReq.Header.Set("User-Agent", "RunnerX-Monitor/1.0")

	resp, err := client.Do(httpReq)
	latencyMs := time.Since(startTime).Milliseconds()

	if err != nil {
		status = "down"
		errorMsg = err.Error()
		c.JSON(http.StatusOK, gin.H{
			"status":     status,
			"latency_ms": latencyMs,
			"error":      errorMsg,
		})
		return
	}
	defer resp.Body.Close()

	statusCode = resp.StatusCode
	if statusCode >= 200 && statusCode < 400 {
		status = "up"
	} else {
		status = "down"
		errorMsg = fmt.Sprintf("HTTP %d", statusCode)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      status,
		"status_code": statusCode,
		"latency_ms":  latencyMs,
		"error":       errorMsg,
	})
}
