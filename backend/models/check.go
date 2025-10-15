package models

import (
	"time"

	"gorm.io/gorm"
)

type Check struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	MonitorID   uint           `gorm:"not null;index" json:"monitor_id"`
	Status      string         `gorm:"not null" json:"status"` // up, down
	LatencyMs   int64          `json:"latency_ms"`
	StatusCode  int            `json:"status_code,omitempty"`
	ErrorMsg    string         `json:"error_msg,omitempty"`
	ResponseTime time.Duration `json:"response_time"`
    // Root cause classification
    CauseType   string         `json:"cause_type,omitempty"`   // dns_error, connection_timeout, http_error, ssl_error, tcp_error, unknown
    CauseDetail string         `json:"cause_detail,omitempty"`
}

