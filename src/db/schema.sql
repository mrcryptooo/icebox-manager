-- IceBox Manager Database Schema
-- deleted_at = soft delete; گزارش‌ها فقط ردیف‌هایی را می‌خوانند که deleted_at IS NULL باشد

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'owner',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  sale_date TEXT NOT NULL,
  cash_amount REAL DEFAULT 0,
  pos_amount REAL DEFAULT 0,
  card_transfer_amount REAL DEFAULT 0,
  online_amount REAL DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  note TEXT,
  deleted_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  deleted_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
