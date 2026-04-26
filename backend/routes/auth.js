const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/database');
const { authenticateToken, generateToken } = require('../middleware/auth');
const validateClient = require('../middleware/validateClient');
const logger = require('../utils/logger');

// POST /api/auth/login
router.post('/login', validateClient, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('deviceId').notEmpty(),
  body('platform').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, deviceId, platform, deviceName } = req.body;

  try {
    const db = getDB();
    
    const user = db.prepare(`
      SELECT * FROM users WHERE email = ? AND is_active = 1
    `).get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = generateToken(user, deviceId, platform);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Deactivate old sessions for this device
    db.prepare(`
      UPDATE user_sessions SET is_active = 0
      WHERE user_id = ? AND device_id = ?
    `).run(user.id, deviceId);

    // Create new session
    db.prepare(`
      INSERT INTO user_sessions (user_id, device_id, device_name, platform, ip_address, user_agent, token_hash, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id, deviceId, deviceName || 'Unknown Device',
      platform, req.ip, req.headers['user-agent'] || '',
      tokenHash, expiresAt
    );

    // Update device info on user
    db.prepare(`
      UPDATE users SET device_id = ?, device_platform = ?, last_login_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(deviceId, platform, user.id);

    logger.info(`User logged in: ${user.email} from ${platform} device ${deviceId}`);

    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register (Student self-registration)
router.post('/register', validateClient, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
  body('firstName').trim().isLength({ min: 2, max: 50 }),
  body('lastName').trim().isLength({ min: 2, max: 50 }),
  // deviceId and platform are optional — web registrations won't have them
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, firstName, lastName, phone } = req.body;
  const deviceId = req.body.deviceId || `web-${crypto.randomBytes(8).toString('hex')}`;
  const platform = req.body.platform || req.headers['x-platform'] || 'web';

  try {
    const db = getDB();
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomBytes(16).toString('hex');

    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone, device_id, device_platform, is_active, is_verified)
      VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, 1, 0)
    `).run(userId, email, passwordHash, firstName, lastName, phone || null, deviceId, platform);

    // Generate token immediately
    const newUser = { id: userId, email, first_name: firstName, last_name: lastName, role: 'student' };
    const token = generateToken(newUser, deviceId, platform);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO user_sessions (user_id, device_id, platform, ip_address, token_hash, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, deviceId, platform, req.ip, tokenHash, expiresAt);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      token,
      expiresAt,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role: 'student',
        avatarUrl: null,
      }
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    db.prepare('UPDATE user_sessions SET is_active = 0 WHERE token_hash = ?').run(req.tokenHash);
    logger.info(`User logged out: ${req.user.id}`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url, 
             u.phone, u.bio, u.is_verified, u.last_login_at, u.created_at,
             t.expertise, t.qualifications, t.rating, t.years_experience
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      WHERE u.id = ? AND u.is_active = 1
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      bio: user.bio,
      isVerified: user.is_verified === 1,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      teacherProfile: user.expertise ? {
        expertise: user.expertise,
        qualifications: user.qualifications,
        rating: user.rating,
        yearsExperience: user.years_experience,
      } : null,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/validate-session
router.post('/validate-session', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newHash, req.user.id);

    // Invalidate all other sessions
    db.prepare(`
      UPDATE user_sessions SET is_active = 0 WHERE user_id = ? AND token_hash != ?
    `).run(req.user.id, req.tokenHash);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
