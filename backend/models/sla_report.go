package models

import (
    "time"
    "gorm.io/gorm"
)

type SLAReport struct {
    ID         uint           `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

    UserID        uint      `gorm:"not null;index" json:"user_id"`
    MonitorID     uint      `gorm:"not null;index" json:"monitor_id"`
    ReportDate    time.Time `gorm:"index" json:"report_date"`
    UptimePercent float64   `json:"uptime_percent"`
    DowntimeMinutes int64   `json:"downtime_minutes"`
    SLAViolations int       `json:"sla_violations"`
    SLAThreshold  float64   `json:"sla_threshold"` // e.g., 99.9%
    Status        string    `json:"status"`        // compliant, warning, violation
}
