package models

import "time"

// MonitorForecast stores predictive analytics for a monitor
type MonitorForecast struct {
    ID         uint      `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time `json:"created_at"`
    MonitorID  uint      `gorm:"not null;index" json:"monitor_id"`
    Timestamp  time.Time `gorm:"index" json:"timestamp"`
    RiskScore  float64   `json:"risk_score"`   // 0-100
    Trend      string    `json:"trend"`        // up, down, steady
}


