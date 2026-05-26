const db = require('../db/database');

// ─── ثبت خرج جدید ────────────────────────────────────────────────────────────
function recordExpense({ branchId, userId, expenseDate, amount, category, note }) {
  const info = db.prepare(`
    INSERT INTO expenses (branch_id, user_id, expense_date, amount, category, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(branchId, userId, expenseDate, amount, category, note || null);
  return getExpenseById(info.lastInsertRowid);
}

// ─── خواندن خرج ──────────────────────────────────────────────────────────────
function getExpenseById(id) {
  return db.prepare(
    'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
  ).get(id);
}

function getExpensesByBranchAndDate(branchId, date) {
  return db.prepare(
    'SELECT * FROM expenses WHERE branch_id = ? AND expense_date = ? AND deleted_at IS NULL ORDER BY created_at DESC'
  ).all(branchId, date);
}

function getExpensesByDateRange(branchId, startDate, endDate) {
  if (branchId) {
    return db.prepare(
      'SELECT * FROM expenses WHERE branch_id = ? AND expense_date BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY expense_date'
    ).all(branchId, startDate, endDate);
  }
  return db.prepare(
    'SELECT * FROM expenses WHERE expense_date BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY expense_date'
  ).all(startDate, endDate);
}

// آخرین N خرج (با نام شعبه)
function getRecentExpenses(limit = 10) {
  return db.prepare(`
    SELECT e.*, b.name AS branch_name
    FROM expenses e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.deleted_at IS NULL
    ORDER BY e.created_at DESC
    LIMIT ?
  `).all(limit);
}

// ─── ویرایش خرج ──────────────────────────────────────────────────────────────
function updateExpense(id, { amount, category, note }) {
  db.prepare(`
    UPDATE expenses
    SET amount = ?, category = ?, note = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(amount, category, note || null, id);
  return getExpenseById(id);
}

// ─── حذف نرم (soft delete) ────────────────────────────────────────────────────
function deleteExpense(id) {
  const result = db.prepare(
    'UPDATE expenses SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL'
  ).run(id);
  return result.changes > 0;
}

// ─── بیشترین دسته خرج در بازه ────────────────────────────────────────────────
function getTopExpenseCategoryForRange(branchId, startDate, endDate) {
  if (branchId) {
    return db.prepare(`
      SELECT category, SUM(amount) AS total
      FROM expenses
      WHERE branch_id = ? AND expense_date BETWEEN ? AND ? AND deleted_at IS NULL
      GROUP BY category ORDER BY total DESC LIMIT 1
    `).get(branchId, startDate, endDate) || null;
  }
  return db.prepare(`
    SELECT category, SUM(amount) AS total
    FROM expenses
    WHERE expense_date BETWEEN ? AND ? AND deleted_at IS NULL
    GROUP BY category ORDER BY total DESC LIMIT 1
  `).get(startDate, endDate) || null;
}

// ─── جمع‌بندی ─────────────────────────────────────────────────────────────────
function aggregateExpenses(rows) {
  return rows.reduce((acc, row) => acc + (row.amount || 0), 0);
}

module.exports = {
  recordExpense,
  getExpenseById,
  getExpensesByBranchAndDate,
  getExpensesByDateRange,
  getRecentExpenses,
  updateExpense,
  deleteExpense,
  aggregateExpenses,
  getTopExpenseCategoryForRange,
};
