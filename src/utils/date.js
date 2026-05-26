const jalaali = require('jalaali-js');

function _pad(n) { return String(n).padStart(2, '0'); }

// ─── میلادی (داخلی — برای کوئری دیتابیس) ────────────────────────────────────
function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${_pad(now.getMonth() + 1)}-${_pad(now.getDate())}`;
}

function getWeekRange() {
  const now = new Date();
  const diffToSat = (now.getDay() + 1) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToSat);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatDate(start), end: formatDate(end) };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

function formatDate(dateObj) {
  return `${dateObj.getFullYear()}-${_pad(dateObj.getMonth() + 1)}-${_pad(dateObj.getDate())}`;
}

function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// ─── شمسی (ورودی کاربر و نمایش) ─────────────────────────────────────────────

// نرمال‌سازی اعداد فارسی/عربی به انگلیسی
function normalizeDateInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .trim();
}

// اعتبارسنجی تاریخ شمسی — فرمت 1405-03-05
function isValidJalaliDate(str) {
  const n = normalizeDateInput(str);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return false;
  const [jy, jm, jd] = n.split('-').map(Number);
  return jalaali.isValidJalaaliDate(jy, jm, jd);
}

// تبدیل تاریخ شمسی به میلادی برای کوئری دیتابیس
function jalaliToGregorianDateString(jStr) {
  const n = normalizeDateInput(jStr);
  const [jy, jm, jd] = n.split('-').map(Number);
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return `${gy}-${_pad(gm)}-${_pad(gd)}`;
}

// تبدیل تاریخ میلادی به شمسی برای نمایش به کاربر
function gregorianToJalaliDateString(gStr) {
  if (!gStr || typeof gStr !== 'string') return '—';
  try {
    const [gy, gm, gd] = gStr.split('-').map(Number);
    const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
    return `${jy}-${_pad(jm)}-${_pad(jd)}`;
  } catch { return gStr; }
}

// امروز به شمسی
function getTodayJalali() {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${jy}-${_pad(jm)}-${_pad(jd)}`;
}

// تعداد روزهای یک ماه شمسی (برای تقویم دکمه‌ای)
function getJalaliMonthDays(month, year) {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return jalaali.isLeapJalaaliYear(year) ? 30 : 29;
}

// اجزای تاریخ امروز به شمسی (برای سال خودکار)
function getTodayJalaliParts() {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { jy, jm, jd };
}

module.exports = {
  getTodayDate, getWeekRange, getMonthRange, formatDate, isValidDate,
  normalizeDateInput, isValidJalaliDate, jalaliToGregorianDateString,
  gregorianToJalaliDateString, getTodayJalali,
  getJalaliMonthDays, getTodayJalaliParts,
};
