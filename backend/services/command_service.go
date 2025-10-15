package services

import (
    "context"
    "fmt"
    "net"
    "os/exec"
    "regexp"
    "strings"
    "time"
    "runnerx/models"
    "gorm.io/gorm"
    ws "runnerx/websocket"
)

type CommandService struct {
    DB *gorm.DB
    Hub *ws.Hub
}

func NewCommandService(db *gorm.DB, hub *ws.Hub) *CommandService {
    return &CommandService{
        DB:  db,
        Hub: hub,
    }
}

type CommandRequest struct {
    Type    string `json:"type" binding:"required"`
    Target  string `json:"target" binding:"required"`
    UserID  uint   `json:"user_id"`
    MonitorID *uint `json:"monitor_id,omitempty"`
}

type CommandResponse struct {
    ID        string    `json:"id"`
    Type      string    `json:"type"`
    Target    string    `json:"target"`
    Status    string    `json:"status"` // running, completed, failed
    Output    string    `json:"output"`
    Error     string    `json:"error,omitempty"`
    Duration  int64     `json:"duration_ms"`
    Timestamp time.Time `json:"timestamp"`
}


// ExecuteCommand safely executes a command with timeout
func (cs *CommandService) ExecuteCommand(req CommandRequest) (*CommandResponse, error) {
    // Validate command type
    if !cs.isValidCommandType(req.Type) {
        return nil, fmt.Errorf("invalid command type: %s", req.Type)
    }

    // Validate target
    if !cs.isValidTarget(req.Target) {
        return nil, fmt.Errorf("invalid target: %s", req.Target)
    }

    // Create command log entry
    logEntry := &models.CommandLog{
        UserID:    req.UserID,
        MonitorID: req.MonitorID,
        Type:      req.Type,
        Target:    req.Target,
        Status:    "running",
    }
    
    if err := cs.DB.Create(logEntry).Error; err != nil {
        return nil, fmt.Errorf("failed to create command log: %v", err)
    }

    // Execute command in goroutine
    go cs.executeCommandAsync(logEntry, req)

    return &CommandResponse{
        ID:        fmt.Sprintf("%d", logEntry.ID),
        Type:      req.Type,
        Target:    req.Target,
        Status:    "running",
        Timestamp: time.Now(),
    }, nil
}

func (cs *CommandService) executeCommandAsync(logEntry *models.CommandLog, req CommandRequest) {
    startTime := time.Now()
    
    var output string
    var err error
    
    // Create context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    switch req.Type {
    case "ping":
        output, err = cs.executePing(ctx, req.Target)
    case "curl":
        output, err = cs.executeCurl(ctx, req.Target)
    case "dns":
        output, err = cs.executeDNS(ctx, req.Target)
    case "traceroute":
        output, err = cs.executeTraceroute(ctx, req.Target)
    default:
        err = fmt.Errorf("unsupported command type: %s", req.Type)
    }

    duration := time.Since(startTime).Milliseconds()
    
    // Update log entry
    logEntry.Duration = duration
    if err != nil {
        logEntry.Status = "failed"
        logEntry.Error = err.Error()
    } else {
        logEntry.Status = "completed"
        logEntry.Output = output
    }
    
    cs.DB.Save(logEntry)

    // Send real-time update via WebSocket
    response := CommandResponse{
        ID:        fmt.Sprintf("%d", logEntry.ID),
        Type:      req.Type,
        Target:    req.Target,
        Status:    logEntry.Status,
        Output:    logEntry.Output,
        Error:     logEntry.Error,
        Duration:  duration,
        Timestamp: time.Now(),
    }

    cs.Hub.BroadcastToUser(req.UserID, "command:result", response)
}

func (cs *CommandService) executePing(ctx context.Context, target string) (string, error) {
    // Use ping command with timeout
    cmd := exec.CommandContext(ctx, "ping", "-c", "4", "-W", "5", target)
    output, err := cmd.CombinedOutput()
    return string(output), err
}

func (cs *CommandService) executeCurl(ctx context.Context, target string) (string, error) {
    // Use curl with timeout and follow redirects
    cmd := exec.CommandContext(ctx, "curl", "-L", "-m", "30", "-s", "-w", 
        "HTTP Code: %{http_code}\nTotal Time: %{time_total}s\nSize: %{size_download} bytes\n", 
        target)
    output, err := cmd.CombinedOutput()
    return string(output), err
}

func (cs *CommandService) executeDNS(ctx context.Context, target string) (string, error) {
    // Use nslookup or dig for DNS resolution
    cmd := exec.CommandContext(ctx, "nslookup", target)
    output, err := cmd.CombinedOutput()
    if err != nil {
        // Fallback to dig if nslookup fails
        cmd = exec.CommandContext(ctx, "dig", target)
        output, err = cmd.CombinedOutput()
    }
    return string(output), err
}

func (cs *CommandService) executeTraceroute(ctx context.Context, target string) (string, error) {
    // Use traceroute command
    cmd := exec.CommandContext(ctx, "traceroute", "-m", "15", target)
    output, err := cmd.CombinedOutput()
    return string(output), err
}

func (cs *CommandService) isValidCommandType(cmdType string) bool {
    validTypes := []string{"ping", "curl", "dns", "traceroute"}
    for _, validType := range validTypes {
        if cmdType == validType {
            return true
        }
    }
    return false
}

func (cs *CommandService) isValidTarget(target string) bool {
    // Basic validation for targets
    if len(target) == 0 || len(target) > 255 {
        return false
    }

    // Check for dangerous characters
    dangerousChars := []string{";", "&", "|", "`", "$", "(", ")", "<", ">", "\"", "'"}
    for _, char := range dangerousChars {
        if strings.Contains(target, char) {
            return false
        }
    }

    // For URLs, validate basic format
    if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") {
        return true
    }

    // For hostnames/IPs, validate format
    if net.ParseIP(target) != nil {
        return true
    }

    // Check if it's a valid hostname
    hostnameRegex := regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$`)
    return hostnameRegex.MatchString(target)
}

// GetCommandHistory returns command history for a user
func (cs *CommandService) GetCommandHistory(userID uint, limit int) ([]models.CommandLog, error) {
    var logs []models.CommandLog
    err := cs.DB.Where("user_id = ?", userID).
        Order("created_at DESC").
        Limit(limit).
        Find(&logs).Error
    return logs, err
}

// GetAvailableCommands returns list of available commands
func (cs *CommandService) GetAvailableCommands() []map[string]interface{} {
    return []map[string]interface{}{
        {
            "type":        "ping",
            "name":        "Ping",
            "description": "Test network connectivity to a host",
            "example":     "google.com",
            "icon":        "📡",
        },
        {
            "type":        "curl",
            "name":        "HTTP Request",
            "description": "Make HTTP request and check response",
            "example":     "https://example.com",
            "icon":        "🌐",
        },
        {
            "type":        "dns",
            "name":        "DNS Lookup",
            "description": "Resolve domain name to IP address",
            "example":     "example.com",
            "icon":        "🔍",
        },
        {
            "type":        "traceroute",
            "name":        "Traceroute",
            "description": "Trace network path to destination",
            "example":     "google.com",
            "icon":        "🛤️",
        },
    }
}
