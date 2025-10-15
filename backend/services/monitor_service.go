package services

import (
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runnerx/models"
	ws "runnerx/websocket"
	"strings"
	"sync"
	"time"
	"io"
	"bytes"

	"gorm.io/gorm"
)

type MonitorService struct {
	db  *gorm.DB
	hub *ws.Hub
    ae  *AutomationEngine
}

func NewMonitorService(db *gorm.DB, hub *ws.Hub) *MonitorService {
    return &MonitorService{
        db:  db,
        hub: hub,
        ae:  NewAutomationEngine(db, hub),
    }
}

// Start begins monitoring all enabled monitors
func (ms *MonitorService) Start() {
	log.Println("Monitor service started")
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ms.checkAllMonitors()
	}
}

func (ms *MonitorService) checkAllMonitors() {
	var monitors []models.Monitor
	if err := ms.db.Where("enabled = ?", true).Find(&monitors).Error; err != nil {
		log.Printf("Error fetching monitors: %v", err)
		return
	}

	for _, monitor := range monitors {
		// Check if it's time to check this monitor
		if monitor.LastCheckAt != nil {
			nextCheck := monitor.LastCheckAt.Add(time.Duration(monitor.IntervalSeconds) * time.Second)
			if time.Now().Before(nextCheck) {
				continue
			}
		}

		// Perform check in goroutine to avoid blocking
		go ms.checkMonitor(&monitor)
	}
}

func (ms *MonitorService) checkMonitor(monitor *models.Monitor) {
	startTime := time.Now()
	var status string
	var latencyMs int64
	var statusCode int
	var errorMsg string

	switch monitor.Type {
	case "http":
		status, latencyMs, statusCode, errorMsg = ms.checkHTTP(monitor)
	case "ping":
		status, latencyMs, errorMsg = ms.checkPing(monitor)
	case "tcp":
		status, latencyMs, errorMsg = ms.checkTCP(monitor)
	default:
		log.Printf("Unknown monitor type: %s", monitor.Type)
		return
	}

	// Save check result
	causeType, causeDetail := deriveRootCause(monitor.Type, status, statusCode, errorMsg)
	check := models.Check{
		MonitorID:    monitor.ID,
		Status:       status,
		LatencyMs:    latencyMs,
		StatusCode:   statusCode,
		ErrorMsg:     errorMsg,
		ResponseTime: time.Since(startTime),
		CauseType:    causeType,
		CauseDetail:  causeDetail,
	}

	if err := ms.db.Create(&check).Error; err != nil {
		log.Printf("Error saving check: %v", err)
	}

	// Get old status before update
	oldStatus := monitor.Status

	// Update monitor status
	if err := monitor.UpdateStatus(ms.db, status, latencyMs); err != nil {
		log.Printf("Error updating monitor status: %v", err)
		return
	}

	// Broadcast update via WebSocket
	updateData := map[string]interface{}{
		"monitor_id":       monitor.ID,
		"status":           status,
		"last_check_at":    time.Now(),
		"last_latency_ms":  latencyMs,
		"uptime_percent":   monitor.UptimePercent,
	}

	ms.hub.BroadcastToUser(monitor.UserID, "monitor:update", updateData)

	// Handle status change
	if oldStatus != status && oldStatus != "pending" {
        // Broadcast status change
		statusChangeData := map[string]interface{}{
			"monitor_id": monitor.ID,
			"old_status": oldStatus,
			"new_status": status,
			"timestamp":  time.Now(),
		}
		ms.hub.BroadcastToUser(monitor.UserID, "monitor:status_change", statusChangeData)

        // Evaluate automation rules
        if ms.ae != nil {
            ms.ae.EvaluateRules(monitor.UserID, monitor.ID, status, oldStatus)
        }

		// Create notification with burst suppression
		shouldCreateNotification := ms.shouldCreateNotification(monitor.ID, status)
		if shouldCreateNotification {
			var message string
			var notifType string

			if status == "down" {
				message = fmt.Sprintf("Monitor '%s' is now offline", monitor.Name)
				notifType = "down"
			} else if status == "up" && oldStatus == "down" {
				message = fmt.Sprintf("Monitor '%s' is back online", monitor.Name)
				notifType = "up"
			}

			if message != "" {
				notification, err := models.CreateNotification(ms.db, monitor.UserID, monitor.ID, notifType, message)
				if err != nil {
					log.Printf("Error creating notification: %v", err)
				} else {
					// Broadcast notification
					notificationData := map[string]interface{}{
						"id":         notification.ID,
						"monitor_id": monitor.ID,
						"type":       notifType,
						"message":    message,
						"created_at": notification.CreatedAt,
					}
					ms.hub.BroadcastToUser(monitor.UserID, "notification", notificationData)

					// Update last notification time
					ms.updateLastNotificationTime(monitor.ID)
				}
			}
		}
	}

	log.Printf("Checked %s (%s): %s - %dms", monitor.Name, monitor.Type, status, latencyMs)
}

// Burst suppression - track last notification time per monitor
var lastNotificationTime = make(map[uint]time.Time)
var notificationMutex sync.RWMutex

func (ms *MonitorService) shouldCreateNotification(monitorID uint, status string) bool {
	notificationMutex.RLock()
	lastTime, exists := lastNotificationTime[monitorID]
	notificationMutex.RUnlock()

	// Don't spam - minimum 5 minutes between notifications for same monitor
	if exists && time.Since(lastTime) < 5*time.Minute {
		return false
	}

	return true
}

func (ms *MonitorService) updateLastNotificationTime(monitorID uint) {
	notificationMutex.Lock()
	lastNotificationTime[monitorID] = time.Now()
	notificationMutex.Unlock()
}

func (ms *MonitorService) checkHTTP(monitor *models.Monitor) (string, int64, int, string) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	method := monitor.Method
	if method == "" {
		method = "GET"
	}

    req, err := http.NewRequest(method, monitor.Endpoint, nil)
	if err != nil {
		return "down", 0, 0, err.Error()
	}

	// Add custom headers if provided
	// Note: In production, parse monitor.HeadersJSON properly
	req.Header.Set("User-Agent", "RunnerX-Monitor/1.0")

	startTime := time.Now()
    resp, err := client.Do(req)
	latencyMs := time.Since(startTime).Milliseconds()

    if err != nil {
        return "down", latencyMs, 0, err.Error()
    }
	defer resp.Body.Close()

    if resp.StatusCode >= 200 && resp.StatusCode < 400 {
        // Capture a small safe snapshot body (truncate to 1KB) for HTTP monitors
        var buf bytes.Buffer
        limited := io.LimitReader(resp.Body, 1024)
        _, _ = io.Copy(&buf, limited)
        body := sanitizeSnapshot(buf.String())
        // Rewind not needed as we already closed later; store body in error field for simplicity
        if body != "" {
            // no-op here; snapshot saved via Check fields below if needed
        }
        return "up", latencyMs, resp.StatusCode, body
    }

    return "down", latencyMs, resp.StatusCode, fmt.Sprintf("Status code: %d", resp.StatusCode)
}

func (ms *MonitorService) checkPing(monitor *models.Monitor) (string, int64, string) {
	startTime := time.Now()
	
	// Extract hostname/IP from endpoint
	endpoint := strings.TrimPrefix(monitor.Endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")
	endpoint = strings.Split(endpoint, "/")[0]
	endpoint = strings.Split(endpoint, ":")[0]

	cmd := exec.Command("ping", "-c", "1", "-W", "5", endpoint)
	err := cmd.Run()
	latencyMs := time.Since(startTime).Milliseconds()

    if err != nil {
        return "down", latencyMs, err.Error()
    }

	return "up", latencyMs, ""
}

func (ms *MonitorService) checkTCP(monitor *models.Monitor) (string, int64, string) {
	startTime := time.Now()
	
	// Simple TCP connection check would go here
	// For now, treating it similar to HTTP
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(monitor.Endpoint)
	latencyMs := time.Since(startTime).Milliseconds()

	if err != nil {
		return "down", latencyMs, err.Error()
	}
	defer resp.Body.Close()

	return "up", latencyMs, ""
}

// sanitizeSnapshot removes scripts and inline events from HTML/text
func sanitizeSnapshot(s string) string {
    // naive strip for scripts and on* attributes; for production use a real sanitizer
    lower := strings.ToLower(s)
    if strings.Contains(lower, "<script") {
        s = strings.ReplaceAll(s, "<script", "")
        s = strings.ReplaceAll(s, "</script>", "")
    }
    // strip common inline events
    for _, attr := range []string{"onclick", "onload", "onerror", "onmouseover"} {
        s = strings.ReplaceAll(s, attr+"=", "")
    }
    return s
}

// deriveRootCause infers a coarse cause classification for failed checks
func deriveRootCause(monitorType, status string, statusCode int, errMsg string) (string, string) {
    if status == "up" {
        return "", ""
    }
    // HTTP codes
    if monitorType == "http" && statusCode > 0 {
        return "http_error", fmt.Sprintf("HTTP %d", statusCode)
    }
    // Error message heuristics
    lower := strings.ToLower(errMsg)
    switch {
    case strings.Contains(lower, "timeout"):
        if monitorType == "dns" || strings.Contains(lower, "lookup") {
            return "dns_error", "DNS timeout"
        }
        return "connection_timeout", "Connection timed out"
    case strings.Contains(lower, "tls") || strings.Contains(lower, "ssl"):
        return "ssl_error", errMsg
    case strings.Contains(lower, "no such host") || strings.Contains(lower, "lookup"):
        return "dns_error", errMsg
    case strings.Contains(lower, "refused"):
        return "tcp_error", "Connection refused"
    }
    if errMsg != "" {
        return "unknown", errMsg
    }
    return "unknown", ""
}

