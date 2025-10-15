package routes

import (
    "runnerx/config"
    "runnerx/controllers"
    "runnerx/services"

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

// Automation routes removed per spec

// Status page routes removed per spec

func LogsRoutes(router *gin.RouterGroup, db *gorm.DB, svc *services.LogInsightsService) {
    logsController := controllers.NewLogsController(db, svc)
    router.GET("/logs/:incidentId", logsController.GetInsights)
}

func ScreenshotsRoutes(router *gin.RouterGroup, db *gorm.DB) {
    sc := controllers.NewScreenshotsController(db)
    router.GET("/screenshots/:incidentId", sc.GetLatest)
    router.POST("/screenshots/:incidentId/capture", sc.CaptureLatest)
}

func SnapshotsRoutes(router *gin.RouterGroup, db *gorm.DB) {
    s := controllers.NewSnapshotsController(db)
    router.GET("/snapshots/:serverId", s.Get)
}

func IncidentsRoutes(router *gin.RouterGroup, db *gorm.DB) {
    ic := controllers.NewIncidentsController(db)
    router.GET("/incidents/:serverId", ic.Get)
}

func PublicRoutes(router *gin.RouterGroup, db *gorm.DB) {}

