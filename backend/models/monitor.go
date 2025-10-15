package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

type StringArray []string

func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		*s = []string{}
		return nil
	}
	return json.Unmarshal(bytes, s)
}

func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	return json.Marshal(s)
}

type Monitor struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	UserID          uint           `gorm:"not null;index" json:"user_id"`
	Name            string         `gorm:"not null" json:"name"`
	Type            string         `gorm:"not null" json:"type"` // http, ping, tcp, dns
	Endpoint        string         `gorm:"not null" json:"endpoint"`
	Method          string         `gorm:"default:GET" json:"method"`
	IntervalSeconds int            `gorm:"default:60" json:"interval_seconds"`
	Timeout         int            `gorm:"default:10" json:"timeout"`
	HeadersJSON     string         `json:"headers_json,omitempty"`
	Enabled         bool           `gorm:"default:true" json:"enabled"`
	Tags            StringArray    `gorm:"type:text" json:"tags"`
	
	// Status fields
	Status         string    `gorm:"default:pending" json:"status"` // up, down, paused, pending
	LastCheckAt    *time.Time `json:"last_check_at,omitempty"`
	LastLatencyMs  *int64     `json:"last_latency_ms,omitempty"`
	UptimePercent  float64   `gorm:"default:0" json:"uptime_percent"`
	TotalChecks    int64     `gorm:"default:0" json:"total_checks"`
	SuccessfulChecks int64   `gorm:"default:0" json:"successful_checks"`
	
	// Relations
	Checks []Check `gorm:"foreignKey:MonitorID;constraint:OnDelete:CASCADE" json:"-"`
}

// UpdateStatus updates monitor status after a check
func (m *Monitor) UpdateStatus(db *gorm.DB, status string, latencyMs int64) error {
	now := time.Now()
	m.Status = status
	m.LastCheckAt = &now
	m.LastLatencyMs = &latencyMs
	m.TotalChecks++
	
	if status == "up" {
		m.SuccessfulChecks++
	}
	
	// Calculate uptime percentage
	if m.TotalChecks > 0 {
		m.UptimePercent = float64(m.SuccessfulChecks) / float64(m.TotalChecks) * 100
	}
	
	return db.Save(m).Error
}

