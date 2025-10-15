package services

import (
    "fmt"
    "time"
    "runnerx/models"
    "gorm.io/gorm"
)

type IncidentService struct { db *gorm.DB }

func NewIncidentService(db *gorm.DB) *IncidentService { return &IncidentService{db: db} }

// RecordFailure creates/updates an incident for a down event
func (is *IncidentService) RecordFailure(userID, monitorID uint, latencyMs int64, statusCode int, errMsg string) {
    summary := "Service down"
    if statusCode > 0 { summary = fmt.Sprintf("HTTP %d - down", statusCode) }
    if errMsg != "" { summary = errMsg }
    inc := models.Incident{ UserID: userID, MonitorID: monitorID, Timestamp: time.Now(), Severity: "critical", Summary: summary, Type: "down" }
    _ = is.db.Create(&inc).Error
}

// RecordSpike records a latency spike event
func (is *IncidentService) RecordSpike(userID, monitorID uint, fromMs, toMs int64) {
    if toMs <= fromMs*2 { return }
    summary := fmt.Sprintf("Latency spiked from %dms to %dms", fromMs, toMs)
    inc := models.Incident{ UserID: userID, MonitorID: monitorID, Timestamp: time.Now(), Severity: "warn", Summary: summary, Type: "spike" }
    _ = is.db.Create(&inc).Error
}

// RecordRecovery records a recovery/up event
func (is *IncidentService) RecordRecovery(userID, monitorID uint, uptime float64) {
    summary := fmt.Sprintf("Recovered with %.2f%% uptime", uptime)
    inc := models.Incident{ UserID: userID, MonitorID: monitorID, Timestamp: time.Now(), Severity: "info", Summary: summary, Type: "recovery" }
    _ = is.db.Create(&inc).Error
}


