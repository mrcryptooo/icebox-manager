'use strict';
const { getBizContextByTelegramId, DEFAULT_PERMISSIONS } = require('../core/teamService');

const OWNER_ID = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;

// ─── آیا کاربر سوپرادمین است؟ ────────────────────────────────────────────────
function isSuperAdmin(ctx) {
  if (!OWNER_ID) return false;
  return ctx.from?.id === OWNER_ID;
}

// ─── بارگذاری biz context از دیتابیس ────────────────────────────────────────
async function loadBizContext(telegramId) {
  return getBizContextByTelegramId(telegramId);
}

// ─── بررسی دسترسی ────────────────────────────────────────────────────────────
function hasPermission(biz, permission) {
  if (!biz) return false;
  const perms = Array.isArray(biz.permissions) ? biz.permissions : [];
  return perms.includes('*') || perms.includes(permission);
}

// ─── سازگاری با Phase 6 (برای index.js) ─────────────────────────────────────
function isOwner(ctx) {
  return isSuperAdmin(ctx);
}

function isAuthorized(ctx) {
  return isSuperAdmin(ctx);
}

// ─── دریافت biz از session ───────────────────────────────────────────────────
function getCurrentBusiness(session) {
  return session?.biz || null;
}

module.exports = {
  isSuperAdmin,
  isOwner,
  loadBizContext,
  hasPermission,
  isAuthorized,
  getCurrentBusiness,
  DEFAULT_PERMISSIONS,
  OWNER_ID,
};
