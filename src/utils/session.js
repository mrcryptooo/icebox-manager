'use strict';
// ─── مدیریت session درون‌حافظه ────────────────────────────────────────────────
// این ماژول توسط handlers.js و index.js هر دو import می‌شود.

const sessions = new Map();

/**
 * برگرداندن session کاربر (ایجاد می‌کند اگر وجود نداشته باشد)
 * @param {number} userId — شناسه عددی تلگرام
 */
function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: null, data: {}, biz: null, pinUnlocked: {} });
  }
  return sessions.get(userId);
}

/**
 * پاک کردن step و data، اما حفظ biz و pinUnlocked
 * برای ناوبری بین منوها (کاربر همچنان لاگین است)
 */
function clearSession(userId) {
  const s = sessions.get(userId) || {};
  sessions.set(userId, {
    step:        null,
    data:        {},
    biz:         s.biz         || null,
    pinUnlocked: s.pinUnlocked || {},
  });
}

/**
 * حذف کامل session (logout / deregister)
 */
function destroySession(userId) {
  sessions.delete(userId);
}

module.exports = { getSession, clearSession, destroySession };
