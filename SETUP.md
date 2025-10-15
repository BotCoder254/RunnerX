# RunnerX Setup Guide

Complete setup instructions for RunnerX monitoring tool.

## 🎯 Quick Start (5 minutes)

### Step 1: Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
go mod download
```

### Step 2: Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and update `JWT_SECRET`:
```env
PORT=8080
DATABASE_URL=./runnerx.db
JWT_SECRET=your-very-secure-random-secret-key-here
```

> 💡 Generate a secure secret: `openssl rand -hex 32`

### Step 3: Start Backend

```bash
cd backend
go run main.go
```

You should see:
```
Database connected successfully
Running database migrations...
Migrations completed successfully
Monitor service started
Server starting on :8080
```

### Step 4: Start Frontend

In a new terminal:
```bash
npm start
```

Browser will open at `http://localhost:3000`

### Step 5: Create Account

1. Click "Sign up" 
2. Enter your details
3. You'll be redirected to the dashboard

## 🔧 Detailed Setup

### Prerequisites Check

**Node.js:**
```bash
node --version  # Should be 18+
npm --version   # Should be 9+
```

**Go:**
```bash
go version      # Should be 1.21+
```

**SQLite3:**
```bash
sqlite3 --version  # Should be installed
```

### Frontend Configuration

Create `.env` in project root (optional):
```env
REACT_APP_API_URL=http://localhost:8080/api
```

**Custom Port:**
```bash
PORT=3001 npm start
```

### Backend Configuration

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 8080 |
| DATABASE_URL | SQLite file path | ./runnerx.db |
| JWT_SECRET | JWT signing key | REQUIRED |

**Database Setup:**

The database is created automatically on first run. Location: `backend/runnerx.db`

To reset database:
```bash
cd backend
rm runnerx.db
go run main.go  # Will recreate
```

### Verify Installation

1. **Backend Health Check:**
```bash
curl http://localhost:8080/health
# Expected: {"status":"ok"}
```

2. **Frontend Load:**
Open `http://localhost:3000` - should see login page

3. **Register Test User:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

## 📱 Using RunnerX

### Create Your First Monitor

1. Login to dashboard
2. Click "Add Monitor"
3. Fill in details:
   - **Name:** My Website
   - **Type:** HTTP
   - **URL:** https://example.com
   - **Interval:** 1 minute
4. Click "Create Monitor"

The monitor will appear in your dashboard and start checking automatically!

### Monitor Types

**HTTP Monitor:**
- Checks websites/APIs
- Supports all HTTP methods
- Custom headers supported
- Tracks status codes and latency

**Ping Monitor:**
- Uses ICMP ping
- Good for basic connectivity
- Measures round-trip time

**TCP Monitor:**
- Tests TCP port connectivity
- Useful for databases, SSH, etc.

### Understanding Status

| Status | Color | Meaning |
|--------|-------|---------|
| 🟢 Online | Green | Service is up |
| 🔴 Offline | Red | Service is down |
| ⏸️ Paused | Gray | Monitoring paused |
| 🟡 Pending | Yellow | First check pending |

### Dashboard Features

**Stats Overview:**
- Total online/offline/paused monitors
- Average uptime percentage

**Filter Monitors:**
- Click sidebar toggle (☰)
- Filter by status
- Filter by tags (coming soon)

**Monitor Cards:**
- Real-time status
- Last check time
- Current latency
- Uptime percentage
- Mini sparkline chart
- Waterlike animation on hover

**Dark Mode:**
- Click sun/moon icon in header
- Preference saved automatically

**Auto-lock:**
- Locks after 30 minutes inactivity
- Manual lock: User menu → Lock Screen
- Unlock with password

## 🐛 Troubleshooting

### Backend won't start

**Error: "bind: address already in use"**
```bash
# Find process using port 8080
lsof -i :8080
# Kill it
kill -9 <PID>
```

**Error: "failed to connect to database"**
- Check write permissions in `backend/` directory
- Try: `chmod 755 backend/`

### Frontend won't start

**Error: "node_modules not found"**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Error: "Port 3000 already in use"**
```bash
# Use different port
PORT=3001 npm start
```

### Connection Issues

**Frontend can't reach backend:**

1. Check backend is running:
```bash
curl http://localhost:8080/health
```

2. Check CORS settings in `backend/main.go`:
```go
AllowOrigins: []string{"http://localhost:3000", "http://localhost:3001"}
```

3. Check proxy in `package.json`:
```json
"proxy": "http://localhost:8080"
```

### Monitor Not Checking

**Monitor shows "Pending":**
- Wait 10 seconds (check cycle runs every 10s)
- Check backend logs for errors
- Verify endpoint is accessible from server

**Monitor always shows "Down":**
- Check endpoint URL is correct
- Test endpoint manually: `curl <endpoint>`
- Check firewall/network settings
- Review check history for error messages

### Authentication Issues

**"Invalid token" error:**
- Token expired (7 days) - login again
- JWT_SECRET changed - existing tokens invalid
- Clear localStorage and login again

**Can't register:**
- Email already exists
- Password must be 6+ characters
- Check backend logs for errors

## 🚀 Production Deployment

### Security Checklist

- [ ] Change JWT_SECRET to secure random value
- [ ] Use HTTPS (reverse proxy with nginx/caddy)
- [ ] Set up firewall rules
- [ ] Regular backups of database
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated

### Build for Production

**Frontend:**
```bash
npm run build
```

Serve `build/` directory with nginx/apache/caddy.

**Backend:**
```bash
cd backend
CGO_ENABLED=1 go build -o runnerx-server main.go
```

**Systemd Service:**
```ini
[Unit]
Description=RunnerX Monitor Service
After=network.target

[Service]
Type=simple
User=runnerx
WorkingDirectory=/opt/runnerx/backend
Environment="PORT=8080"
Environment="JWT_SECRET=your-secure-secret"
Environment="DATABASE_URL=/var/lib/runnerx/runnerx.db"
ExecStart=/opt/runnerx/backend/runnerx-server
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable runnerx
sudo systemctl start runnerx
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name monitor.example.com;

    location / {
        root /opt/runnerx/build;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Database Management

### Backup Database

```bash
cd backend
sqlite3 runnerx.db ".backup runnerx-backup-$(date +%Y%m%d).db"
```

### View Database

```bash
cd backend
sqlite3 runnerx.db

# List tables
.tables

# View monitors
SELECT * FROM monitors;

# Exit
.quit
```

### Clean Old Checks

```sql
-- Delete checks older than 30 days
DELETE FROM checks WHERE created_at < datetime('now', '-30 days');
```

## 🔄 Updates

```bash
# Update frontend
npm update

# Update backend
cd backend
go get -u ./...
go mod tidy
```

## 📈 Monitoring RunnerX Itself

Create a monitor for RunnerX:
- **Type:** HTTP
- **URL:** http://localhost:8080/health
- **Interval:** 5 minutes

This ensures your monitoring service is running!

## 💡 Tips & Best Practices

1. **Start with fewer monitors** - Test with 5-10 before scaling
2. **Use appropriate intervals** - Don't overload targets
3. **Add tags** - Organize monitors (prod, staging, api, etc.)
4. **Regular backups** - Automate database backups
5. **Monitor the monitor** - Set up health checks
6. **Review history** - Check patterns in downtime
7. **Dark mode** - Easier on eyes for 24/7 monitoring

## 🆘 Getting Help

- Check logs: `backend/` directory
- Enable Go debug: `GIN_MODE=debug go run main.go`
- Browser console for frontend errors
- GitHub issues for bug reports

## 📚 Next Steps

- Add more monitors
- Set up production deployment
- Configure backup automation
- Integrate with alerting (future feature)
- Customize check intervals per use case

---

**Happy Monitoring! 🎉**

