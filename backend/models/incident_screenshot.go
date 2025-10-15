package models

import (
    "time"
    "gorm.io/gorm"
)

type IncidentScreenshot struct {
    ID         uint           `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

    UserID     uint           `gorm:"not null;index" json:"user_id"`
    MonitorID  uint           `gorm:"not null;index" json:"monitor_id"`
    IncidentID string         `gorm:"not null;index" json:"incident_id"`
    Path       string         `gorm:"not null" json:"path"`
}


