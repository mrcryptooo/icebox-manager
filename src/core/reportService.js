'use strict';
const { getSalesByDateRange, aggregateSales } = require('./salesService');
const { getExpensesByDateRange, aggregateExpenses, getTopExpenseCategoryForRange } = require('./expenseService');
const { getAllBranches, getBranchById } = require('./branchService');
const { formatMoney, formatNumber } = require('../utils/formatMoney');
const {
  getTodayDate, getWeekRange, getMonthRange,
  gregorianToJalaliDateString, getTodayJalali,
} = require('../utils/date');

// ─── فرمت کارتی گزارش یک شعبه ────────────────────────────────────────────────
function buildReportText(label, branchName, sales, expensesTotal, topCategory) {
  const total = sales.cash + sales.pos + sales.cardTransfer + sales.online;
  const net = total - expensesTotal;
  const avgOrder = sales.orderCount > 0 ? total / sales.orderCount : 0;

  function pct(amount) {
    if (total === 0) return '۰٪';
    return formatNumber(Math.round(amount * 100 / total)) + '٪';
  }

  const sep  = '━'.repeat(28);
  const thin = '─'.repeat(28);
  return (
    `${sep}\n` +
    `📊 ${label}\n` +
    `🏪 شعبه: ${branchName}\n` +
    `${sep}\n` +
    `💵 نقدی:          ${formatMoney(sales.cash)} (${pct(sales.cash)})\n` +
    `💳 پوز:           ${formatMoney(sales.pos)} (${pct(sales.pos)})\n` +
    `🔄 کارت‌به‌کارت:  ${formatMoney(sales.cardTransfer)} (${pct(sales.cardTransfer)})\n` +
    `🌐 آنلاین:        ${formatMoney(sales.online)} (${pct(sales.online)})\n` +
    `${thin}\n` +
    `🧾 فروش کل:  ${formatMoney(total)} تومان\n` +
    `📦 مخارج:    ${formatMoney(expensesTotal)} تومان\n` +
    `💰 مانده:    ${formatMoney(net)} تومان\n` +
    `${thin}\n` +
    `🛒 سفارش: ${formatNumber(sales.orderCount)}  |  📈 میانگین: ${formatMoney(avgOrder)} تومان` +
    (topCategory
      ? `\n📂 بیشترین خرج: ${topCategory.category} — ${formatMoney(topCategory.total)} تومان`
      : '') +
    `\n${sep}`
  );
}

// ─── گزارش یک شعبه ───────────────────────────────────────────────────────────
async function getSingleBranchReport(branchId, label, startDate, endDate, businessId) {
  const branch      = await getBranchById(branchId);
  const salesRows   = await getSalesByDateRange(branchId, startDate, endDate, businessId);
  const expenseRows = await getExpensesByDateRange(branchId, startDate, endDate, businessId);
  if (salesRows.length === 0 && expenseRows.length === 0) {
    return `📊 ${label}\n🏪 شعبه: ${branch ? branch.name : '—'}\n\n⚠️ در این بازه گزارشی ثبت نشده است.`;
  }
  const sales       = aggregateSales(salesRows);
  const expenses    = aggregateExpenses(expenseRows);
  const topCategory = await getTopExpenseCategoryForRange(branchId, startDate, endDate, businessId);
  return buildReportText(label, branch ? branch.name : '—', sales, expenses, topCategory);
}

// ─── گزارش همه شعبه‌ها ───────────────────────────────────────────────────────
async function buildAllBranchesReport(label, startDate, endDate, businessId) {
  const branches = await getAllBranches(businessId);
  if (branches.length === 0) return 'هیچ شعبه‌ای ثبت نشده است.';

  const sep = '━'.repeat(28);
  let lines = [`${sep}\n📊 ${label} — همه شعبه‌ها\n${sep}`];
  let grandTotal    = 0;
  let grandExpenses = 0;
  let hasData = false;

  for (const branch of branches) {
    const salesRows   = await getSalesByDateRange(branch.id, startDate, endDate, businessId);
    const expenseRows = await getExpensesByDateRange(branch.id, startDate, endDate, businessId);
    const sales    = aggregateSales(salesRows);
    const expenses = aggregateExpenses(expenseRows);
    const total    = sales.cash + sales.pos + sales.cardTransfer + sales.online;
    grandTotal    += total;
    grandExpenses += expenses;
    if (salesRows.length > 0 || expenseRows.length > 0) hasData = true;

    lines.push(
      `\n🏪 ${branch.name}\n` +
      `  فروش کل: ${formatMoney(total)} تومان\n` +
      `  مخارج: ${formatMoney(expenses)} تومان\n` +
      `  مانده: ${formatMoney(total - expenses)} تومان\n` +
      `  سفارش: ${formatNumber(sales.orderCount)}`
    );
  }

  if (!hasData) {
    return `📊 ${label} — همه شعبه‌ها\n\n⚠️ در این بازه گزارشی ثبت نشده است.`;
  }

  lines.push(
    `\n${'═'.repeat(28)}\n` +
    `💼 جمع کل فروش: ${formatMoney(grandTotal)} تومان\n` +
    `📦 جمع کل مخارج: ${formatMoney(grandExpenses)} تومان\n` +
    `💰 مانده کل: ${formatMoney(grandTotal - grandExpenses)} تومان`
  );
  return lines.join('\n');
}

// ─── گزارش مقایسه شعبه‌ها ────────────────────────────────────────────────────
async function buildComparisonText(label, startDate, endDate, businessId) {
  const branches = await getAllBranches(businessId);
  if (branches.length === 0) return 'هیچ شعبه‌ای ثبت نشده است.';
  if (branches.length < 2)  return 'برای مقایسه شعبه‌ها باید حداقل دو شعبه ثبت شده باشد.';

  const stats = await Promise.all(branches.map(async branch => {
    const salesRows   = await getSalesByDateRange(branch.id, startDate, endDate, businessId);
    const expenseRows = await getExpensesByDateRange(branch.id, startDate, endDate, businessId);
    const sales    = aggregateSales(salesRows);
    const expenses = aggregateExpenses(expenseRows);
    const total    = sales.cash + sales.pos + sales.cardTransfer + sales.online;
    const avgOrder = sales.orderCount > 0 ? total / sales.orderCount : 0;
    return { name: branch.name, total, expenses, net: total - expenses, orderCount: sales.orderCount, avgOrder };
  }));

  const sorted        = [...stats].sort((a, b) => b.total - a.total);
  const best          = sorted[0];
  const leastExpenses = [...stats].sort((a, b) => a.expenses - b.expenses)[0];
  const bestNet       = [...stats].sort((a, b) => b.net - a.net)[0];
  const grandTotal    = stats.reduce((s, b) => s + b.total,    0);
  const grandExpenses = stats.reduce((s, b) => s + b.expenses, 0);

  const sepC = '━'.repeat(28);
  const lines = [`${sepC}\n📊 ${label} — مقایسه شعبه‌ها\n${sepC}`];

  for (const b of sorted) {
    const share = grandTotal > 0 ? Math.round(b.total * 100 / grandTotal) : 0;
    lines.push(
      `\n🏪 ${b.name}\n` +
      `  💰 فروش کل: ${formatMoney(b.total)} (${formatNumber(share)}٪)\n` +
      `  📦 مخارج کل: ${formatMoney(b.expenses)} تومان\n` +
      `  🟢 مانده تقریبی: ${formatMoney(b.net)} تومان\n` +
      `  🛒 سفارش: ${formatNumber(b.orderCount)}\n` +
      `  📈 میانگین هر سفارش: ${formatMoney(b.avgOrder)} تومان`
    );
  }

  lines.push(
    `\n${'═'.repeat(28)}\n` +
    `🥇 بهترین فروش: ${best.name} — ${formatMoney(best.total)} تومان\n` +
    `💚 کم‌خرج‌ترین: ${leastExpenses.name} — ${formatMoney(leastExpenses.expenses)} تومان\n` +
    `🏆 بیشترین مانده: ${bestNet.name} — ${formatMoney(bestNet.net)} تومان\n` +
    `${'─'.repeat(28)}\n` +
    `💼 جمع فروش: ${formatMoney(grandTotal)} تومان\n` +
    `📦 جمع مخارج: ${formatMoney(grandExpenses)} تومان\n` +
    `💰 مانده کل: ${formatMoney(grandTotal - grandExpenses)} تومان`
  );
  return lines.join('\n');
}

// ─── گزارش روزانه ─────────────────────────────────────────────────────────────
async function getDailyReport(branchId, businessId) {
  const today = getTodayDate();
  return getSingleBranchReport(branchId, `گزارش امروز — ${getTodayJalali()}`, today, today, businessId);
}

async function getDailyAllBranches(businessId) {
  const today = getTodayDate();
  return buildAllBranchesReport(`گزارش امروز — ${getTodayJalali()}`, today, today, businessId);
}

async function getDailyComparison(businessId) {
  const today = getTodayDate();
  return buildComparisonText(`گزارش امروز — ${getTodayJalali()}`, today, today, businessId);
}

// ─── گزارش هفتگی ─────────────────────────────────────────────────────────────
async function getWeeklyReport(branchId, businessId) {
  const { start, end } = getWeekRange();
  const label = `گزارش هفتگی (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return getSingleBranchReport(branchId, label, start, end, businessId);
}

async function getWeeklyAllBranches(businessId) {
  const { start, end } = getWeekRange();
  const label = `گزارش هفتگی (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildAllBranchesReport(label, start, end, businessId);
}

async function getWeeklyComparison(businessId) {
  const { start, end } = getWeekRange();
  const label = `گزارش هفتگی (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildComparisonText(label, start, end, businessId);
}

// ─── گزارش ماهانه ────────────────────────────────────────────────────────────
async function getMonthlyReport(branchId, businessId) {
  const { start, end } = getMonthRange();
  const label = `گزارش ماهانه (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return getSingleBranchReport(branchId, label, start, end, businessId);
}

async function getMonthlyAllBranches(businessId) {
  const { start, end } = getMonthRange();
  const label = `گزارش ماهانه (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildAllBranchesReport(label, start, end, businessId);
}

async function getMonthlyComparison(businessId) {
  const { start, end } = getMonthRange();
  const label = `گزارش ماهانه (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildComparisonText(label, start, end, businessId);
}

// ─── گزارش بازه دلخواه ───────────────────────────────────────────────────────
async function getCustomReport(branchId, startDate, endDate, businessId) {
  const label = `بازه ${gregorianToJalaliDateString(startDate)} تا ${gregorianToJalaliDateString(endDate)}`;
  return getSingleBranchReport(branchId, label, startDate, endDate, businessId);
}

async function getCustomAllBranches(startDate, endDate, businessId) {
  const label = `بازه ${gregorianToJalaliDateString(startDate)} تا ${gregorianToJalaliDateString(endDate)}`;
  return buildAllBranchesReport(label, startDate, endDate, businessId);
}

async function getCustomComparison(startDate, endDate, businessId) {
  const label = `بازه ${gregorianToJalaliDateString(startDate)} تا ${gregorianToJalaliDateString(endDate)}`;
  return buildComparisonText(label, startDate, endDate, businessId);
}

module.exports = {
  getDailyReport,    getWeeklyReport,    getMonthlyReport,
  getDailyAllBranches, getWeeklyAllBranches, getMonthlyAllBranches,
  getDailyComparison,  getWeeklyComparison,  getMonthlyComparison,
  getCustomReport, getCustomAllBranches, getCustomComparison,
};
