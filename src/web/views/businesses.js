'use strict';
// ─── Businesses Page (super_admin only) — Phase 9A ────────────────────────────
const { layout, escHtml, fmtNum } = require('./layout');

function businessesPage({ isSuperAdmin, businesses }) {
  let tableHtml;
  if (!businesses || businesses.length === 0) {
    tableHtml = '<div class="empty-state">📭 هیچ کسب‌وکاری ثبت نشده است.</div>';
  } else {
    const rows = businesses.map(b => {
      const createdAt = b.created_at
        ? new Date(b.created_at).toLocaleDateString('fa-IR')
        : '—';
      return `
      <tr>
        <td>${fmtNum(b.id)}</td>
        <td>${escHtml(b.name)}</td>
        <td>${escHtml(b.owner_name || '—')}</td>
        <td>${escHtml(b.phone || '—')}</td>
        <td>${createdAt}</td>
        <td><span class="badge ${b.is_active == 1 ? 'badge-ok' : 'badge-off'}">${b.is_active == 1 ? 'فعال' : 'غیرفعال'}</span></td>
      </tr>`;
    }).join('\n');

    tableHtml = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>شناسه</th>
            <th>نام کسب‌وکار</th>
            <th>مالک</th>
            <th>تلفن</th>
            <th>تاریخ ثبت</th>
            <th>وضعیت</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  const content = `
    <div class="section-meta">
      <span>تعداد: <strong>${fmtNum((businesses || []).length)}</strong> کسب‌وکار</span>
    </div>
    ${tableHtml}`;

  return layout({
    title: 'کسب‌وکارها',
    active: '/businesses',
    isSuperAdmin,
    content,
  });
}

module.exports = { businessesPage };
