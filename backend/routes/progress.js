const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// PUT /api/progress/:lessonId - Update progress
router.put('/:lessonId', authenticateToken, (req, res) => {
  try {
    const { lessonId } = req.params;
    const { watchedSeconds, totalSeconds, lastPosition } = req.body;
    const db = getDB();

    // Verify enrollment
    const enrollment = db.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND lesson_id = ? AND status = "active"'
    ).get(req.user.id, lessonId);

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this lesson' });
    }

    const percentComplete = totalSeconds > 0 ? Math.min(100, (watchedSeconds / totalSeconds) * 100) : 0;
    const isCompleted = percentComplete >= 90 ? 1 : 0;

    const existing = db.prepare('SELECT id FROM progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lessonId);

    if (existing) {
      db.prepare(`
        UPDATE progress SET
          watched_seconds = MAX(watched_seconds, ?),
          total_seconds = ?,
          percent_complete = MAX(percent_complete, ?),
          is_completed = MAX(is_completed, ?),
          last_position = ?,
          last_watched_at = datetime('now'),
          updated_at = datetime('now')
        WHERE user_id = ? AND lesson_id = ?
      `).run(watchedSeconds, totalSeconds, percentComplete, isCompleted, lastPosition, req.user.id, lessonId);
    } else {
      const progressId = crypto.randomBytes(16).toString('hex');
      db.prepare(`
        INSERT INTO progress (id, user_id, lesson_id, watched_seconds, total_seconds, percent_complete, is_completed, last_position, last_watched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(progressId, req.user.id, lessonId, watchedSeconds, totalSeconds, percentComplete, isCompleted, lastPosition);
    }

    // Mark enrollment as completed if 90%+ watched
    if (isCompleted) {
      db.prepare(`
        UPDATE enrollments SET status = 'completed', completed_at = COALESCE(completed_at, datetime('now'))
        WHERE user_id = ? AND lesson_id = ? AND status = 'active'
      `).run(req.user.id, lessonId);
    }

    res.json({ percentComplete, isCompleted: isCompleted === 1 });
  } catch (error) {
    logger.error('Update progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/progress - Get all progress for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const progress = db.prepare(`
      SELECT p.*, l.title as lesson_title, l.thumbnail_url, l.type
      FROM progress p
      JOIN lessons l ON l.id = p.lesson_id
      WHERE p.user_id = ?
      ORDER BY p.last_watched_at DESC
    `).all(req.user.id);

    res.json({ progress });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/progress/:lessonId
router.get('/:lessonId', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const progress = db.prepare(`
      SELECT * FROM progress WHERE user_id = ? AND lesson_id = ?
    `).get(req.user.id, req.params.lessonId);

    res.json({ progress: progress || { percent_complete: 0, last_position: 0, is_completed: false } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
