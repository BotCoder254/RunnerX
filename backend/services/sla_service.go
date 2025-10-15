package services

import (
    "time"
    "runnerx/models"
    "gorm.io/gorm"
)

type SLAService struct {
    DB *gorm.DB
}

func NewSLAService(db *gorm.DB) *SLAService {
    return &SLAService{DB: db}
}

// CalculateSLAForMonitor calculates SLA metrics for a specific monitor
func (s *SLAService) CalculateSLAForMonitor(userID, monitorID uint, reportDate time.Time) (*models.SLAReport, error) {
    // Get monitor
    var monitor models.Monitor
    if err := s.DB.Where("id = ? AND user_id = ?", monitorID, userID).First(&monitor).Error; err != nil {
        return nil, err
    }

    // Calculate date range (24 hours)
    startDate := reportDate.Truncate(24 * time.Hour)
    endDate := startDate.Add(24 * time.Hour)

    // Get incidents for this period
    var incidents []models.Incident
    if err := s.DB.Where("monitor_id = ? AND user_id = ? AND timestamp >= ? AND timestamp < ?", 
        monitorID, userID, startDate, endDate).Find(&incidents).Error; err != nil {
        return nil, err
    }

    // Calculate downtime in minutes
    totalDowntimeMinutes := int64(0)
    slaViolations := 0
    slaThreshold := 99.9 // Default SLA threshold

    for _, incident := range incidents {
        if incident.Type == "down" {
            // Calculate incident duration
            incidentDuration := s.calculateIncidentDuration(incident.ID)
            totalDowntimeMinutes += incidentDuration
            
            // Check if this violates SLA (more than 0.1% downtime)
            if incidentDuration > 0 {
                slaViolations++
            }
        }
    }

    // Calculate uptime percentage
    totalMinutes := int64(24 * 60) // 24 hours in minutes
    uptimeMinutes := totalMinutes - totalDowntimeMinutes
    uptimePercent := float64(uptimeMinutes) / float64(totalMinutes) * 100

    // Determine status
    status := "compliant"
    if uptimePercent < slaThreshold {
        status = "violation"
    } else if uptimePercent < slaThreshold+0.5 {
        status = "warning"
    }

    slaReport := &models.SLAReport{
        UserID:          userID,
        MonitorID:       monitorID,
        ReportDate:      startDate,
        UptimePercent:   uptimePercent,
        DowntimeMinutes: totalDowntimeMinutes,
        SLAViolations:   slaViolations,
        SLAThreshold:    slaThreshold,
        Status:          status,
    }

    return slaReport, nil
}

// calculateIncidentDuration calculates the duration of an incident in minutes
func (s *SLAService) calculateIncidentDuration(incidentID uint) int64 {
    var events []models.IncidentEvent
    if err := s.DB.Where("incident_id = ?", incidentID).Order("created_at ASC").Find(&events).Error; err != nil {
        return 0
    }

    if len(events) < 2 {
        return 0
    }

    start := events[0].CreatedAt
    end := events[len(events)-1].CreatedAt
    duration := end.Sub(start)

    return int64(duration.Minutes())
}

// GenerateDailySLAReports generates SLA reports for all monitors
func (s *SLAService) GenerateDailySLAReports() error {
    // Get all users
    var users []models.User
    if err := s.DB.Find(&users).Error; err != nil {
        return err
    }

    reportDate := time.Now().Truncate(24 * time.Hour).Add(-24 * time.Hour) // Yesterday

    for _, user := range users {
        // Get all monitors for this user
        var monitors []models.Monitor
        if err := s.DB.Where("user_id = ?", user.ID).Find(&monitors).Error; err != nil {
            continue
        }

        for _, monitor := range monitors {
            // Check if report already exists
            var existingReport models.SLAReport
            err := s.DB.Where("user_id = ? AND monitor_id = ? AND report_date = ?", 
                user.ID, monitor.ID, reportDate).First(&existingReport).Error
            
            if err == gorm.ErrRecordNotFound {
                // Generate new report
                report, err := s.CalculateSLAForMonitor(user.ID, monitor.ID, reportDate)
                if err != nil {
                    continue
                }

                // Save report
                if err := s.DB.Create(report).Error; err != nil {
                    continue
                }
            }
        }
    }

    return nil
}

// GetSLAReportsForUser gets SLA reports for a specific user
func (s *SLAService) GetSLAReportsForUser(userID uint, days int) ([]models.SLAReport, error) {
    var reports []models.SLAReport
    
    startDate := time.Now().AddDate(0, 0, -days)
    
    if err := s.DB.Where("user_id = ? AND report_date >= ?", userID, startDate).
        Order("report_date DESC").Find(&reports).Error; err != nil {
        return nil, err
    }

    return reports, nil
}

// GetSLAReportsForMonitor gets SLA reports for a specific monitor
func (s *SLAService) GetSLAReportsForMonitor(userID, monitorID uint, days int) ([]models.SLAReport, error) {
    var reports []models.SLAReport
    
    startDate := time.Now().AddDate(0, 0, -days)
    
    if err := s.DB.Where("user_id = ? AND monitor_id = ? AND report_date >= ?", 
        userID, monitorID, startDate).Order("report_date DESC").Find(&reports).Error; err != nil {
        return nil, err
    }

    return reports, nil
}
