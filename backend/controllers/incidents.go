package controllers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "runnerx/middleware"
    "runnerx/models"
    "runnerx/services"
)

type IncidentsController struct { 
    DB *gorm.DB 
    aiSummaryService *services.AISummaryService
}

func NewIncidentsController(db *gorm.DB) *IncidentsController { 
    return &IncidentsController{
        DB: db,
        aiSummaryService: services.NewAISummaryService(db),
    }
}

// GET /api/incidents/:serverId -> timeline
func (ic *IncidentsController) Get(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    idStr := c.Param("serverId")
    mid, _ := strconv.ParseUint(idStr, 10, 64)
    var mon models.Monitor
    if err := ic.DB.Where("id = ? AND user_id = ?", mid, userID).First(&mon).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "monitor not found"})
        return
    }
    var items []models.Incident
    if err := ic.DB.Where("monitor_id = ? AND user_id = ?", mid, userID).Order("timestamp DESC").Limit(100).Find(&items).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch"})
        return
    }
    c.JSON(http.StatusOK, items)
}

// POST /api/incidents/summary - Generate AI summary for an incident
func (ic *IncidentsController) GenerateSummary(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    var req struct {
        IncidentID uint `json:"incident_id" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Get incident and verify ownership
    var incident models.Incident
    if err := ic.DB.Where("id = ? AND user_id = ?", req.IncidentID, userID).First(&incident).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "incident not found"})
        return
    }
    
    // Check if summary already exists
    var existingSummary models.IncidentAISummary
    err := ic.DB.Where("incident_id = ?", req.IncidentID).First(&existingSummary).Error
    
    if err == nil {
        // Return existing summary
        c.JSON(http.StatusOK, existingSummary)
        return
    }
    
    // Generate new summary
    summary, err := ic.aiSummaryService.GenerateSummary(&incident)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate summary"})
        return
    }
    
    // Save summary
    if err := ic.DB.Create(summary).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save summary"})
        return
    }
    
    c.JSON(http.StatusOK, summary)
}


