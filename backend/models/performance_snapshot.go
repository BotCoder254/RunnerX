package models

import (
    "time"
)

type PerformanceSnapshot struct {
    ID         uint      `gorm:"primarykey" json:"id"`
    CreatedAt  time.Time `json:"created_at"`
    MonitorID  uint      `gorm:"not null;index" json:"monitor_id"`

    // Aggregated last hour metrics
    UptimePercent float64 `json:"uptime_percent"`
    AvgLatencyMs  float64 `json:"avg_latency_ms"`
    CpuLoad       float64 `json:"cpu_load"`
    P50LatencyMs  float64 `json:"p50_latency_ms"`
    P95LatencyMs  float64 `json:"p95_latency_ms"`
    SuccessRatio  float64 `json:"success_ratio"`
}


