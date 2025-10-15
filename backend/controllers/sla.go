package controllers

import (
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "runnerx/middleware"
    "runnerx/services"
)

type SLAController struct {
    DB         *gorm.DB
    slaService *services.SLAService
}

func NewSLAController(db *gorm.DB) *SLAController {
    return &SLAController{
        DB:         db,
        slaService: services.NewSLAService(db),
    }
}

// GET /api/sla - Get SLA reports for user
func (sc *SLAController) GetSLAReports(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    daysStr := c.DefaultQuery("days", "30")
    days, err := strconv.Atoi(daysStr)
    if err != nil || days < 1 || days > 365 {
        days = 30
    }
    
    reports, err := sc.slaService.GetSLAReportsForUser(userID, days)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch SLA reports"})
        return
    }
    
    c.JSON(http.StatusOK, reports)
}

// GET /api/sla/:monitorId - Get SLA reports for specific monitor
func (sc *SLAController) GetMonitorSLAReports(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    monitorIDStr := c.Param("monitorId")
    monitorID, err := strconv.ParseUint(monitorIDStr, 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid monitor ID"})
        return
    }
    
    daysStr := c.DefaultQuery("days", "30")
    days, err := strconv.Atoi(daysStr)
    if err != nil || days < 1 || days > 365 {
        days = 30
    }
    
    reports, err := sc.slaService.GetSLAReportsForMonitor(userID, uint(monitorID), days)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch SLA reports"})
        return
    }
    
    c.JSON(http.StatusOK, reports)
}

// POST /api/sla/generate - Manually generate SLA reports
func (sc *SLAController) GenerateSLAReports(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    var req struct {
        MonitorID *uint `json:"monitor_id,omitempty"`
        Days      int   `json:"days,omitempty"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    if req.Days == 0 {
        req.Days = 1
    }
    
    if req.MonitorID != nil {
        // Generate for specific monitor
        reportDate := time.Now().Truncate(24 * time.Hour).Add(-24 * time.Hour) // Yesterday
        _, err := sc.slaService.CalculateSLAForMonitor(userID, *req.MonitorID, reportDate)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate SLA report"})
            return
        }
    } else {
        // Generate for all monitors
        err := sc.slaService.GenerateDailySLAReports()
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate SLA reports"})
            return
        }
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "SLA reports generated successfully"})
}
