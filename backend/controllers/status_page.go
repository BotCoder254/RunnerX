package controllers

import (
	"fmt"
	"net/http"
	"runnerx/middleware"
	"runnerx/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StatusPageController struct{ DB *gorm.DB }

func NewStatusPageController(db *gorm.DB) *StatusPageController { return &StatusPageController{DB: db} }

type CreateStatusPageRequest struct {
	Slug string `json:"slug" binding:"required"
`
	Name         string `json:"name"`
	MonitorIDs   []uint `json:"monitor_ids"`
	Theme        string `json:"theme"`
	Layout       string `json:"layout"`
	ShowUptime   *bool  `json:"show_uptime"`
	ShowLatency  *bool  `json:"show_latency"`
	ShowLogoText *bool  `json:"show_logo_text"`
}

func (spc *StatusPageController) Create(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	var req CreateStatusPageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Basic validation
	if req.Layout == "" {
		req.Layout = "grid"
	}
	if req.Theme == "" {
		req.Theme = "emerald"
	}
	csv := make([]string, len(req.MonitorIDs))
	for i, id := range req.MonitorIDs {
		csv[i] = fmtUint(id)
	}
	sp := models.StatusPage{
		UserID:        userID,
		Slug:          req.Slug,
		Name:          req.Name,
		MonitorIDsCSV: strings.Join(csv, ","),
		Theme:         req.Theme,
		Layout:        req.Layout,
		ShowUptime:    ptrBool(req.ShowUptime, true),
		ShowLatency:   ptrBool(req.ShowLatency, true),
		ShowLogoText:  ptrBool(req.ShowLogoText, true),
	}
	if err := spc.DB.Create(&sp).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create status page"})
		return
	}
	c.JSON(http.StatusOK, sp)
}

func (spc *StatusPageController) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var sp models.StatusPage
	if err := spc.DB.Where("slug = ?", slug).First(&sp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	// Return page config and filtered monitors
	ids := parseCSVUint(sp.MonitorIDsCSV)
	var monitors []models.Monitor
	if len(ids) > 0 {
		if err := spc.DB.Where("id IN ?", ids).Find(&monitors).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load monitors"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"page":         sp,
		"monitors":     monitors,
		"generated_at": time.Now(),
	})
}

// Helpers
func parseCSVUint(csv string) []uint {
	if strings.TrimSpace(csv) == "" {
		return []uint{}
	}
	parts := strings.Split(csv, ",")
	out := make([]uint, 0, len(parts))
	for _, p := range parts {
		var v uint
		_, _ = fmt.Sscanf(strings.TrimSpace(p), "%d", &v)
		if v > 0 {
			out = append(out, v)
		}
	}
	return out
}

func fmtUint(u uint) string { return fmt.Sprintf("%d", u) }
func ptrBool(b *bool, def bool) bool {
	if b == nil {
		return def
	}
	return *b
}
