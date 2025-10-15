package controllers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "runnerx/middleware"
    "runnerx/models"
)

type SnapshotsController struct { DB *gorm.DB }

func NewSnapshotsController(db *gorm.DB) *SnapshotsController { return &SnapshotsController{DB: db} }

// GET /api/snapshots/:serverId -> recent performance snapshots
func (sc *SnapshotsController) Get(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    idStr := c.Param("serverId")
    monitorID, _ := strconv.ParseUint(idStr, 10, 64)
    // ensure ownership: monitor belongs to user
    var mon models.Monitor
    if err := sc.DB.Where("id = ? AND user_id = ?", monitorID, userID).First(&mon).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "monitor not found"})
        return
    }
    var snaps []models.PerformanceSnapshot
    if err := sc.DB.Where("monitor_id = ?", monitorID).Order("created_at DESC").Limit(24).Find(&snaps).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch"})
        return
    }
    c.JSON(http.StatusOK, snaps)
}


