'use strict';
// ─── Login Page — Phase 9A ─────────────────────────────────────────────────────

function loginPage(error = '') {
  const errHtml = error
    ? `<div class="login-error">${error}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ورود — IceBox Manager</title>
  <link rel="stylesheet" href="/public/style.css">
</head>
<body class="login-body">
  <div class="login-card">
    <div class="login-logo">🧊</div>
    <h1 class="login-title">IceBox Manager</h1>
    <p class="login-subtitle">داشبورد مدیریتی</p>
    ${errHtml}
    <form method="POST" action="/login" class="login-form">
      <div class="form-group">
        <label for="telegram_id">شناسه تلگرام</label>
        <input
          type="number"
          id="telegram_id"
          name="telegram_id"
          placeholder="شناسه عددی تلگرام شما"
          required
          autocomplete="off"
        >
      </div>
      <div class="form-group">
        <label for="password">رمز عبور داشبورد</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="رمز عبور"
          required
          autocomplete="current-password"
        >
      </div>
      <button type="submit" class="login-btn">ورود به داشبورد</button>
    </form>
  </div>
</body>
</html>`;
}

module.exports = { loginPage };
