'use strict';
// ─── Accounting Report Page — Phase 9A ────────────────────────────────────────
const { layout, escHtml, fmtMoney, fmtNum } = require('./layout');

function accountingPage({ isSuperAdmin, bizName, report, startDate, endDate, dateLabel }) {
  const { sales, expenses, purchases, inventory, payroll, summary } = report;

  function row(label, value, cls = '') {
    return `<tr class="${cls}"><td class="row-label">${escHtml(label)}</td><td class="row-value">${value}</td></tr>`;
  }

  const salesRows = `
    ${row('فروش نقدی', fmtMoney(sales.cash))}
    ${row('فروش POS', fmtMoney(sales.pos))}
    ${row('کارت/کارت‌به‌کارت', fmtMoney(sales.cardTransfer))}
    ${row('فروش آنلاین', fmtMoney(sales.online))}
    ${row('تعداد سفارش', fmtNum(sales.orderCount))}
    ${row('میانگین هر سفارش', fmtMoney(sales.avgOrderValue))}
    ${row('جمع فروش', fmtMoney(sales.total), 'row-total')}`;

  const expRows = `
    ${row('جمع مخارج', fmtMoney(expenses.total), 'row-total')}
    ${expenses.categories.length > 0
      ? expenses.categories.map(c => row(`↳ ${c.category}`, fmtMoney(c.total))).join('\n')
      : row('دسته‌بندی', '—')}`;

  const purchRows = `
    ${row('خرید مواد در بازه', fmtMoney(purchases.totalAmount))}
    ${row('پرداخت هنگام خرید', fmtMoney(purchases.paidAtPurchase))}
    ${row('پرداخت‌های بعدی', fmtMoney(purchases.laterPayments))}
    ${row('بدهی جاری (کل)', fmtMoney(purchases.currentDebt), 'row-warn')}
    ${row('تأمین‌کنندگان بدهکار', fmtNum(purchases.debtorCount))}`;

  const payrollRows = `
    ${row('حقوق پایه پرسنل فعال', fmtMoney(payroll.baseSalaryTotal))}
    ${row('پرداخت حقوق (بازه)', fmtMoney(payroll.salaryPayment))}
    ${row('مساعده (بازه)', fmtMoney(payroll.advance))}
    ${row('مصرف داخلی (بازه)', fmtMoney(payroll.internalConsumption))}
    ${row('پاداش (تعهد)', fmtMoney(payroll.bonus))}
    ${row('کسورات', fmtMoney(payroll.deduction))}
    ${row('مانده کل پرسنل', fmtMoney(payroll.totalStaffBalance), 'row-warn')}`;

  const invRows = `
    ${row('تعداد اقلام فعال', fmtNum(inventory.totalItems))}
    ${row('اقلام کم‌موجودی', fmtNum(inventory.lowStockCount), inventory.lowStockCount > 0 ? 'row-warn' : '')}`;

  const sumRows = `
    ${row('ورودی نقدی (فروش)', fmtMoney(summary.cashIn), 'row-total')}
    ${row('خروجی نقدی', fmtMoney(summary.cashOut), 'row-total')}
    ${row('خالص نقدی', fmtMoney(summary.netCash), summary.netCash >= 0 ? 'row-ok' : 'row-bad')}
    ${row('تعهدات (بدهی + مانده پرسنل)', fmtMoney(summary.obligations))}
    ${row('خالص پس از تعهدات', fmtMoney(summary.afterObligations), summary.afterObligations >= 0 ? 'row-ok' : 'row-bad')}`;

  function section(title, rowsHtml) {
    return `
    <div class="report-section">
      <h2 class="section-title">${title}</h2>
      <table class="report-table">
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }

  // Period selector form
  const periodForm = `
    <form method="GET" action="/accounting" class="period-form">
      <label for="start">از:</label>
      <input type="date" name="start" id="start" value="${escHtml(startDate)}">
      <label for="end">تا:</label>
      <input type="date" name="end" id="end" value="${escHtml(endDate)}">
      <button type="submit" class="btn-primary">نمایش</button>
    </form>`;

  const content = `
    <div class="section-meta">
      <span class="biz-name">🏪 ${escHtml(bizName)}</span>
      <span class="date-label">📅 ${escHtml(dateLabel)}</span>
    </div>
    ${periodForm}
    ${section('💰 فروش', salesRows)}
    ${section('🧾 مخارج', expRows)}
    ${section('🚚 خریدهای مواد و تأمین‌کنندگان', purchRows)}
    ${section('👥 پرسنل و حقوق', payrollRows)}
    ${section('📦 انبار', invRows)}
    ${section('📈 جمع‌بندی مالی', sumRows)}
    <div class="info-note">
      ⚠️ این گزارش برای مدیریت داخلی است و گزارش رسمی مالیاتی محسوب نمی‌شود.
    </div>`;

  return layout({
    title: 'گزارش حسابداری',
    active: '/accounting',
    isSuperAdmin,
    content,
  });
}

module.exports = { accountingPage };
