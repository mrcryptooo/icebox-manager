require('dotenv').config();
const { Telegraf } = require('telegraf');
const { handleStart, handleText } = require('./handlers');

// ─── پیام‌های روزانه ──────────────────────────────────────────────────────────
// OWNER_ID را در .env تنظیم کنید: OWNER_ID=123456789
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

// زمان‌بندی پیام روزانه — هر دقیقه بررسی می‌شود
// توجه: روی Railway سرور timezone ممکن است UTC باشد.
// ایران UTC+3:30 است:
//   ۹:۰۰ ایران = ۵:۳۰ UTC
//   ۲۳:۳۰ ایران = ۲۰:۰۰ UTC
// بعد از Deploy روی Railway اگر لازم بود ساعت را تنظیم کنید.
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

    // صبح: ۵:۳۰ UTC = ۹:۰۰ ایران
    if (h === 5 && m === 30 && lastMorning !== dayKey) {
      lastMorning = dayKey;
      const quote = pickRandom(MORNING_QUOTES);
      bot.telegram.sendMessage(OWNER_ID,
        `🌅 صبح بخیر مدیر عزیز\n\n` +
        `امروز هم یک فرصت تازه برای فروش بهتره.\n` +
        `💡 ${quote}\n\n` +
        `آخر روز فروش و مخارج رو ثبت کن تا گزارش‌هات دقیق بمونه.`
      ).catch(() => {});
    }

    // شب: ۲۰:۰۰ UTC = ۲۳:۳۰ ایران
    if (h === 20 && m === 0 && lastEvening !== dayKey) {
      lastEvening = dayKey;
      const quote = pickRandom(EVENING_QUOTES);
      bot.telegram.sendMessage(OWNER_ID,
        `🌙 شب بخیر\n\n` +
        `قبل از بستن روز، فروش و خرج‌های امروز رو ثبت کن.\n` +
        `💡 ${quote}`
      ).catch(() => {});
    }
  }, 60 * 1000);
}

console.log('🤖 ربات IceBox Manager در حال بارگذاری است...');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ خطا: BOT_TOKEN در فایل .env تعریف نشده است.');
  process.exit(1);
}

console.log('🔑 توکن پیدا شد. در حال اتصال به تلگرام...');

const bot = new Telegraf(token);

bot.start(handleStart);
bot.command('menu', handleStart);
bot.on('text', handleText);

bot.catch((err, ctx) => {
  console.error(`خطا برای کاربر ${ctx.from?.id}:`, err);
  ctx.reply('⚠️ یک خطای داخلی رخ داد. لطفاً دوباره تلاش کنید.').catch(() => {});
});

// در Telegraf 4.x پس از launch()، callback دوم بعد از getMe() اجرا می‌شود
bot.launch({}, () => {
  console.log('✅ اتصال به تلگرام برقرار شد. ربات آماده دریافت پیام است.');
  console.log(`🏪 نام ربات: @${bot.botInfo?.username ?? 'IceBoxManagerBot'}`);
  console.log('👉 حالا در تلگرام /start بزنید.');
  startDailyScheduler(bot);
}).catch((err) => {
  console.error('❌ خطا در اجرای ربات:', err.message);
  if (err.message?.includes('401')) {
    console.error('👉 توکن نامعتبر است. توکن را از @BotFather دریافت و در .env وارد کنید.');
  }
  if (err.message?.includes('ENOTFOUND') || err.message?.includes('ETIMEDOUT')) {
    console.error('👉 اتصال اینترنت یا دسترسی به api.telegram.org ممکن نیست.');
  }
  process.exit(1);
});

process.once('SIGINT', () => {
  console.log('\n🛑 ربات در حال توقف است...');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  console.log('\n🛑 ربات در حال توقف است...');
  bot.stop('SIGTERM');
});
