package models

import (
	"time"

	"gorm.io/gorm"
)

type UserPreferences struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	UserID          uint           `gorm:"uniqueIndex;not null" json:"user_id"`
	DisplayMode     string         `gorm:"default:grid" json:"display_mode"` // grid, list, compact, masonry
	DefaultInterval int            `gorm:"default:60" json:"default_interval"`
	Timezone        string         `gorm:"default:UTC" json:"timezone"`
	AnimationPref   bool           `gorm:"default:true" json:"animation_pref"`
	
	// Relations
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// GetOrCreateUserPreferences gets or creates preferences for a user
func GetOrCreateUserPreferences(db *gorm.DB, userID uint) (*UserPreferences, error) {
	var preferences UserPreferences
	
	err := db.Where("user_id = ?", userID).First(&preferences).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create default preferences
			preferences = UserPreferences{
				UserID:          userID,
				DisplayMode:     "grid",
				DefaultInterval: 60,
				Timezone:        "UTC",
				AnimationPref:   true,
			}
			if err := db.Create(&preferences).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	
	return &preferences, nil
}

// UpdatePreferences updates user preferences
func (p *UserPreferences) UpdatePreferences(db *gorm.DB, updates map[string]interface{}) error {
	return db.Model(p).Updates(updates).Error
}

