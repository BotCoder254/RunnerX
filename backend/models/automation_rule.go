package models

import "time"

type AutomationRule struct {
    ID            uint      `gorm:"primarykey" json:"id"`
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
    UserID        uint      `gorm:"not null;index" json:"user_id"`
    MonitorID     uint      `gorm:"not null;index" json:"monitor_id"`
    ConditionType string    `json:"condition_type"` // down, recovered
    ActionType    string    `json:"action_type"`    // toast, sound, webhook
    PayloadJSON   string    `json:"payload_json"`
    Enabled       bool      `gorm:"default:true" json:"enabled"`
}


