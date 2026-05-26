const db = require('../db/database');

function findOrCreateUser(telegramId, name) {
  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  if (!user) {
    const info = db.prepare(
      'INSERT INTO users (telegram_id, name, role) VALUES (?, ?, ?)'
    ).run(telegramId, name || 'کاربر', 'owner');
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }
  return user;
}

function getUserByTelegramId(telegramId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

module.exports = { findOrCreateUser, getUserByTelegramId };
