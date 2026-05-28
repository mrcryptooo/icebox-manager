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

  // ردیف ۵: تأمین‌کننده‌ها
  if (hasAll || has('suppliers.manage') || has('purchases.create') ||
      has('purchases.view') || has('supplier_payments.create') ||
      has('supplier_accounts.view')) {
    rows.push(['🏭 تأمین‌کننده‌ها']);
  }

  // ردیف ۵b: انبار مواد اولیه
  if (hasAll || has('inventory.view') || has('inventory.manage') ||
      has('inventory.consume') || has('inventory.adjust')) {
    rows.push(['📦 انبار']);
  }

  // ردیف ۵c: حساب پرسنل
  if (hasAll || has('payroll.view') || has('payroll.manage') ||
      has('payroll.pay') || has('payroll.adjust')) {
    rows.push(['👥 حساب پرسنل']);
  }

  // ردیف ۶: مجوزها (super_admin) + تنظیمات
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
    ['🧾 گزارش ریز مخارج'],
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
    ['🛒 خروجی خریدهای مواد'],
    ['📦 خروجی انبار'],
    ['📋 خروجی حقوق پرسنل'],
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

// ─── مدیریت دسترسی‌های یک عضو (Phase 7D + 8C) ───────────────────────────────
function permissionsKeyboard(perms) {
  const permsArr = Array.isArray(perms) ? perms : [];
  const ALL = [
    'sales.create',       'sales.view',         'sales.edit',      'sales.delete',
    'expenses.create',    'expenses.view',       'expenses.edit',   'expenses.delete',
    'reports.view',       'exports.create',
    'branches.manage',    'manage_records.view', 'settings.manage', 'team.manage',
    'suppliers.manage',   'purchases.create',    'purchases.view',
    'supplier_payments.create', 'supplier_accounts.view',
    'inventory.view',     'inventory.manage',    'inventory.consume', 'inventory.adjust',
    'payroll.view',       'payroll.manage',      'payroll.pay',       'payroll.adjust',
  ];
  const LBL = {
    'sales.create': 'ثبت فروش', 'sales.view': 'مشاهده فروش',
    'sales.edit': 'ویرایش فروش', 'sales.delete': 'حذف فروش',
    'expenses.create': 'ثبت خرج', 'expenses.view': 'مشاهده خرج',
    'expenses.edit': 'ویرایش خرج', 'expenses.delete': 'حذف خرج',
    'reports.view': 'مشاهده گزارش‌ها', 'exports.create': 'خروجی اطلاعات',
    'branches.manage': 'مدیریت شعبه‌ها', 'manage_records.view': 'مدیریت ثبت‌ها',
    'settings.manage': 'تنظیمات', 'team.manage': 'مدیریت تیم',
    'suppliers.manage': 'مدیریت تأمین‌کننده‌ها',
    'purchases.create': 'ثبت خرید مواد',
    'purchases.view': 'مشاهده خریدها',
    'supplier_payments.create': 'ثبت پرداخت به تأمین‌کننده',
    'supplier_accounts.view': 'مشاهده حساب تأمین‌کنندگان',
    'inventory.view': 'مشاهده انبار',
    'inventory.manage': 'مدیریت انبار',
    'inventory.consume': 'ثبت مصرف انبار',
    'inventory.adjust': 'اصلاح موجودی انبار',
    'payroll.view':    'مشاهده حقوق پرسنل',
    'payroll.manage':  'مدیریت حقوق پرسنل',
    'payroll.pay':     'ثبت پرداخت حقوق',
    'payroll.adjust':  'اصلاح حساب پرسنل',
  };
  const rows = ALL.map(p => [`${permsArr.includes(p) ? '✅' : '❌'} ${LBL[p]}`]);
  rows.push(['🔄 بازگردانی پیش‌فرض نقش']);
  rows.push(['🔙 بازگشت', '🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── منوی تأمین‌کننده‌ها (Phase 8) ───────────────────────────────────────────
function supplierMenuKeyboard() {
  return Markup.keyboard([
    ['➕ افزودن تأمین‌کننده', '📋 لیست تأمین‌کننده‌ها'],
    ['💳 حساب تأمین‌کنندگان'],
    ['🛒 ثبت خرید مواد', '💵 ثبت پرداخت به تأمین‌کننده'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب تأمین‌کننده از لیست ────────────────────────────────────────────
function supplierSelectKeyboard(suppliers) {
  const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const rows = suppliers.map((s, i) => {
    const num = NUMS[i] || `${i + 1}.`;
    return [`${num} ${s.name}`];
  });
  rows.push(['❌ لغو', '🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── واحد کالا ───────────────────────────────────────────────────────────────
function purchaseUnitKeyboard() {
  return Markup.keyboard([
    ['کیلو', 'عدد', 'لیتر'],
    ['کارتن', 'بسته', 'سایر'],
    ['❌ لغو'],
  ]).resize();
}

// ─── روش پرداخت به تأمین‌کننده ───────────────────────────────────────────────
function paymentMethodKeyboard() {
  return Markup.keyboard([
    ['نقدی', 'پوز'],
    ['کارت‌به‌کارت', 'آنلاین'],
    ['سایر'],
    ['❌ لغو'],
  ]).resize();
}

// ─── بازه گزارش ریز مخارج ────────────────────────────────────────────────────
function expenseDetailPeriodKeyboard() {
  return Markup.keyboard([
    ['📊 امروز', '📅 این هفته'],
    ['🗓️ این ماه', '📆 بازه دلخواه'],
    ['🏠 منوی اصلی'],
  ]).resize();
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

// ─── منوی انبار مواد اولیه (Phase 8C) ───────────────────────────────────────
function inventoryMenuKeyboard() {
  return Markup.keyboard([
    ['📋 موجودی فعلی', '⚠️ هشدار کمبود'],
    ['➕ افزودن ماده', '➖ ثبت مصرف/خروج'],
    ['🔧 اصلاح موجودی', '📜 گردش انبار'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب ماده از لیست انبار ───────────────────────────────────────────────
function inventoryItemSelectKeyboard(items) {
  const PD   = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  const fmtN = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => PD[d]);
  const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const rows = items.map((item, i) => {
    const num   = NUMS[i] || `${i + 1}.`;
    const stock = item.stock !== undefined ? ` — ${fmtN(item.stock)}` : '';
    return [`${num} ${item.name} (${item.unit})${stock}`];
  });
  rows.push(['❌ لغو', '🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── منوی حساب پرسنل (Phase 8D) ──────────────────────────────────────────────
function payrollMenuKeyboard() {
  return Markup.keyboard([
    ['📋 لیست حساب پرسنل', '💰 تعیین حقوق پایه'],
    ['💵 ثبت پرداخت حقوق', '🧾 ثبت برداشت / علی‌الحساب'],
    ['🍦 ثبت مصرف داخلی', '🎁 ثبت پاداش'],
    ['➖ ثبت کسری / جریمه', '📊 گزارش حقوق ماه'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب کارمند از لیست (Phase 8D) ───────────────────────────────────────
function staffSelectKeyboard(members) {
  const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const RLBL = {
    super_admin: 'سوپرادمین', business_owner: 'مالک',
    manager: 'سرپرست', staff: 'کارمند', accountant: 'حسابدار',
  };
  const rows = members.map((m, i) => {
    const num  = NUMS[i] || `${i + 1}.`;
    const name = m.display_name || m.name || `کاربر ${m.telegram_id}`;
    const role = RLBL[m.role] || m.role;
    return [`${num} ${name} — ${role}`];
  });
  rows.push(['❌ لغو', '🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

// ─── انتخاب نوع حقوق (Phase 8D) ─────────────────────────────────────────────
function salaryTypeKeyboard() {
  return Markup.keyboard([
    ['ماهانه', 'روزانه', 'ساعتی'],
    ['❌ لغو'],
  ]).resize();
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
  supplierMenuKeyboard,
  supplierSelectKeyboard,
  purchaseUnitKeyboard,
  paymentMethodKeyboard,
  expenseDetailPeriodKeyboard,
  inventoryMenuKeyboard,
  inventoryItemSelectKeyboard,
  payrollMenuKeyboard,
  staffSelectKeyboard,
  salaryTypeKeyboard,
};
