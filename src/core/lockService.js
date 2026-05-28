'use strict';
const { query } = require('../db/database');
const crypto = require('crypto');

// ─── بخش‌های قابل قفل ────────────────────────────────────────────────────────
const LOCKABLE_SECTIONS = ['reports', 'exports', 'manage_records', 'settings', 'expenses'];

const SECTION_LABELS = {
  reports:        'گزارش‌ها',
  exports:        'خروجی اطلاعات',
  manage_records: 'مدیریت ثبت‌ها',
  settings:       'تنظیمات',
  expenses:       'ثبت خرج',
};

// ─── هش PIN ───────────────────────────────────────────────────────────────────
function hashPin(businessId, sectionKey, pin) {
  return crypto
    .createHash('sha256')
    .update(`icebox:${businessId}:${sectionKey}:${pin}`)
    .digest('hex');
}

function verifyPin(businessId, sectionKey, pin, storedHash) {
  return hashPin(businessId, sectionKey, pin) === storedHash;
}

// ─── تنظیم قفل بخش ───────────────────────────────────────────────────────────
async function setSectionLock(businessId, sectionKey, pin) {
  const pinHash = hashPin(businessId, sectionKey, pin);
  await query(`
    INSERT INTO section_locks (business_id, section_key, pin_hash)
    VALUES ($1, $2, $3)
    ON CONFLICT (business_id, section_key) DO UPDATE SET pin_hash = $3
  `, [businessId, sectionKey, pinHash]);
}

// ─── خواندن قفل یک بخش ───────────────────────────────────────────────────────
async function getSectionLock(businessId, sectionKey) {
  const result = await query(
    'SELECT * FROM section_locks WHERE business_id = $1 AND section_key = $2',
    [businessId, sectionKey]
  );
  return result.rows[0] || null;
}

// ─── حذف قفل بخش ─────────────────────────────────────────────────────────────
async function removeSectionLock(businessId, sectionKey) {
  await query(
    'DELETE FROM section_locks WHERE business_id = $1 AND section_key = $2',
    [businessId, sectionKey]
  );
}

// ─── لیست بخش‌های قفل‌شده ─────────────────────────────────────────────────────
async function getSectionLocks(businessId) {
  const result = await query(
    'SELECT section_key FROM section_locks WHERE business_id = $1',
    [businessId]
  );
  return result.rows.map(r => r.section_key);
}

module.exports = {
  hashPin,
  verifyPin,
  setSectionLock,
  getSectionLock,
  removeSectionLock,
  getSectionLocks,
  LOCKABLE_SECTIONS,
  SECTION_LABELS,
};
