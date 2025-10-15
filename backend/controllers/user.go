package controllers

import (
	"net/http"

	"runnerx/middleware"
	"runnerx/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserController struct {
	DB *gorm.DB
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{DB: db}
}

type UpdatePreferencesRequest struct {
	DisplayMode     *string `json:"display_mode,omitempty"`
	DefaultInterval *int    `json:"default_interval,omitempty"`
	Timezone        *string `json:"timezone,omitempty"`
	AnimationPref   *bool   `json:"animation_pref,omitempty"`
}

// GetCurrentUser returns the current authenticated user
func (uc *UserController) GetCurrentUser(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var user models.User
	if err := uc.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
		"role":  user.Role,
	})
}

// GetUserPreferences returns user preferences
func (uc *UserController) GetUserPreferences(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	preferences, err := models.GetOrCreateUserPreferences(uc.DB, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get preferences"})
		return
	}

	c.JSON(http.StatusOK, preferences)
}

// UpdateUserPreferences updates user preferences
func (uc *UserController) UpdateUserPreferences(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var req UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	preferences, err := models.GetOrCreateUserPreferences(uc.DB, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get preferences"})
		return
	}

	// Build updates map
	updates := make(map[string]interface{})
	
	if req.DisplayMode != nil {
		// Validate display mode
		validModes := map[string]bool{"grid": true, "list": true, "compact": true, "masonry": true}
		if !validModes[*req.DisplayMode] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid display mode"})
			return
		}
		updates["display_mode"] = *req.DisplayMode
	}
	
	if req.DefaultInterval != nil {
		if *req.DefaultInterval < 10 || *req.DefaultInterval > 86400 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid interval range (10-86400)"})
			return
		}
		updates["default_interval"] = *req.DefaultInterval
	}
	
	if req.Timezone != nil {
		updates["timezone"] = *req.Timezone
	}
	
	if req.AnimationPref != nil {
		updates["animation_pref"] = *req.AnimationPref
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid updates provided"})
		return
	}

	if err := preferences.UpdatePreferences(uc.DB, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	c.JSON(http.StatusOK, preferences)
}

