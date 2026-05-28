'use strict';
const { query } = require('../db/database');

// ─── دسترسی‌های پیش‌فرض هر نقش ───────────────────────────────────────────────
const DEFAULT_PERMISSIONS = {
  business_owner: ['*'],
  manager: [
    'sales.create', 'sales.view', 'sales.edit', 'sales.delete',
    'expenses.create', 'expenses.view', 'expenses.edit', 'expenses.delete',
    'reports.view', 'exports.create', 'branches.manage', 'manage_records.view',
    'team.manage',
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
  manager:        'سرپرست',
  staff:          'کارمند',
  accountant:     'حسابدار',
};

// ─── افزودن یا به‌روزرسانی عضو تیم ──────────────────────────────────────────
async function addTeamMember({ businessId, userId, role, displayName }) {
  const perms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.staff;
  const result = await query(`
    INSERT INTO business_users (business_id, user_id, role, permissions, display_name)
    VALUES ($1, $2, $3, $4::jsonb, $5)
    ON CONFLICT (business_id, user_id) DO UPDATE
      SET role        = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          is_active   = 1,
          display_name = CASE
            WHEN EXCLUDED.display_name IS NOT NULL THEN EXCLUDED.display_name
            ELSE business_users.display_name
          END
    RETURNING *
  `, [businessId, userId, role, JSON.stringify(perms), displayName || null]);
  return result.rows[0];
}

// ─── لیست اعضای فعال یک کسب‌وکار ────────────────────────────────────────────
async function getTeamMembers(businessId) {
  const result = await query(`
    SELECT bu.id, bu.user_id, bu.role, bu.is_active,
           bu.display_name, bu.permissions,
           u.name, u.telegram_id
    FROM business_users bu
    JOIN users u ON bu.user_id = u.id
    WHERE bu.business_id = $1 AND bu.is_active = 1
    ORDER BY bu.id
  `, [businessId]);
  return result.rows;
}

// ─── لیست همه اعضا (شامل غیرفعال) ───────────────────────────────────────────
async function getAllTeamMembers(businessId) {
  const result = await query(`
    SELECT bu.id, bu.user_id, bu.role, bu.is_active,
           bu.display_name, bu.permissions,
           u.name, u.telegram_id
    FROM business_users bu
    JOIN users u ON bu.user_id = u.id
    WHERE bu.business_id = $1
    ORDER BY bu.is_active DESC, bu.id
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

// ─── فعال کردن عضو ───────────────────────────────────────────────────────────
async function activateMember(businessId, userId) {
  const result = await query(`
    UPDATE business_users SET is_active = 1
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
  getAllTeamMembers,
  updateMemberRole,
  deactivateMember,
  activateMember,
  getBizContextByTelegramId,
  DEFAULT_PERMISSIONS,
  ROLE_LABELS,
};
