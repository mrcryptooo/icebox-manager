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

// ─── ساخت جداول + مهاجرت ─────────────────────────────────────────────────────
async function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  await runMigrations();
  console.log('✅ دیتابیس PostgreSQL آماده است.');
}

// ─── مهاجرت‌های Phase 7 ───────────────────────────────────────────────────────
async function runMigrations() {
  // ایجاد کسب‌وکار پیش‌فرض اگر وجود ندارد
  const bizCheck = await pool.query('SELECT id FROM businesses LIMIT 1');
  if (bizCheck.rows.length === 0) {
    await pool.query(
      "INSERT INTO businesses (name, type, is_active) VALUES ($1, $2, 1)",
      ['فروشگاه پیش‌فرض', 'بستنی‌فروشی']
    );
    console.log('ℹ️  کسب‌وکار پیش‌فرض ایجاد شد.');
  }

  // شناسه کسب‌وکار پیش‌فرض
  const defaultBiz = await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  const defaultBizId = defaultBiz.rows[0].id;

  // لینک کردن داده‌های قدیمی (بدون business_id) به کسب‌وکار پیش‌فرض
  await pool.query('UPDATE branches SET business_id = $1 WHERE business_id IS NULL', [defaultBizId]);
  await pool.query('UPDATE sales    SET business_id = $1 WHERE business_id IS NULL', [defaultBizId]);
  await pool.query('UPDATE expenses SET business_id = $1 WHERE business_id IS NULL', [defaultBizId]);

  // ربط دادن OWNER به کسب‌وکار پیش‌فرض (اگر کاربرش در جدول users وجود دارد)
  const ownerId = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;
  if (ownerId) {
    const ownerUser = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [ownerId]
    );
    if (ownerUser.rows.length > 0) {
      const userId = ownerUser.rows[0].id;
      await pool.query(`
        INSERT INTO business_users (business_id, user_id, role, permissions)
        VALUES ($1, $2, 'business_owner', '["*"]'::jsonb)
        ON CONFLICT (business_id, user_id) DO NOTHING
      `, [defaultBizId, userId]);
    }
  }
}

// ─── بررسی اتصال دیتابیس (برای /health) ─────────────────────────────────────
async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { query, initDatabase, checkConnection };
