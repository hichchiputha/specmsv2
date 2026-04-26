const express = require('express');
const router = express.Router();
const { getDB } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;

    // New lessons (last 14 days)
    const newLessons = db.prepare(`
      SELECT l.id, l.title, l.thumbnail_url, l.type, l.is_free, l.difficulty, l.created_at,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        u.first_name || ' ' || u.last_name as teacher_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.lesson_id = l.id AND e.user_id = ?) as is_enrolled
      FROM lessons l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE l.is_published = 1 AND l.created_at >= datetime('now', '-14 days')
      ORDER BY l.created_at DESC
      LIMIT 8
    `).all(userId);

    // Featured lessons
    const featured = db.prepare(`
      SELECT l.id, l.title, l.thumbnail_url, l.type, l.is_free, l.is_featured, l.difficulty,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        u.first_name || ' ' || u.last_name as teacher_name,
        (SELECT COUNT(*) FROM enrollments e2 WHERE e2.lesson_id = l.id AND e2.status = 'active') as enrollment_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.lesson_id = l.id AND e.user_id = ?) as is_enrolled
      FROM lessons l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE l.is_published = 1 AND l.is_featured = 1
      ORDER BY l.view_count DESC
      LIMIT 6
    `).all(userId);

    // Enrolled lessons with progress
    const enrolledLessons = db.prepare(`
      SELECT l.id, l.title, l.thumbnail_url, l.type, l.is_free, l.duration_minutes,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        u.first_name || ' ' || u.last_name as teacher_name,
        COALESCE(p.percent_complete, 0) as progress,
        p.last_watched_at,
        e.status as enrollment_status, e.enrolled_at
      FROM enrollments e
      JOIN lessons l ON l.id = e.lesson_id
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = e.user_id
      WHERE e.user_id = ? AND e.status IN ('active', 'completed')
      ORDER BY COALESCE(p.last_watched_at, e.enrolled_at) DESC
      LIMIT 10
    `).all(userId);

    // Continue watching (in-progress lessons)
    const continueWatching = db.prepare(`
      SELECT l.id, l.title, l.thumbnail_url, l.type, l.duration_minutes,
        c.name as category_name, c.icon as category_icon,
        p.percent_complete, p.last_position, p.last_watched_at
      FROM progress p
      JOIN lessons l ON l.id = p.lesson_id
      LEFT JOIN categories c ON c.id = l.category_id
      JOIN enrollments e ON e.lesson_id = l.id AND e.user_id = p.user_id AND e.status = 'active'
      WHERE p.user_id = ? AND p.percent_complete > 0 AND p.percent_complete < 90
      ORDER BY p.last_watched_at DESC
      LIMIT 4
    `).all(userId);

    // Stats
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT e.lesson_id) as total_enrolled,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.lesson_id END) as completed,
        COALESCE(SUM(p.watched_seconds) / 3600.0, 0) as total_hours,
        COUNT(DISTINCT CASE WHEN p.last_watched_at >= datetime('now', '-7 days') THEN e.lesson_id END) as active_this_week
      FROM enrollments e
      LEFT JOIN progress p ON p.lesson_id = e.lesson_id AND p.user_id = e.user_id
      WHERE e.user_id = ?
    `).get(userId);

    // Announcements
    const announcements = db.prepare(`
      SELECT * FROM announcements 
      WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
      AND (target_role = 'all' OR target_role = ?)
      ORDER BY created_at DESC LIMIT 5
    `).all(req.user.role);

    // Categories with lesson count
    const categories = db.prepare(`
      SELECT c.id, c.name, c.icon, c.color,
        COUNT(l.id) as lesson_count
      FROM categories c
      LEFT JOIN lessons l ON l.category_id = c.id AND l.is_published = 1
      GROUP BY c.id
      ORDER BY lesson_count DESC
    `).all();

    res.json({
      newLessons: newLessons.map(l => ({ ...l, isEnrolled: l.is_enrolled > 0 })),
      featured: featured.map(l => ({ ...l, isEnrolled: l.is_enrolled > 0 })),
      enrolledLessons,
      continueWatching,
      stats: {
        totalEnrolled: stats.total_enrolled || 0,
        completed: stats.completed || 0,
        totalHours: Math.round((stats.total_hours || 0) * 10) / 10,
        activeThisWeek: stats.active_this_week || 0,
      },
      announcements,
      categories,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
