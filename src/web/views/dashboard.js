'use strict';
// ─── Dashboard Home Page — Phase 9A ───────────────────────────────────────────
const { layout, escHtml, fmtMoney, fmtNum } = require('./layout');

function dashboardPage({ isSuperAdmin, bizName, report, dateLabel }) {
  const { sales, expenses, purchases, inventory, payroll, summary } = report;

  const cards = [
    {
      icon: '💰',
      label: 'فروش کل',
      value: fmtMoney(sales.total),
      sub: `${fmtNum(sales.orderCount)} سفارش`,
      cls: 'card-green',
    },
    {
      icon: '🧾',
      label: 'مخارج',
      value: fmtMoney(expenses.total),
      sub: expenses.topCategory ? `بیشترین: ${escHtml(expenses.topCategory.category)}` : '—',
      cls: 'card-red',
    },
    {
      icon: '🚚',
      label: 'خریدهای مواد',
      value: fmtMoney(purchases.totalAmount),
      sub: `بدهی جاری: ${fmtMoney(purchases.currentDebt)}`,
      cls: 'card-orange',
    },
    {
      icon: '📦',
      label: 'اقلام انبار',
      value: fmtNum(inventory.totalItems),
      sub: inventory.lowStockCount > 0
        ? `⚠️ ${fmtNum(inventory.lowStockCount)} کم‌موجودی`
        : '✅ موجودی مناسب',
      cls: inventory.lowStockCount > 0 ? 'card-yellow' : 'card-blue',
    },
    {
      icon: '👥',
      label: 'حقوق پرداختی',
      value: fmtMoney(payroll.salaryPayment),
      sub: `مانده پرسنل: ${fmtMoney(payroll.totalStaffBalance)}`,
      cls: 'card-purple',
    },
    {
      icon: '📈',
      label: 'خالص نقدی',
      value: fmtMoney(summary.netCash),
      sub: `پس از تعهدات: ${fmtMoney(summary.afterObligations)}`,
      cls: summary.netCash >= 0 ? 'card-green' : 'card-red',
    },
  ];

  const cardsHtml = cards.map(c => `
    <div class="stat-card ${c.cls}">
      <div class="card-icon">${c.icon}</div>
      <div class="card-info">
        <div class="card-label">${c.label}</div>
        <div class="card-value">${c.value}</div>
        <div class="card-sub">${c.sub}</div>
      </div>
    </div>`).join('\n');

  const content = `
    <div class="section-meta">
      <span class="biz-name">🏪 ${escHtml(bizName)}</span>
      <span class="date-label">📅 ${escHtml(dateLabel)}</span>
    </div>
    <div class="stat-grid">
      ${cardsHtml}
    </div>
    <div class="info-note">
      ⚠️ این گزارش برای مدیریت داخلی است و گزارش رسمی مالیاتی محسوب نمی‌شود.
    </div>`;

  return layout({
    title: 'خلاصه وضعیت',
    active: '/',
    isSuperAdmin,
    content,
  });
}

module.exports = { dashboardPage };
