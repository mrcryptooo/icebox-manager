'use strict';
// ─── HTML Layout Helper — Phase 9A ────────────────────────────────────────────

// Escape HTML to prevent XSS
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format money with commas and تومان
function fmtMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('fa-IR') + ' تومان';
}

// Format number with commas only
function fmtNum(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('fa-IR');
}

// Sidebar nav links
function navLinks(active, isSuperAdmin) {
  // لینک‌های پایه برای همه کاربران
  const bizLinks = [
    { href: '/',            icon: '🏠', label: 'خلاصه' },
    { href: '/accounting',  icon: '📊', label: 'حسابداری' },
    { href: '/suppliers',   icon: '🚚', label: 'تأمین‌کنندگان' },
    { href: '/inventory',   icon: '📦', label: 'انبار' },
    { href: '/payroll',     icon: '👥', label: 'پرسنل' },
  ];

  function linkHtml(l) {
    const cls = (l.href === active || (active && active.startsWith('/admin') && l.href === '/admin')) ? 'active' : '';
    return `<a href="${l.href}" class="nav-link ${cls}">${l.icon} <span>${escHtml(l.label)}</span></a>`;
  }

  if (isSuperAdmin) {
    // super_admin: بخش ادمین کل + جداکننده + لینک‌های کسب‌وکار
    const adminLinks = [
      { href: '/admin', icon: '🌐', label: 'پنل ادمین کل' },
    ];
    return `
      <div class="nav-section-label">مدیریت سیستم</div>
      ${adminLinks.map(linkHtml).join('\n')}
      <div class="nav-divider"></div>
      <div class="nav-section-label">کسب‌وکار من</div>
      ${bizLinks.map(linkHtml).join('\n')}`;
  }

  return bizLinks.map(linkHtml).join('\n');
}

// Full page layout
function layout({ title, active, isSuperAdmin, content, scripts = '' }) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)} — IceBox Manager</title>
  <link rel="stylesheet" href="/public/style.css">
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">🧊</div>
        <div class="sidebar-title">IceBox Manager</div>
      </div>
      <nav class="sidebar-nav">
        ${navLinks(active, isSuperAdmin)}
      </nav>
      <div class="sidebar-footer">
        <a href="/logout" class="nav-link logout-link">🚪 <span>خروج</span></a>
      </div>
    </aside>
    <main class="main-content">
      <div class="page-header">
        <h1 class="page-title">${escHtml(title)}</h1>
      </div>
      <div class="page-body">
        ${content}
      </div>
    </main>
  </div>
  ${scripts}
</body>
</html>`;
}

module.exports = { layout, escHtml, fmtMoney, fmtNum };
