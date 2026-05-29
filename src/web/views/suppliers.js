'use strict';
// ─── Suppliers Page — Phase 9A ────────────────────────────────────────────────
const { layout, escHtml, fmtMoney, fmtNum } = require('./layout');

function suppliersPage({ isSuperAdmin, bizName, suppliers }) {
  let tableHtml;
  if (!suppliers || suppliers.length === 0) {
    tableHtml = '<div class="empty-state">📭 هیچ تأمین‌کننده‌ای ثبت نشده است.</div>';
  } else {
    const rows = suppliers.map(s => {
      const debtCls = Number(s.debt) > 0 ? 'debt-positive' : 'debt-zero';
      return `
      <tr>
        <td>${escHtml(s.name)}</td>
        <td>${escHtml(s.phone || '—')}</td>
        <td class="num-cell">${fmtMoney(s.totalPurchases)}</td>
        <td class="num-cell">${fmtMoney(Number(s.paidAtPurchase) + Number(s.totalPayments))}</td>
        <td class="num-cell ${debtCls}">${fmtMoney(s.debt)}</td>
        <td><span class="badge ${s.is_active == 1 ? 'badge-ok' : 'badge-off'}">${s.is_active == 1 ? 'فعال' : 'غیرفعال'}</span></td>
      </tr>`;
    }).join('\n');

    tableHtml = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>نام</th>
            <th>تلفن</th>
            <th>جمع خرید</th>
            <th>جمع پرداخت</th>
            <th>بدهی</th>
            <th>وضعیت</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  const totalDebt = (suppliers || []).reduce((s, x) => s + (Number(x.debt) || 0), 0);
  const debtorCount = (suppliers || []).filter(x => Number(x.debt) > 0).length;

  const summary = `
    <div class="summary-bar">
      <span>تأمین‌کنندگان: <strong>${fmtNum((suppliers || []).length)}</strong></span>
      <span>بدهکار: <strong>${fmtNum(debtorCount)}</strong></span>
      <span>جمع بدهی: <strong class="${totalDebt > 0 ? 'debt-positive' : ''}">${fmtMoney(totalDebt)}</strong></span>
    </div>`;

  const content = `
    <div class="section-meta">
      <span class="biz-name">🏪 ${escHtml(bizName)}</span>
    </div>
    ${summary}
    ${tableHtml}`;

  return layout({
    title: 'تأمین‌کنندگان',
    active: '/suppliers',
    isSuperAdmin,
    content,
  });
}

module.exports = { suppliersPage };
