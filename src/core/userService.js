const { query } = require('../db/database');

// ─── یافتن یا ساخت کاربر ─────────────────────────────────────────────────────
async function findOrCreateUser(telegramId, name) {
  const existing = await query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const inserted = await query(
    'INSERT INTO users (telegram_id, name, role) VALUES ($1, $2, $3) RETURNING *',
    [telegramId, name || 'کاربر', 'owner']
  );
  return inserted.rows[0];
}

// ─── خواندن کاربر بر اساس telegram_id ───────────────────────────────────────
async function getUserByTelegramId(telegramId) {
  const result = await query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0] || null;
}

module.exports = { findOrCreateUser, getUserByTelegramId };
