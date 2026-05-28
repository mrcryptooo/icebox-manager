'use strict';
const { query } = require('../db/database');

// ─── دسترسی‌های پیش‌فرض هر نقش ───────────────────────────────────────────────
const DEFAULT_PERMISSIONS = {
  business_owner: ['*'],
  manager: [
    'sales.create', 'sales.view', 'sales.edit', 'sales.delete',
    'expenses.create', 'expenses.view', 'expenses.edit', 'expenses.delete',
    'reports.view', 'exports.create', 'branches.manage', 'manage_records.view',
  ],
  staff: [
    'sales.create', 'sales.view',
    'expenses.create', 'expenses.view',
    'reports.view',
  ],
  accountant: [
    'sales.view', 'expenses.view', 'expenses.create',
    'reports.view', 'exports.create', 'manage_records.view',
  ],
};

// ─── نام فارسی نقش‌ها ─────────────────────────────────────────────────────────
const ROLE_LABELS = {
  super_admin:    'سوپرادمین',
  business_owner: 'مالک',
  manager:        'مدیر',
  staff:          'کارمند',
  accountant:     'حسابدار',
};

// ─── افزودن یا به‌روزرسانی عضو تیم ──────────────────────────────────────────
async function addTeamMember({ businessId, userId, role }) {
  const perms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.staff;
  const result = await query(`
    INSERT INTO business_users (business_id, user_id, role, permissions)
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (business_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, is_active = 1
    RETURNING *
  `, [businessId, userId, role, JSON.stringify(perms)]);
  return result.rows[0];
}

// ─── لیست اعضای فعال یک کسب‌وکار ────────────────────────────────────────────
async function getTeamMembers(businessId) {
  const result = await query(`
    SELECT bu.id, bu.role, bu.is_active, u.name, u.telegram_id
    FROM business_users bu
    JOIN users u ON bu.user_id = u.id
    WHERE bu.business_id = $1 AND bu.is_active = 1
    ORDER BY bu.id
  `, [businessId]);
  return result.rows;
}

// ─── تغییر نقش عضو ───────────────────────────────────────────────────────────
async function updateMemberRole(businessId, userId, role) {
  const perms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.staff;
  const result = await query(`
    UPDATE business_users
    SET role = $1, permissions = $2::jsonb
    WHERE business_id = $3 AND user_id = $4
    RETURNING *
  `, [role, JSON.stringify(perms), businessId, userId]);
  return result.rows[0] || null;
}

// ─── غیرفعال کردن عضو ────────────────────────────────────────────────────────
async function deactivateMember(businessId, userId) {
  const result = await query(`
    UPDATE business_users SET is_active = 0
    WHERE business_id = $1 AND user_id = $2
    RETURNING *
  `, [businessId, userId]);
  return result.rows[0] || null;
}

// ─── بارگذاری biz context با آیدی تلگرام ─────────────────────────────────────
async function getBizContextByTelegramId(telegramId) {
  const result = await query(`
    SELECT bu.business_id, b.name AS business_name, bu.role, bu.permissions
    FROM business_users bu
    JOIN users u  ON bu.user_id     = u.id
    JOIN businesses b ON bu.business_id = b.id
    WHERE u.telegram_id = $1
      AND bu.is_active  = 1
      AND b.is_active   = 1
    ORDER BY bu.business_id
    LIMIT 1
  `, [telegramId]);

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    businessId:   row.business_id,
    businessName: row.business_name,
    role:         row.role,
    permissions:  row.permissions || DEFAULT_PERMISSIONS[row.role] || [],
  };
}

module.exports = {
  addTeamMember,
  getTeamMembers,
  updateMemberRole,
  deactivateMember,
  getBizContextByTelegramId,
  DEFAULT_PERMISSIONS,
  ROLE_LABELS,
};
