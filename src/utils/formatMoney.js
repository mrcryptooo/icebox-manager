const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits(num) {
  return String(num).replace(/\d/g, d => persianDigits[d]);
}

function formatMoney(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '۰';
  const rounded = Math.round(Number(amount));
  const formatted = rounded.toLocaleString('en-US');
  return toPersianDigits(formatted);
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '۰';
  return toPersianDigits(Math.round(Number(num)).toLocaleString('en-US'));
}

module.exports = { formatMoney, formatNumber, toPersianDigits };
