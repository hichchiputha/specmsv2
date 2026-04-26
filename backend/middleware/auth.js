const jwt = require('jsonwebtoken');
const { getDB } = require('../models/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Read JWT_SECRET at request time so .env changes are always picked up
function getJwtSecret() {
  return process.env.JWT_SECRET || 'lms-super-secret-jwt-key-change-in-production';
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const JWT_SECRET = getJwtSecret();
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify session exists in DB
    const db = getDB();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = db.prepare(`
      SELECT s.*, u.is_active, u.role
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.is_active = 1 AND s.user_id = ?
    `).get(tokenHash, decoded.userId);

    if (!session) {
      return res.status(401).json({ error: 'Session not found. Please log in again.' });
    }

    if (!session.is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    if (new Date(session.expires_at) < new Date()) {
      db.prepare('UPDATE user_sessions SET is_active = 0 WHERE token_hash = ?').run(tokenHash);
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    // Update last active timestamp
    db.prepare("UPDATE user_sessions SET last_used_at = datetime('now') WHERE token_hash = ?").run(tokenHash);

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      deviceId: decoded.deviceId,
    };
    req.token = token;
    req.tokenHash = tokenHash;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    logger.warn(`JWT verification failed: ${err.message}`);
    return res.status(403).json({ error: 'Invalid token. Please log in again.', code: 'INVALID_JWT' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(`Permission denied: user ${req.user.id} (${req.user.role}) tried to access ${req.path}`);
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
    next();
  };
}

function generateToken(user, deviceId, platform) {
  const JWT_SECRET = getJwtSecret();
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceId,
      platform,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const requireAdmin   = requireRole('admin');
const requireTeacher = requireRole('admin', 'teacher');
const requireStudent = requireRole('admin', 'teacher', 'student');

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireTeacher,
  requireStudent,
  generateToken,
};
