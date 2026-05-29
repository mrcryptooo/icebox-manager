'use strict';
// ─── Payroll Page — Phase 9A ──────────────────────────────────────────────────
const { layout, escHtml, fmtMoney, fmtNum } = require('./layout');

const ROLE_LABELS = {
  staff:         'کارمند',
  manager:       'مدیر',
  cashier:       'صندوق‌دار',
  delivery:      'پیک',
  business_owner:'مالک',
  super_admin:   'سوپر ادمین',
};

function payrollPage({ isSuperAdmin, bizName, staff }) {
  let tableHtml;
  if (!staff || staff.length === 0) {
    tableHtml = '<div class="empty-state">📭 هیچ پرسنلی ثبت نشده است.</div>';
  } else {
    const rows = staff.map(s => {
      const balance = Number(s.balance) || 0;
      const balanceCls = balance > 0 ? 'debt-positive' : (balance < 0 ? 'balance-negative' : '');
      const roleLabel = ROLE_LABELS[s.role] || escHtml(s.role);
      return `
      <tr>
        <td>${escHtml(s.displayName)}</td>
        <td>${roleLabel}</td>
        <td class="num-cell">${fmtMoney(s.baseSalary)}</td>
        <td class="num-cell">${fmtMoney(s.salaryPayment)}</td>
        <td class="num-cell">${fmtMoney(s.advance)}</td>
        <td class="num-cell">${fmtMoney(s.bonus)}</td>
        <td class="num-cell">${fmtMoney(s.deduction)}</td>
        <td class="num-cell ${balanceCls}">${fmtMoney(balance)}</td>
      </tr>`;
    }).join('\n');

    tableHtml = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>نام</th>
            <th>نقش</th>
            <th>حقوق پایه</th>
            <th>پرداخت شده</th>
            <th>مساعده</th>
            <th>پاداش</th>
            <th>کسورات</th>
            <th>مانده</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  const totalBalance = (staff || []).reduce((s, x) => s + (Number(x.balance) || 0), 0);
  const count = (staff || []).length;

  const summary = `
    <div class="summary-bar">
      <span>تعداد پرسنل: <strong>${fmtNum(count)}</strong></span>
      <span>جمع مانده‌ها: <strong class="${totalBalance > 0 ? 'debt-positive' : ''}">${fmtMoney(totalBalance)}</strong></span>
    </div>`;

  const content = `
    <div class="section-meta">
      <span class="biz-name">🏪 ${escHtml(bizName)}</span>
    </div>
    ${summary}
    ${tableHtml}`;

  return layout({
    title: 'پرسنل و حقوق',
    active: '/payroll',
    isSuperAdmin,
    content,
  });
}

module.exports = { payrollPage };
