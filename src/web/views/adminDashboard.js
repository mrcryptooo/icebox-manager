'use strict';
// ─── Admin Dashboard Page (super_admin only) — Phase 9B ──────────────────────
const { layout, escHtml, fmtMoney, fmtNum } = require('./layout');

function adminDashboardPage({ overview, bizList, monthStart, today }) {
  // ── کارت‌های خلاصه کل سیستم ────────────────────────────────────────────────
  const cards = [
    { icon: '🏢', label: 'کسب‌وکارهای فعال',    value: fmtNum(overview.totalBusinesses),    cls: 'card-blue' },
    { icon: '🔑', label: 'لایسنس‌های کل',        value: fmtNum(overview.totalLicenses),       cls: 'card-purple' },
    { icon: '✅', label: 'لایسنس‌های استفاده‌شده', value: fmtNum(overview.usedLicenses),       cls: 'card-green' },
    { icon: '👤', label: 'کاربران سیستم',         value: fmtNum(overview.totalUsers),          cls: 'card-blue' },
    { icon: '💰', label: 'فروش کل (این ماه)',     value: fmtMoney(overview.totalSales),        cls: 'card-green' },
    { icon: '🧾', label: 'مخارج کل (این ماه)',    value: fmtMoney(overview.totalExpenses),     cls: 'card-red' },
    { icon: '🚚', label: 'بدهی تأمین‌کننده‌ها',   value: fmtMoney(overview.totalDebt),         cls: 'card-orange' },
    { icon: '👥', label: 'مانده حقوق پرسنل',      value: fmtMoney(overview.totalStaffBalance), cls: 'card-purple' },
  ];

  const cardsHtml = cards.map(c => `
    <div class="stat-card ${c.cls}">
      <div class="card-icon">${c.icon}</div>
      <div class="card-info">
        <div class="card-label">${c.label}</div>
        <div class="card-value">${c.value}</div>
      </div>
    </div>`).join('\n');

  // ── جدول کسب‌وکارها ─────────────────────────────────────────────────────────
  let tableHtml;
  if (!bizList || bizList.length === 0) {
    tableHtml = '<div class="empty-state">📭 هیچ کسب‌وکاری ثبت نشده است.</div>';
  } else {
    const rows = bizList.map(b => {
      const createdAt = b.created_at
        ? new Date(b.created_at).toLocaleDateString('fa-IR')
        : '—';
      const ownerInfo = b.owner_display_name
        ? `${escHtml(b.owner_display_name)}<br><small class="text-muted">${escHtml(String(b.owner_telegram_id || ''))}</small>`
        : (b.owner_telegram_id ? `<small class="text-muted">${escHtml(String(b.owner_telegram_id))}</small>` : '—');
      const netCls = Number(b.netCash) >= 0 ? 'num-positive' : 'num-negative';
      const debtCls = Number(b.debtTotal) > 0 ? 'num-negative' : '';
      return `
      <tr>
        <td><a href="/admin/business/${b.id}" class="detail-link">${escHtml(b.name)}</a></td>
        <td>${escHtml(b.type || '—')}</td>
        <td>${escHtml(b.city || '—')}</td>
        <td>${ownerInfo}</td>
        <td><span class="badge ${b.is_active == 1 ? 'badge-ok' : 'badge-off'}">${b.is_active == 1 ? 'فعال' : 'غیرفعال'}</span></td>
        <td>${createdAt}</td>
        <td class="num-cell">${fmtNum(b.memberCount)}</td>
        <td class="num-cell">${fmtMoney(b.salesTotal)}</td>
        <td class="num-cell">${fmtMoney(b.expTotal)}</td>
        <td class="num-cell ${netCls}">${fmtMoney(b.netCash)}</td>
        <td class="num-cell ${debtCls}">${fmtMoney(b.debtTotal)}</td>
        <td class="num-cell">${fmtMoney(b.staffBalance)}</td>
        <td><a href="/admin/business/${b.id}" class="btn-detail">جزئیات →</a></td>
      </tr>`;
    }).join('\n');

    tableHtml = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>نام کسب‌وکار</th>
            <th>نوع</th>
            <th>شهر</th>
            <th>مالک</th>
            <th>وضعیت</th>
            <th>تاریخ ثبت</th>
            <th>اعضا</th>
            <th>فروش ماه</th>
            <th>مخارج ماه</th>
            <th>مانده نقدی</th>
            <th>بدهی</th>
            <th>مانده پرسنل</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  const content = `
    <div class="section-meta">
      <span class="date-label">📅 آمار مالی از ${escHtml(monthStart)} تا ${escHtml(today)}</span>
    </div>
    <div class="stat-grid admin-grid">
      ${cardsHtml}
    </div>
    <div class="report-section">
      <h2 class="section-title">🏢 کسب‌وکارها</h2>
      ${tableHtml}
    </div>`;

  return layout({
    title: 'پنل مدیریت کل سیستم',
    active: '/admin',
    isSuperAdmin: true,
    content,
  });
}

module.exports = { adminDashboardPage };
