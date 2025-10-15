package models

import (
    "time"
    "gorm.io/gorm"
)

// LogInsight stores summarized/grouped log patterns for an incident
type LogInsight struct {
    ID          uint           `gorm:"primarykey" json:"id"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

    // Ownership and grouping
    UserID      uint           `gorm:"not null;index" json:"user_id"`
    IncidentID  string         `gorm:"not null;index" json:"incident_id"`

    // Group signature and counts
    PatternHash string         `gorm:"index;not null" json:"pattern_hash"`
    Pattern     string         `gorm:"not null" json:"pattern"` // representative canonicalized pattern
    Example     string         `json:"example"`                  // sample line from the group
    Level       string         `gorm:"index" json:"level"`     // info, warn, error
    Count       int64          `gorm:"default:0" json:"count"`

    // Optional reference
    MonitorID   *uint          `gorm:"index" json:"monitor_id,omitempty"`
}


