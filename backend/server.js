require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const { initDB } = require('./models/database');

const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const lessonRoutes     = require('./routes/lessons');
const seminarRoutes    = require('./routes/seminars');
const teacherRoutes    = require('./routes/teachers');
const enrollmentRoutes = require('./routes/enrollments');
const progressRoutes   = require('./routes/progress');
const adminRoutes      = require('./routes/admin');
const videoRoutes      = require('./routes/video');
const searchRoutes     = require('./routes/search');
const dashboardRoutes  = require('./routes/dashboard');
const validateClient   = require('./middleware/validateClient');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // CSP handled by Electron; too restrictive for API
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'app://.',
  'http://localhost:3000',  // Electron renderer dev
  'http://localhost:5173',  // Website dev
  process.env.ADMIN_ORIGIN || 'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow Electron (no origin) or explicitly allowed origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.replace('/*', '')))) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization',
    'X-Client-ID', 'X-Platform', 'X-App-Token', 'X-Admin-Key',
    'x-client-id', 'x-platform', 'x-app-token', 'x-admin-key',
  ],
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts, please try again later.' },
});

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files (uploaded PDFs and avatars) ─────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.set('X-Content-Type-Options', 'nosniff');
    // Allow images and PDFs to be rendered inline
    if (filePath.endsWith('.pdf')) {
      res.set('Content-Disposition', 'inline');
    }
  },
}));

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
// Auth: client validation applied BUT login/register allowed (client validates x-app-token OR x-admin-key)
app.use('/api/auth',        authLimiter, validateClient, authRoutes);
app.use('/api/users',       validateClient, userRoutes);
app.use('/api/lessons',     validateClient, lessonRoutes);
app.use('/api/seminars',    validateClient, seminarRoutes);
app.use('/api/teachers',    validateClient, teacherRoutes);
app.use('/api/enrollments', validateClient, enrollmentRoutes);
app.use('/api/progress',    validateClient, progressRoutes);
app.use('/api/admin',       validateClient, adminRoutes);
app.use('/api/video',       validateClient, videoRoutes);
app.use('/api/search',      validateClient, searchRoutes);
app.use('/api/dashboard',   validateClient, dashboardRoutes);

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Access denied' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    logger.info('✅ Database initialized');
    app.listen(PORT, () => {
      logger.info(`🚀 LMS Backend running on http://localhost:${PORT}`);
      logger.info(`   Admin login: ${process.env.ADMIN_EMAIL || 'admin@lms.local'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
