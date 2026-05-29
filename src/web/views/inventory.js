'use strict';
// ─── Inventory Page — Phase 9A ────────────────────────────────────────────────
const { layout, escHtml, fmtNum } = require('./layout');

function inventoryPage({ isSuperAdmin, bizName, items }) {
  let tableHtml;
  if (!items || items.length === 0) {
    tableHtml = '<div class="empty-state">📭 هیچ قلم انباری ثبت نشده است.</div>';
  } else {
    const rows = items.map(item => {
      const stock   = Number(item.stock) || 0;
      const minStock = Number(item.min_stock) || 0;
      const isLow   = stock <= minStock;
      const stockCls = isLow ? 'stock-low' : 'stock-ok';
      const badge   = isLow
        ? `<span class="badge badge-warn">کم‌موجودی</span>`
        : `<span class="badge badge-ok">مناسب</span>`;
      return `
      <tr class="${isLow ? 'row-highlight' : ''}">
        <td>${escHtml(item.name)}</td>
        <td class="num-cell ${stockCls}">${fmtNum(stock)}</td>
        <td class="num-cell">${fmtNum(minStock)}</td>
        <td>${escHtml(item.unit || '—')}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('\n');

    tableHtml = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>نام قلم</th>
            <th>موجودی فعلی</th>
            <th>حداقل موجودی</th>
            <th>واحد</th>
            <th>وضعیت</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  const totalItems = (items || []).length;
  const lowItems   = (items || []).filter(i => Number(i.stock) <= Number(i.min_stock)).length;

  const summary = `
    <div class="summary-bar">
      <span>اقلام فعال: <strong>${fmtNum(totalItems)}</strong></span>
      <span>کم‌موجودی: <strong class="${lowItems > 0 ? 'debt-positive' : ''}">${fmtNum(lowItems)}</strong></span>
    </div>`;

  const content = `
    <div class="section-meta">
      <span class="biz-name">🏪 ${escHtml(bizName)}</span>
    </div>
    ${summary}
    ${tableHtml}`;

  return layout({
    title: 'انبار',
    active: '/inventory',
    isSuperAdmin,
    content,
  });
}

module.exports = { inventoryPage };
