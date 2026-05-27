# 🍦 IceBox Manager — ربات تلگرام مدیریت بستنی‌فروشی

ربات فارسی تلگرام برای مدیریت مالی و عملیات روزانه بستنی‌فروشی

---

## ویژگی‌ها

- ثبت فروش روزانه به تفکیک نقدی، پوز، کارت‌به‌کارت و آنلاین
- ثبت مخارج با دسته‌بندی فارسی
- گزارش روزانه، هفتگی، ماهانه و بازه دلخواه
- انتخاب تاریخ شمسی با دکمه (بدون تایپ)
- مقایسه شعبه‌ها
- مدیریت چند شعبه
- ویرایش و حذف فروش/مخارج
- پیام‌های صبح بخیر و شب بخیر روزانه
- رابط کاربری کاملاً فارسی با دکمه‌های emoji‌دار

---

## پیش‌نیازها

- [Node.js](https://nodejs.org) نسخه **18 یا بالاتر** (توصیه: Node 20 LTS یا Node 22)
- یک سرور **PostgreSQL** (محلی یا Railway)
- یک ربات تلگرام از [@BotFather](https://t.me/BotFather)

---

## نصب و راه‌اندازی محلی

### ۱. نصب وابستگی‌ها

```bash
npm install
```

### ۲. ساخت فایل `.env`

```bash
# ویندوز
copy .env.example .env

# مک/لینوکس
cp .env.example .env
```

فایل `.env` را باز کنید و مقادیر را پر کنید:

```env
BOT_TOKEN=توکن_ربات_شما_از_BotFather
OWNER_ID=آیدی_عددی_تلگرام_شما
DATABASE_URL=postgresql://user:password@localhost:5432/icebox
NODE_ENV=development
```

برای دریافت `BOT_TOKEN`: به [@BotFather](https://t.me/BotFather) بروید و `/newbot` بزنید.

برای دریافت `OWNER_ID`: به [@userinfobot](https://t.me/userinfobot) پیام بدهید.

### ۳. اجرای ربات

```bash
# محیط توسعه (با restart خودکار)
npm run dev

# محیط تولید
npm start
```

---

## استقرار روی Railway

این پروژه از **PostgreSQL** استفاده می‌کند. Railway یک سرویس PostgreSQL مدیریت‌شده ارائه می‌دهد که داده‌ها در آن پایدار می‌مانند.

---

### مراحل Deploy روی Railway

#### ۱. آپلود پروژه روی GitHub

اگر هنوز Git ندارید:

```bash
git init
git add .
git commit -m "IceBox Manager - initial commit"
```

یک repository جدید در [github.com](https://github.com) بسازید و push کنید:

```bash
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

> **مهم:** `.env` هرگز commit نشود — `.gitignore` آن را ignore کرده است.

---

#### ۲. ساخت پروژه در Railway

۱. به [railway.app](https://railway.app) بروید و ثبت‌نام یا ورود کنید
۲. روی **New Project** کلیک کنید
۳. **Deploy from GitHub repo** را انتخاب کنید
۴. repository ای که تازه ساختید را انتخاب کنید
۵. Railway خودکار پروژه را شناسایی می‌کند

---

#### ۲.۵ افزودن سرویس PostgreSQL در Railway

۱. در پنل پروژه Railway روی **+ New** کلیک کنید
۲. **Database → Add PostgreSQL** را انتخاب کنید
۳. Railway به‌صورت خودکار متغیر `DATABASE_URL` را در سرویس ربات تنظیم می‌کند

---

#### ۳. تنظیم Environment Variables در Railway

در پنل Railway، به تب **Variables** بروید و این متغیرها را اضافه کنید:

| نام متغیر | مقدار | توضیح |
|-----------|-------|-------|
| `BOT_TOKEN` | توکن ربات تلگرام | از @BotFather |
| `OWNER_ID` | شناسه عددی تلگرام | از @userinfobot |
| `DATABASE_URL` | (خودکار) | توسط سرویس PostgreSQL تنظیم می‌شود |
| `NODE_ENV` | `production` | محیط اجرا |

> **نکته timezone:** سرور Railway با timezone **UTC** کار می‌کند.
> پیام‌های روزانه در کد برای UTC تنظیم شده‌اند:
> - صبح بخیر: ۵:۳۰ UTC = ۹:۰۰ ایران
> - شب بخیر: ۲۰:۰۰ UTC = ۲۳:۳۰ ایران

---

#### ۴. Deploy و اجرا

Railway بعد از تنظیم Variables خودکار ربات را deploy می‌کند.
اگر deploy خودکار شروع نشد، روی **Deploy** کلیک کنید.

---

#### ۵. مشاهده Logs

در پنل Railway:
- به تب **Deployments** بروید
- روی آخرین deployment کلیک کنید
- تب **Logs** را باز کنید

اگر ربات سالم بالا آمده باشد، این پیام را می‌بینید:

```
✅ اتصال به تلگرام برقرار شد. ربات آماده دریافت پیام است.
```

---

#### ۶. تست در تلگرام

ربات را در تلگرام پیدا کنید و `/start` بزنید.

---

## ساختار پروژه

```
src/
  bot/
    telegram/
      index.js        ← نقطه ورود ربات + زمان‌بندی پیام‌های روزانه
      handlers.js     ← منطق مدیریت پیام‌ها و جریان مکالمه
      keyboards.js    ← تعریف کیبوردهای فارسی
      messages.js     ← تمام متن‌های فارسی ربات
  core/
    salesService.js   ← منطق ثبت و خواندن فروش
    expenseService.js ← منطق ثبت و خواندن مخارج
    reportService.js  ← تولید گزارش‌های ترکیبی
    branchService.js  ← مدیریت شعبه‌ها
    userService.js    ← مدیریت کاربران
  db/
    database.js       ← اتصال PostgreSQL (pg Pool) و initDatabase
    schema.sql        ← طرح جداول دیتابیس (PostgreSQL)
  utils/
    formatMoney.js    ← تبدیل اعداد به فارسی با فرمت تومان
    date.js           ← توابع تاریخ شمسی و میلادی
.env                  ← تنظیمات محیطی (باید بسازید — در .gitignore)
.env.example          ← نمونه تنظیمات
railway.json          ← تنظیمات Railway
```

---

## منوی اصلی ربات

| دکمه | عملکرد |
|------|---------|
| 💰 ثبت فروش امروز | ثبت فروش روزانه شعبه |
| 🧾 ثبت خرج | ثبت مخارج و هزینه‌ها |
| 📊 گزارش‌ها | گزارش روزانه، هفتگی، ماهانه، بازه دلخواه، مقایسه |
| 🗂️ مدیریت ثبت‌ها | مشاهده، ویرایش و حذف رکوردها |
| 🏪 مدیریت شعبه‌ها | افزودن و مشاهده شعبه‌ها |
| ⚙️ تنظیمات | تنظیمات سیستم |
| ❓ راهنما | راهنمای استفاده |

---

## دسته‌بندی مخارج

مواد اولیه • شیر و خامه • میوه • شکلات و تاپینگ • بسته‌بندی • حقوق و دستمزد • اجاره • قبوض • تعمیرات • تبلیغات • پیک و ارسال • سایر

---

## معماری

کد به دو لایه جدا تقسیم شده است:

- **`src/core/`** — منطق کسب‌وکار، مستقل از هر پیام‌رسان
- **`src/bot/telegram/`** — لایه تلگرام

این ساختار امکان افزودن ربات Bale در آینده را با حداقل تغییر فراهم می‌کند.

---

## Roadmap

| مرحله | توضیح | وضعیت |
|-------|-------|--------|
| Phase 1–3 | ثبت فروش، خرج، گزارش‌ها، مدیریت ثبت‌ها | ✅ |
| Phase 4 | گزارش‌های پیشرفته، تاریخ شمسی، مقایسه شعبه‌ها | ✅ |
| Phase 4.5 | Polish: emoji، کارت مالی، پیام‌های روزانه | ✅ |
| Phase 5A | Deploy آزمایشی روی Railway با SQLite | ✅ |
| Phase 5B | مهاجرت به PostgreSQL برای پایداری داده | ✅ |

---

## مجوز

MIT
