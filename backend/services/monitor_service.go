package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os/exec"
	"runnerx/models"
	ws "runnerx/websocket"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type MonitorService struct {
	db  *gorm.DB
	hub *ws.Hub
    li  *LogInsightsService
    ins *IncidentService
}

func NewMonitorService(db *gorm.DB, hub *ws.Hub) *MonitorService {
    return &MonitorService{
        db:  db,
        hub: hub,
        li:  NewLogInsightsService(db, hub),
        ins: NewIncidentService(db),
    }
}

// Start begins monitoring all enabled monitors
func (ms *MonitorService) Start() {
	log.Println("Monitor service started")
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ms.checkAllMonitors()
	}
}

func (ms *MonitorService) checkAllMonitors() {
	var monitors []models.Monitor
	if err := ms.db.Where("enabled = ?", true).Find(&monitors).Error; err != nil {
		log.Printf("Error fetching monitors: %v", err)
		return
	}

	for _, monitor := range monitors {
		// Check if it's time to check this monitor
		if monitor.LastCheckAt != nil {
			nextCheck := monitor.LastCheckAt.Add(time.Duration(monitor.IntervalSeconds) * time.Second)
			if time.Now().Before(nextCheck) {
				continue
			}
		}

		// Perform check in goroutine to avoid blocking
		go ms.checkMonitor(&monitor)
	}
}

func (ms *MonitorService) checkMonitor(monitor *models.Monitor) {
	startTime := time.Now()
	var status string
	var latencyMs int64
	var statusCode int
	var errorMsg string

	switch monitor.Type {
	case "http":
		status, latencyMs, statusCode, errorMsg = ms.checkHTTP(monitor)
	case "ping":
		status, latencyMs, errorMsg = ms.checkPing(monitor)
	case "tcp":
		status, latencyMs, errorMsg = ms.checkTCP(monitor)
	case "dns":
		status, latencyMs, errorMsg = ms.checkDNS(monitor)
	default:
		logrus.WithFields(logrus.Fields{
			"monitor_id": monitor.ID,
			"type":       monitor.Type,
		}).Error("Unknown monitor type")
		return
	}

	// Save check result
	causeType, causeDetail := deriveRootCause(monitor.Type, status, statusCode, errorMsg)
	check := models.Check{
		MonitorID:    monitor.ID,
		Status:       status,
		LatencyMs:    latencyMs,
		StatusCode:   statusCode,
		ErrorMsg:     errorMsg,
		ResponseTime: time.Since(startTime),
		CauseType:    causeType,
		CauseDetail:  causeDetail,
	}

	if err := ms.db.Create(&check).Error; err != nil {
		log.Printf("Error saving check: %v", err)
	}

	// Get old status before update
	oldStatus := monitor.Status

	// Update monitor status
	if err := monitor.UpdateStatus(ms.db, status, latencyMs); err != nil {
		log.Printf("Error updating monitor status: %v", err)
		return
	}

	// Broadcast update via WebSocket
	updateData := map[string]interface{}{
		"monitor_id":       monitor.ID,
		"status":           status,
		"last_check_at":    time.Now(),
		"last_latency_ms":  latencyMs,
		"uptime_percent":   monitor.UptimePercent,
	}

	ms.hub.BroadcastToUser(monitor.UserID, "monitor:update", updateData)

    // Capture screenshot on downtime (best-effort)
    if status == "down" {
        go ms.captureDowntimeScreenshot(monitor)
    }

    // Record a log insight entry only when the check failed
    if status == "down" && ms.li != nil {
        msg := errorMsg
        if msg == "" && statusCode >= 400 {
            msg = fmt.Sprintf("HTTP %d", statusCode)
        }
        if msg != "" {
			incidentID := deriveIncidentID(monitor.ID)
            userID := monitor.UserID
            mid := monitor.ID
            _ = ms.li.RecordLog(userID, incidentID, &mid, "error", msg)
            if ms.ins != nil { ms.ins.RecordFailure(monitor.UserID, monitor.ID, latencyMs, statusCode, errorMsg) }
        }
    }

    // Handle status change
	if oldStatus != status && oldStatus != "pending" {
        // Broadcast status change
		statusChangeData := map[string]interface{}{
			"monitor_id": monitor.ID,
			"old_status": oldStatus,
			"new_status": status,
			"timestamp":  time.Now(),
		}
		ms.hub.BroadcastToUser(monitor.UserID, "monitor:status_change", statusChangeData)

        // Automation removed

		// Create notification with burst suppression
		shouldCreateNotification := ms.shouldCreateNotification(monitor.ID, status)
		if shouldCreateNotification {
			var message string
			var notifType string

			if status == "down" {
				message = fmt.Sprintf("Monitor '%s' is now offline", monitor.Name)
				notifType = "down"
			} else if status == "up" && oldStatus == "down" {
				message = fmt.Sprintf("Monitor '%s' is back online", monitor.Name)
				notifType = "up"
			}

			if message != "" {
				notification, err := models.CreateNotification(ms.db, monitor.UserID, monitor.ID, notifType, message)
				if err != nil {
					log.Printf("Error creating notification: %v", err)
				} else {
					// Broadcast notification
					notificationData := map[string]interface{}{
						"id":         notification.ID,
						"monitor_id": monitor.ID,
						"type":       notifType,
						"message":    message,
						"created_at": notification.CreatedAt,
					}
					ms.hub.BroadcastToUser(monitor.UserID, "notification", notificationData)

					// Update last notification time
					ms.updateLastNotificationTime(monitor.ID)
				}
			}
		}
	}

	log.Printf("Checked %s (%s): %s - %dms", monitor.Name, monitor.Type, status, latencyMs)
}

// deriveIncidentID produces a stable incident scope per monitor
func deriveIncidentID(monitorID uint) string { return fmt.Sprintf("monitor-%d", monitorID) }

func (ms *MonitorService) captureDowntimeScreenshot(m *models.Monitor) {
    if m.Type != "http" {
        return
    }
    ss := NewScreenshotService(ms.db, ms.hub)
    if err := ss.CaptureAndStore(m.UserID, deriveIncidentID(m.ID), m.Endpoint, m.ID); err != nil {
        log.Printf("Screenshot capture failed: %v", err)
    }
}

// Burst suppression - track last notification time per monitor
var lastNotificationTime = make(map[uint]time.Time)
var notificationMutex sync.RWMutex

func (ms *MonitorService) shouldCreateNotification(monitorID uint, status string) bool {
	notificationMutex.RLock()
	lastTime, exists := lastNotificationTime[monitorID]
	notificationMutex.RUnlock()

	// Don't spam - minimum 5 minutes between notifications for same monitor
	if exists && time.Since(lastTime) < 5*time.Minute {
		return false
	}

	return true
}

func (ms *MonitorService) updateLastNotificationTime(monitorID uint) {
	notificationMutex.Lock()
	lastNotificationTime[monitorID] = time.Now()
	notificationMutex.Unlock()
}

func (ms *MonitorService) checkHTTP(monitor *models.Monitor) (string, int64, int, string) {
	// Create context with timeout
	timeout := time.Duration(monitor.Timeout) * time.Second
	if timeout == 0 {
		timeout = 10 * time.Second
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Create HTTP client with proper configuration
	client := &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   5 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   5 * time.Second,
			ResponseHeaderTimeout: 5 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Allow up to 10 redirects
			if len(via) >= 10 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}

	method := monitor.Method
	if method == "" {
		method = "GET"
	}

	// Create request with context
	req, err := http.NewRequestWithContext(ctx, method, monitor.Endpoint, nil)
	if err != nil {
		logrus.WithFields(logrus.Fields{
			"monitor_id": monitor.ID,
			"endpoint":   monitor.Endpoint,
			"error":      err.Error(),
		}).Error("Failed to create HTTP request")
		return "down", 0, 0, fmt.Sprintf("Invalid endpoint: %v", err)
	}

	// Add headers
	req.Header.Set("User-Agent", "RunnerX-Monitor/1.0")
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Connection", "close")

	// Add custom headers if provided
	if monitor.HeadersJSON != "" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(monitor.HeadersJSON), &headers); err == nil {
			for key, value := range headers {
				req.Header.Set(key, value)
			}
		}
	}

	startTime := time.Now()
	resp, err := client.Do(req)
	latencyMs := time.Since(startTime).Milliseconds()

	if err != nil {
		logrus.WithFields(logrus.Fields{
			"monitor_id": monitor.ID,
			"endpoint":   monitor.Endpoint,
			"latency_ms": latencyMs,
			"error":      err.Error(),
		}).Warn("HTTP check failed")
		return "down", latencyMs, 0, err.Error()
	}
	defer resp.Body.Close()

	// Read response body (limited) for better error reporting
	var bodyPreview string
	if resp.Body != nil {
		bodyBytes := make([]byte, 512) // Read first 512 bytes
		n, _ := io.ReadFull(resp.Body, bodyBytes)
		if n > 0 {
			bodyPreview = string(bodyBytes[:n])
		}
	}

	// Determine status based on response code
	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		logrus.WithFields(logrus.Fields{
			"monitor_id":  monitor.ID,
			"endpoint":    monitor.Endpoint,
			"status_code": resp.StatusCode,
			"latency_ms":  latencyMs,
		}).Info("HTTP check successful")
		return "up", latencyMs, resp.StatusCode, bodyPreview
	}

	errorMsg := fmt.Sprintf("HTTP %d: %s", resp.StatusCode, resp.Status)
	if bodyPreview != "" {
		errorMsg += fmt.Sprintf(" - %s", strings.TrimSpace(bodyPreview))
	}

	logrus.WithFields(logrus.Fields{
		"monitor_id":  monitor.ID,
		"endpoint":    monitor.Endpoint,
		"status_code": resp.StatusCode,
		"latency_ms":  latencyMs,
		"error":       errorMsg,
	}).Warn("HTTP check failed with error status")

	return "down", latencyMs, resp.StatusCode, errorMsg
}

func (ms *MonitorService) checkPing(monitor *models.Monitor) (string, int64, string) {
	startTime := time.Now()
	
	// Extract hostname/IP from endpoint
	endpoint := strings.TrimPrefix(monitor.Endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")
	endpoint = strings.Split(endpoint, "/")[0]
	endpoint = strings.Split(endpoint, ":")[0]

	// Create context with timeout
	timeout := time.Duration(monitor.Timeout) * time.Second
	if timeout == 0 {
		timeout = 5 * time.Second
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Use ping command with proper timeout
	cmd := exec.CommandContext(ctx, "ping", "-c", "1", "-W", "5", endpoint)
	err := cmd.Run()
	latencyMs := time.Since(startTime).Milliseconds()

	if err != nil {
		logrus.WithFields(logrus.Fields{
			"monitor_id": monitor.ID,
			"endpoint":   endpoint,
			"latency_ms": latencyMs,
			"error":      err.Error(),
		}).Warn("Ping check failed")
		return "down", latencyMs, err.Error()
	}

	logrus.WithFields(logrus.Fields{
		"monitor_id": monitor.ID,
		"endpoint":   endpoint,
		"latency_ms": latencyMs,
	}).Info("Ping check successful")

	return "up", latencyMs, ""
}

func (ms *MonitorService) checkTCP(monitor *models.Monitor) (string, int64, string) {
	startTime := time.Now()
	
	// Extract host and port from endpoint
	endpoint := strings.TrimPrefix(monitor.Endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")
	endpoint = strings.Split(endpoint, "/")[0]
	
	// Default port if not specified
	if !strings.Contains(endpoint, ":") {
		endpoint += ":80"
	}

	// Create context with timeout
	timeout := time.Duration(monitor.Timeout) * time.Second
	if timeout == 0 {
		timeout = 5 * time.Second
	}
	
	// Attempt TCP connection
	conn, err := net.DialTimeout("tcp", endpoint, timeout)
	latencyMs := time.Since(startTime).Milliseconds()

	if err != nil {
		logrus.WithFields(logrus.Fields{
			"monitor_id": monitor.ID,
			"endpoint":   endpoint,
			"latency_ms": latencyMs,
			"error":      err.Error(),
		}).Warn("TCP check failed")
		return "down", latencyMs, err.Error()
	}
	defer conn.Close()

	logrus.WithFields(logrus.Fields{
		"monitor_id": monitor.ID,
		"endpoint":   endpoint,
		"latency_ms": latencyMs,
	}).Info("TCP check successful")

	return "up", latencyMs, ""
}

func (ms *MonitorService) checkDNS(monitor *models.Monitor) (string, int64, string) {
	startTime := time.Now()
	
	// Extract hostname from endpoint
	hostname := strings.TrimPrefix(monitor.Endpoint, "http://")
	hostname = strings.TrimPrefix(hostname, "https://")
	hostname = strings.Split(hostname, "/")[0]
	hostname = strings.Split(hostname, ":")[0]

	// Create context with timeout
	timeout := time.Duration(monitor.Timeout) * time.Second
	if timeout == 0 {
		timeout = 5 * time.Second
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Perform DNS lookup
	resolver := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{
				Timeout: timeout,
			}
			return d.DialContext(ctx, network, address)
		},
	}

	_, err := resolver.LookupHost(ctx, hostname)
	latencyMs := time.Since(startTime).Milliseconds()

	if err != nil {
		logrus.WithFields(logrus.Fields{
			"monitor_id": monitor.ID,
			"hostname":   hostname,
			"latency_ms": latencyMs,
			"error":      err.Error(),
		}).Warn("DNS check failed")
		return "down", latencyMs, err.Error()
	}

	logrus.WithFields(logrus.Fields{
		"monitor_id": monitor.ID,
		"hostname":   hostname,
		"latency_ms": latencyMs,
	}).Info("DNS check successful")

	return "up", latencyMs, ""
}

// sanitizeSnapshot removes scripts and inline events from HTML/text
func sanitizeSnapshot(s string) string {
    // naive strip for scripts and on* attributes; for production use a real sanitizer
    lower := strings.ToLower(s)
    if strings.Contains(lower, "<script") {
        s = strings.ReplaceAll(s, "<script", "")
        s = strings.ReplaceAll(s, "</script>", "")
    }
    // strip common inline events
    for _, attr := range []string{"onclick", "onload", "onerror", "onmouseover"} {
        s = strings.ReplaceAll(s, attr+"=", "")
    }
    return s
}

// deriveRootCause infers a coarse cause classification for failed checks
func deriveRootCause(monitorType, status string, statusCode int, errMsg string) (string, string) {
    if status == "up" {
        return "", ""
    }
    // HTTP codes
    if monitorType == "http" && statusCode > 0 {
        return "http_error", fmt.Sprintf("HTTP %d", statusCode)
    }
    // Error message heuristics
    lower := strings.ToLower(errMsg)
    switch {
    case strings.Contains(lower, "timeout"):
        if monitorType == "dns" || strings.Contains(lower, "lookup") {
            return "dns_error", "DNS timeout"
        }
        return "connection_timeout", "Connection timed out"
    case strings.Contains(lower, "tls") || strings.Contains(lower, "ssl"):
        return "ssl_error", errMsg
    case strings.Contains(lower, "no such host") || strings.Contains(lower, "lookup"):
        return "dns_error", errMsg
    case strings.Contains(lower, "refused"):
        return "tcp_error", "Connection refused"
    }
    if errMsg != "" {
        return "unknown", errMsg
    }
    return "unknown", ""
}

