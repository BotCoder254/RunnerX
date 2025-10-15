package services

import (
    "encoding/json"
    "log"
    "net/http"
    "bytes"
    "runnerx/models"
    ws "runnerx/websocket"
    "gorm.io/gorm"
)

// AutomationEngine listens to monitor updates and triggers actions
type AutomationEngine struct {
    db  *gorm.DB
    hub *ws.Hub
}

func NewAutomationEngine(db *gorm.DB, hub *ws.Hub) *AutomationEngine { return &AutomationEngine{db: db, hub: hub} }

// EvaluateRules checks rules for a particular monitor update
func (ae *AutomationEngine) EvaluateRules(userID uint, monitorID uint, status string, oldStatus string) {
    var rules []models.AutomationRule
    if err := ae.db.Where("user_id = ? AND monitor_id = ? AND enabled = ?", userID, monitorID, true).Find(&rules).Error; err != nil {
        log.Printf("Automation: failed to load rules: %v", err)
        return
    }
    for _, r := range rules {
        if r.ConditionType == "down" && status == "down" {
            ae.execute(r, userID, monitorID, status)
        }
        if r.ConditionType == "recovered" && oldStatus == "down" && status == "up" {
            ae.execute(r, userID, monitorID, status)
        }
    }
}

func (ae *AutomationEngine) execute(rule models.AutomationRule, userID uint, monitorID uint, status string) {
    switch rule.ActionType {
    case "toast", "sound":
        payload := map[string]interface{}{
            "monitor_id": monitorID,
            "action": rule.ActionType,
            "status": status,
            "payload": jsonRaw(rule.PayloadJSON),
        }
        ae.hub.BroadcastToUser(userID, "automation:action", payload)
    case "webhook":
        if rule.PayloadJSON != "" {
            var p map[string]interface{}
            _ = json.Unmarshal([]byte(rule.PayloadJSON), &p)
            url, _ := p["url"].(string)
            if url != "" {
                body, _ := json.Marshal(map[string]interface{}{"monitor_id": monitorID, "status": status})
                go http.Post(url, "application/json", bytes.NewReader(body))
            }
        }
    }
}

func jsonRaw(s string) interface{} { var v interface{}; _ = json.Unmarshal([]byte(s), &v); return v }


