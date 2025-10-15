package services

import (
	"log"
	"math"
    "sort"
	"runnerx/models"
	ws "runnerx/websocket"
	"time"

	"gorm.io/gorm"
)

// AnalyticsService periodically computes forecasts per monitor
type AnalyticsService struct {
	db  *gorm.DB
	hub *ws.Hub
}

func NewAnalyticsService(db *gorm.DB, hub *ws.Hub) *AnalyticsService {
	return &AnalyticsService{db: db, hub: hub}
}

// StartHourly runs analysis every hour
func (as *AnalyticsService) StartHourly() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for {
		as.runOnce()
		<-ticker.C
	}
}

func (as *AnalyticsService) runOnce() {
	var monitors []models.Monitor
	if err := as.db.Where("enabled = ?", true).Find(&monitors).Error; err != nil {
		log.Printf("Analytics: failed to list monitors: %v", err)
		return
	}
	cutoff := time.Now().Add(-7 * 24 * time.Hour)
	for _, m := range monitors {
		var checks []models.Check
		if err := as.db.Where("monitor_id = ? AND created_at >= ?", m.ID, cutoff).Order("created_at DESC").Find(&checks).Error; err != nil {
			log.Printf("Analytics: failed to read checks: %v", err)
			continue
		}
		if len(checks) == 0 {
			continue
		}
		// Moving average latency and failure ratio
		latencyMA := movingAverageLatency(checks, 50)
		failureRatio := computeFailureRatio(checks)
		// Stability score: 100 - weighted risk
		// Normalize latency to 0..1 via log scale
		normLatency := normalizeLatency(latencyMA)
		risk := 0.6*failureRatio + 0.4*normLatency
		_ = math.Max(0, 100*(1.0-risk))

		// Predict next-day risk as smoothed failure ratio
		nextDayRisk := math.Min(100, math.Max(0, 100*(0.7*failureRatio+0.3*normLatency)))

		trend := "steady"
		if len(checks) >= 20 {
			// simple trend over last N vs previous N
			half := len(checks) / 2
			first := computeFailureRatio(checks[half:])
			prev := computeFailureRatio(checks[:half])
			if first > prev+0.05 {
				trend = "up"
			} else if first < prev-0.05 {
				trend = "down"
			}
		}

		forecast := models.MonitorForecast{
			MonitorID: m.ID,
			Timestamp: time.Now(),
			RiskScore: nextDayRisk,
			Trend:     trend,
		}
		if err := as.db.Create(&forecast).Error; err != nil {
			log.Printf("Analytics: failed to save forecast: %v", err)
		}
	}
}

// AggregateLastHour computes hourly performance snapshots for each monitor
func (as *AnalyticsService) AggregateLastHour() {
    cutoff := time.Now().Add(-1 * time.Hour)
    var monitors []models.Monitor
    if err := as.db.Find(&monitors).Error; err != nil { return }
    for _, m := range monitors {
        var checks []models.Check
        if err := as.db.Where("monitor_id = ? AND created_at >= ?", m.ID, cutoff).Order("created_at DESC").Find(&checks).Error; err != nil {
            continue
        }
        if len(checks) == 0 { continue }
        total := float64(len(checks))
        success := 0.0
        latencies := make([]int64, 0, len(checks))
        sum := 0.0
        for _, c := range checks {
            if c.Status == "up" { success++ }
            latencies = append(latencies, c.LatencyMs)
            sum += float64(c.LatencyMs)
        }
        avg := sum / total
        // simple percentiles
        sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
        p50 := float64(latencies[int(0.5*total)])
        p95 := float64(latencies[int(0.95*total)-1])
        snap := models.PerformanceSnapshot{
            MonitorID:     m.ID,
            UptimePercent: 100.0 * (success / total),
            AvgLatencyMs:  avg,
            CpuLoad:       0, // placeholder; integrate real host metrics if available
            P50LatencyMs:  p50,
            P95LatencyMs:  p95,
            SuccessRatio:  success / total,
        }
        _ = as.db.Create(&snap).Error
    }
}

func movingAverageLatency(checks []models.Check, window int) float64 {
	if len(checks) == 0 {
		return 0
	}
	if window <= 0 {
		window = 1
	}
	sum := 0.0
	n := 0
	for i := 0; i < len(checks) && i < window; i++ {
		sum += float64(checks[i].LatencyMs)
		n++
	}
	if n == 0 {
		return 0
	}
	return sum / float64(n)
}

func computeFailureRatio(checks []models.Check) float64 {
	if len(checks) == 0 {
		return 0
	}
	fails := 0
	lookback := len(checks)
	if lookback > 200 {
		lookback = 200
	}
	for i := 0; i < lookback; i++ {
		if checks[i].Status == "down" {
			fails++
		}
	}
	return float64(fails) / float64(lookback)
}

func normalizeLatency(latencyMs float64) float64 {
	if latencyMs <= 0 {
		return 0
	}
	// Log scale cap at 10s
	l := math.Log1p(latencyMs) / math.Log1p(10000)
	if l < 0 {
		return 0
	}
	if l > 1 {
		return 1
	}
	return l
}
