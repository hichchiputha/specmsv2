const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/database');
const { authenticateToken, requireAdmin, requireTeacher } = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/lessons
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const {
      type = 'all', category, difficulty, isFree,
      search, teacherId, page = 1, limit = 20,
      sortBy = 'created_at', sortDir = 'DESC', featured,
    } = req.query;

    const userId = req.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['l.is_published = 1'];
    const params = [];

    if (type !== 'all') { conditions.push('l.type = ?'); params.push(type); }
    if (category) { conditions.push('l.category_id = ?'); params.push(category); }
    if (difficulty) { conditions.push('l.difficulty = ?'); params.push(difficulty); }
    if (isFree !== undefined && isFree !== '') {
      conditions.push('l.is_free = ?');
      params.push(isFree === 'true' ? 1 : 0);
    }
    if (teacherId) { conditions.push('l.teacher_id = ?'); params.push(teacherId); }
    if (featured === 'true') { conditions.push('l.is_featured = 1'); }
    if (search) {
      conditions.push('(l.title LIKE ? OR l.description LIKE ? OR l.tags LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const allowedSort = ['created_at', 'title', 'view_count', 'price', 'duration_minutes'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const safeDir = sortDir === 'ASC' ? 'ASC' : 'DESC';

    // Use parameterized userId — no string interpolation
    const lessons = db.prepare(`
      SELECT
        l.id, l.title, l.description, l.thumbnail_url, l.type, l.is_free, l.price,
        l.duration_minutes, l.difficulty, l.is_featured, l.view_count, l.tags,
        l.created_at, l.updated_at, l.order_index,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        c.id as category_id,
        u.first_name || ' ' || u.last_name as teacher_name,
        t.id as teacher_id, t.rating as teacher_rating,
        (SELECT COUNT(*) FROM enrollments e2 WHERE e2.lesson_id = l.id AND e2.status = 'active') as enrollment_count,
        (SELECT COUNT(*) FROM enrollments e3 WHERE e3.lesson_id = l.id AND e3.status = 'active' AND e3.user_id = ?) as is_enrolled,
        (SELECT percent_complete FROM progress p WHERE p.lesson_id = l.id AND p.user_id = ?) as my_progress,
        v.id as has_video
      FROM lessons l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN videos v ON v.lesson_id = l.id
      ${whereClause}
      ORDER BY l.${safeSort} ${safeDir}
      LIMIT ? OFFSET ?
    `).all(userId, userId, ...params, parseInt(limit), offset);

    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM lessons l ${whereClause}
    `).get(params);
    const total = countRow?.count || 0;

    res.json({
      lessons: lessons.map(l => ({
        ...l,
        tags: (() => { try { return JSON.parse(l.tags || '[]'); } catch(e) { return []; } })(),
        isEnrolled: (l.is_enrolled || 0) > 0,
        myProgress: l.my_progress || 0,
        hasVideo: !!l.has_video,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('List lessons error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
});

// GET /api/lessons/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const userId = req.user.id;

    const lesson = db.prepare(`
      SELECT
        l.*,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        u.first_name || ' ' || u.last_name as teacher_name,
        u.avatar_url as teacher_avatar,
        t.id as teacher_id, t.expertise, t.rating as teacher_rating,
        (SELECT COUNT(*) FROM enrollments e2 WHERE e2.lesson_id = l.id AND e2.status = 'active') as enrollment_count,
        (SELECT status FROM enrollments e3 WHERE e3.lesson_id = l.id AND e3.user_id = ?) as my_enrollment_status,
        (SELECT percent_complete FROM progress p WHERE p.lesson_id = l.id AND p.user_id = ?) as my_progress,
        (SELECT last_position FROM progress p2 WHERE p2.lesson_id = l.id AND p2.user_id = ?) as my_last_position,
        v.id as video_id, v.captions_available, v.quality_options
      FROM lessons l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN teachers t ON t.id = l.teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN videos v ON v.lesson_id = l.id
      WHERE l.id = ? AND l.is_published = 1
    `).get(userId, userId, userId, id);

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const pdfs = db.prepare(`
      SELECT id, title, description, file_url, external_url, file_type, file_size, is_downloadable, order_index
      FROM pdfs WHERE lesson_id = ? ORDER BY order_index ASC
    `).all(id);

    // Increment view count (fire-and-forget)
    db.prepare('UPDATE lessons SET view_count = view_count + 1 WHERE id = ?').run(id);

    res.json({
      ...lesson,
      tags: (() => { try { return JSON.parse(lesson.tags || '[]'); } catch(e) { return []; } })(),
      qualityOptions: (() => { try { return JSON.parse(lesson.quality_options || '[]'); } catch(e) { return []; } })(),
      isEnrolled: !!lesson.my_enrollment_status,
      myEnrollmentStatus: lesson.my_enrollment_status,
      myProgress: lesson.my_progress || 0,
      myLastPosition: lesson.my_last_position || 0,
      pdfs,
    });
  } catch (error) {
    logger.error('Get lesson error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
});

// POST /api/lessons
router.post('/', authenticateToken, requireTeacher, [
  body('title').trim().isLength({ min: 3, max: 200 }),
  body('type').isIn(['lesson', 'seminar']),
  body('isFree').isBoolean(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDB();
    const {
      title, description, thumbnailUrl, teacherId, categoryId,
      type, isFree, price, durationMinutes, difficulty,
      isPublished, isFeatured, orderIndex, tags,
    } = req.body;

    const lessonId = crypto.randomBytes(16).toString('hex');
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : (tags ? [tags] : []));

    db.prepare(`
      INSERT INTO lessons (
        id, title, description, thumbnail_url, teacher_id, category_id,
        type, is_free, price, duration_minutes, difficulty,
        is_published, is_featured, order_index, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lessonId,
      title,
      description || '',
      thumbnailUrl || null,
      teacherId || null,
      categoryId || null,
      type || 'lesson',
      isFree ? 1 : 0,
      parseFloat(price) || 0,
      parseInt(durationMinutes) || 0,
      difficulty || 'beginner',
      isPublished ? 1 : 0,
      isFeatured ? 1 : 0,
      parseInt(orderIndex) || 0,
      tagsJson
    );

    logger.info(`Lesson created: ${lessonId} by ${req.user.id}`);
    res.status(201).json({ message: 'Lesson created successfully', lessonId });
  } catch (error) {
    logger.error('Create lesson error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
});

// PUT /api/lessons/:id
router.put('/:id', authenticateToken, requireTeacher, (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    // Teachers can only edit their own lessons
    if (req.user.role === 'teacher') {
      const teacher = db.prepare('SELECT id FROM teachers WHERE user_id = ?').get(req.user.id);
      if (!teacher || lesson.teacher_id !== teacher.id) {
        return res.status(403).json({ error: 'You can only edit your own lessons' });
      }
    }

    const {
      title, description, thumbnailUrl, categoryId, teacherId,
      isFree, price, durationMinutes, difficulty,
      isPublished, isFeatured, orderIndex, tags,
    } = req.body;

    const tagsJson = tags !== undefined
      ? JSON.stringify(Array.isArray(tags) ? tags : [tags])
      : null;

    db.prepare(`
      UPDATE lessons SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        thumbnail_url = COALESCE(?, thumbnail_url),
        category_id = COALESCE(?, category_id),
        teacher_id = COALESCE(?, teacher_id),
        is_free = COALESCE(?, is_free),
        price = COALESCE(?, price),
        duration_minutes = COALESCE(?, duration_minutes),
        difficulty = COALESCE(?, difficulty),
        is_published = COALESCE(?, is_published),
        is_featured = COALESCE(?, is_featured),
        order_index = COALESCE(?, order_index),
        tags = COALESCE(?, tags),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title || null,
      description !== undefined ? description : null,
      thumbnailUrl || null,
      categoryId || null,
      teacherId || null,
      isFree !== undefined ? (isFree ? 1 : 0) : null,
      price !== undefined ? parseFloat(price) : null,
      durationMinutes !== undefined ? parseInt(durationMinutes) : null,
      difficulty || null,
      isPublished !== undefined ? (isPublished ? 1 : 0) : null,
      isFeatured !== undefined ? (isFeatured ? 1 : 0) : null,
      orderIndex !== undefined ? parseInt(orderIndex) : null,
      tagsJson,
      id
    );

    res.json({ message: 'Lesson updated successfully' });
  } catch (error) {
    logger.error('Update lesson error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
});

// DELETE /api/lessons/:id
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const result = db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    logger.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/lessons/:id/pdfs
router.post('/:id/pdfs', authenticateToken, requireTeacher, [
  body('title').trim().isLength({ min: 2, max: 200 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDB();
    const { title, description, fileUrl, externalUrl, fileType, fileSize, isDownloadable, orderIndex } = req.body;
    const pdfId = crypto.randomBytes(16).toString('hex');

    db.prepare(`
      INSERT INTO pdfs (id, lesson_id, title, description, file_url, external_url, file_type, file_size, is_downloadable, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pdfId, req.params.id, title, description || '',
      fileUrl || null, externalUrl || null,
      fileType || 'pdf', fileSize || null,
      isDownloadable !== false ? 1 : 0,
      parseInt(orderIndex) || 0
    );

    res.status(201).json({ message: 'PDF added', pdfId });
  } catch (error) {
    logger.error('Add PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/lessons/:id/pdfs/:pdfId
router.delete('/:id/pdfs/:pdfId', authenticateToken, requireTeacher, (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM pdfs WHERE id = ? AND lesson_id = ?').run(req.params.pdfId, req.params.id);
    res.json({ message: 'PDF removed' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
