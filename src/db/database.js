// Uses Node.js 22+ built-in sqlite module (stable in Node 24+, no Python/compile needed)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/icebox.db';
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(path.resolve(dbPath));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initializeSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

// اضافه کردن ستون‌های جدید به جداول موجود (اگر قبلاً وجود نداشتند)
function runMigrations() {
  const migrations = [
    'ALTER TABLE sales ADD COLUMN deleted_at TEXT',
    'ALTER TABLE expenses ADD COLUMN deleted_at TEXT',
  ];
  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (_) {
      // ستون از قبل وجود دارد — نادیده گرفته می‌شود
    }
  }
}

initializeSchema();
runMigrations();

module.exports = db;
