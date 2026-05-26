const { getSalesByDateRange, aggregateSales } = require('./salesService');
const { getExpensesByDateRange, aggregateExpenses, getTopExpenseCategoryForRange } = require('./expenseService');
const { getAllBranches, getBranchById } = require('./branchService');
const { formatMoney, formatNumber } = require('../utils/formatMoney');
const {
  getTodayDate, getWeekRange, getMonthRange,
  gregorianToJalaliDateString, getTodayJalali,
} = require('../utils/date');

// ─── گزارش یک شعبه ───────────────────────────────────────────────────────────
function buildReportText(label, branchName, sales, expensesTotal, topCategory) {
  const total = sales.cash + sales.pos + sales.cardTransfer + sales.online;
  const net = total - expensesTotal;
  const avgOrder = sales.orderCount > 0 ? total / sales.orderCount : 0;

  function pct(amount) {
    if (total === 0) return '۰٪';
    return formatNumber(Math.round(amount * 100 / total)) + '٪';
  }

  const sep = '━'.repeat(28);
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

function getSingleBranchReport(branchId, label, startDate, endDate) {
  const branch = getBranchById(branchId);
  const salesRows = getSalesByDateRange(branchId, startDate, endDate);
  const expenseRows = getExpensesByDateRange(branchId, startDate, endDate);
  if (salesRows.length === 0 && expenseRows.length === 0) {
    return `📊 ${label}\n🏪 شعبه: ${branch.name}\n\n⚠️ در این بازه گزارشی ثبت نشده است.`;
  }
  const sales = aggregateSales(salesRows);
  const expenses = aggregateExpenses(expenseRows);
  const topCategory = getTopExpenseCategoryForRange(branchId, startDate, endDate);
  return buildReportText(label, branch.name, sales, expenses, topCategory);
}

// ─── گزارش همه شعبه‌ها ───────────────────────────────────────────────────────
function buildAllBranchesReport(label, startDate, endDate) {
  const branches = getAllBranches();
  if (branches.length === 0) return 'هیچ شعبه‌ای ثبت نشده است.';

  const sep = '━'.repeat(28);
  let lines = [`${sep}\n📊 ${label} — همه شعبه‌ها\n${sep}`];
  let grandTotal = 0;
  let grandExpenses = 0;
  let hasData = false;

  for (const branch of branches) {
    const salesRows = getSalesByDateRange(branch.id, startDate, endDate);
    const expenseRows = getExpensesByDateRange(branch.id, startDate, endDate);
    const sales = aggregateSales(salesRows);
    const expenses = aggregateExpenses(expenseRows);
    const total = sales.cash + sales.pos + sales.cardTransfer + sales.online;
    grandTotal += total;
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
function buildComparisonText(label, startDate, endDate) {
  const branches = getAllBranches();
  if (branches.length === 0) return 'هیچ شعبه‌ای ثبت نشده است.';
  if (branches.length < 2) return 'برای مقایسه شعبه‌ها باید حداقل دو شعبه ثبت شده باشد.';

  const stats = branches.map(branch => {
    const salesRows = getSalesByDateRange(branch.id, startDate, endDate);
    const expenseRows = getExpensesByDateRange(branch.id, startDate, endDate);
    const sales = aggregateSales(salesRows);
    const expenses = aggregateExpenses(expenseRows);
    const total = sales.cash + sales.pos + sales.cardTransfer + sales.online;
    const avgOrder = sales.orderCount > 0 ? total / sales.orderCount : 0;
    return { name: branch.name, total, expenses, net: total - expenses, orderCount: sales.orderCount, avgOrder };
  });

  const sorted = [...stats].sort((a, b) => b.total - a.total);
  const best = sorted[0];
  const leastExpenses = [...stats].sort((a, b) => a.expenses - b.expenses)[0];
  const bestNet = [...stats].sort((a, b) => b.net - a.net)[0];
  const grandTotal = stats.reduce((s, b) => s + b.total, 0);
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
function getDailyReport(branchId) {
  const today = getTodayDate();
  return getSingleBranchReport(branchId, `گزارش امروز — ${getTodayJalali()}`, today, today);
}

function getDailyAllBranches() {
  const today = getTodayDate();
  return buildAllBranchesReport(`گزارش امروز — ${getTodayJalali()}`, today, today);
}

function getDailyComparison() {
  const today = getTodayDate();
  return buildComparisonText(`گزارش امروز — ${getTodayJalali()}`, today, today);
}

// ─── گزارش هفتگی ─────────────────────────────────────────────────────────────
function getWeeklyReport(branchId) {
  const { start, end } = getWeekRange();
  const label = `گزارش هفتگی (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return getSingleBranchReport(branchId, label, start, end);
}

function getWeeklyAllBranches() {
  const { start, end } = getWeekRange();
  const label = `گزارش هفتگی (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildAllBranchesReport(label, start, end);
}

function getWeeklyComparison() {
  const { start, end } = getWeekRange();
  const label = `گزارش هفتگی (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildComparisonText(label, start, end);
}

// ─── گزارش ماهانه ────────────────────────────────────────────────────────────
function getMonthlyReport(branchId) {
  const { start, end } = getMonthRange();
  const label = `گزارش ماهانه (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return getSingleBranchReport(branchId, label, start, end);
}

function getMonthlyAllBranches() {
  const { start, end } = getMonthRange();
  const label = `گزارش ماهانه (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildAllBranchesReport(label, start, end);
}

function getMonthlyComparison() {
  const { start, end } = getMonthRange();
  const label = `گزارش ماهانه (${gregorianToJalaliDateString(start)} تا ${gregorianToJalaliDateString(end)})`;
  return buildComparisonText(label, start, end);
}

// ─── گزارش بازه دلخواه (ورودی میلادی — تبدیل از شمسی در handler انجام شده) ──
function getCustomReport(branchId, startDate, endDate) {
  const label = `بازه ${gregorianToJalaliDateString(startDate)} تا ${gregorianToJalaliDateString(endDate)}`;
  return getSingleBranchReport(branchId, label, startDate, endDate);
}

function getCustomAllBranches(startDate, endDate) {
  const label = `بازه ${gregorianToJalaliDateString(startDate)} تا ${gregorianToJalaliDateString(endDate)}`;
  return buildAllBranchesReport(label, startDate, endDate);
}

function getCustomComparison(startDate, endDate) {
  const label = `بازه ${gregorianToJalaliDateString(startDate)} تا ${gregorianToJalaliDateString(endDate)}`;
  return buildComparisonText(label, startDate, endDate);
}

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getDailyAllBranches,
  getWeeklyAllBranches,
  getMonthlyAllBranches,
  getDailyComparison,
  getWeeklyComparison,
  getMonthlyComparison,
  getCustomReport,
  getCustomAllBranches,
  getCustomComparison,
};
