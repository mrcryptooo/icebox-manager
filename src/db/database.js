const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ─── اتصال به PostgreSQL ──────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false },
  }),
});

// ─── helper عمومی برای اجرای query ───────────────────────────────────────────
async function query(sql, params = []) {
  return pool.query(sql, params);
}

// ─── ساخت جداول (اجرای schema.sql) ──────────────────────────────────────────
async function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('✅ دیتابیس PostgreSQL آماده است.');
}

module.exports = { query, initDatabase };
