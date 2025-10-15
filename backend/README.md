# RunnerX Backend

Modern monitoring service backend built with Go, Gin, and GORM.

## Features

- 🔐 JWT Authentication with single user role
- 📊 Real-time monitoring (HTTP, Ping, TCP)
- 🗄️ SQLite database with GORM
- 🔒 Rate limiting and security middleware
- 📈 Historical check data and statistics
- 🎯 RESTful API design

## Prerequisites

- Go 1.21 or higher
- SQLite3

## Setup

1. Install dependencies:
```bash
go mod download
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your settings (especially JWT_SECRET in production)

4. Run the server:
```bash
go run main.go
```

The server will start on `http://localhost:8080`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Monitors (Protected)

- `GET /api/monitors` - Get all monitors
- `GET /api/monitor/:id` - Get specific monitor
- `POST /api/monitor` - Create monitor
- `PUT /api/monitor/:id` - Update monitor
- `DELETE /api/monitor/:id` - Delete monitor
- `PATCH /api/monitor/:id/toggle` - Enable/disable monitor
- `GET /api/monitor/:id/stats` - Get monitor statistics
- `GET /api/monitor/:id/history` - Get check history

### Health

- `GET /health` - Health check endpoint

## Project Structure

```
backend/
├── config/          # Configuration
├── controllers/     # Request handlers
├── database/        # Database setup and migrations
├── middleware/      # Auth and rate limiting
├── models/          # Data models
├── routes/          # Route definitions
├── services/        # Background monitoring service
└── main.go          # Application entry point
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting (100 requests/minute per IP)
- Input validation
- CORS configuration
- Single user role with full privileges

## Database Schema

### Users
- id, created_at, updated_at, deleted_at
- name, email, password (hashed), role

### Monitors
- id, created_at, updated_at, deleted_at
- user_id, name, type, endpoint, method
- interval_seconds, headers_json, enabled, tags
- status, last_check_at, last_latency_ms
- uptime_percent, total_checks, successful_checks

### Checks
- id, created_at, deleted_at
- monitor_id, status, latency_ms
- status_code, error_msg, response_time

## Building for Production

```bash
go build -o runnerx-server main.go
```

Then run:
```bash
./runnerx-server
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `DATABASE_URL` - SQLite database path (default: ./runnerx.db)
- `JWT_SECRET` - Secret key for JWT signing (REQUIRED in production)

## License

MIT

