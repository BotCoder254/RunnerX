package controllers

import (
	"net/http"
	"path/filepath"
	"strings"

	"runnerx/middleware"
	"runnerx/models"
	"runnerx/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ScreenshotsController struct{ DB *gorm.DB }

func NewScreenshotsController(db *gorm.DB) *ScreenshotsController {
	return &ScreenshotsController{DB: db}
}

// GET /api/screenshots/:incidentId -> returns latest screenshot file
func (sc *ScreenshotsController) GetLatest(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	incidentID := c.Param("incidentId")
	if incidentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "incidentId required"})
		return
	}
	var rec models.IncidentScreenshot
	if err := sc.DB.Where("user_id = ? AND incident_id = ?", userID, incidentID).Order("created_at DESC").First(&rec).Error; err != nil {
		// Don't log error - 404 is expected when no screenshot exists yet
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "no screenshot available", "message": "Capture a screenshot first"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		}
		return
	}
	c.FileAttachment(filepath.Clean(rec.Path), filepath.Base(rec.Path))
}

// POST /api/screenshots/:incidentId/capture -> triggers capture for http monitors
func (sc *ScreenshotsController) CaptureLatest(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	incidentID := c.Param("incidentId")
	if incidentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "incidentId required"})
		return
	}
	// Expect incidentId format monitor-<id>
	var monitor models.Monitor
	if strings.HasPrefix(incidentID, "monitor-") {
		idStr := strings.TrimPrefix(incidentID, "monitor-")
		if idStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incidentId"})
			return
		}
		if err := sc.DB.Where("id = ? AND user_id = ?", idStr, userID).First(&monitor).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "monitor not found"})
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported incidentId"})
		return
	}
	if monitor.Type != "http" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "screenshots supported for HTTP monitors"})
		return
	}
	ss := services.NewScreenshotService(sc.DB, nil)
	go ss.CaptureAndStore(userID, incidentID, monitor.Endpoint, monitor.ID)
	c.JSON(http.StatusAccepted, gin.H{"status": "capture started"})
}
