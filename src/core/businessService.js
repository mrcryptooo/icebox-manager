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

// ─── ترمیم business_user مفقود برای مالکان (Phase 9B Recovery) ──────────────
// فقط read-کردن + INSERT/ON CONFLICT UPDATE — هیچ DELETE/DROP نمی‌کند.
// فقط از دستور /repair_business_users (super_admin) فراخوانی شود.
async function repairMissingBusinessOwners() {
  // کسب‌وکارهایی که owner_id دارند ولی business_user فعال business_owner ندارند
  const missingRes = await query(`
    SELECT b.id AS business_id, b.name, b.owner_id
    FROM businesses b
    WHERE b.is_active  = 1
      AND b.owner_id   IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM business_users bu
        WHERE bu.business_id = b.id
          AND bu.user_id     = b.owner_id
          AND bu.is_active   = 1
          AND bu.role        = 'business_owner'
      )
  `);

  const missing = missingRes.rows;
  if (missing.length === 0) return { missing: 0, repaired: 0, details: [] };

  let repaired = 0;
  for (const row of missing) {
    await query(`
      INSERT INTO business_users (business_id, user_id, role, permissions, is_active)
      VALUES ($1, $2, 'business_owner', '["*"]'::jsonb, 1)
      ON CONFLICT (business_id, user_id) DO UPDATE
        SET role        = 'business_owner',
            permissions = '["*"]'::jsonb,
            is_active   = 1
    `, [row.business_id, row.owner_id]);
    repaired++;
  }

  return {
    missing:  missing.length,
    repaired,
    details:  missing.map(r => ({ businessId: r.business_id, name: r.name })),
  };
}

module.exports = {
  createBusiness,
  getBusinessById,
  getAllBusinesses,
  getDefaultBusiness,
  ensureDefaultBusiness,
  repairMissingBusinessOwners,
};
