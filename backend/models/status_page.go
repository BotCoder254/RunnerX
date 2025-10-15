package models

import "time"

// StatusPage stores configuration for a public status page
type StatusPage struct {
    ID            uint      `gorm:"primarykey" json:"id"`
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
    UserID        uint      `gorm:"not null;index" json:"user_id"`
    Slug          string    `gorm:"uniqueIndex;not null" json:"slug"`
    Name          string    `json:"name"`
    MonitorIDsCSV string    `json:"monitor_ids_csv"` // comma-separated monitor IDs for simplicity
    Theme         string    `json:"theme"`           // name of solid color palette
    Layout        string    `json:"layout"`          // grid or list
    ShowUptime    bool      `gorm:"default:true" json:"show_uptime"`
    ShowLatency   bool      `gorm:"default:true" json:"show_latency"`
    ShowLogoText  bool      `gorm:"default:true" json:"show_logo_text"`
    PublicToken   string    `json:"public_token"` // optional read-only token for sharing
}


