package services

import (
    "crypto/sha1"
    "encoding/hex"
    "regexp"
    "strings"
    "time"

    "gorm.io/gorm"
    "runnerx/models"
    ws "runnerx/websocket"
)

// LogInsightsService groups similar log messages into canonicalized patterns
type LogInsightsService struct {
    db  *gorm.DB
    hub *ws.Hub
}

func NewLogInsightsService(db *gorm.DB, hub *ws.Hub) *LogInsightsService {
    return &LogInsightsService{db: db, hub: hub}
}

// Canonicalize reduces a log line to a structure pattern (token hash-like)
func (s *LogInsightsService) Canonicalize(message string) (pattern string) {
    p := message
    // Replace quoted strings
    p = regexp.MustCompile(`"[^"]*"`).ReplaceAllString(p, "\"?\"")
    // Replace numbers
    p = regexp.MustCompile(`\b\d+\b`).ReplaceAllString(p, "#")
    // Replace UUIDs
    p = regexp.MustCompile(`[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}`).ReplaceAllString(p, "<uuid>")
    // Collapse whitespace
    p = strings.Join(strings.Fields(p), " ")
    if len(p) > 512 { p = p[:512] }
    return p
}

func (s *LogInsightsService) patternHash(pattern string) string {
    sum := sha1.Sum([]byte(pattern))
    return hex.EncodeToString(sum[:])
}

// RecordLog ingests a raw log line and upserts a grouped insight for the given incident
func (s *LogInsightsService) RecordLog(userID uint, incidentID string, monitorID *uint, level string, message string) error {
    pattern := s.Canonicalize(message)
    hash := s.patternHash(pattern)

    var insight models.LogInsight
    tx := s.db.Where("user_id = ? AND incident_id = ? AND pattern_hash = ?", userID, incidentID, hash).First(&insight)
    now := time.Now()
    if tx.Error == nil {
        insight.Count += 1
        insight.UpdatedAt = now
        return s.db.Save(&insight).Error
    }
    if tx.Error != nil && tx.Error != gorm.ErrRecordNotFound {
        return tx.Error
    }
    insight = models.LogInsight{
        UserID:      userID,
        IncidentID:  incidentID,
        PatternHash: hash,
        Pattern:     pattern,
        Example:     message,
        Level:       level,
        MonitorID:   monitorID,
        Count:       1,
        CreatedAt:   now,
        UpdatedAt:   now,
    }
    if err := s.db.Create(&insight).Error; err != nil {
        return err
    }
    // Broadcast incremental update to user clients
    payload := map[string]interface{}{
        "type": "log_insight:update",
        "incident_id": incidentID,
        "insight": insight,
    }
    s.hub.BroadcastToUser(userID, "logs:insight", payload)
    return nil
}

// GetInsights returns insights for an incident, optional search filter
func (s *LogInsightsService) GetInsights(userID uint, incidentID string, query string) ([]models.LogInsight, error) {
    var items []models.LogInsight
    dbq := s.db.Where("user_id = ? AND incident_id = ?", userID, incidentID).Order("count DESC, updated_at DESC")
    if strings.TrimSpace(query) != "" {
        like := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
        dbq = dbq.Where("LOWER(pattern) LIKE ? OR LOWER(example) LIKE ?", like, like)
    }
    if err := dbq.Find(&items).Error; err != nil {
        return nil, err
    }
    return items, nil
}


