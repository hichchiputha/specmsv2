const { getDB } = require('../models/database');
const logger = require('../utils/logger');

/**
 * Validates that the request comes from either:
 *  1. A valid Electron app (x-app-token header matches DB record), OR
 *  2. The web admin panel (x-admin-key header matches env var)
 */
function validateElectronClient(req, res, next) {
  // ── Web admin panel bypass ──────────────────────────────────────────────
  // Read ADMIN_API_KEY at request time so .env is always loaded
  const adminApiKey = process.env.ADMIN_API_KEY || 'lms-admin-panel-secret-key-change-this';
  const adminKey = req.headers['x-admin-key'];

  if (adminKey && adminKey === adminApiKey) {
    req.isAdminPanel = true;
    return next();
  }

  // ── Electron app token ──────────────────────────────────────────────────
  const appToken = req.headers['x-app-token'];
  const platform  = req.headers['x-platform'];
  const clientId  = req.headers['x-client-id'];

  if (!appToken) {
    logger.warn(`No app token from ${req.ip} → ${req.path}`);
    return res.status(403).json({
      error: 'Access denied: this API is only accessible from the LMS desktop application',
      code: 'INVALID_CLIENT',
    });
  }

  let validToken;
  try {
    const db = getDB();
    validToken = db.prepare(
      'SELECT id FROM app_tokens WHERE token = ? AND is_active = 1'
    ).get(appToken);
  } catch (err) {
    logger.error('validateClient DB error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!validToken) {
    logger.warn(`Invalid app token from ${req.ip}: ${appToken?.slice(0, 20)}…`);
    return res.status(403).json({
      error: 'Access denied: invalid application token',
      code: 'INVALID_APP_TOKEN',
    });
  }

  req.clientPlatform = platform;
  req.clientId = clientId;
  next();
}

module.exports = validateElectronClient;
