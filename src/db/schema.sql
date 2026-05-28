-- IceBox Manager Database Schema (PostgreSQL)
-- deleted_at = soft delete; گزارش‌ها فقط ردیف‌هایی را می‌خوانند که deleted_at IS NULL باشد

-- ─── کاربران ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  name        TEXT,
  role        TEXT DEFAULT 'owner',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── شعبه‌ها ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  address     TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── فروش‌ها ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id                   SERIAL PRIMARY KEY,
  branch_id            INTEGER NOT NULL,
  user_id              INTEGER NOT NULL,
  sale_date            TEXT NOT NULL,
  cash_amount          REAL DEFAULT 0,
  pos_amount           REAL DEFAULT 0,
  card_transfer_amount REAL DEFAULT 0,
  online_amount        REAL DEFAULT 0,
  order_count          INTEGER DEFAULT 0,
  note                 TEXT,
  deleted_at           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id)   REFERENCES users(id)
);

-- ─── مخارج ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  branch_id    INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  amount       REAL NOT NULL,
  category     TEXT NOT NULL,
  note         TEXT,
  deleted_at   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id)   REFERENCES users(id)
);

-- ─── کسب‌وکارها (Phase 7) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT,
  city         TEXT,
  phone        TEXT,
  owner_id     INTEGER,
  license_code TEXT UNIQUE,
  is_active    INTEGER DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── لایسنس‌ها (Phase 7) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id         SERIAL PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  used_by    INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at    TIMESTAMPTZ
);

-- ─── کاربران کسب‌وکار (Phase 7) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_users (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  role        TEXT NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- ─── قفل‌های بخش (Phase 7) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS section_locks (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  section_key TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, section_key)
);

-- ─── مهاجرت: اضافه کردن ستون business_id به جداول موجود ─────────────────────
ALTER TABLE branches ADD COLUMN IF NOT EXISTS business_id INTEGER;
ALTER TABLE sales    ADD COLUMN IF NOT EXISTS business_id INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS business_id INTEGER;

-- ─── مهاجرت Phase 7 QA: نام واقعی اعضا در تیم ───────────────────────────────
ALTER TABLE business_users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ─── تأمین‌کننده‌ها (Phase 8) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT,
  note        TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── خرید مواد از تأمین‌کننده (Phase 8) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_purchases (
  id                     SERIAL PRIMARY KEY,
  business_id            INTEGER NOT NULL,
  supplier_id            INTEGER NOT NULL,
  branch_id              INTEGER,
  purchase_date          TEXT NOT NULL,
  item_name              TEXT NOT NULL,
  quantity               NUMERIC NOT NULL DEFAULT 1,
  unit                   TEXT NOT NULL DEFAULT 'عدد',
  unit_price             NUMERIC NOT NULL DEFAULT 0,
  total_amount           NUMERIC NOT NULL,
  paid_amount            NUMERIC NOT NULL DEFAULT 0,
  note                   TEXT,
  created_by_telegram_id BIGINT,
  deleted_at             TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- ─── پرداخت‌های بعدی به تأمین‌کننده (Phase 8) ────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_payments (
  id                     SERIAL PRIMARY KEY,
  business_id            INTEGER NOT NULL,
  supplier_id            INTEGER NOT NULL,
  payment_date           TEXT NOT NULL,
  amount                 NUMERIC NOT NULL,
  method                 TEXT NOT NULL DEFAULT 'نقدی',
  note                   TEXT,
  created_by_telegram_id BIGINT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
