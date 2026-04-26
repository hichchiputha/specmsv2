const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/database');
const { authenticateToken, requireAdmin, requireTeacher } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Multer: PDF uploads ────────────────────────────────────────────────────
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'pdfs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX files are allowed'));
  },
});

// ── Multer: Avatar uploads ─────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only image files (JPG, PNG, GIF, WEBP) allowed'));
  },
});

// All admin routes require authentication
router.use(authenticateToken);

// ── STATS ──────────────────────────────────────────────────────────────────
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    res.json({
      users: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "student"').get().count,
      teachers: db.prepare('SELECT COUNT(*) as count FROM teachers').get().count,
      lessons: db.prepare('SELECT COUNT(*) as count FROM lessons WHERE type = "lesson"').get().count,
      seminars: db.prepare('SELECT COUNT(*) as count FROM lessons WHERE type = "seminar"').get().count,
      enrollments: db.prepare('SELECT COUNT(*) as count FROM enrollments WHERE status = "active"').get().count,
      completions: db.prepare('SELECT COUNT(*) as count FROM enrollments WHERE status = "completed"').get().count,
      recentUsers: db.prepare(`
        SELECT id, email, first_name, last_name, created_at, is_active, is_verified
        FROM users WHERE role = 'student' ORDER BY created_at DESC LIMIT 5
      `).all(),
      recentLessons: db.prepare(`
        SELECT l.id, l.title, l.type, l.is_published, l.created_at,
          u.first_name || ' ' || u.last_name as teacher_name
        FROM lessons l
        LEFT JOIN teachers t ON t.id = l.teacher_id
        LEFT JOIN users u ON u.id = t.user_id
        ORDER BY l.created_at DESC LIMIT 5
      `).all(),
      popularLessons: db.prepare(`
        SELECT l.id, l.title, l.type, l.view_count,
          COUNT(e.id) as enrollment_count
        FROM lessons l
        LEFT JOIN enrollments e ON e.lesson_id = l.id
        WHERE l.is_published = 1
        GROUP BY l.id
        ORDER BY enrollment_count DESC LIMIT 5
      `).all(),
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── USER MANAGEMENT ────────────────────────────────────────────────────────
router.get('/users', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (role) { conditions.push('u.role = ?'); params.push(role); }
    if (isActive !== undefined && isActive !== '') {
      conditions.push('u.is_active = ?');
      params.push(isActive === 'true' ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const users = db.prepare(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.is_verified,
        u.phone, u.last_login_at, u.created_at, u.device_platform, u.avatar_url,
        COUNT(DISTINCT e.id) as enrollment_count
      FROM users u
      LEFT JOIN enrollments e ON e.user_id = u.id
      ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all([...params, parseInt(limit), offset]);

    const total = db.prepare(`SELECT COUNT(*) as count FROM users u ${where}`).get(params).count;

    res.json({
      users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    logger.error('Admin list users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('role').isIn(['student', 'teacher', 'admin']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDB();
    const { email, password, firstName, lastName, role, phone } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const hash = await bcrypt.hash(password, 12);
    const userId = crypto.randomBytes(16).toString('hex');

    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone, is_active, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(userId, email, hash, firstName, lastName, role, phone || null);

    // Auto-create teacher profile when role is teacher
    if (role === 'teacher') {
      const teacherId = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO teachers (id, user_id) VALUES (?, ?)').run(teacherId, userId);
    }

    logger.info(`Admin created user: ${email} (${role})`);
    res.status(201).json({ message: 'User created successfully', userId });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { firstName, lastName, email, phone, role, isActive, isVerified, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 12);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, id);
    }

    db.prepare(`
      UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        is_active = COALESCE(?, is_active),
        is_verified = COALESCE(?, is_verified),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      firstName || null, lastName || null, email || null, phone || null, role || null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      isVerified !== undefined ? (isVerified ? 1 : 0) : null,
      id
    );

    // If role changed to teacher, ensure teacher profile exists
    if (role === 'teacher') {
      const existing = db.prepare('SELECT id FROM teachers WHERE user_id = ?').get(id);
      if (!existing) {
        const teacherId = crypto.randomBytes(16).toString('hex');
        db.prepare('INSERT INTO teachers (id, user_id) VALUES (?, ?)').run(teacherId, id);
      }
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    // Soft delete — deactivate instead of remove
	db.prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id/enrollments', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const enrollments = db.prepare(`
      SELECT e.*, l.title as lesson_title, l.type, l.is_free,
        COALESCE(p.percent_complete, 0) as progress
      FROM enrollments e
      JOIN lessons l ON l.id = e.lesson_id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = e.user_id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `).all(req.params.id);
    res.json({ enrollments });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── TEACHER MANAGEMENT ─────────────────────────────────────────────────────
router.get('/teachers', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const teachers = db.prepare(`
      SELECT t.id, t.expertise, t.qualifications, t.years_experience, t.rating, t.is_featured, t.total_students,
        u.id as user_id, u.email, u.first_name, u.last_name, u.avatar_url, u.is_active, u.created_at,
        COUNT(DISTINCT l.id) as lesson_count
      FROM teachers t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN lessons l ON l.teacher_id = t.id
      GROUP BY t.id
      ORDER BY u.first_name ASC
    `).all();
    res.json({ teachers });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/teachers/:id', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const { expertise, qualifications, yearsExperience, isFeatured } = req.body;
    db.prepare(`
      UPDATE teachers SET
        expertise = COALESCE(?, expertise),
        qualifications = COALESCE(?, qualifications),
        years_experience = COALESCE(?, years_experience),
        is_featured = COALESCE(?, is_featured)
      WHERE id = ?
    `).run(
      expertise !== undefined ? expertise : null,
      qualifications !== undefined ? qualifications : null,
      yearsExperience !== undefined ? parseInt(yearsExperience) || null : null,
      isFeatured !== undefined ? (isFeatured ? 1 : 0) : null,
      req.params.id
    );
    res.json({ message: 'Teacher updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/teachers/:id/avatar — Upload teacher profile picture
router.post('/teachers/:id/avatar', requireAdmin, uploadAvatar.single('avatar'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const db = getDB();
    const teacher = db.prepare('SELECT user_id FROM teachers WHERE id = ?').get(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update the user's avatar_url
    db.prepare("UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?")
      .run(avatarUrl, teacher.user_id);

    logger.info(`Avatar uploaded for teacher ${req.params.id}: ${avatarUrl}`);
    res.json({ avatarUrl, message: 'Avatar uploaded successfully' });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// PUT /api/admin/teachers/:id/avatar-url — Set avatar from external URL
router.put('/teachers/:id/avatar-url', requireAdmin, (req, res) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: 'avatarUrl is required' });

    const db = getDB();
    const teacher = db.prepare('SELECT user_id FROM teachers WHERE id = ?').get(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    db.prepare("UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?")
      .run(avatarUrl, teacher.user_id);

    res.json({ message: 'Avatar URL updated', avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PDF UPLOAD ─────────────────────────────────────────────────────────────
router.post('/upload-pdf', requireTeacher, uploadPdf.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/pdfs/${req.file.filename}`;
    res.json({ fileUrl, filename: req.file.originalname, size: req.file.size });
  } catch (error) {
    logger.error('PDF upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
router.post('/announcements', requireAdmin, [
  body('title').trim().notEmpty(),
  body('content').trim().notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const db = getDB();
    const { title, content, type, targetRole, expiresAt } = req.body;
    const id = crypto.randomBytes(16).toString('hex');
    db.prepare(`
      INSERT INTO announcements (id, title, content, type, target_role, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, content, type || 'general', targetRole || 'all', req.user.id, expiresAt || null);
    res.status(201).json({ message: 'Announcement created', id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/announcements', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const announcements = db.prepare(`
      SELECT a.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM announcements a LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.created_at DESC
    `).all();
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/announcements/:id', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    db.prepare('UPDATE announcements SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Announcement removed' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── APP TOKENS ─────────────────────────────────────────────────────────────
router.get('/app-tokens', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const tokens = db.prepare('SELECT id, token, platform, description, is_active, created_at FROM app_tokens ORDER BY created_at DESC').all();
    res.json({ tokens });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/app-tokens', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const { platform, description } = req.body;
    const token = `lms-${crypto.randomBytes(24).toString('hex')}`;
    const id = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO app_tokens (id, token, platform, description) VALUES (?, ?, ?, ?)').run(id, token, platform || 'all', description || 'Generated token');
    res.status(201).json({ token, id, message: 'Token created' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/app-tokens/:id/toggle', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    db.prepare('UPDATE app_tokens SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
    res.json({ message: 'Token toggled' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── ENROLLMENTS MANAGEMENT ─────────────────────────────────────────────────
router.get('/enrollments', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const { lessonId, userId, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (lessonId) { conditions.push('e.lesson_id = ?'); params.push(lessonId); }
    if (userId) { conditions.push('e.user_id = ?'); params.push(userId); }
    if (status) { conditions.push('e.status = ?'); params.push(status); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const enrollments = db.prepare(`
      SELECT e.*,
        u.email, u.first_name || ' ' || u.last_name as user_name,
        l.title as lesson_title, l.type, l.is_free, l.price,
        COALESCE(p.percent_complete, 0) as progress
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN lessons l ON l.id = e.lesson_id
      LEFT JOIN progress p ON p.lesson_id = e.lesson_id AND p.user_id = e.user_id
      ${where}
      ORDER BY e.enrolled_at DESC
      LIMIT ? OFFSET ?
    `).all([...params, parseInt(limit), offset]);

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM enrollments e ${where}`).get(params);
    const total = countRow?.count || 0;

    res.json({ enrollments, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    logger.error('Admin enrollments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/enrollments/:id', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const { status, paymentStatus } = req.body;
    db.prepare(`
      UPDATE enrollments SET
        status = COALESCE(?, status),
        payment_status = COALESCE(?, payment_status)
      WHERE id = ?
    `).run(status || null, paymentStatus || null, req.params.id);
    res.json({ message: 'Enrollment updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CATEGORIES ─────────────────────────────────────────────────────────────
router.get('/categories', (req, res) => {
  // Public to all authenticated users (teachers need it for lesson creation)
  try {
    const db = getDB();
    const categories = db.prepare(`
      SELECT c.*, COUNT(l.id) as lesson_count
      FROM categories c
      LEFT JOIN lessons l ON l.category_id = c.id
      GROUP BY c.id ORDER BY c.name
    `).all();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const { name, description, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO categories (id, name, description, icon, color) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, description || '', icon || '📂', color || '#6366f1');
    res.status(201).json({ message: 'Category created', id });
  } catch (error) {
    if (error.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Category already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/categories/:id', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
