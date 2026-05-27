const { query } = require('../db/database');

// ─── دریافت همه فروش‌ها برای خروجی CSV ──────────────────────────────────────
async function getAllSalesForExport() {
  const result = await query(`
    SELECT
      s.id,
      b.name                                                              AS branch_name,
      s.sale_date                                                         AS report_date,
      s.cash_amount,
      s.pos_amount                                                        AS card_amount,
      s.card_transfer_amount                                              AS transfer_amount,
      s.online_amount,
      (s.cash_amount + s.pos_amount + s.card_transfer_amount + s.online_amount) AS total_amount,
      s.order_count,
      s.note,
      s.created_at
    FROM sales s
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE s.deleted_at IS NULL
    ORDER BY s.sale_date DESC, s.id DESC
  `);
  return result.rows;
}

// ─── دریافت همه مخارج برای خروجی CSV ────────────────────────────────────────
async function getAllExpensesForExport() {
  const result = await query(`
    SELECT
      e.id,
      b.name        AS branch_name,
      e.expense_date,
      e.amount,
      e.category,
      e.note,
      e.created_at
    FROM expenses e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.deleted_at IS NULL
    ORDER BY e.expense_date DESC, e.id DESC
  `);
  return result.rows;
}

// ─── ساخت CSV ─────────────────────────────────────────────────────────────────
// مقادیر حاوی کاما، کوتیشن یا خط‌جدید را escape می‌کند
function escapeCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function fmtTime(val) {
  if (!val) return '';
  return String(val).replace('T', ' ').slice(0, 19);
}

function buildSalesCsv(rows) {
  const header = 'id,branch_name,report_date,cash_amount,card_amount,transfer_amount,online_amount,total_amount,order_count,note,created_at';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.id,
      escapeCell(r.branch_name),
      r.report_date,
      r.cash_amount     || 0,
      r.card_amount     || 0,
      r.transfer_amount || 0,
      r.online_amount   || 0,
      r.total_amount    || 0,
      r.order_count     || 0,
      escapeCell(r.note),
      fmtTime(r.created_at),
    ].join(','));
  }
  return lines.join('\r\n');
}

function buildExpensesCsv(rows) {
  const header = 'id,branch_name,expense_date,amount,category,note,created_at';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.id,
      escapeCell(r.branch_name),
      r.expense_date,
      r.amount || 0,
      escapeCell(r.category),
      escapeCell(r.note),
      fmtTime(r.created_at),
    ].join(','));
  }
  return lines.join('\r\n');
}

module.exports = {
  getAllSalesForExport,
  getAllExpensesForExport,
  buildSalesCsv,
  buildExpensesCsv,
};
