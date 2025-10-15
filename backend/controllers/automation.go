package controllers

import (
    "net/http"
    "runnerx/middleware"
    "runnerx/models"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type AutomationController struct { DB *gorm.DB }
func NewAutomationController(db *gorm.DB) *AutomationController { return &AutomationController{DB: db} }

func (ac *AutomationController) List(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    var rules []models.AutomationRule
    if err := ac.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&rules).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch rules"})
        return
    }
    c.JSON(http.StatusOK, rules)
}

func (ac *AutomationController) Create(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    var rule models.AutomationRule
    if err := c.ShouldBindJSON(&rule); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    rule.UserID = userID
    if rule.ConditionType == "" || rule.ActionType == "" || rule.MonitorID == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Missing fields"})
        return
    }
    if err := ac.DB.Create(&rule).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create"})
        return
    }
    c.JSON(http.StatusOK, rule)
}

func (ac *AutomationController) Delete(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    id := c.Param("id")
    if err := ac.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.AutomationRule{}).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"deleted": true})
}


