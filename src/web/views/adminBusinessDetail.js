'use strict';
// ─── Admin Business Detail Page (super_admin only) — Phase 9B ────────────────
const { layout, escHtml, fmtMoney, fmtNum } = require('./layout');

const ROLE_LABELS = {
  business_owner: 'مالک کسب‌وکار',
  manager:        'سرپرست',
  staff:          'کارمند',
  cashier:        'صندوق‌دار',
  delivery:       'پیک',
  accountant:     'حسابدار',
  super_admin:    'سوپر ادمین',
};

function fmtDate(val) {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('fa-IR'); } catch (_) { return String(val); }
}

// ── جدول‌ساز عمومی ────────────────────────────────────────────────────────────
function makeTable(headers, rows) {
  if (!rows || rows.length === 0) {
    return '<div class="empty-state" style="padding:16px 24px">ثبتی وجود ندارد.</div>';
  }
  const ths = headers.map(h => `<th>${escHtml(h)}</th>`).join('');
  const trs = rows.map(cells =>
    `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
  ).join('\n');
  return `
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>
  </div>`;
}

// ── صفحه اصلی ─────────────────────────────────────────────────────────────────
function adminBusinessDetailPage({
  detail, report, recentSales, recentExpenses,
  suppliers, inventory, payroll,
  recentPurchases, recentSupplierPayments,
  monthStart, today,
}) {
  const { biz, owner, license, team, branches } = detail;

  // ─── کارت اطلاعات کسب‌وکار ─────────────────────────────────────────────────
  const infoCard = `
  <div class="detail-info-grid">
    <div class="info-block">
      <div class="info-label">نام کسب‌وکار</div>
      <div class="info-value">${escHtml(biz.name)}</div>
    </div>
    <div class="info-block">
      <div class="info-label">نوع</div>
      <div class="info-value">${escHtml(biz.type || '—')}</div>
    </div>
    <div class="info-block">
      <div class="info-label">شهر</div>
      <div class="info-value">${escHtml(biz.city || '—')}</div>
    </div>
    <div class="info-block">
      <div class="info-label">تلفن</div>
      <div class="info-value">${escHtml(biz.phone || '—')}</div>
    </div>
    <div class="info-block">
      <div class="info-label">وضعیت</div>
      <div class="info-value">
        <span class="badge ${biz.is_active == 1 ? 'badge-ok' : 'badge-off'}">
          ${biz.is_active == 1 ? 'فعال' : 'غیرفعال'}
        </span>
      </div>
    </div>
    <div class="info-block">
      <div class="info-label">تاریخ ثبت</div>
      <div class="info-value">${fmtDate(biz.created_at)}</div>
    </div>
    <div class="info-block">
      <div class="info-label">مالک</div>
      <div class="info-value">${owner ? escHtml(owner.display_name || owner.name || '—') : '—'}</div>
    </div>
    <div class="info-block">
      <div class="info-label">تلگرام مالک</div>
      <div class="info-value">${owner ? escHtml(String(owner.telegram_id || '—')) : '—'}</div>
    </div>
    <div class="info-block">
      <div class="info-label">لایسنس</div>
      <div class="info-value">${license ? escHtml(license.code) : (biz.license_code ? escHtml(biz.license_code) : '—')}</div>
    </div>
    <div class="info-block">
      <div class="info-label">وضعیت لایسنس</div>
      <div class="info-value">
        ${license
          ? `<span class="badge ${license.is_used ? 'badge-ok' : 'badge-warn'}">${license.is_used ? 'فعال‌شده' : 'استفاده‌نشده'}</span>`
          : '<span class="badge badge-off">ثبت‌نشده</span>'}
      </div>
    </div>
    <div class="info-block">
      <div class="info-label">تاریخ فعال‌سازی</div>
      <div class="info-value">${license ? fmtDate(license.used_at) : '—'}</div>
    </div>
    <div class="info-block">
      <div class="info-label">شعبه‌ها</div>
      <div class="info-value">${fmtNum(branches.length)}</div>
    </div>
  </div>`;

  // ─── کارت‌های خلاصه حسابداری این ماه ──────────────────────────────────────
  let acctCards = '';
  if (report) {
    const { sales, expenses, purchases, inventory: inv, summary } = report;
    const acctData = [
      { icon: '💰', label: 'فروش', value: fmtMoney(sales.total), cls: 'card-green' },
      { icon: '🧾', label: 'مخارج', value: fmtMoney(expenses.total), cls: 'card-red' },
      { icon: '🚚', label: 'بدهی تأمین‌کننده', value: fmtMoney(purchases.currentDebt), cls: 'card-orange' },
      { icon: '📦', label: 'اقلام انبار', value: fmtNum(inv.totalItems), cls: inv.lowStockCount > 0 ? 'card-yellow' : 'card-blue' },
      { icon: '📈', label: 'مانده نقدی', value: fmtMoney(summary.netCash), cls: summary.netCash >= 0 ? 'card-green' : 'card-red' },
      { icon: '📉', label: 'پس از تعهدات', value: fmtMoney(summary.afterObligations), cls: summary.afterObligations >= 0 ? 'card-green' : 'card-red' },
    ];
    acctCards = `
    <div class="stat-grid">
      ${acctData.map(c => `
      <div class="stat-card ${c.cls}">
        <div class="card-icon">${c.icon}</div>
        <div class="card-info">
          <div class="card-label">${c.label}</div>
          <div class="card-value">${c.value}</div>
        </div>
      </div>`).join('\n')}
    </div>`;
  }

  // ─── جدول اعضای تیم ─────────────────────────────────────────────────────────
  const teamTable = makeTable(
    ['نام', 'نقش', 'تلگرام', 'وضعیت', 'تاریخ عضویت'],
    team.map(m => [
      escHtml(m.display_name),
      escHtml(ROLE_LABELS[m.role] || m.role),
      escHtml(String(m.telegram_id || '—')),
      `<span class="badge ${m.is_active == 1 ? 'badge-ok' : 'badge-off'}">${m.is_active == 1 ? 'فعال' : 'غیرفعال'}</span>`,
      fmtDate(m.created_at),
    ])
  );

  // ─── شعبه‌ها ─────────────────────────────────────────────────────────────────
  const branchTable = makeTable(
    ['شناسه', 'نام شعبه', 'آدرس', 'وضعیت'],
    branches.map(b => [
      fmtNum(b.id),
      escHtml(b.name),
      escHtml(b.address || '—'),
      `<span class="badge ${b.is_active == 1 ? 'badge-ok' : 'badge-off'}">${b.is_active == 1 ? 'فعال' : 'غیرفعال'}</span>`,
    ])
  );

  // ─── فروش‌های اخیر ──────────────────────────────────────────────────────────
  const salesTable = makeTable(
    ['تاریخ', 'شعبه', 'نقدی', 'پوز', 'کارت', 'آنلاین', 'جمع', 'سفارش', 'یادداشت'],
    recentSales.map(s => [
      escHtml(s.sale_date),
      escHtml(s.branch_name),
      fmtMoney(s.cash_amount),
      fmtMoney(s.pos_amount),
      fmtMoney(s.card_transfer_amount),
      fmtMoney(s.online_amount),
      `<strong>${fmtMoney(s.total)}</strong>`,
      fmtNum(s.order_count),
      escHtml(s.note || '—'),
    ])
  );

  // ─── مخارج اخیر ─────────────────────────────────────────────────────────────
  const expTable = makeTable(
    ['تاریخ', 'دسته‌بندی', 'مبلغ', 'شعبه', 'یادداشت'],
    recentExpenses.map(e => [
      escHtml(e.expense_date),
      escHtml(e.category),
      fmtMoney(e.amount),
      escHtml(e.branch_name),
      escHtml(e.note || '—'),
    ])
  );

  // ─── تأمین‌کنندگان ──────────────────────────────────────────────────────────
  const suppTable = makeTable(
    ['نام تأمین‌کننده', 'جمع خرید', 'پرداخت‌شده', 'بدهی', 'وضعیت'],
    suppliers.map(s => {
      const totalPaid = Number(s.paidAtPurchase || 0) + Number(s.totalPayments || 0);
      const debt = Number(s.debt || 0);
      return [
        escHtml(s.name),
        fmtMoney(s.totalPurchases),
        fmtMoney(totalPaid),
        `<span class="${debt > 0 ? 'num-negative' : ''}">${fmtMoney(debt)}</span>`,
        `<span class="badge ${s.is_active == 1 ? 'badge-ok' : 'badge-off'}">${s.is_active == 1 ? 'فعال' : 'غیرفعال'}</span>`,
      ];
    })
  );

  // ─── انبار ───────────────────────────────────────────────────────────────────
  const invTable = makeTable(
    ['نام قلم', 'موجودی', 'حداقل', 'واحد', 'وضعیت'],
    inventory.map(i => {
      const stock = Number(i.stock) || 0;
      const min   = Number(i.min_stock) || 0;
      const isLow = stock <= min;
      return [
        escHtml(i.name),
        `<span class="${isLow ? 'num-negative' : 'num-positive'}">${fmtNum(stock)}</span>`,
        fmtNum(min),
        escHtml(i.unit || '—'),
        `<span class="badge ${isLow ? 'badge-warn' : 'badge-ok'}">${isLow ? 'کم‌موجودی' : 'مناسب'}</span>`,
      ];
    })
  );

  // ─── پرسنل ──────────────────────────────────────────────────────────────────
  const payrollTable = makeTable(
    ['نام', 'نقش', 'حقوق پایه', 'پرداخت‌شده', 'مساعده', 'پاداش', 'کسری', 'مانده'],
    payroll.map(p => {
      const bal = Number(p.balance) || 0;
      return [
        escHtml(p.display_name),
        escHtml(ROLE_LABELS[p.role] || p.role),
        fmtMoney(p.base_salary),
        fmtMoney(p.salary_payment),
        fmtMoney(p.advance),
        fmtMoney(p.bonus),
        fmtMoney(p.deduction),
        `<span class="${bal > 0 ? 'num-negative' : (bal < 0 ? 'num-positive' : '')}">${fmtMoney(bal)}</span>`,
      ];
    })
  );

  // ─── خریدهای اخیر ────────────────────────────────────────────────────────────
  const purchTable = makeTable(
    ['تاریخ', 'تأمین‌کننده', 'ماده', 'تعداد', 'واحد', 'جمع کل', 'پرداخت‌شده', 'مانده'],
    recentPurchases.map(p => [
      escHtml(p.purchase_date),
      escHtml(p.supplier_name),
      escHtml(p.item_name),
      fmtNum(p.quantity),
      escHtml(p.unit),
      fmtMoney(p.total_amount),
      fmtMoney(p.paid_amount),
      `<span class="${Number(p.remaining) > 0 ? 'num-negative' : ''}">${fmtMoney(p.remaining)}</span>`,
    ])
  );

  // ─── پرداخت‌های اخیر تأمین‌کننده ────────────────────────────────────────────
  const payTable = makeTable(
    ['تاریخ', 'تأمین‌کننده', 'مبلغ', 'روش', 'یادداشت'],
    recentSupplierPayments.map(p => [
      escHtml(p.payment_date),
      escHtml(p.supplier_name),
      fmtMoney(p.amount),
      escHtml(p.method || '—'),
      escHtml(p.note || '—'),
    ])
  );

  // ─── کنار هم گذاشتن همه بخش‌ها ─────────────────────────────────────────────
  function section(title, html) {
    return `
    <div class="report-section">
      <h2 class="section-title">${title}</h2>
      ${html}
    </div>`;
  }

  const content = `
    <div class="detail-back">
      <a href="/admin" class="back-link">← بازگشت به پنل ادمین</a>
    </div>

    ${section('🏪 مشخصات کسب‌وکار', infoCard)}

    <div class="section-meta">
      <span class="date-label">📅 خلاصه مالی این ماه: ${escHtml(monthStart)} تا ${escHtml(today)}</span>
    </div>
    ${acctCards}

    ${section('👥 اعضای تیم ('+fmtNum(team.length)+')', teamTable)}
    ${section('🏬 شعبه‌ها ('+fmtNum(branches.length)+')', branchTable)}
    ${section('💰 فروش‌های اخیر (آخرین ۲۰)', salesTable)}
    ${section('🧾 مخارج اخیر (آخرین ۲۰)', expTable)}
    ${section('🚚 تأمین‌کنندگان', suppTable)}
    ${section('🛒 خریدهای مواد اخیر (آخرین ۲۰)', purchTable)}
    ${section('💳 پرداخت‌های اخیر به تأمین‌کننده (آخرین ۲۰)', payTable)}
    ${section('📦 موجودی انبار', invTable)}
    ${section('👤 حساب پرسنل', payrollTable)}

    <div class="info-note">
      ⚠️ این گزارش برای مدیریت داخلی سیستم است. اطلاعات هر کسب‌وکار محرمانه است.
    </div>`;

  return layout({
    title: `جزئیات: ${escHtml(biz.name)}`,
    active: '/admin',
    isSuperAdmin: true,
    content,
  });
}

module.exports = { adminBusinessDetailPage };
