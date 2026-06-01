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
  res.locals.telegramId   = Number(telegramId);
  res.locals.isSuperAdmin = !!(ownerId && Number(telegramId) === ownerId);
  next();
}

// Express middleware — requires super_admin role
// باید بعد از requireAuth استفاده شود.
function requireSuperAdmin(req, res, next) {
  if (!res.locals.isSuperAdmin) {
    return res.status(403).send(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>دسترسی ممنوع — IceBox Manager</title>
  <link rel="stylesheet" href="/public/style.css">
</head>
<body class="login-body">
  <div class="login-card" style="text-align:center">
    <div style="font-size:48px;margin-bottom:12px">🚫</div>
    <h1 style="font-size:20px;margin-bottom:8px">دسترسی ممنوع</h1>
    <p style="color:#64748b;margin-bottom:24px">شما به این بخش دسترسی ندارید.</p>
    <a href="/" style="color:#3b82f6;text-decoration:none">← بازگشت به داشبورد</a>
  </div>
</body>
</html>`);
  }
  next();
}

module.exports = { verifyLogin, setSession, getSession, clearSession, requireAuth, requireSuperAdmin };
