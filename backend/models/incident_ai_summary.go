package models

import (
    "time"
    "gorm.io/gorm"
)

type IncidentAISummary struct {
    ID         uint           `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

    IncidentID uint   `gorm:"not null;index" json:"incident_id"`
    Summary    string `gorm:"type:text" json:"summary"`
    Keywords   string `gorm:"type:text" json:"keywords"` // JSON array of extracted keywords
    Duration   string `json:"duration"`                  // Human readable duration
    Severity   string `json:"severity"`                  // Computed severity level
    Confidence float64 `json:"confidence"`               // NLP confidence score (0-1)
}
