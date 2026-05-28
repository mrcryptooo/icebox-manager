'use strict';
const { query } = require('../db/database');

// ─── دریافت همه فروش‌ها برای خروجی CSV ──────────────────────────────────────
async function getAllSalesForExport(businessId) {
  const whereClause = businessId
    ? 'WHERE s.deleted_at IS NULL AND s.business_id = $1'
    : 'WHERE s.deleted_at IS NULL';
  const params = businessId ? [businessId] : [];

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
    ${whereClause}
    ORDER BY s.sale_date DESC, s.id DESC
  `, params);
  return result.rows;
}

// ─── دریافت همه مخارج برای خروجی CSV ────────────────────────────────────────
async function getAllExpensesForExport(businessId) {
  const whereClause = businessId
    ? 'WHERE e.deleted_at IS NULL AND e.business_id = $1'
    : 'WHERE e.deleted_at IS NULL';
  const params = businessId ? [businessId] : [];

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
    ${whereClause}
    ORDER BY e.expense_date DESC, e.id DESC
  `, params);
  return result.rows;
}

// ─── ساخت CSV ─────────────────────────────────────────────────────────────────
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
      r.id, escapeCell(r.branch_name), r.report_date,
      r.cash_amount || 0, r.card_amount || 0, r.transfer_amount || 0, r.online_amount || 0,
      r.total_amount || 0, r.order_count || 0,
      escapeCell(r.note), fmtTime(r.created_at),
    ].join(','));
  }
  return lines.join('\r\n');
}

function buildExpensesCsv(rows) {
  const header = 'id,branch_name,expense_date,amount,category,note,created_at';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.id, escapeCell(r.branch_name), r.expense_date,
      r.amount || 0, escapeCell(r.category), escapeCell(r.note),
      fmtTime(r.created_at),
    ].join(','));
  }
  return lines.join('\r\n');
}

function buildPurchasesCsv(rows) {
  const header = 'id,supplier_name,branch_name,purchase_date,item_name,quantity,unit,unit_price,total_amount,paid_amount,remaining_amount,note,created_at';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.id, escapeCell(r.supplier_name), escapeCell(r.branch_name),
      r.purchase_date, escapeCell(r.item_name),
      r.quantity || 0, escapeCell(r.unit),
      r.unit_price || 0, r.total_amount || 0,
      r.paid_amount || 0, r.remaining_amount || 0,
      escapeCell(r.note), fmtTime(r.created_at),
    ].join(','));
  }
  return lines.join('\r\n');
}

module.exports = {
  getAllSalesForExport,
  getAllExpensesForExport,
  buildSalesCsv,
  buildExpensesCsv,
  buildPurchasesCsv,
};
