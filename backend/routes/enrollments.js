// enrollments.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../models/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/enrollments - Get user's enrollments
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const enrollments = db.prepare(`
      SELECT 
        e.id, e.status, e.enrolled_at, e.completed_at, e.payment_status,
        l.id as lesson_id, l.title, l.description, l.thumbnail_url, l.type,
        l.is_free, l.duration_minutes, l.difficulty,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        u.first_name || ' ' || u.last_name as teacher_name,
        COALESCE(p.percent_complete, 0) as progress,
        p.last_watched_at, p.last_position
      FROM enrollments e
      JOIN lessons l ON l.id = e.lesson_id
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = e.user_id
      WHERE e.user_id = ? AND e.status != 'suspended'
      ORDER BY e.enrolled_at DESC
    `).all(req.user.id);

    res.json({ enrollments });
  } catch (error) {
    logger.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/enrollments - Enroll in a lesson (free only)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId required' });

    const db = getDB();

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND is_published = 1').get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    if (!lesson.is_free) {
      return res.status(402).json({
        error: 'This is a paid lesson. Please contact admin for enrollment.',
        code: 'PAID_LESSON',
        contactMessage: 'Please contact your administrator to enroll in this paid lesson.'
      });
    }

    const existing = db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lessonId);
    if (existing) {
      if (existing.status === 'active') return res.status(409).json({ error: 'Already enrolled' });
      // Reactivate
      db.prepare("UPDATE enrollments SET status = 'active', enrolled_at = datetime('now') WHERE id = ?").run(existing.id);
      return res.json({ message: 'Re-enrolled successfully' });
    }

    const enrollId = crypto.randomBytes(16).toString('hex');
    db.prepare(`
      INSERT INTO enrollments (id, user_id, lesson_id, status, payment_status)
      VALUES (?, ?, ?, 'active', 'free')
    `).run(enrollId, req.user.id, lessonId);

    logger.info(`User ${req.user.id} enrolled in lesson ${lessonId}`);
    res.status(201).json({ message: 'Enrolled successfully', enrollmentId: enrollId });
  } catch (error) {
    logger.error('Enroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/enrollments/admin-enroll (Admin: Enroll user in paid lesson)
router.post('/admin-enroll', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId, lessonId, paymentStatus, paymentAmount } = req.body;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId);
    if (existing) {
      db.prepare('UPDATE enrollments SET status = "active", payment_status = ?, payment_amount = ? WHERE id = ?')
        .run(paymentStatus || 'paid', paymentAmount || 0, existing.id);
      return res.json({ message: 'Enrollment updated' });
    }

    const enrollId = crypto.randomBytes(16).toString('hex');
    db.prepare(`
      INSERT INTO enrollments (id, user_id, lesson_id, status, payment_status, payment_amount)
      VALUES (?, ?, ?, 'active', ?, ?)
    `).run(enrollId, userId, lessonId, paymentStatus || 'paid', paymentAmount || 0);

    res.status(201).json({ message: 'User enrolled successfully' });
  } catch (error) {
    logger.error('Admin enroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/enrollments/:lessonId - Unenroll
router.delete('/:lessonId', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    db.prepare(`
      UPDATE enrollments SET status = 'suspended' WHERE user_id = ? AND lesson_id = ?
    `).run(req.user.id, req.params.lessonId);
    res.json({ message: 'Unenrolled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
