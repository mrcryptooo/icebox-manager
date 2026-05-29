'use strict';
// ─── Dashboard Authentication — Phase 9A ──────────────────────────────────────
const crypto = require('crypto');

const COOKIE_NAME = 'ibm_session';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Timing-safe string comparison to prevent timing attacks
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still run comparison to avoid timing leak from length
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Verify login credentials
function verifyLogin(telegramId, password) {
  const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD;
  const ownerId      = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;
  if (!adminPassword || !ownerId) return false;
  const idMatch   = Number(telegramId) === ownerId;
  const passMatch = safeEqual(password, adminPassword);
  return idMatch && passMatch;
}

// Set session cookie
function setSession(res, telegramId) {
  res.cookie(COOKIE_NAME, String(telegramId), {
    signed:   true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
  });
}

// Get session from request (returns telegramId string or null)
function getSession(req) {
  const val = req.signedCookies?.[COOKIE_NAME];
  return val || null;
}

// Clear session cookie
function clearSession(res) {
  res.clearCookie(COOKIE_NAME);
}

// Express middleware — requires authentication
function requireAuth(req, res, next) {
  const telegramId = getSession(req);
  if (!telegramId) {
    return res.redirect('/login');
  }
  const ownerId = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;
  res.locals.telegramId  = Number(telegramId);
  res.locals.isSuperAdmin = ownerId && Number(telegramId) === ownerId;
  next();
}

module.exports = { verifyLogin, setSession, getSession, clearSession, requireAuth };
