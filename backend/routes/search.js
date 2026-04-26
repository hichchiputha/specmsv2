const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/search?q=term&type=lesson|seminar&limit=20
router.get('/', authenticateToken, (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [], query: q || '' });
    }

    const db = getDB();
    const userId = req.user.id;
    const searchTerm = `%${q.trim()}%`;
    const safeLimit = Math.min(parseInt(limit) || 20, 50);

    const conditions = [
      "l.is_published = 1",
      "(l.title LIKE ? OR l.description LIKE ? OR l.tags LIKE ?)",
    ];
    const params = [userId, userId, searchTerm, searchTerm, searchTerm];

    if (type && ['lesson', 'seminar'].includes(type)) {
      conditions.push('l.type = ?');
      params.push(type);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const results = db.prepare(`
      SELECT
        l.id, l.title, l.description, l.thumbnail_url, l.type,
        l.is_free, l.difficulty, l.duration_minutes, l.view_count,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        u.first_name || ' ' || u.last_name as teacher_name,
        (SELECT percent_complete FROM progress p WHERE p.lesson_id = l.id AND p.user_id = ?) as my_progress,
        (SELECT COUNT(*) FROM enrollments e WHERE e.lesson_id = l.id AND e.user_id = ? AND e.status = 'active') as is_enrolled
      FROM lessons l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      ${where}
      ORDER BY l.view_count DESC, l.created_at DESC
      LIMIT ?
    `).all(...params, safeLimit);

    res.json({
      results: results.map(r => ({
        ...r,
        isEnrolled: (r.is_enrolled || 0) > 0,
        myProgress: r.my_progress || 0,
      })),
      query: q.trim(),
      total: results.length,
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', detail: error.message });
  }
});

module.exports = router;
