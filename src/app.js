'use strict';
// ─── Entry Point — Phase 9A ───────────────────────────────────────────────────
// Starts both the Telegram bot and the web dashboard server.
require('./bot/telegram/index');
const { startWebServer } = require('./web/server');
startWebServer();
