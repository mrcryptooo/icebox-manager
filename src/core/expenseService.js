const { query } = require('../db/database');

// ─── ثبت خرج جدید ────────────────────────────────────────────────────────────
async function recordExpense({ branchId, userId, expenseDate, amount, category, note }) {
  const result = await query(`
    INSERT INTO expenses (branch_id, user_id, expense_date, amount, category, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [branchId, userId, expenseDate, amount, category, note || null]);
  return getExpenseById(result.rows[0].id);
}

// ─── خواندن خرج ──────────────────────────────────────────────────────────────
async function getExpenseById(id) {
  const result = await query(
    'SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0] || null;
}

async function getExpensesByBranchAndDate(branchId, date) {
  const result = await query(
    'SELECT * FROM expenses WHERE branch_id = $1 AND expense_date = $2 AND deleted_at IS NULL ORDER BY created_at DESC',
    [branchId, date]
  );
  return result.rows;
}

async function getExpensesByDateRange(branchId, startDate, endDate) {
  if (branchId) {
    const result = await query(
      'SELECT * FROM expenses WHERE branch_id = $1 AND expense_date BETWEEN $2 AND $3 AND deleted_at IS NULL ORDER BY expense_date',
      [branchId, startDate, endDate]
    );
    return result.rows;
  }
  const result = await query(
    'SELECT * FROM expenses WHERE expense_date BETWEEN $1 AND $2 AND deleted_at IS NULL ORDER BY expense_date',
    [startDate, endDate]
  );
  return result.rows;
}

// آخرین N خرج (با نام شعبه)
async function getRecentExpenses(limit = 10) {
  const result = await query(`
    SELECT e.*, b.name AS branch_name
    FROM expenses e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.deleted_at IS NULL
    ORDER BY e.created_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

// ─── ویرایش خرج ──────────────────────────────────────────────────────────────
async function updateExpense(id, { amount, category, note }) {
  await query(`
    UPDATE expenses
    SET amount = $1, category = $2, note = $3
    WHERE id = $4 AND deleted_at IS NULL
  `, [amount, category, note || null, id]);
  return getExpenseById(id);
}

// ─── حذف نرم (soft delete) ────────────────────────────────────────────────────
async function deleteExpense(id) {
  const result = await query(
    'UPDATE expenses SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rowCount > 0;
}

// ─── بیشترین دسته خرج در بازه ────────────────────────────────────────────────
async function getTopExpenseCategoryForRange(branchId, startDate, endDate) {
  if (branchId) {
    const result = await query(`
      SELECT category, SUM(amount) AS total
      FROM expenses
      WHERE branch_id = $1 AND expense_date BETWEEN $2 AND $3 AND deleted_at IS NULL
      GROUP BY category ORDER BY total DESC LIMIT 1
    `, [branchId, startDate, endDate]);
    return result.rows[0] || null;
  }
  const result = await query(`
    SELECT category, SUM(amount) AS total
    FROM expenses
    WHERE expense_date BETWEEN $1 AND $2 AND deleted_at IS NULL
    GROUP BY category ORDER BY total DESC LIMIT 1
  `, [startDate, endDate]);
  return result.rows[0] || null;
}

// ─── جمع‌بندی (pure — بدون نیاز به async) ────────────────────────────────────
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
