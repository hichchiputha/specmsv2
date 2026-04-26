# 🎓 LMS Academy — Full-Stack Learning Management System

A secure, production-ready LMS with an **Electron desktop app**, **Node.js backend**, and **web admin panel**. YouTube videos are served encrypted and only playable inside the Electron app by verified, enrolled users.

---

## 📁 Project Structure

```
lms-project/
│
├── backend/                          # Node.js + Express API server
│   ├── middleware/
│   │   ├── auth.js                   # JWT authentication & role guards
│   │   └── validateClient.js         # Electron app token validation
│   ├── models/
│   │   └── database.js               # SQLite schema, init, seed
│   ├── routes/
│   │   ├── admin.js                  # Admin: users, teachers, PDFs, tokens, categories
│   │   ├── auth.js                   # Login, register, logout, /me, change-password
│   │   ├── dashboard.js              # Student dashboard feed
│   │   ├── enrollments.js            # Enroll, unenroll, admin-enroll
│   │   ├── lessons.js                # CRUD lessons + PDFs
│   │   ├── progress.js               # Video progress tracking
│   │   ├── search.js                 # Full-text lesson search
│   │   ├── seminars.js               # Seminars (type=seminar lessons)
│   │   ├── teachers.js               # Teacher profiles
│   │   ├── users.js                  # Profile, sessions, notifications
│   │   └── video.js                  # Encrypted video token delivery
│   ├── utils/
│   │   └── logger.js                 # Winston logger
│   ├── .env.example                  # Environment variables template
│   ├── package.json
│   └── server.js                     # Express app entry point
│
├── electron-app/                     # Desktop application (Electron)
│   ├── src/
│   │   ├── main/
│   │   │   └── main.js               # Main process: security, crypto, IPC, updater
│   │   ├── preload/
│   │   │   └── preload.js            # Secure context bridge (exposes electron API)
│   │   └── renderer/                 # React frontend (CRA)
│   │       ├── public/
│   │       │   └── index.html
│   │       ├── src/
│   │       │   ├── components/
│   │       │   │   ├── layout/
│   │       │   │   │   ├── AppLayout.jsx       # Student sidebar + topbar
│   │       │   │   │   └── AdminLayout.jsx     # Admin sidebar
│   │       │   │   ├── AdminRoute.jsx          # Role guard (admin/teacher)
│   │       │   │   ├── LessonCard.jsx          # Reusable lesson card
│   │       │   │   ├── ProtectedRoute.jsx      # Auth guard
│   │       │   │   └── UpdateBanner.jsx        # Auto-update notification
│   │       │   ├── pages/
│   │       │   │   ├── admin/
│   │       │   │   │   ├── AdminDashboard.jsx  # Stats, quick actions
│   │       │   │   │   ├── AdminEnrollments.jsx# Manage all enrollments
│   │       │   │   │   ├── AdminLessons.jsx    # Create/edit lessons, add video/PDFs
│   │       │   │   │   ├── AdminSettings.jsx   # Announcements, tokens, categories
│   │       │   │   │   ├── AdminTeachers.jsx   # Teacher profiles
│   │       │   │   │   └── AdminUsers.jsx      # User CRUD, enroll users
│   │       │   │   ├── DashboardPage.jsx       # Student home: new, featured, stats
│   │       │   │   ├── LessonDetailPage.jsx    # Lesson info, enroll, PDFs
│   │       │   │   ├── LessonsPage.jsx         # Browse lessons with filters
│   │       │   │   ├── LoginPage.jsx           # Login (Electron only)
│   │       │   │   ├── MyLearningPage.jsx      # Enrolled lessons + progress
│   │       │   │   ├── ProfilePage.jsx         # Profile, password, sessions
│   │       │   │   ├── RegisterPage.jsx        # Student self-registration
│   │       │   │   ├── SearchPage.jsx          # Real-time search
│   │       │   │   ├── SeminarsPage.jsx        # Browse seminars
│   │       │   │   ├── TeachersPage.jsx        # Teacher directory
│   │       │   │   └── VideoPlayerPage.jsx     # Custom player (no YT controls)
│   │       │   ├── store/
│   │       │   │   └── authStore.js            # Zustand auth state (persisted)
│   │       │   ├── styles/
│   │       │   │   └── global.css              # Dark luxury design system
│   │       │   ├── utils/
│   │       │   │   └── api.js                  # Axios + app token injection
│   │       │   ├── App.jsx                     # Router, security guards
│   │       │   └── index.js                    # React entry point
│   │       └── package.json
│   └── package.json                  # Electron build config
│
└── website/                          # Vite + React admin web panel
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx            # Admin sidebar + outlet
    │   │   └── ProtectedRoute.jsx    # Auth guard
    │   ├── pages/
    │   │   ├── BlockedPage.jsx       # Shown to normal browser visitors
    │   │   ├── DashboardPage.jsx     # Platform stats overview
    │   │   ├── EnrollmentsPage.jsx   # All enrollments management
    │   │   ├── LessonsPage.jsx       # Lesson/seminar CRUD
    │   │   ├── LoginPage.jsx         # Admin login
    │   │   ├── SettingsPage.jsx      # Announcements, tokens, categories
    │   │   ├── TeachersPage.jsx      # Teacher management
    │   │   └── UsersPage.jsx         # User management
    │   ├── store/
    │   │   └── authStore.js          # Zustand auth (admin only)
    │   ├── styles/
    │   │   └── global.css            # Shared dark design tokens
    │   ├── utils/
    │   │   └── api.js                # Axios with admin headers
    │   ├── App.jsx                   # Browser block guard + router
    │   └── main.jsx                  # Vite entry
    ├── .env.example
    ├── package.json
    └── vite.config.js
```

---

## 🔐 Security Architecture

| Layer | Mechanism |
|---|---|
| **API access** | `X-App-Token` header — only Electron builds with the token can call the API |
| **Authentication** | JWT (7-day sessions) stored in SQLite, validated per-request |
| **Video delivery** | YouTube video IDs AES-256-CBC encrypted at rest; decrypted only in Electron main process |
| **Device binding** | Hardware `deviceId` generated per install, stored with session |
| **Screen protection** | `setContentProtection(true)` — blocks screenshots & screen recording |
| **DevTools** | Blocked in production via keyboard intercept + `devtools-opened` event |
| **Right-click** | Disabled via `context-menu` event in main + renderer |
| **Browser block** | Website detects non-Electron, non-localhost and shows BlockedPage |
| **Content Security Policy** | Strict CSP set via `webRequest.onHeadersReceived` |
| **Session revocation** | All sessions stored in DB; server-side invalidation works instantly |

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** 18+
- **npm** 7+

---

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your secrets!
npm start
```

**First run auto-seeds:**
- Default admin: `admin@lms.local` / `Admin@123456`
- Default app token: `lms-electron-app-token-v1`
- Default categories (8)

---

### 2. Electron App

```bash
cd electron-app
npm install

# Install renderer dependencies
cd src/renderer
npm install
cd ../../..

# Run in development (starts both React dev server + Electron)
npm start

# Build distributable
npm run build
npm run dist
```

The Electron app reads environment from `.env` in the electron-app root:

```env
NODE_ENV=development
API_URL=http://localhost:3001
APP_TOKEN=lms-electron-app-token-v1
VIDEO_ENCRYPTION_KEY=lms-video-encryption-key-32bytes!
VIDEO_MASTER_KEY=lms-master-video-key-32bytessss!
```

---

### 3. Website (Admin Panel)

```bash
cd website
npm install
cp .env.example .env
npm run dev     # dev server on :5173
npm run build   # production build
```

**Important:** In production, serve the website behind a reverse proxy (nginx) with:
- IP allowlist (office/admin IPs only)
- HTTPS with strong TLS
- `X-Frame-Options: DENY`

---

## 🔑 Environment Variables

### Backend `.env`

| Variable | Description |
|---|---|
| `PORT` | API port (default: 3001) |
| `DB_PATH` | SQLite database path |
| `JWT_SECRET` | Secret for signing JWTs (use 64+ random chars) |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |
| `VIDEO_ENCRYPTION_KEY` | 32-char key for video ID encryption |
| `VIDEO_MASTER_KEY` | 32-char master key for lesson content |
| `DEFAULT_APP_TOKEN` | Token embedded in Electron builds |
| `ADMIN_API_KEY` | Web admin panel bypass key |
| `ADMIN_ORIGIN` | CORS origin for web admin panel |

---

## 📹 How Video Security Works

```
Admin adds YouTube URL (unlisted)
         ↓
Backend encrypts video ID with AES-256-CBC
         ↓
Stored in DB as: encrypted_video_id + encryption_iv
         ↓
Student clicks "Watch"
         ↓
Electron calls GET /api/video/lesson-token/:lessonId
  → Backend verifies enrollment
  → Returns double-encrypted payload
         ↓
Electron main process decrypts with native crypto
  (preload context bridge, never touches renderer)
         ↓
Decrypted YouTube ID used in iframe (youtube-nocookie.com)
  → Custom controls overlay (no YouTube UI)
  → Interceptor injects auth headers
  → setContentProtection blocks screen recording
```

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| `student` | Browse, enroll (free), watch, track progress |
| `teacher` | All student perms + create/edit own lessons, add videos/PDFs |
| `admin` | Full access: all users, all lessons, enrollments, tokens, announcements |

---

## 🎬 Adding a Lesson (Admin Flow)

1. Go to **Admin → Lessons → New**
2. Fill title, type (lesson/seminar), category, teacher, difficulty
3. Set **Free** or **Paid** (paid users see "Contact admin" message)
4. **Publish** the lesson
5. Switch to **Video tab** → paste YouTube URL (must be unlisted)
6. Switch to **PDFs tab** → upload or link PDFs/documents
7. Students can now enroll and watch!

---

## 📡 API Endpoints Summary

### Auth
- `POST /api/auth/login` — Login (requires device info)
- `POST /api/auth/register` — Student self-registration
- `POST /api/auth/logout` — Invalidate session
- `GET /api/auth/me` — Current user info
- `PUT /api/auth/change-password`

### Lessons
- `GET /api/lessons` — List with filters (type, category, difficulty, free, search)
- `GET /api/lessons/:id` — Lesson detail + PDFs + enrollment status
- `POST /api/lessons` — Create (teacher+)
- `PUT /api/lessons/:id` — Update (teacher+)
- `DELETE /api/lessons/:id` — Delete (admin)
- `POST /api/lessons/:id/pdfs` — Add PDF
- `DELETE /api/lessons/:id/pdfs/:pdfId`

### Video
- `GET /api/video/lesson-token/:lessonId` — Get encrypted video token
- `POST /api/video` — Link YouTube video (teacher+)
- `POST /api/video/verify-playback` — Verify playback session

### Enrollments
- `GET /api/enrollments` — My enrollments
- `POST /api/enrollments` — Enroll in free lesson
- `POST /api/enrollments/admin-enroll` — Admin enroll any user (admin)
- `DELETE /api/enrollments/:lessonId`

### Progress
- `GET /api/progress` — My progress
- `GET /api/progress/:lessonId`
- `PUT /api/progress/:lessonId` — Update watch position

### Dashboard
- `GET /api/dashboard` — New lessons, featured, enrolled, stats, announcements

### Search
- `GET /api/search?q=term` — Full-text lesson search

### Admin
- `GET /api/admin/stats`
- `GET/POST/PUT/DELETE /api/admin/users`
- `GET/PUT /api/admin/teachers`
- `GET/POST/PUT/DELETE /api/admin/enrollments`
- `GET/POST/DELETE /api/admin/announcements`
- `GET/POST /api/admin/categories`
- `GET/POST /api/admin/app-tokens`
- `POST /api/admin/upload-pdf`

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Desktop App | Electron 29, React 18 (CRA), Zustand, TanStack Query |
| Web Admin | Vite 5, React 18, Zustand, TanStack Query |
| Backend | Node.js, Express 4, better-sqlite3 |
| Database | SQLite (via better-sqlite3, WAL mode) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Video | YouTube IFrame API (nocookie), AES-256-CBC |
| Animations | Framer Motion |
| Styling | Pure CSS custom properties (no Tailwind) |
| Validation | express-validator |
| Logging | Winston |
| Updates | electron-updater |

---

## 🏗️ Production Deployment

### Backend
```bash
# Use PM2 for process management
npm install -g pm2
cd backend
NODE_ENV=production pm2 start server.js --name lms-api
pm2 save
```

### Nginx config (example)
```nginx
server {
    listen 443 ssl;
    server_name api.yourschool.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
```

### Electron Build
```bash
cd electron-app
# Set production API URL in .env
echo "API_URL=https://api.yourschool.com" >> .env
npm run dist
# Output: dist/LMS Academy Setup.exe (Windows)
#         dist/LMS Academy.dmg (macOS)
#         dist/LMS Academy.AppImage (Linux)
```

---

## 📝 License

MIT — Built for educational institutions.
