'use strict';
const { query } = require('../db/database');

// ─── ثبت خرج جدید ────────────────────────────────────────────────────────────
async function recordExpense({ businessId, branchId, userId, expenseDate, amount, category, note }) {
  const result = await query(`
    INSERT INTO expenses (business_id, branch_id, user_id, expense_date, amount, category, note)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [businessId || null, branchId, userId, expenseDate, amount, category, note || null]);
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

async function getExpensesByDateRange(branchId, startDate, endDate, businessId) {
  if (branchId && businessId) {
    const result = await query(
      `SELECT * FROM expenses
       WHERE branch_id = $1 AND expense_date BETWEEN $2 AND $3
         AND deleted_at IS NULL AND business_id = $4
       ORDER BY expense_date`,
      [branchId, startDate, endDate, businessId]
    );
    return result.rows;
  }
  if (branchId) {
    const result = await query(
      'SELECT * FROM expenses WHERE branch_id = $1 AND expense_date BETWEEN $2 AND $3 AND deleted_at IS NULL ORDER BY expense_date',
      [branchId, startDate, endDate]
    );
    return result.rows;
  }
  if (businessId) {
    const result = await query(
      'SELECT * FROM expenses WHERE expense_date BETWEEN $1 AND $2 AND deleted_at IS NULL AND business_id = $3 ORDER BY expense_date',
      [startDate, endDate, businessId]
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
async function getRecentExpenses(limit = 10, businessId) {
  if (businessId) {
    const result = await query(`
      SELECT e.*, b.name AS branch_name
      FROM expenses e LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.deleted_at IS NULL AND e.business_id = $1
      ORDER BY e.created_at DESC LIMIT $2
    `, [businessId, limit]);
    return result.rows;
  }
  const result = await query(`
    SELECT e.*, b.name AS branch_name
    FROM expenses e LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.deleted_at IS NULL
    ORDER BY e.created_at DESC LIMIT $1
  `, [limit]);
  return result.rows;
}

// ─── ویرایش خرج ──────────────────────────────────────────────────────────────
async function updateExpense(id, { amount, category, note }) {
  await query(`
    UPDATE expenses SET amount = $1, category = $2, note = $3
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
async function getTopExpenseCategoryForRange(branchId, startDate, endDate, businessId) {
  if (branchId && businessId) {
    const result = await query(`
      SELECT category, SUM(amount) AS total FROM expenses
      WHERE branch_id = $1 AND expense_date BETWEEN $2 AND $3
        AND deleted_at IS NULL AND business_id = $4
      GROUP BY category ORDER BY total DESC LIMIT 1
    `, [branchId, startDate, endDate, businessId]);
    return result.rows[0] || null;
  }
  if (branchId) {
    const result = await query(`
      SELECT category, SUM(amount) AS total FROM expenses
      WHERE branch_id = $1 AND expense_date BETWEEN $2 AND $3 AND deleted_at IS NULL
      GROUP BY category ORDER BY total DESC LIMIT 1
    `, [branchId, startDate, endDate]);
    return result.rows[0] || null;
  }
  const result = await query(`
    SELECT category, SUM(amount) AS total FROM expenses
    WHERE expense_date BETWEEN $1 AND $2 AND deleted_at IS NULL
    GROUP BY category ORDER BY total DESC LIMIT 1
  `, [startDate, endDate]);
  return result.rows[0] || null;
}

// ─── گزارش ریز مخارج (Phase 8) ───────────────────────────────────────────────
async function getExpensesDetailedReport(businessId, startDate, endDate) {
  const result = await query(`
    SELECT e.id, b.name AS branch_name, e.expense_date,
           e.amount, e.category, e.note, e.created_at
    FROM expenses e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.business_id = $1
      AND e.expense_date BETWEEN $2 AND $3
      AND e.deleted_at IS NULL
    ORDER BY e.expense_date DESC, e.id DESC
  `, [businessId, startDate, endDate]);
  return result.rows;
}

// ─── جمع‌بندی (pure) ─────────────────────────────────────────────────────────
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
  getExpensesDetailedReport,
};
