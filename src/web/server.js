'use strict';
// ─── Web Dashboard Server — Phase 9A ─────────────────────────────────────────
require('dotenv').config();
const path         = require('path');
const express      = require('express');
const cookieParser = require('cookie-parser');

const { verifyLogin, setSession, clearSession, getSession } = require('./auth');
const { registerRoutes } = require('./routes');
const { loginPage }      = require('./views/login');

function startWebServer() {
  const app  = express();
  const PORT = process.env.PORT || 3000;
  const secret = process.env.DASHBOARD_ADMIN_PASSWORD || 'icebox_default_secret_change_me';

  // ── Middleware ──────────────────────────────────────────────────────────────
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser(secret));
  app.use('/public', express.static(path.join(__dirname, 'public')));

  // Disable x-powered-by header for security
  app.disable('x-powered-by');

  // ── Login routes ────────────────────────────────────────────────────────────
  app.get('/login', (req, res) => {
    if (getSession(req)) return res.redirect('/');
    res.send(loginPage());
  });

  app.post('/login', (req, res) => {
    const { telegram_id, password } = req.body || {};
    if (!telegram_id || !password) {
      return res.send(loginPage('شناسه تلگرام و رمز عبور الزامی است.'));
    }
    if (verifyLogin(telegram_id, password)) {
      setSession(res, telegram_id);
      return res.redirect('/');
    }
    return res.send(loginPage('شناسه تلگرام یا رمز عبور اشتباه است.'));
  });

  app.get('/logout', (req, res) => {
    clearSession(res);
    res.redirect('/login');
  });

  // ── Dashboard routes ────────────────────────────────────────────────────────
  registerRoutes(app);

  // ── 404 handler ─────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).send('صفحه‌ای یافت نشد.');
  });

  // ── Error handler ────────────────────────────────────────────────────────────
  app.use((err, req, res, _next) => {
    console.error('[Dashboard] Unhandled error:', err);
    res.status(500).send('خطای داخلی سرور.');
  });

  // ── Start listening ──────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`🌐 داشبورد وب روی پورت ${PORT} در حال اجراست.`);
    console.log(`   آدرس: http://localhost:${PORT}`);
  });
}

module.exports = { startWebServer };
