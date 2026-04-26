const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

// Seminars are lessons with type='seminar'
// Reuse lessons route logic but filter by type
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, search, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["l.type = 'seminar'", "l.is_published = 1"];
    const params = [];

    if (search) {
      conditions.push('(l.title LIKE ? OR l.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      conditions.push('l.category_id = ?');
      params.push(category);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const seminars = db.prepare(`
      SELECT l.id, l.title, l.description, l.thumbnail_url, l.is_free, l.price,
        l.duration_minutes, l.difficulty, l.view_count, l.created_at,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        u.first_name || ' ' || u.last_name as teacher_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.lesson_id = l.id AND e.status = 'active') as enrollment_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.lesson_id = l.id AND e.user_id = '${req.user.id}') as is_enrolled
      FROM lessons l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).all([...params, parseInt(limit), offset]);

    const total = db.prepare(`SELECT COUNT(*) as count FROM lessons l ${where}`).get(params).count;

    res.json({
      seminars: seminars.map(s => ({ ...s, isEnrolled: s.is_enrolled > 0 })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
