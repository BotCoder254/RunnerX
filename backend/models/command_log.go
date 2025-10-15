package models

import (
    "time"
    "gorm.io/gorm"
)

type CommandLog struct {
    ID         uint           `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

    UserID     uint    `gorm:"not null;index" json:"user_id"`
    MonitorID  *uint   `gorm:"index" json:"monitor_id,omitempty"`
    Type       string  `gorm:"not null" json:"type"`
    Target     string  `gorm:"not null" json:"target"`
    Status     string  `gorm:"not null" json:"status"`
    Output     string  `gorm:"type:text" json:"output"`
    Error      string  `gorm:"type:text" json:"error"`
    Duration   int64   `json:"duration_ms"`
}
