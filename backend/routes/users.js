const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/users/profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.phone, u.bio,
        u.is_verified, u.created_at, u.last_login_at,
        COUNT(DISTINCT e.id) as enrollment_count,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_count
      FROM users u
      LEFT JOIN enrollments e ON e.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(req.user.id);

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().trim(),
  body('bio').optional().trim().isLength({ max: 500 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDB();
    const { firstName, lastName, phone, bio, avatarUrl } = req.body;

    db.prepare(`
      UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(firstName || null, lastName || null, phone || null, bio || null, avatarUrl || null, req.user.id);

    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/sessions - View active sessions
router.get('/sessions', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const sessions = db.prepare(`
      SELECT id, device_name, platform, ip_address, created_at, last_used_at, expires_at
      FROM user_sessions WHERE user_id = ? AND is_active = 1
      ORDER BY last_used_at DESC
    `).all(req.user.id);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/sessions/:id - Revoke a session
router.delete('/sessions/:id', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    db.prepare('UPDATE user_sessions SET is_active = 0 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/notifications
router.get('/notifications', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const notifications = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(req.user.id);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/notifications/read-all
router.put('/notifications/read-all', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
