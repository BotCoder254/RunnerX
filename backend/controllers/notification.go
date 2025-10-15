package controllers

import (
	"net/http"
	"time"

	"runnerx/middleware"
	"runnerx/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NotificationController struct {
	DB *gorm.DB
}

func NewNotificationController(db *gorm.DB) *NotificationController {
	return &NotificationController{DB: db}
}

// GetNotifications retrieves all notifications for the current user
func (nc *NotificationController) GetNotifications(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var notifications []models.Notification
	if err := nc.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(100).
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

// MarkNotificationSeen marks a notification as seen
func (nc *NotificationController) MarkNotificationSeen(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	var notification models.Notification
	if err := nc.DB.Where("id = ? AND user_id = ?", id, userID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	if err := notification.MarkAsSeen(nc.DB); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as seen"})
		return
	}

	c.JSON(http.StatusOK, notification)
}

// DeleteNotification deletes a notification
func (nc *NotificationController) DeleteNotification(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	id := c.Param("id")

	result := nc.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Notification{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted successfully"})
}

// GetUnreadCount returns the count of unread notifications
func (nc *NotificationController) GetUnreadCount(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)

	var count int64
	if err := nc.DB.Model(&models.Notification{}).
		Where("user_id = ? AND seen_at IS NULL", userID).
		Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// MarkAllSeen marks all notifications as seen
func (nc *NotificationController) MarkAllSeen(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	now := time.Now()

	if err := nc.DB.Model(&models.Notification{}).
		Where("user_id = ? AND seen_at IS NULL", userID).
		Update("seen_at", now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all as seen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as seen"})
}

