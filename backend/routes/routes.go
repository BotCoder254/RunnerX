package routes

import (
	"runnerx/config"
	"runnerx/controllers"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AuthRoutes(router *gin.RouterGroup, db *gorm.DB) {
	cfg := config.Load()
	authController := controllers.NewAuthController(db, cfg.JWTSecret)

	router.POST("/login", authController.Login)
	router.POST("/register", authController.Register)
}

func MonitorRoutes(router *gin.RouterGroup, db *gorm.DB) {
	monitorController := controllers.NewMonitorController(db)

	router.GET("/monitors", monitorController.GetMonitors)
	router.GET("/monitor/:id", monitorController.GetMonitor)
    router.GET("/monitor/:id/forecast", monitorController.GetMonitorForecast)
    router.GET("/monitor/:id/rootcause", monitorController.GetRootCauseTimeline)
	router.POST("/monitor", monitorController.CreateMonitor)
	router.POST("/monitor/test", monitorController.TestMonitor)
	router.PUT("/monitor/:id", monitorController.UpdateMonitor)
	router.DELETE("/monitor/:id", monitorController.DeleteMonitor)
	router.PATCH("/monitor/:id/toggle", monitorController.ToggleMonitor)
	router.GET("/monitor/:id/stats", monitorController.GetMonitorStats)
	router.GET("/monitor/:id/history", monitorController.GetMonitorHistory)
    router.GET("/monitor/:id/snapshot", monitorController.GetMonitorSnapshot)
}

func NotificationRoutes(router *gin.RouterGroup, db *gorm.DB) {
	notificationController := controllers.NewNotificationController(db)

	router.GET("/notifications", notificationController.GetNotifications)
	router.GET("/notifications/unread", notificationController.GetUnreadCount)
	router.PUT("/notification/:id/mark_seen", notificationController.MarkNotificationSeen)
	router.PUT("/notifications/mark_all_seen", notificationController.MarkAllSeen)
	router.DELETE("/notification/:id", notificationController.DeleteNotification)
}

func UserRoutes(router *gin.RouterGroup, db *gorm.DB) {
	userController := controllers.NewUserController(db)

	router.GET("/user/me", userController.GetCurrentUser)
	router.GET("/user/preferences", userController.GetUserPreferences)
	router.PUT("/user/preferences", userController.UpdateUserPreferences)
}

func AutomationRoutes(router *gin.RouterGroup, db *gorm.DB) {
    automationController := controllers.NewAutomationController(db)
    router.GET("/automation/rules", automationController.List)
    router.POST("/automation/rules", automationController.Create)
    router.DELETE("/automation/rules/:id", automationController.Delete)
}

func StatusPageRoutes(router *gin.RouterGroup, db *gorm.DB) {
    spController := controllers.NewStatusPageController(db)
    // Authenticated create/list under /api
    router.POST("/status_page", spController.Create)
}

func PublicRoutes(router *gin.RouterGroup, db *gorm.DB) {
    spController := controllers.NewStatusPageController(db)
    router.GET("/status/:slug", spController.GetBySlug)
}

