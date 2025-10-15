package services

import (
	"encoding/json"
	"fmt"
	"runnerx/models"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type MonitoringConfigService struct {
	DB *gorm.DB
}

func NewMonitoringConfigService(db *gorm.DB) *MonitoringConfigService {
	return &MonitoringConfigService{DB: db}
}

// ValidateMonitorConfig validates monitor configuration before creation
func (mcs *MonitoringConfigService) ValidateMonitorConfig(monitor *models.Monitor) error {
	// Validate endpoint format
	if err := mcs.validateEndpoint(monitor.Endpoint, monitor.Type); err != nil {
		return fmt.Errorf("invalid endpoint: %v", err)
	}

	// Validate interval
	if monitor.IntervalSeconds < 10 {
		return fmt.Errorf("interval must be at least 10 seconds")
	}
	if monitor.IntervalSeconds > 86400 {
		return fmt.Errorf("interval cannot exceed 24 hours")
	}

	// Validate timeout
	if monitor.Timeout < 1 {
		return fmt.Errorf("timeout must be at least 1 second")
	}
	if monitor.Timeout > 60 {
		return fmt.Errorf("timeout cannot exceed 60 seconds")
	}

	// Validate headers JSON if provided
	if monitor.HeadersJSON != "" {
		if err := mcs.validateHeadersJSON(monitor.HeadersJSON); err != nil {
			return fmt.Errorf("invalid headers JSON: %v", err)
		}
	}

	return nil
}

// validateEndpoint checks if the endpoint is valid for the monitor type
func (mcs *MonitoringConfigService) validateEndpoint(endpoint, monitorType string) error {
	switch monitorType {
	case "http":
		if !mcs.isValidHTTPEndpoint(endpoint) {
			return fmt.Errorf("invalid HTTP endpoint format")
		}
	case "ping":
		if !mcs.isValidPingEndpoint(endpoint) {
			return fmt.Errorf("invalid ping endpoint format")
		}
	case "tcp":
		if !mcs.isValidTCPEndpoint(endpoint) {
			return fmt.Errorf("invalid TCP endpoint format")
		}
	case "dns":
		if !mcs.isValidDNSEndpoint(endpoint) {
			return fmt.Errorf("invalid DNS endpoint format")
		}
	default:
		return fmt.Errorf("unsupported monitor type: %s", monitorType)
	}
	return nil
}

// isValidHTTPEndpoint validates HTTP/HTTPS URLs
func (mcs *MonitoringConfigService) isValidHTTPEndpoint(endpoint string) bool {
	return len(endpoint) > 0 && (endpoint[:4] == "http" || endpoint[:5] == "https")
}

// isValidPingEndpoint validates ping targets (hostname or IP)
func (mcs *MonitoringConfigService) isValidPingEndpoint(endpoint string) bool {
	// Remove protocol prefixes
	endpoint = mcs.removeProtocolPrefix(endpoint)
	endpoint = mcs.removePath(endpoint)
	return len(endpoint) > 0
}

// isValidTCPEndpoint validates TCP endpoints (host:port)
func (mcs *MonitoringConfigService) isValidTCPEndpoint(endpoint string) bool {
	endpoint = mcs.removeProtocolPrefix(endpoint)
	endpoint = mcs.removePath(endpoint)
	return len(endpoint) > 0
}

// isValidDNSEndpoint validates DNS hostnames
func (mcs *MonitoringConfigService) isValidDNSEndpoint(endpoint string) bool {
	endpoint = mcs.removeProtocolPrefix(endpoint)
	endpoint = mcs.removePath(endpoint)
	return len(endpoint) > 0
}

// Helper functions
func (mcs *MonitoringConfigService) removeProtocolPrefix(endpoint string) string {
	if len(endpoint) > 7 && endpoint[:7] == "http://" {
		return endpoint[7:]
	}
	if len(endpoint) > 8 && endpoint[:8] == "https://" {
		return endpoint[8:]
	}
	return endpoint
}

func (mcs *MonitoringConfigService) removePath(endpoint string) string {
	for i, char := range endpoint {
		if char == '/' || char == '?' || char == '#' {
			return endpoint[:i]
		}
	}
	return endpoint
}

// validateHeadersJSON validates the headers JSON format
func (mcs *MonitoringConfigService) validateHeadersJSON(headersJSON string) error {
	var headers map[string]string
	if err := json.Unmarshal([]byte(headersJSON), &headers); err != nil {
		return err
	}
	return nil
}

// GetOptimalInterval suggests optimal monitoring interval based on monitor type
func (mcs *MonitoringConfigService) GetOptimalInterval(monitorType string) int {
	switch monitorType {
	case "http":
		return 60 // 1 minute for HTTP
	case "ping":
		return 30 // 30 seconds for ping
	case "tcp":
		return 60 // 1 minute for TCP
	case "dns":
		return 300 // 5 minutes for DNS
	default:
		return 60
	}
}

// GetOptimalTimeout suggests optimal timeout based on monitor type
func (mcs *MonitoringConfigService) GetOptimalTimeout(monitorType string) int {
	switch monitorType {
	case "http":
		return 10 // 10 seconds for HTTP
	case "ping":
		return 5 // 5 seconds for ping
	case "tcp":
		return 5 // 5 seconds for TCP
	case "dns":
		return 5 // 5 seconds for DNS
	default:
		return 10
	}
}

// TestMonitorConnection tests the monitor connection before saving
func (mcs *MonitoringConfigService) TestMonitorConnection(monitor *models.Monitor) (bool, string, int64, error) {
	// Create a temporary monitor service for testing
	monitorService := &MonitorService{db: mcs.DB}
	
	var status string
	var latencyMs int64
	var errorMsg string

	switch monitor.Type {
	case "http":
		var statusCode int
		status, latencyMs, statusCode, errorMsg = monitorService.checkHTTP(monitor)
		_ = statusCode // Use statusCode to avoid unused variable warning
	case "ping":
		status, latencyMs, errorMsg = monitorService.checkPing(monitor)
	case "tcp":
		status, latencyMs, errorMsg = monitorService.checkTCP(monitor)
	case "dns":
		status, latencyMs, errorMsg = monitorService.checkDNS(monitor)
	default:
		return false, "", 0, fmt.Errorf("unsupported monitor type: %s", monitor.Type)
	}

	isOnline := status == "up"
	return isOnline, errorMsg, latencyMs, nil
}

// GetMonitorHealthStatus provides detailed health status for a monitor
func (mcs *MonitoringConfigService) GetMonitorHealthStatus(monitorID uint) (*MonitorHealthStatus, error) {
	var monitor models.Monitor
	if err := mcs.DB.First(&monitor, monitorID).Error; err != nil {
		return nil, err
	}

	// Get recent checks
	var recentChecks []models.Check
	if err := mcs.DB.Where("monitor_id = ? AND created_at >= ?", monitorID, time.Now().Add(-24*time.Hour)).
		Order("created_at DESC").Limit(100).Find(&recentChecks).Error; err != nil {
		return nil, err
	}

	// Calculate health metrics
	totalChecks := len(recentChecks)
	successfulChecks := 0
	var totalLatency int64
	var avgLatency float64

	for _, check := range recentChecks {
		if check.Status == "up" {
			successfulChecks++
		}
		totalLatency += check.LatencyMs
	}

	if totalChecks > 0 {
		avgLatency = float64(totalLatency) / float64(totalChecks)
	}

	uptimePercent := float64(successfulChecks) / float64(totalChecks) * 100

	// Determine health status
	var healthStatus string
	if uptimePercent >= 99.9 {
		healthStatus = "excellent"
	} else if uptimePercent >= 99.0 {
		healthStatus = "good"
	} else if uptimePercent >= 95.0 {
		healthStatus = "fair"
	} else {
		healthStatus = "poor"
	}

	return &MonitorHealthStatus{
		MonitorID:        monitorID,
		MonitorName:      monitor.Name,
		MonitorType:      monitor.Type,
		CurrentStatus:    monitor.Status,
		HealthStatus:     healthStatus,
		UptimePercent:    uptimePercent,
		TotalChecks:      totalChecks,
		SuccessfulChecks: successfulChecks,
		AverageLatency:   avgLatency,
		LastCheckAt:      monitor.LastCheckAt,
		LastLatencyMs:    monitor.LastLatencyMs,
	}, nil
}

// MonitorHealthStatus represents the health status of a monitor
type MonitorHealthStatus struct {
	MonitorID        uint      `json:"monitor_id"`
	MonitorName      string    `json:"monitor_name"`
	MonitorType      string    `json:"monitor_type"`
	CurrentStatus    string    `json:"current_status"`
	HealthStatus     string    `json:"health_status"`
	UptimePercent    float64   `json:"uptime_percent"`
	TotalChecks      int       `json:"total_checks"`
	SuccessfulChecks int       `json:"successful_checks"`
	AverageLatency   float64   `json:"average_latency"`
	LastCheckAt      *time.Time `json:"last_check_at"`
	LastLatencyMs    *int64    `json:"last_latency_ms"`
}

// LogMonitorEvent logs important monitor events
func (mcs *MonitoringConfigService) LogMonitorEvent(monitorID uint, eventType, message string) {
	logrus.WithFields(logrus.Fields{
		"monitor_id": monitorID,
		"event_type": eventType,
		"message":    message,
		"timestamp":  time.Now(),
	}).Info("Monitor event")
}
