package services

import (
    "context"
    "fmt"
    "os"
    "os"
    "path/filepath"
    "time"

    "github.com/chromedp/chromedp"
    "gorm.io/gorm"
    "runnerx/models"
    ws "runnerx/websocket"
)

type ScreenshotService struct {
    db  *gorm.DB
    hub *ws.Hub
}

func NewScreenshotService(db *gorm.DB, hub *ws.Hub) *ScreenshotService {
    return &ScreenshotService{db: db, hub: hub}
}

func (s *ScreenshotService) CaptureAndStore(userID uint, incidentID string, url string, monitorID uint) error {
    // Headless browser screenshot using chromedp
    // Allow custom Chrome executable via CHROME_PATH
    execPath := os.Getenv("CHROME_PATH")
    opts := []chromedp.ExecAllocatorOption{}
    if execPath != "" {
        opts = append(opts, chromedp.ExecPath(execPath))
    }
    allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), opts...)
    defer allocCancel()
    ctx, cancel := chromedp.NewContext(allocCtx)
    defer cancel()

    var buf []byte
    // 10s timeout
    cctx, ccancel := context.WithTimeout(ctx, 10*time.Second)
    defer ccancel()

    if err := chromedp.Run(cctx,
        chromedp.Navigate(url),
        chromedp.Sleep(2*time.Second),
        chromedp.CaptureScreenshot(&buf),
    ); err != nil {
        return err
    }

    // Ensure screenshots dir
    _ = os.MkdirAll("screenshots", 0755)
    filename := fmt.Sprintf("%s_%d.png", incidentID, time.Now().Unix())
    path := filepath.Join("screenshots", filename)

    f, err := os.Create(path)
    if err != nil { return err }
    defer f.Close()

    if _, err := f.Write(buf); err != nil { return err }

    rec := models.IncidentScreenshot{
        UserID: userID,
        IncidentID: incidentID,
        MonitorID: monitorID,
        Path: path,
    }
    if err := s.db.Create(&rec).Error; err != nil { return err }

    s.hub.BroadcastToUser(userID, "incident:screenshot", map[string]interface{}{
        "incident_id": incidentID,
        "path": path,
    })
    return nil
}


