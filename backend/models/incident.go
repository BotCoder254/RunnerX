package models

import (
    "time"
    "gorm.io/gorm"
)

type Incident struct {
    ID         uint           `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

    UserID     uint           `gorm:"not null;index" json:"user_id"`
    MonitorID  uint           `gorm:"not null;index" json:"monitor_id"`
    Timestamp  time.Time      `gorm:"index" json:"timestamp"`
    Severity   string         `gorm:"index" json:"severity"` // info, warn, critical
    Summary    string         `json:"summary"`
    Type       string         `gorm:"index" json:"type"` // down, spike, recovery
}

type IncidentEvent struct {
    ID         uint           `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time      `json:"created_at"`
    IncidentID uint           `gorm:"not null;index" json:"incident_id"`
    Detail     string         `json:"detail"`
    Meta       string         `json:"meta"` // optional JSON
}


