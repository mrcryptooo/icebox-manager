'use strict';
const { query } = require('../db/database');

// ─── ایجاد کسب‌وکار جدید ─────────────────────────────────────────────────────
async function createBusiness({ name, type, city, phone, ownerId, licenseCode }) {
  const result = await query(
    `INSERT INTO businesses (name, type, city, phone, owner_id, license_code)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, type || null, city || null, phone || null, ownerId || null, licenseCode || null]
  );
  return result.rows[0];
}

// ─── خواندن کسب‌وکار با شناسه ────────────────────────────────────────────────
async function getBusinessById(id) {
  const result = await query(
    'SELECT * FROM businesses WHERE id = $1 AND is_active = 1',
    [id]
  );
  return result.rows[0] || null;
}

// ─── لیست همه کسب‌وکارها ─────────────────────────────────────────────────────
async function getAllBusinesses() {
  const result = await query(
    'SELECT * FROM businesses WHERE is_active = 1 ORDER BY id'
  );
  return result.rows;
}

// ─── اولین کسب‌وکار (پیش‌فرض) ────────────────────────────────────────────────
async function getDefaultBusiness() {
  const result = await query('SELECT * FROM businesses ORDER BY id LIMIT 1');
  return result.rows[0] || null;
}

/**
 * اطمینان از وجود کسب‌وکار پیش‌فرض — اگر وجود نداشت می‌سازد.
 * @returns {number} id کسب‌وکار پیش‌فرض
 */
async function ensureDefaultBusiness() {
  const existing = await query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  if (existing.rows.length > 0) return existing.rows[0].id;

  const result = await query(
    `INSERT INTO businesses (name, type, is_active) VALUES ($1, $2, 1) RETURNING id`,
    ['فروشگاه پیش‌فرض', 'بستنی‌فروشی']
  );
  return result.rows[0].id;
}

module.exports = {
  createBusiness,
  getBusinessById,
  getAllBusinesses,
  getDefaultBusiness,
  ensureDefaultBusiness,
};
