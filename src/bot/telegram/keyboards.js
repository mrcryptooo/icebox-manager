const { Markup } = require('telegraf');
const { getJalaliMonthDays } = require('../../utils/date');

// ─── منوی اصلی ───────────────────────────────────────────────────────────────
const mainMenu = Markup.keyboard([
  ['💰 ثبت فروش امروز', '🧾 ثبت خرج'],
  ['📊 گزارش‌ها', '🗂️ مدیریت ثبت‌ها'],
  ['🏪 مدیریت شعبه‌ها', '⚙️ تنظیمات'],
  ['❓ راهنما'],
]).resize();

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

module.exports = {
  mainMenu,
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
  jalaliMonthsKeyboard,
  jalaliDaysKeyboard,
};
