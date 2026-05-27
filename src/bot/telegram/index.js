require('dotenv').config();
const { Telegraf } = require('telegraf');
const { handleStart, handleText, handleId, handleHealth, handleExportCommand } = require('./handlers');
const { initDatabase } = require('../../db/database');
const { isAuthorized } = require('../../utils/auth');
const MSG = require('./messages');

// ─── پیام‌های روزانه ──────────────────────────────────────────────────────────
const OWNER_ID = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;

const MORNING_QUOTES = [
  'فروش خوب از نظم روزانه شروع می‌شود.',
  'هر عددی که امروز ثبت کنی، فردا به تصمیم بهتر تبدیل می‌شود.',
  'مدیریت دقیق خرج‌ها یعنی سود بیشتر.',
  'مشتری راضی، بهترین تبلیغ کسب‌وکار است.',
  'صندوق مرتب، ذهن آرام‌تر.',
];

const EVENING_QUOTES = [
  'عددهای دقیق امروز، تصمیم‌های بهتر فردا رو می‌سازن.',
  'هر شب که ثبت می‌کنی، یک قدم به سود بیشتر نزدیک می‌شی.',
  'گزارش دقیق، مدیریت آگاهانه.',
  'ثبت منظم، آرامش مالی.',
  'امروز چقدر فروختی؟ ثبتش کن تا فراموش نشه.',
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function startDailyScheduler(bot) {
  if (!OWNER_ID) {
    console.log('ℹ️ OWNER_ID تنظیم نشده — پیام‌های روزانه غیرفعال است.');
    return;
  }
  let lastMorning = null;
  let lastEvening = null;
  setInterval(() => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
    if (h === 5 && m === 30 && lastMorning !== dayKey) {
      lastMorning = dayKey;
      bot.telegram.sendMessage(OWNER_ID,
        `🌅 صبح بخیر مدیر عزیز\n\nامروز هم یک فرصت تازه برای فروش بهتره.\n💡 ${pickRandom(MORNING_QUOTES)}\n\nآخر روز فروش و مخارج رو ثبت کن تا گزارش‌هات دقیق بمونه.`
      ).catch(() => {});
    }
    if (h === 20 && m === 0 && lastEvening !== dayKey) {
      lastEvening = dayKey;
      bot.telegram.sendMessage(OWNER_ID,
        `🌙 شب بخیر\n\nقبل از بستن روز، فروش و خرج‌های امروز رو ثبت کن.\n💡 ${pickRandom(EVENING_QUOTES)}`
      ).catch(() => {});
    }
  }, 60 * 1000);
}

// ─── بررسی متغیرهای محیطی ────────────────────────────────────────────────────
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ خطا: BOT_TOKEN در فایل .env تعریف نشده است.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('❌ خطا: DATABASE_URL در فایل .env تعریف نشده است.');
  process.exit(1);
}
if (!OWNER_ID) {
  console.warn('⚠️ هشدار: OWNER_ID تنظیم نشده — هیچ کاربری نمی‌تواند از ربات استفاده کند.');
}

console.log('🤖 ربات IceBox Manager در حال بارگذاری است...');

const bot = new Telegraf(token);

async function main() {
  console.log('🗄️ در حال اتصال به دیتابیس PostgreSQL...');
  await initDatabase();

  // ─── /id — برای همه کاربران (قبل از middleware احراز هویت) ─────────────────
  bot.command('id', handleId);

  // ─── middleware احراز هویت — همه پیام‌های بعدی بررسی می‌شوند ─────────────────
  bot.use(async (ctx, next) => {
    if (!isAuthorized(ctx)) {
      return ctx.reply(MSG.unauthorized);
    }
    return next();
  });

  // ─── دستورات مجاز (فقط OWNER) ────────────────────────────────────────────────
  bot.start(handleStart);
  bot.command('menu',   handleStart);
  bot.command('health', handleHealth);
  bot.command('export', handleExportCommand);

  bot.on('text', handleText);

  bot.catch((err, ctx) => {
    console.error(`خطا برای کاربر ${ctx.from?.id}:`, err);
    ctx.reply('⚠️ یک خطای داخلی رخ داد. لطفاً دوباره تلاش کنید.').catch(() => {});
  });

  console.log('🔑 در حال اتصال به تلگرام...');
  await bot.launch({}, () => {
    console.log('✅ اتصال به تلگرام برقرار شد. ربات آماده دریافت پیام است.');
    console.log(`🏪 نام ربات: @${bot.botInfo?.username ?? 'IceBoxManagerBot'}`);
    console.log('👉 حالا در تلگرام /start بزنید.');
    startDailyScheduler(bot);
  });
}

main().catch((err) => {
  console.error('❌ خطا در اجرای ربات:', err.message);
  if (err.message?.includes('401'))
    console.error('👉 توکن نامعتبر است. توکن را از @BotFather دریافت و در .env وارد کنید.');
  if (err.message?.includes('ENOTFOUND') || err.message?.includes('ETIMEDOUT'))
    console.error('👉 اتصال اینترنت یا دسترسی به api.telegram.org ممکن نیست.');
  if (err.code === 'ECONNREFUSED' || err.message?.includes('CONNECTION'))
    console.error('👉 اتصال به دیتابیس ناموفق بود. DATABASE_URL را بررسی کنید.');
  process.exit(1);
});

process.once('SIGINT',  () => { console.log('\n🛑 ربات در حال توقف است...'); bot.stop('SIGINT'); });
process.once('SIGTERM', () => { console.log('\n🛑 ربات در حال توقف است...'); bot.stop('SIGTERM'); });
