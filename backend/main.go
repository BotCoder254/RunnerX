package main

import (
	"log"
	"runnerx/config"
	"runnerx/database"
	"runnerx/middleware"
	"runnerx/routes"
	"runnerx/services"
	ws "runnerx/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db := database.Init(cfg.DatabaseURL)

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Initialize WebSocket hub
	hub := ws.NewHub()
	go hub.Run()

	// Initialize monitor service with WebSocket hub
	monitorService := services.NewMonitorService(db, hub)
	go monitorService.Start()

	// Start analytics and system mood services
	analyticsService := services.NewAnalyticsService(db, hub)
	go analyticsService.StartHourly()

	systemMoodService := services.NewSystemMoodService(db, hub)
	go systemMoodService.Start()

	// Setup Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Rate limiting middleware
	r.Use(middleware.RateLimiter())

	// WebSocket endpoint
	r.GET("/ws", ws.HandleWebSocket(hub, cfg.JWTSecret))

	// API routes
	api := r.Group("/api")
	{
		// Auth routes (public)
		auth := api.Group("/auth")
		routes.AuthRoutes(auth, db)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		routes.MonitorRoutes(protected, db)
		routes.NotificationRoutes(protected, db)
		routes.UserRoutes(protected, db)
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Start server
	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

