'use strict';
const { Markup } = require('telegraf');
const { getJalaliMonthDays } = require('../../utils/date');

// ─── منوهای اصلی بر اساس نقش ─────────────────────────────────────────────────

// سوپرادمین — کامل‌ترین منو
const superAdminMenu = Markup.keyboard([
  ['💰 ثبت فروش امروز', '🧾 ثبت خرج'],
  ['📊 گزارش‌ها', '🗂️ مدیریت ثبت‌ها'],
  ['🏪 مدیریت شعبه‌ها', '👥 مدیریت تیم'],
  ['🔑 مجوزها', '⚙️ تنظیمات'],
  ['❓ راهنما'],
]).resize();

// مالک کسب‌وکار
const businessOwnerMenu = Markup.keyboard([
  ['💰 ثبت فروش امروز', '🧾 ثبت خرج'],
  ['📊 گزارش‌ها', '🗂️ مدیریت ثبت‌ها'],
  ['🏪 مدیریت شعبه‌ها', '👥 مدیریت تیم'],
  ['⚙️ تنظیمات', '❓ راهنما'],
]).resize();

// مدیر
const managerMenu = Markup.keyboard([
  ['💰 ثبت فروش امروز', '🧾 ثبت خرج'],
  ['📊 گزارش‌ها', '🗂️ مدیریت ثبت‌ها'],
  ['❓ راهنما'],
]).resize();

// کارمند
const staffMenu = Markup.keyboard([
  ['💰 ثبت فروش امروز'],
  ['❓ راهنما'],
]).resize();

// حسابدار
const accountantMenu = Markup.keyboard([
  ['📊 گزارش‌ها', '📤 خروجی اطلاعات'],
  ['❓ راهنما'],
]).resize();

// سازگاری با Phase 6
const mainMenu = businessOwnerMenu;

/**
 * منوی اصلی پویا براساس permissionهای واقعی کاربر (Phase 7D)
 * اگر biz نداشت، منوی پیش‌فرض برمی‌گردد.
 */
function getMainMenuDynamic(biz) {
  if (!biz) return mainMenu;
  const perms  = Array.isArray(biz.permissions) ? biz.permissions : [];
  const hasAll = perms.includes('*');
  const role   = biz.role;
  const has    = (p) => hasAll || perms.includes(p);

  const rows = [];

  // ردیف ۱: ثبت فروش + ثبت خرج
  const r1 = [];
  if (has('sales.create'))    r1.push('💰 ثبت فروش امروز');
  if (has('expenses.create')) r1.push('🧾 ثبت خرج');
  if (r1.length) rows.push(r1);

  // ردیف ۲: گزارش‌ها + خروجی اطلاعات
  const r2 = [];
  if (has('reports.view'))   r2.push('📊 گزارش‌ها');
  if (has('exports.create')) r2.push('📤 خروجی اطلاعات');
  if (r2.length) rows.push(r2);

  // ردیف ۳: مدیریت ثبت‌ها
  if (has('manage_records.view')) rows.push(['🗂️ مدیریت ثبت‌ها']);

  // ردیف ۴: مدیریت شعبه‌ها + مدیریت تیم
  const r4 = [];
  if (has('branches.manage')) r4.push('🏪 مدیریت شعبه‌ها');
  if (has('team.manage'))     r4.push('👥 مدیریت تیم');
  if (r4.length) rows.push(r4);

  // ردیف ۵: مجوزها (super_admin) + تنظیمات
  const r5 = [];
  if (role === 'super_admin')                r5.push('🔑 مجوزها');
  if (hasAll || has('settings.manage'))      r5.push('⚙️ تنظیمات');
  if (r5.length) rows.push(r5);

  // ردیف آخر: راهنما
  rows.push(['❓ راهنما']);

  return Markup.keyboard(rows).resize();
}

/**
 * برگرداندن منوی اصلی متناسب با نقش کاربر
 */
function getMainMenuForRole(role) {
  switch (role) {
    case 'super_admin':    return superAdminMenu;
    case 'business_owner': return businessOwnerMenu;
    case 'manager':        return managerMenu;
    case 'staff':          return staffMenu;
    case 'accountant':     return accountantMenu;
    default:               return mainMenu;
  }
}

// ─── ورودی و لغو ─────────────────────────────────────────────────────────────
const cancelKeyboard = Markup.keyboard([
  ['❌ لغو', '🏠 منوی اصلی'],
]).resize();

// ─── انتخاب شعبه ─────────────────────────────────────────────────────────────
function branchKeyboard(branches) {
  const rows = branches.map(b => [b.name]);
  rows.push(['🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── وقتی شعبه‌ای وجود ندارد ─────────────────────────────────────────────────
function noBranchesActionKeyboard() {
  return Markup.keyboard([
    ['➕ افزودن شعبه'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── دسته‌بندی خرج ───────────────────────────────────────────────────────────
function expenseCategoryKeyboard() {
  return Markup.keyboard([
    ['مواد اولیه', 'شیر و خامه'],
    ['میوه', 'شکلات و تاپینگ'],
    ['بسته‌بندی', 'حقوق و دستمزد'],
    ['اجاره', 'قبوض'],
    ['تعمیرات', 'تبلیغات'],
    ['پیک و ارسال', 'سایر'],
    ['❌ لغو', '🏠 منوی اصلی'],
  ]).resize();
}

// ─── تأیید فروش ──────────────────────────────────────────────────────────────
function confirmSaleKeyboard() {
  return Markup.keyboard([
    ['✅ تأیید و ذخیره'],
    ['✏️ ویرایش', '❌ لغو'],
  ]).resize();
}

// ─── تأیید خرج ───────────────────────────────────────────────────────────────
function confirmExpenseKeyboard() {
  return Markup.keyboard([
    ['✅ تأیید و ذخیره'],
    ['✏️ ویرایش', '❌ لغو'],
  ]).resize();
}

// ─── منوی گزارش‌ها ────────────────────────────────────────────────────────────
function reportsMenuKeyboard() {
  return Markup.keyboard([
    ['📊 گزارش امروز', '📅 گزارش هفتگی'],
    ['🗓️ گزارش ماهانه', '🏪 گزارش شعبه'],
    ['🔁 مقایسه شعبه‌ها', '📆 بازه دلخواه'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب بازه زمانی ───────────────────────────────────────────────────────
function periodKeyboard() {
  return Markup.keyboard([
    ['📊 امروز', '📅 این هفته'],
    ['🗓️ این ماه', '📆 بازه دلخواه'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── نوع گزارش ───────────────────────────────────────────────────────────────
function reportTypeKeyboard() {
  return Markup.keyboard([
    ['یک شعبه', 'همه شعبه‌ها'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── مدیریت شعبه‌ها ──────────────────────────────────────────────────────────
function branchManageKeyboard() {
  return Markup.keyboard([
    ['➕ افزودن شعبه', '📋 لیست شعبه‌ها'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── مدیریت ثبت‌ها ───────────────────────────────────────────────────────────
function manageRecordsKeyboard() {
  return Markup.keyboard([
    ['📋 آخرین فروش‌ها', '📋 آخرین مخارج'],
    ['🗑️ حذف فروش', '🗑️ حذف خرج'],
    ['✏️ ویرایش فروش', '✏️ ویرایش خرج'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── تأیید حذف ───────────────────────────────────────────────────────────────
function confirmDeleteKeyboard() {
  return Markup.keyboard([
    ['🗑️ بله، حذف شود'],
    ['❌ لغو'],
  ]).resize();
}

// ─── تأیید (عمومی) ───────────────────────────────────────────────────────────
function confirmYesNoKeyboard() {
  return Markup.keyboard([
    ['✅ بله، مطمئنم'],
    ['❌ خیر، لغو'],
  ]).resize();
}

// ─── تنظیمات (business_owner / super_admin) ──────────────────────────────────
function settingsKeyboard() {
  return Markup.keyboard([
    ['📤 خروجی اطلاعات', '🔒 قفل بخش‌ها'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── تنظیمات (accountant) ────────────────────────────────────────────────────
function settingsKeyboardSimple() {
  return Markup.keyboard([
    ['📤 خروجی اطلاعات'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── منوی خروجی CSV ──────────────────────────────────────────────────────────
function exportMenuKeyboard() {
  return Markup.keyboard([
    ['📊 خروجی فروش‌ها', '💰 خروجی مخارج'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب ماه شمسی ─────────────────────────────────────────────────────────
function jalaliMonthsKeyboard() {
  return Markup.keyboard([
    ['فروردین', 'اردیبهشت', 'خرداد'],
    ['تیر', 'مرداد', 'شهریور'],
    ['مهر', 'آبان', 'آذر'],
    ['دی', 'بهمن', 'اسفند'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب روز شمسی ─────────────────────────────────────────────────────────
function jalaliDaysKeyboard(month, year) {
  const maxDay = getJalaliMonthDays(month, year);
  const PD = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const toPersian = n => String(n).replace(/\d/g, d => PD[parseInt(d)]);
  const rows = [];
  let row = [];
  for (let d = 1; d <= maxDay; d++) {
    row.push(toPersian(d));
    if (row.length === 7) { rows.push([...row]); row = []; }
  }
  if (row.length > 0) rows.push([...row]);
  rows.push(['🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── مدیریت تیم ──────────────────────────────────────────────────────────────
function teamMenuKeyboard() {
  return Markup.keyboard([
    ['➕ افزودن عضو', '📋 لیست اعضا'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب عضو از لیست (شامل غیرفعال) ─────────────────────────────────────
function memberSelectKeyboard(members) {
  const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const RLBL = {
    super_admin: 'سوپرادمین', business_owner: 'مالک',
    manager: 'سرپرست', staff: 'کارمند', accountant: 'حسابدار',
  };
  const rows = members.map((m, i) => {
    const num    = NUMS[i] || `${i + 1}.`;
    const name   = m.display_name || m.name || `کاربر ${m.telegram_id}`;
    const role   = RLBL[m.role] || m.role;
    const status = (m.is_active === 1 || m.is_active === true) ? '' : ' 🚫';
    return [`${num} ${name} — ${role}${status}`];
  });
  rows.push(['🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── عملیات روی عضو انتخاب‌شده ───────────────────────────────────────────────
function memberActionKeyboard(isActive) {
  return Markup.keyboard([
    ['🔄 تغییر نقش', '🔐 مدیریت دسترسی‌ها'],
    [isActive ? '🚫 غیرفعال کردن عضو' : '✅ فعال کردن عضو'],
    ['👁 دیدن دسترسی‌ها'],
    ['🔙 بازگشت به لیست'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── مدیریت دسترسی‌های یک عضو (Phase 7D) ────────────────────────────────────
function permissionsKeyboard(perms) {
  const permsArr = Array.isArray(perms) ? perms : [];
  const ALL = [
    'sales.create',       'sales.view',         'sales.edit',      'sales.delete',
    'expenses.create',    'expenses.view',       'expenses.edit',   'expenses.delete',
    'reports.view',       'exports.create',
    'branches.manage',    'manage_records.view', 'settings.manage', 'team.manage',
  ];
  const LBL = {
    'sales.create': 'ثبت فروش', 'sales.view': 'مشاهده فروش',
    'sales.edit': 'ویرایش فروش', 'sales.delete': 'حذف فروش',
    'expenses.create': 'ثبت خرج', 'expenses.view': 'مشاهده خرج',
    'expenses.edit': 'ویرایش خرج', 'expenses.delete': 'حذف خرج',
    'reports.view': 'مشاهده گزارش‌ها', 'exports.create': 'خروجی اطلاعات',
    'branches.manage': 'مدیریت شعبه‌ها', 'manage_records.view': 'مدیریت ثبت‌ها',
    'settings.manage': 'تنظیمات', 'team.manage': 'مدیریت تیم',
  };
  const rows = ALL.map(p => [`${permsArr.includes(p) ? '✅' : '❌'} ${LBL[p]}`]);
  rows.push(['🔄 بازگردانی پیش‌فرض نقش']);
  rows.push(['🔙 بازگشت', '🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── انتخاب نقش ──────────────────────────────────────────────────────────────
function roleSelectKeyboard() {
  return Markup.keyboard([
    ['سرپرست', 'کارمند'],
    ['حسابدار'],
    ['❌ لغو'],
  ]).resize();
}

// ─── نوع کسب‌وکار ────────────────────────────────────────────────────────────
function businessTypeKeyboard() {
  return Markup.keyboard([
    ['بستنی‌فروشی', 'شیرینی‌فروشی'],
    ['کافه', 'رستوران'],
    ['سایر'],
    ['❌ لغو'],
  ]).resize();
}

// ─── مدیریت لایسنس ───────────────────────────────────────────────────────────
function licenseMenuKeyboard() {
  return Markup.keyboard([
    ['➕ ایجاد لایسنس جدید', '📋 لیست لایسنس‌ها'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب بخش برای قفل ─────────────────────────────────────────────────────
function lockSectionKeyboard(lockedSections) {
  const LABELS = {
    reports:        'گزارش‌ها',
    exports:        'خروجی اطلاعات',
    manage_records: 'مدیریت ثبت‌ها',
    settings:       'تنظیمات',
    expenses:       'مخارج',
  };
  const ALL = ['reports', 'exports', 'manage_records', 'settings', 'expenses'];
  const rows = ALL.map(s => [
    `${lockedSections.includes(s) ? '🔒' : '🔓'} ${LABELS[s]}`,
  ]);
  rows.push(['🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── عملیات روی بخش قفل‌شده/آزاد ────────────────────────────────────────────
function lockSectionActionKeyboard(hasLock) {
  if (hasLock) {
    return Markup.keyboard([
      ['🔓 غیرفعال کردن قفل'],
      ['🔑 تغییر رمز'],
      ['❌ لغو', '🏠 منوی اصلی'],
    ]).resize();
  }
  return Markup.keyboard([
    ['🔐 فعال کردن قفل'],
    ['❌ لغو', '🏠 منوی اصلی'],
  ]).resize();
}

module.exports = {
  mainMenu,
  superAdminMenu,
  businessOwnerMenu,
  managerMenu,
  staffMenu,
  accountantMenu,
  getMainMenuForRole,
  getMainMenuDynamic,
  cancelKeyboard,
  branchKeyboard,
  noBranchesActionKeyboard,
  expenseCategoryKeyboard,
  confirmSaleKeyboard,
  confirmExpenseKeyboard,
  reportsMenuKeyboard,
  periodKeyboard,
  reportTypeKeyboard,
  branchManageKeyboard,
  manageRecordsKeyboard,
  confirmDeleteKeyboard,
  confirmYesNoKeyboard,
  jalaliMonthsKeyboard,
  jalaliDaysKeyboard,
  settingsKeyboard,
  settingsKeyboardSimple,
  exportMenuKeyboard,
  teamMenuKeyboard,
  memberSelectKeyboard,
  memberActionKeyboard,
  permissionsKeyboard,
  roleSelectKeyboard,
  businessTypeKeyboard,
  licenseMenuKeyboard,
  lockSectionKeyboard,
  lockSectionActionKeyboard,
};
