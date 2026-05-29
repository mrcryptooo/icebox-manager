'use strict';
const { query } = require('../db/database');

// ─── دسترسی‌های پیش‌فرض هر نقش ───────────────────────────────────────────────
const DEFAULT_PERMISSIONS = {
  business_owner: ['*'],
  manager: [
    'sales.create', 'sales.view', 'sales.edit',
    'expenses.create', 'expenses.view',
    'reports.view', 'manage_records.view',
    'purchases.create', 'purchases.view', 'supplier_accounts.view',
    'inventory.view', 'inventory.consume', 'inventory.adjust',
  ],
  staff: [
    'sales.create',
  ],
  accountant: [
    'sales.view', 'expenses.view',
    'reports.view', 'exports.create',
    'purchases.view', 'supplier_payments.create', 'supplier_accounts.view',
    'inventory.view',
    'payroll.view', 'payroll.pay',
    'accounting.view',
  ],
};

// ─── همه permissionهای قابل مدیریت ───────────────────────────────────────────
const ALL_PERMISSIONS = [
  'sales.create',       'sales.view',         'sales.edit',      'sales.delete',
  'expenses.create',    'expenses.view',       'expenses.edit',   'expenses.delete',
  'reports.view',       'exports.create',
  'branches.manage',    'manage_records.view', 'settings.manage', 'team.manage',
  'suppliers.manage',   'purchases.create',    'purchases.view',
  'supplier_payments.create', 'supplier_accounts.view',
  'inventory.view',     'inventory.manage',    'inventory.consume', 'inventory.adjust',
  'payroll.view',       'payroll.manage',      'payroll.pay',       'payroll.adjust',
  'accounting.view',
];

// ─── نام فارسی permissionها ────────────────────────────────────────────────────
const PERMISSION_LABELS = {
  'sales.create':        'ثبت فروش',
  'sales.view':          'مشاهده فروش',
  'sales.edit':          'ویرایش فروش',
  'sales.delete':        'حذف فروش',
  'expenses.create':     'ثبت خرج',
  'expenses.view':       'مشاهده خرج',
  'expenses.edit':       'ویرایش خرج',
  'expenses.delete':     'حذف خرج',
  'reports.view':        'مشاهده گزارش‌ها',
  'exports.create':      'خروجی اطلاعات',
  'branches.manage':          'مدیریت شعبه‌ها',
  'manage_records.view':      'مدیریت ثبت‌ها',
  'settings.manage':          'تنظیمات',
  'team.manage':              'مدیریت تیم',
  'suppliers.manage':         'مدیریت تأمین‌کننده‌ها',
  'purchases.create':         'ثبت خرید مواد',
  'purchases.view':           'مشاهده خریدها',
  'supplier_payments.create': 'ثبت پرداخت به تأمین‌کننده',
  'supplier_accounts.view':   'مشاهده حساب تأمین‌کنندگان',
  'inventory.view':           'مشاهده انبار',
  'inventory.manage':         'مدیریت انبار',
  'inventory.consume':        'ثبت مصرف انبار',
  'inventory.adjust':         'اصلاح موجودی انبار',
  'payroll.view':             'مشاهده حقوق پرسنل',
  'payroll.manage':           'مدیریت حقوق پرسنل',
  'payroll.pay':              'ثبت پرداخت حقوق',
  'payroll.adjust':           'اصلاح حساب پرسنل',
  'accounting.view':          'گزارش حسابداری کامل',
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

// ─── بررسی عضویت غیرفعال برای یک telegram_id ────────────────────────────────
// اگر کاربر در یک کسب‌وکار فعال عضو بوده اما is_active = 0 شده، این تابع رکورد را برمی‌گرداند.
// در /start برای نمایش پیام «حساب شما غیرفعال شده» به جای درخواست لایسنس استفاده می‌شود.
async function getInactiveMembership(telegramId) {
  const result = await query(`
    SELECT bu.id, b.name AS business_name
    FROM business_users bu
    JOIN users u  ON bu.user_id     = u.id
    JOIN businesses b ON bu.business_id = b.id
    WHERE u.telegram_id = $1
      AND bu.is_active = 0
      AND b.is_active  = 1
    LIMIT 1
  `, [telegramId]);
  return result.rows[0] || null;
}

// ─── خواندن دسترسی‌های فعلی یک عضو ───────────────────────────────────────────
async function getMemberPermissions(businessId, userId) {
  const result = await query(
    'SELECT permissions FROM business_users WHERE business_id = $1 AND user_id = $2',
    [businessId, userId]
  );
  if (!result.rows[0]) return [];
  const perms = result.rows[0].permissions;
  return Array.isArray(perms) ? perms : [];
}

// ─── ذخیره دسترسی‌های جدید برای یک عضو ───────────────────────────────────────
async function updateMemberPermissions(businessId, userId, perms) {
  const result = await query(`
    UPDATE business_users SET permissions = $1::jsonb
    WHERE business_id = $2 AND user_id = $3
    RETURNING *
  `, [JSON.stringify(perms), businessId, userId]);
  return result.rows[0] || null;
}

// ─── روشن/خاموش کردن یک permission ──────────────────────────────────────────
async function toggleMemberPermission(businessId, userId, permKey) {
  const perms = await getMemberPermissions(businessId, userId);
  const newPerms = perms.includes(permKey)
    ? perms.filter(p => p !== permKey)
    : [...perms, permKey];
  await updateMemberPermissions(businessId, userId, newPerms);
  return newPerms;
}

// ─── بازگردانی دسترسی‌ها به حالت پیش‌فرض نقش ────────────────────────────────
async function resetMemberPermissionsToRoleDefault(businessId, userId) {
  const result = await query(
    'SELECT role FROM business_users WHERE business_id = $1 AND user_id = $2',
    [businessId, userId]
  );
  if (!result.rows[0]) return null;
  const role  = result.rows[0].role;
  const perms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.staff;
  await updateMemberPermissions(businessId, userId, perms);
  return perms;
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
  getInactiveMembership,
  getMemberPermissions,
  updateMemberPermissions,
  toggleMemberPermission,
  resetMemberPermissionsToRoleDefault,
  getBizContextByTelegramId,
  DEFAULT_PERMISSIONS,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
};
