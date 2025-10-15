package models

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
	UserID     uint           `gorm:"not null;index" json:"user_id"`
	MonitorID  uint           `gorm:"not null;index" json:"monitor_id"`
	Type       string         `gorm:"not null" json:"type"` // down, up, warning
	Message    string         `gorm:"not null" json:"message"`
	SeenAt     *time.Time     `json:"seen_at,omitempty"`
	
	// Relations
	User    User    `gorm:"foreignKey:UserID" json:"-"`
	Monitor Monitor `gorm:"foreignKey:MonitorID" json:"-"`
}

// CreateNotification creates a new notification and returns it
func CreateNotification(db *gorm.DB, userID, monitorID uint, notifType, message string) (*Notification, error) {
	notification := Notification{
		UserID:    userID,
		MonitorID: monitorID,
		Type:      notifType,
		Message:   message,
	}

	if err := db.Create(&notification).Error; err != nil {
		return nil, err
	}

	return &notification, nil
}

// MarkAsSeen marks a notification as seen
func (n *Notification) MarkAsSeen(db *gorm.DB) error {
	now := time.Now()
	n.SeenAt = &now
	return db.Save(n).Error
}

