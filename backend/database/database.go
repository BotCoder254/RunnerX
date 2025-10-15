package database

import (
	"log"
	"runnerx/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Init(databaseURL string) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connected successfully")
	return db
}

func Migrate(db *gorm.DB) error {
	log.Println("Running database migrations...")

	err := db.AutoMigrate(
		&models.User{},
		&models.Monitor{},
		&models.Check{},
		&models.Notification{},
		&models.UserPreferences{},
		&models.MonitorForecast{},
			// StatusPage removed
			// AutomationRule removed
		&models.LogInsight{},
		&models.IncidentScreenshot{},
		&models.PerformanceSnapshot{},
        &models.Incident{},
        &models.IncidentEvent{},
	)

	if err != nil {
		return err
	}

	log.Println("Migrations completed successfully")
	return nil
}
