package controllers

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "runnerx/middleware"
    "runnerx/services"
)

type LogsController struct {
    DB  *gorm.DB
    Svc *services.LogInsightsService
}

func NewLogsController(db *gorm.DB, svc *services.LogInsightsService) *LogsController {
    return &LogsController{DB: db, Svc: svc}
}

// GET /api/logs/:incidentId
func (lc *LogsController) GetInsights(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    incidentID := strings.TrimSpace(c.Param("incidentId"))
    if incidentID == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "incidentId required"})
        return
    }
    q := c.Query("q")
    items, err := lc.Svc.GetInsights(userID, incidentID, q)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch insights"})
        return
    }
    c.JSON(http.StatusOK, items)
}


