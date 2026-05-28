'use strict';
const { query } = require('../db/database');

// ─── تولید کد لایسنس ICE-XXXX-XXXX ──────────────────────────────────────────
function generateLicenseCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand4 = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `ICE-${rand4()}-${rand4()}`;
}

// ─── ایجاد لایسنس جدید ───────────────────────────────────────────────────────
async function createLicense() {
  let code;
  for (let attempt = 0; attempt < 20; attempt++) {
    code = generateLicenseCode();
    const existing = await query('SELECT id FROM licenses WHERE code = $1', [code]);
    if (existing.rows.length === 0) break;
  }
  const result = await query(
    'INSERT INTO licenses (code) VALUES ($1) RETURNING *',
    [code]
  );
  return result.rows[0];
}

// ─── خواندن لایسنس با کد ─────────────────────────────────────────────────────
async function getLicenseByCode(code) {
  const result = await query('SELECT * FROM licenses WHERE code = $1', [code]);
  return result.rows[0] || null;
}

// ─── لیست همه لایسنس‌ها (با نام کسب‌وکار استفاده‌کننده) ──────────────────────
async function getAllLicenses() {
  const result = await query(`
    SELECT l.*, b.name AS business_name
    FROM licenses l
    LEFT JOIN businesses b ON l.used_by = b.id
    ORDER BY l.created_at DESC
  `);
  return result.rows;
}

// ─── فعال‌سازی لایسنس ─────────────────────────────────────────────────────────
async function activateLicense(code, businessId) {
  const result = await query(
    `UPDATE licenses SET used_by = $1, used_at = NOW()
     WHERE code = $2 AND used_by IS NULL RETURNING *`,
    [businessId, code]
  );
  return result.rows[0] || null;
}

module.exports = {
  createLicense,
  getLicenseByCode,
  getAllLicenses,
  activateLicense,
};
