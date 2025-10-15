# RunnerX 🚀

A modern, self-hosted monitoring tool inspired by Uptime Kuma. Built with React, Go, Gin, and GORM.

![RunnerX](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎨 Modern UI/UX
- **Beautiful Dashboard** - Clean, professional interface with solid colors
- **Dark Mode** - Full dark mode support with smooth transitions
- **Waterlike Animations** - Real-time "waterlike" effects on monitor cards using Framer Motion
- **Mobile Responsive** - Fully optimized for all screen sizes
- **Real-time Updates** - Live status updates every 5 seconds

### 🔐 Security & Authentication
- **JWT Authentication** - Secure token-based authentication
- **Single User Role** - Simplified user management with full privileges
- **Auto-lock Screen** - Automatic locking after 30 minutes of inactivity
- **Rate Limiting** - Protection against abuse (100 req/min per IP)
- **Password Hashing** - bcrypt encryption for passwords

### 📊 Monitoring Features
- **Multiple Monitor Types** - HTTP, Ping, TCP support
- **Customizable Intervals** - From 30 seconds to 1 hour
- **Status Tracking** - Real-time status (Online, Offline, Paused, Pending)
- **Uptime Statistics** - Track uptime percentage and latency
- **Historical Data** - View check history and trends
- **Modern Charts** - Beautiful visualizations with Chart.js
- **Tags & Filters** - Organize monitors with tags and filter by status

### 🛠️ Technology Stack

**Frontend:**
- React 19
- Tailwind CSS (with dark mode)
- Framer Motion (animations)
- TanStack Query (data fetching)
- Lucide Icons
- React Toastify (notifications)
- Chart.js (visualizations)
- React Router (routing)
- Axios (HTTP client)

**Backend:**
- Go 1.21+
- Gin (web framework)
- GORM (ORM)
- SQLite (database)
- JWT (authentication)
- bcrypt (password hashing)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Go 1.21+
- SQLite3

### Installation

#### 1. Clone the repository

```bash
cd runnerx
```

#### 2. Setup Frontend

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The frontend will run on `http://localhost:3000`

#### 3. Setup Backend

```bash
cd backend

# Download Go dependencies
go mod download

# Create .env file
cat > .env << EOF
PORT=8080
DATABASE_URL=./runnerx.db
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Run the server
go run main.go
```

The backend will run on `http://localhost:8080`

### 🔧 Environment Variables

**Backend (.env):**
```env
PORT=8080
DATABASE_URL=./runnerx.db
JWT_SECRET=your-secret-key-change-in-production
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:8080/api
```

## 📱 Usage

### 1. Register/Login
- Open `http://localhost:3000`
- Register a new account or login
- You'll be redirected to the dashboard

### 2. Add Monitors
- Click "Add Monitor" button
- Fill in monitor details:
  - Name
  - Type (HTTP, Ping, TCP)
  - Endpoint/URL
  - Check interval
  - Optional: HTTP method, headers, tags
- Click "Create Monitor"

### 3. Monitor Dashboard
- View all monitors in a beautiful grid layout
- Filter by status (All, Online, Offline, Paused, Pending)
- Real-time status updates with waterlike animations
- View uptime percentage and latency
- Mini sparkline charts for quick trends

### 4. Manage Monitors
- Click on menu (⋮) for options:
  - Pause/Resume monitoring
  - Edit monitor settings
  - Delete monitor

### 5. Security Features
- Auto-lock after 30 minutes of inactivity
- Manual lock from user menu
- Dark mode toggle in header

## 🏗️ Project Structure

```
runnerx/
├── backend/
│   ├── config/           # Configuration
│   ├── controllers/      # API controllers
│   ├── database/         # Database setup
│   ├── middleware/       # Auth & rate limiting
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Background monitoring
│   ├── go.mod           # Go dependencies
│   ├── main.go          # Entry point
│   └── README.md
│
├── src/
│   ├── components/
│   │   ├── auth/        # Login, Register, LockScreen
│   │   ├── common/      # ProtectedRoute
│   │   └── dashboard/   # Dashboard components
│   ├── contexts/        # Auth & Theme contexts
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API service layer
│   ├── utils/           # Constants & formatters
│   ├── App.js           # Main app component
│   └── index.js         # Entry point
│
├── public/              # Static assets
├── package.json         # Frontend dependencies
├── tailwind.config.js   # Tailwind configuration
└── README.md           # This file
```

## 🎨 Color Palette

**Light Mode:**
- Primary: Blue (#0ea5e9)
- Success: Green (#22c55e)
- Danger: Red (#ef4444)
- Warning: Amber (#f59e0b)
- Neutral: Gray (#737373)

**Dark Mode:**
- Background: Near black (#0a0a0a)
- Surface: Dark gray (#262626)
- Text: White (#ffffff)
- All status colors are adjusted for dark mode

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Monitors (Protected)
- `GET /api/monitors` - List all monitors
- `GET /api/monitor/:id` - Get monitor details
- `POST /api/monitor` - Create monitor
- `PUT /api/monitor/:id` - Update monitor
- `DELETE /api/monitor/:id` - Delete monitor
- `PATCH /api/monitor/:id/toggle` - Toggle enabled
- `GET /api/monitor/:id/stats` - Get statistics
- `GET /api/monitor/:id/history` - Get check history

### Health
- `GET /health` - Health check

## 🔒 Security Features

1. **JWT Authentication** - Secure token-based auth with 7-day expiry
2. **Password Hashing** - bcrypt with salt rounds
3. **Rate Limiting** - 100 requests/minute per IP
4. **Input Validation** - Server-side validation on all inputs
5. **CORS Protection** - Configured CORS policies
6. **Auto-lock** - Inactivity detection and screen locking
7. **Secure Defaults** - No sensitive data in localStorage

## 🚀 Production Deployment

### Frontend Build

```bash
npm run build
```

Serves the `build/` directory with your preferred web server.

### Backend Build

```bash
cd backend
go build -o runnerx-server main.go
```

Run the binary:
```bash
./runnerx-server
```

### Docker (Optional)

Create `Dockerfile` for containerized deployment:
```dockerfile
# Frontend
FROM node:18 AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Backend
FROM golang:1.21 AS backend
WORKDIR /app
COPY backend/ .
RUN go build -o runnerx-server main.go

# Production
FROM debian:bullseye-slim
WORKDIR /app
COPY --from=backend /app/runnerx-server .
COPY --from=frontend /app/build ./public
EXPOSE 8080
CMD ["./runnerx-server"]
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by [Uptime Kuma](https://github.com/louislam/uptime-kuma)
- Built with modern web technologies
- Designed for self-hosting and privacy

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ for the self-hosting community**
