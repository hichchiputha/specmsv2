const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'lms.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
    });
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'teacher', 'admin')),
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  phone TEXT,
  bio TEXT,
  device_id TEXT,
  device_platform TEXT,
  session_token TEXT,
  session_expires_at TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Teachers table (extended teacher profiles)
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  expertise TEXT,
  qualifications TEXT,
  years_experience INTEGER DEFAULT 0,
  rating REAL DEFAULT 0.0,
  total_students INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'lesson' CHECK(type IN ('lesson', 'seminar')),
  is_free INTEGER NOT NULL DEFAULT 0,
  price REAL DEFAULT 0.0,
  duration_minutes INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'beginner' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_published INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Videos table (YouTube video data, encrypted)
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  encrypted_video_id TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  quality_options TEXT DEFAULT '[]',
  captions_available INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PDFs table
CREATE TABLE IF NOT EXISTS pdfs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  external_url TEXT,
  file_type TEXT DEFAULT 'pdf',
  file_size INTEGER,
  is_downloadable INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'suspended', 'pending')),
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  expires_at TEXT,
  payment_status TEXT DEFAULT 'free' CHECK(payment_status IN ('free', 'paid', 'pending', 'refunded')),
  payment_amount REAL DEFAULT 0.0,
  UNIQUE(user_id, lesson_id)
);

-- Progress table
CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES videos(id) ON DELETE SET NULL,
  watched_seconds INTEGER DEFAULT 0,
  total_seconds INTEGER DEFAULT 0,
  percent_complete REAL DEFAULT 0.0,
  is_completed INTEGER DEFAULT 0,
  last_position INTEGER DEFAULT 0,
  last_watched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_id)
);

-- Sessions table (for device management)
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT,
  ip_address TEXT,
  user_agent TEXT,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'error')),
  is_read INTEGER DEFAULT 0,
  action_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK(type IN ('general', 'lesson', 'system')),
  target_role TEXT DEFAULT 'all',
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

-- App tokens (valid Electron app installations)
CREATE TABLE IF NOT EXISTS app_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category_id);
CREATE INDEX IF NOT EXISTS idx_lessons_type ON lessons(type);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_lesson ON enrollments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

async function initDB() {
  const database = getDB();
  
  // Run schema
  database.exec(SCHEMA);
  
  // Seed default app token
  const defaultToken = process.env.DEFAULT_APP_TOKEN || 'lms-electron-app-token-v1';
  const existingToken = database.prepare('SELECT id FROM app_tokens WHERE token = ?').get(defaultToken);
  if (!existingToken) {
    database.prepare(`
      INSERT INTO app_tokens (token, platform, description)
      VALUES (?, 'all', 'Default Electron App Token')
    `).run(defaultToken);
  }
  
  // Seed default admin
  const bcrypt = require('bcryptjs');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lms.local';
  const existingAdmin = database.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const adminId = require('crypto').randomBytes(16).toString('hex');
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
    database.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, is_verified)
      VALUES (?, ?, ?, 'System', 'Admin', 'admin', 1, 1)
    `).run(adminId, adminEmail, hash);
  }
  
  // Seed default categories
  const defaultCategories = [
    { name: 'Programming', icon: '💻', color: '#6366f1' },
    { name: 'Mathematics', icon: '🔢', color: '#f59e0b' },
    { name: 'Science', icon: '🔬', color: '#10b981' },
    { name: 'Language', icon: '📚', color: '#ec4899' },
    { name: 'Business', icon: '💼', color: '#3b82f6' },
    { name: 'Arts', icon: '🎨', color: '#8b5cf6' },
    { name: 'Health', icon: '🏥', color: '#ef4444' },
    { name: 'Technology', icon: '⚙️', color: '#14b8a6' },
  ];
  
  for (const cat of defaultCategories) {
    const exists = database.prepare('SELECT id FROM categories WHERE name = ?').get(cat.name);
    if (!exists) {
      database.prepare(`
        INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)
      `).run(cat.name, cat.icon, cat.color);
    }
  }
  
  return database;
}

module.exports = { getDB, initDB };
