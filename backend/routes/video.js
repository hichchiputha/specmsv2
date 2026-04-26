const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../models/database');
const { authenticateToken, requireTeacher } = require('../middleware/auth');
const logger = require('../utils/logger');

// Keys are read at startup after dotenv loads
function getEncKey() {
  return (process.env.VIDEO_ENCRYPTION_KEY || 'lms-video-encryption-key-32bytes!').padEnd(32, '0').substring(0, 32);
}
function getMasterKey() {
  return (process.env.VIDEO_MASTER_KEY || 'lms-master-video-key-32bytessss!').padEnd(32, '0').substring(0, 32);
}

function encrypt(text, key) {
  const keyBuffer = Buffer.from(key, 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(Buffer.from(text, 'utf8'));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { crypted: encrypted.toString('hex'), ivs: iv.toString('hex') };
}

function decrypt(crypted, ivs, key) {
  try {
    const keyBuffer = Buffer.from(key, 'utf8');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, Buffer.from(ivs, 'hex'));
    let dec = decipher.update(Buffer.from(crypted, 'hex'));
    dec = Buffer.concat([dec, decipher.final()]);
    return dec.toString('utf8');
  } catch (e) { return null; }
}

// GET /api/video/lesson-token/:lessonId
// Returns encrypted video payload for enrolled users
router.get('/lesson-token/:lessonId', authenticateToken, (req, res) => {
  try {
    const { lessonId } = req.params;
    const db = getDB();

    // Verify enrollment
    const enrollment = db.prepare(`
      SELECT id FROM enrollments
      WHERE user_id = ? AND lesson_id = ? AND status = 'active'
    `).get(req.user.id, lessonId);

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this lesson', code: 'NOT_ENROLLED' });
    }

    const video = db.prepare(`
      SELECT v.*, l.title FROM videos v
      JOIN lessons l ON l.id = v.lesson_id
      WHERE v.lesson_id = ? AND l.is_published = 1
    `).get(lessonId);

    if (!video) {
      return res.status(404).json({ error: 'No video found for this lesson' });
    }

    const MASTER_KEY = getMasterKey();
    const ENC_KEY = getEncKey();

    // Payload: double-encoded video info for Electron to decrypt
    const payload = JSON.stringify({
      videoId: video.youtube_video_id,
      lessonId,
      userId: req.user.id,
      ts: Date.now(),
      exp: Date.now() + 3600000, // 1 hour
    });

    const enc = encrypt(Buffer.from(payload).toString('base64'), MASTER_KEY);

    // Playback key: raw video info for secondary verification
    const playbackRaw = `${video.youtube_video_id}|${req.user.id}|${lessonId}`;
    const playbackEnc = encrypt(Buffer.from(playbackRaw).toString('base64'), ENC_KEY);

    const accessToken = crypto.randomBytes(32).toString('hex');

    logger.info(`Video token issued: user=${req.user.id} lesson=${lessonId}`);

    res.json({
      key: enc.crypted,
      hash: enc.ivs,
      type: 'video',
      playbackKey: playbackEnc.crypted,
      playbackHash: playbackEnc.ivs,
      accessToken,
      qualityOptions: (() => { try { return JSON.parse(video.quality_options || '[]'); } catch(e) { return []; } })(),
      hasCaptions: video.captions_available === 1,
    });
  } catch (error) {
    logger.error('Video token error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
});

// POST /api/video — Link YouTube video to lesson (Teacher+)
router.post('/', authenticateToken, requireTeacher, (req, res) => {
  try {
    const { lessonId, youtubeVideoId, qualityOptions } = req.body;
    if (!lessonId || !youtubeVideoId) {
      return res.status(400).json({ error: 'lessonId and youtubeVideoId are required' });
    }

    const db = getDB();

    // Verify lesson exists
    const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const ENC_KEY = getEncKey();
    const enc = encrypt(Buffer.from(youtubeVideoId).toString('base64'), ENC_KEY);

    const videoId = crypto.randomBytes(16).toString('hex');
    db.prepare(`
      INSERT OR REPLACE INTO videos (id, lesson_id, youtube_video_id, encrypted_video_id, encryption_iv, quality_options)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      videoId, lessonId, youtubeVideoId,
      enc.crypted, enc.ivs,
      JSON.stringify(qualityOptions || ['hd1080', 'hd720', 'large', 'medium', 'small'])
    );

    logger.info(`Video linked: lesson=${lessonId} video=${youtubeVideoId}`);
    res.status(201).json({ message: 'Video linked successfully', videoId });
  } catch (error) {
    logger.error('Add video error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
});

// POST /api/video/verify-playback — Called by Electron to verify playback session
router.post('/verify-playback', authenticateToken, (req, res) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId required' });

    const db = getDB();
    const enrollment = db.prepare(`
      SELECT id FROM enrollments WHERE user_id = ? AND lesson_id = ? AND status = 'active'
    `).get(req.user.id, lessonId);

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled', code: 'NOT_ENROLLED' });
    }

    logger.info(`Playback verified: user=${req.user.id} lesson=${lessonId}`);
    res.json({ valid: true, timestamp: Date.now() });
  } catch (error) {
    logger.error('Verify playback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
