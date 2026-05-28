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
  ['🏪 مدیریت شعبه‌ها', '❓ راهنما'],
]).resize();

// کارمند
const staffMenu = Markup.keyboard([
  ['💰 ثبت فروش امروز', '🧾 ثبت خرج'],
  ['📊 گزارش‌ها', '❓ راهنما'],
]).resize();

// حسابدار
const accountantMenu = Markup.keyboard([
  ['📊 گزارش‌ها', '🗂️ مدیریت ثبت‌ها'],
  ['⚙️ تنظیمات', '❓ راهنما'],
]).resize();

// سازگاری با Phase 6 (برای جاهایی که هنوز mainMenu مستقیم استفاده می‌شود)
const mainMenu = businessOwnerMenu;

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
    ['🔄 تغییر نقش', '🚫 غیرفعال کردن'],
    ['🏠 منوی اصلی'],
  ]).resize();
}

// ─── انتخاب نقش ──────────────────────────────────────────────────────────────
function roleSelectKeyboard() {
  return Markup.keyboard([
    ['مدیر', 'کارمند'],
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
    exports:        'خروجی',
    manage_records: 'مدیریت ثبت‌ها',
    settings:       'تنظیمات',
    expenses:       'ثبت خرج',
  };
  const ALL = ['reports', 'exports', 'manage_records', 'settings', 'expenses'];
  const rows = ALL.map(s => [
    `${lockedSections.includes(s) ? '🔒' : '🔓'} ${LABELS[s]}`,
  ]);
  rows.push(['🏠 منوی اصلی']);
  return Markup.keyboard(rows).resize();
}

module.exports = {
  mainMenu,
  superAdminMenu,
  businessOwnerMenu,
  managerMenu,
  staffMenu,
  accountantMenu,
  getMainMenuForRole,
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
  roleSelectKeyboard,
  businessTypeKeyboard,
  licenseMenuKeyboard,
  lockSectionKeyboard,
};
