package controllers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "runnerx/middleware"
    "runnerx/models"
)

type IncidentsController struct { DB *gorm.DB }

func NewIncidentsController(db *gorm.DB) *IncidentsController { return &IncidentsController{DB: db} }

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


