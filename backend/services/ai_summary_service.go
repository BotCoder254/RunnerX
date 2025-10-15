package services

import (
    "encoding/json"
    "fmt"
    "regexp"
    "sort"
    "strings"
    "time"
    "runnerx/models"
    "gorm.io/gorm"
)

type AISummaryService struct {
    DB *gorm.DB
}

func NewAISummaryService(db *gorm.DB) *AISummaryService {
    return &AISummaryService{DB: db}
}

// GenerateSummary creates an AI summary for an incident
func (s *AISummaryService) GenerateSummary(incident *models.Incident) (*models.IncidentAISummary, error) {
    // Get incident events for context
    var events []models.IncidentEvent
    if err := s.DB.Where("incident_id = ?", incident.ID).Find(&events).Error; err != nil {
        return nil, err
    }

    // Combine incident data for analysis
    textData := s.buildTextData(incident, events)
    
    // Extract keywords using NLP
    keywords := s.extractKeywords(textData)
    
    // Generate summary
    summary := s.generatePlainEnglishSummary(incident, events, keywords)
    
    // Calculate duration
    duration := s.calculateDuration(incident, events)
    
    // Determine severity
    severity := s.determineSeverity(incident, events)
    
    // Calculate confidence based on data quality
    confidence := s.calculateConfidence(incident, events)

    // Convert keywords to JSON
    keywordsJSON, _ := json.Marshal(keywords)

    aiSummary := &models.IncidentAISummary{
        IncidentID: incident.ID,
        Summary:    summary,
        Keywords:   string(keywordsJSON),
        Duration:   duration,
        Severity:   severity,
        Confidence: confidence,
    }

    return aiSummary, nil
}

// buildTextData combines incident and event data into analyzable text
func (s *AISummaryService) buildTextData(incident *models.Incident, events []models.IncidentEvent) string {
    var textParts []string
    
    // Add incident summary
    if incident.Summary != "" {
        textParts = append(textParts, incident.Summary)
    }
    
    // Add incident type and severity
    textParts = append(textParts, fmt.Sprintf("Type: %s", incident.Type))
    textParts = append(textParts, fmt.Sprintf("Severity: %s", incident.Severity))
    
    // Add event details
    for _, event := range events {
        if event.Detail != "" {
            textParts = append(textParts, event.Detail)
        }
        if event.Meta != "" {
            textParts = append(textParts, event.Meta)
        }
    }
    
    return strings.Join(textParts, " ")
}

// extractKeywords uses NLP to extract important keywords
func (s *AISummaryService) extractKeywords(text string) []string {
    // Clean and tokenize text
    cleaned := s.cleanText(text)
    words := strings.Fields(cleaned)
    
    // Remove common stop words
    stopWords := map[string]bool{
        "the": true, "a": true, "an": true, "and": true, "or": true, "but": true,
        "in": true, "on": true, "at": true, "to": true, "for": true, "of": true,
        "with": true, "by": true, "is": true, "are": true, "was": true, "were": true,
        "be": true, "been": true, "have": true, "has": true, "had": true, "do": true,
        "does": true, "did": true, "will": true, "would": true, "could": true, "should": true,
    }
    
    // Count word frequency
    wordCount := make(map[string]int)
    for _, word := range words {
        if len(word) > 2 && !stopWords[strings.ToLower(word)] {
            wordCount[strings.ToLower(word)]++
        }
    }
    
    // Sort by frequency and return top keywords
    type wordFreq struct {
        word  string
        count int
    }
    
    var sortedWords []wordFreq
    for word, count := range wordCount {
        sortedWords = append(sortedWords, wordFreq{word, count})
    }
    
    sort.Slice(sortedWords, func(i, j int) bool {
        return sortedWords[i].count > sortedWords[j].count
    })
    
    // Return top 10 keywords
    keywords := make([]string, 0, 10)
    for i, wf := range sortedWords {
        if i >= 10 {
            break
        }
        keywords = append(keywords, wf.word)
    }
    
    return keywords
}

// cleanText removes special characters and normalizes text
func (s *AISummaryService) cleanText(text string) string {
    // Remove special characters except spaces
    reg := regexp.MustCompile(`[^a-zA-Z0-9\s]`)
    cleaned := reg.ReplaceAllString(text, " ")
    
    // Normalize whitespace
    reg = regexp.MustCompile(`\s+`)
    cleaned = reg.ReplaceAllString(cleaned, " ")
    
    return strings.TrimSpace(cleaned)
}

// generatePlainEnglishSummary creates a human-readable summary
func (s *AISummaryService) generatePlainEnglishSummary(incident *models.Incident, events []models.IncidentEvent, keywords []string) string {
    var summary strings.Builder
    
    // Start with incident type and severity
    summary.WriteString(fmt.Sprintf("A %s incident occurred with %s severity. ", 
        incident.Type, incident.Severity))
    
    // Add duration information
    if len(events) > 0 {
        duration := s.calculateDuration(incident, events)
        summary.WriteString(fmt.Sprintf("The incident lasted %s. ", duration))
    }
    
    // Add key details from events
    if len(events) > 0 {
        summary.WriteString("Key details: ")
        for i, event := range events {
            if i >= 3 { // Limit to first 3 events
                break
            }
            if event.Detail != "" {
                summary.WriteString(fmt.Sprintf("%s; ", event.Detail))
            }
        }
    }
    
    // Add keyword context
    if len(keywords) > 0 {
        summary.WriteString(fmt.Sprintf("Related terms: %s.", strings.Join(keywords[:min(5, len(keywords))], ", ")))
    }
    
    return strings.TrimSuffix(summary.String(), "; ")
}

// calculateDuration computes human-readable duration
func (s *AISummaryService) calculateDuration(incident *models.Incident, events []models.IncidentEvent) string {
    if len(events) < 2 {
        return "unknown duration"
    }
    
    // Sort events by creation time
    sort.Slice(events, func(i, j int) bool {
        return events[i].CreatedAt.Before(events[j].CreatedAt)
    })
    
    start := events[0].CreatedAt
    end := events[len(events)-1].CreatedAt
    duration := end.Sub(start)
    
    if duration < time.Minute {
        return fmt.Sprintf("%.0f seconds", duration.Seconds())
    } else if duration < time.Hour {
        return fmt.Sprintf("%.1f minutes", duration.Minutes())
    } else {
        return fmt.Sprintf("%.1f hours", duration.Hours())
    }
}

// determineSeverity calculates severity based on incident data
func (s *AISummaryService) determineSeverity(incident *models.Incident, events []models.IncidentEvent) string {
    // Base severity from incident
    baseSeverity := incident.Severity
    
    // Adjust based on duration and event count
    duration := s.calculateDuration(incident, events)
    
    if strings.Contains(duration, "hour") {
        if baseSeverity == "info" {
            return "warn"
        } else if baseSeverity == "warn" {
            return "critical"
        }
    }
    
    if len(events) > 5 {
        if baseSeverity == "info" {
            return "warn"
        }
    }
    
    return baseSeverity
}

// calculateConfidence computes NLP confidence score
func (s *AISummaryService) calculateConfidence(incident *models.Incident, events []models.IncidentEvent) float64 {
    confidence := 0.5 // Base confidence
    
    // Increase confidence based on data availability
    if incident.Summary != "" {
        confidence += 0.2
    }
    
    if len(events) > 0 {
        confidence += 0.2
    }
    
    // Increase confidence based on event detail quality
    detailCount := 0
    for _, event := range events {
        if len(event.Detail) > 10 {
            detailCount++
        }
    }
    
    if detailCount > 0 {
        confidence += float64(detailCount) * 0.05
    }
    
    // Cap at 1.0
    if confidence > 1.0 {
        confidence = 1.0
    }
    
    return confidence
}

// min returns the minimum of two integers
func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}
