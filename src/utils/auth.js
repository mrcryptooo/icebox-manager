/**
 * Access Control Helpers
 *
 * isOwner(ctx)      — آیا فرستنده مالک ربات است؟
 * isAuthorized(ctx) — آیا فرستنده اجازه استفاده دارد؟
 *
 * فعلاً فقط OWNER_ID مجاز است.
 * در آینده برای اضافه کردن مدیر شعبه، isAuthorized را توسعه دهید.
 */

function isOwner(ctx) {
  const ownerId = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;
  if (ownerId === null) return false;
  return ctx.from?.id === ownerId;
}

// فعلاً فقط OWNER مجاز است؛ بعداً می‌توان نقش‌های بیشتری اینجا اضافه کرد
function isAuthorized(ctx) {
  return isOwner(ctx);
}

module.exports = { isOwner, isAuthorized };
