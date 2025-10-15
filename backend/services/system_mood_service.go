package services

import (
    "log"
    "time"
    "runnerx/models"
    ws "runnerx/websocket"
    "gorm.io/gorm"
)

// SystemMoodService computes global system uptime and broadcasts mood
type SystemMoodService struct {
    db  *gorm.DB
    hub *ws.Hub
}

func NewSystemMoodService(db *gorm.DB, hub *ws.Hub) *SystemMoodService {
    return &SystemMoodService{db: db, hub: hub}
}

// Start runs every minute
func (s *SystemMoodService) Start() {
    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()
    for {
        s.computeAndBroadcast()
        <-ticker.C
    }
}

func (s *SystemMoodService) computeAndBroadcast() {
    var monitors []models.Monitor
    if err := s.db.Find(&monitors).Error; err != nil {
        log.Printf("SystemMood: failed to read monitors: %v", err)
        return
    }
    if len(monitors) == 0 { return }

    var sum float64
    for _, m := range monitors {
        sum += m.UptimePercent
    }
    avg := sum / float64(len(monitors))

    mood := 0 // 0 calm, 1 slight, 2 waves, 3 stormy
    switch {
    case avg >= 99:
        mood = 0
    case avg >= 97:
        mood = 1
    case avg >= 90:
        mood = 2
    default:
        mood = 3
    }

    payload := map[string]interface{}{
        "system_uptime_percent": avg,
        "mood": mood,
    }
    s.hub.Broadcast("system_mood_update", payload)
}


