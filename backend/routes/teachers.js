// teachers.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const teachers = db.prepare(`
      SELECT t.id, t.expertise, t.rating, t.years_experience, t.is_featured, t.total_students,
        u.first_name, u.last_name, u.avatar_url, u.bio,
        COUNT(l.id) as lesson_count
      FROM teachers t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN lessons l ON l.teacher_id = t.id AND l.is_published = 1
      WHERE u.is_active = 1
      GROUP BY t.id
      ORDER BY t.is_featured DESC, t.rating DESC
    `).all();
    res.json({ teachers });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/lessons', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const lessons = db.prepare(`
      SELECT l.id, l.title, l.thumbnail_url, l.type, l.is_free, l.difficulty, l.duration_minutes, l.view_count
      FROM lessons l
      WHERE l.teacher_id = ? AND l.is_published = 1
      ORDER BY l.created_at DESC
    `).all(req.params.id);
    res.json({ lessons });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
