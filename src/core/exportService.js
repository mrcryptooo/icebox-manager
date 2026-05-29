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

function buildInventoryCsv(rows) {
  const header = 'item_name,stock,unit,min_stock,status';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      escapeCell(r.name),
      r.stock || 0,
      escapeCell(r.unit),
      r.min_stock || 0,
      escapeCell(r.status),
    ].join(','));
  }
  return lines.join('\r\n');
}

function buildStaffTransactionsCsv(rows) {
  const header = 'id,staff_name,role,transaction_type,amount,transaction_date,note,created_at';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.id,
      escapeCell(r.staff_name),
      escapeCell(r.role),
      escapeCell(r.transaction_type),
      r.amount || 0,
      r.transaction_date,
      escapeCell(r.note),
      fmtTime(r.created_at),
    ].join(','));
  }
  return lines.join('\r\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 8F — توابع خروجی حسابداری کامل (بازه زمانی)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── فروش‌ها در بازه ──────────────────────────────────────────────────────────
async function getSalesForRangeExport(businessId, startDate, endDate) {
  const result = await query(`
    SELECT
      s.sale_date                                                              AS date,
      b.name                                                                   AS branch,
      s.cash_amount                                                            AS cash,
      s.pos_amount                                                             AS pos,
      s.card_transfer_amount                                                   AS transfer,
      s.online_amount                                                          AS online,
      (s.cash_amount + s.pos_amount + s.card_transfer_amount + s.online_amount) AS total,
      s.order_count,
      s.note
    FROM sales s
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE s.business_id = $1
      AND s.sale_date BETWEEN $2 AND $3
      AND s.deleted_at IS NULL
    ORDER BY s.sale_date ASC, s.id ASC
  `, [businessId, startDate, endDate]);
  return result.rows;
}

// ─── مخارج در بازه ────────────────────────────────────────────────────────────
async function getExpensesForRangeExport(businessId, startDate, endDate) {
  const result = await query(`
    SELECT
      e.expense_date AS date,
      b.name         AS branch,
      e.category,
      e.amount,
      e.note
    FROM expenses e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.business_id = $1
      AND e.expense_date BETWEEN $2 AND $3
      AND e.deleted_at IS NULL
    ORDER BY e.expense_date ASC, e.id ASC
  `, [businessId, startDate, endDate]);
  return result.rows;
}

// ─── خریدهای مواد در بازه ─────────────────────────────────────────────────────
async function getSupplierPurchasesForRangeExport(businessId, startDate, endDate) {
  const result = await query(`
    SELECT
      sp.purchase_date                      AS date,
      s.name                                AS supplier,
      sp.item_name                          AS item,
      sp.quantity,
      sp.unit,
      sp.unit_price,
      sp.total_amount,
      sp.paid_amount,
      (sp.total_amount - sp.paid_amount)    AS remaining_amount,
      sp.note
    FROM supplier_purchases sp
    LEFT JOIN suppliers s ON sp.supplier_id = s.id
    WHERE sp.business_id = $1
      AND sp.purchase_date BETWEEN $2 AND $3
      AND sp.deleted_at IS NULL
    ORDER BY sp.purchase_date ASC, sp.id ASC
  `, [businessId, startDate, endDate]);
  return result.rows;
}

// ─── پرداخت‌های تأمین‌کننده در بازه ──────────────────────────────────────────
async function getSupplierPaymentsForRangeExport(businessId, startDate, endDate) {
  const result = await query(`
    SELECT
      p.payment_date AS date,
      s.name         AS supplier,
      p.amount,
      p.method,
      p.note
    FROM supplier_payments p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.business_id = $1
      AND p.payment_date BETWEEN $2 AND $3
    ORDER BY p.payment_date ASC, p.id ASC
  `, [businessId, startDate, endDate]);
  return result.rows;
}

// ─── تراکنش‌های پرسنل در بازه ────────────────────────────────────────────────
async function getPayrollTransactionsForRangeExport(businessId, startDate, endDate) {
  const result = await query(`
    SELECT
      st.transaction_date                        AS date,
      COALESCE(bu.display_name, u.name)          AS staff_name,
      bu.role,
      st.transaction_type                        AS type,
      st.amount,
      st.note
    FROM staff_transactions st
    JOIN business_users bu ON st.business_user_id = bu.id
    JOIN users u            ON bu.user_id = u.id
    WHERE st.business_id = $1
      AND st.transaction_date BETWEEN $2 AND $3
    ORDER BY st.transaction_date ASC, st.id ASC
  `, [businessId, startDate, endDate]);
  return result.rows;
}

// ─── ساخت CSV خلاصه حسابداری ─────────────────────────────────────────────────
function buildAccountingSummaryCsv(report, startJalali, endJalali) {
  const { sales, expenses, purchases, inventory, payroll, summary } = report;
  const header = 'label,value';
  const rows = [
    ['دوره گزارش',           `${startJalali} تا ${endJalali}`],
    ['فروش کل',              sales.total],
    ['فروش نقدی',            sales.cash],
    ['فروش پوز',             sales.pos],
    ['فروش کارت‌به‌کارت',   sales.cardTransfer],
    ['فروش آنلاین',          sales.online],
    ['تعداد سفارش',          sales.orderCount],
    ['میانگین هر سفارش',     sales.avgOrderValue],
    ['کل مخارج',             expenses.total],
    ['کل خرید مواد',         purchases.totalAmount],
    ['پرداخت هنگام خرید',    purchases.paidAtPurchase],
    ['پرداخت‌های بعدی',      purchases.laterPayments],
    ['بدهی فعلی تأمین‌کنندگان', purchases.currentDebt],
    ['تعداد تأمین‌کننده بدهکار', purchases.debtorCount],
    ['تعداد اقلام انبار',    inventory.totalItems],
    ['اقلام کم‌موجودی',      inventory.lowStockCount],
    ['حقوق پایه کل پرسنل',  payroll.baseSalaryTotal],
    ['حقوق پرداخت‌شده',      payroll.salaryPayment],
    ['برداشت / علی‌الحساب',  payroll.advance],
    ['مصرف داخلی',           payroll.internalConsumption],
    ['پاداش',                payroll.bonus],
    ['کسری / جریمه',         payroll.deduction],
    ['مانده کل حقوق پرسنل', payroll.totalStaffBalance],
    ['ورودی نقدی (فروش)',    summary.cashIn],
    ['خروجی نقدی',           summary.cashOut],
    ['مانده نقدی تقریبی',   summary.netCash],
    ['تعهدات پرداخت‌نشده',   summary.obligations],
    ['مانده بعد از تعهدات',  summary.afterObligations],
  ];
  const lines = [header];
  for (const [label, value] of rows) {
    lines.push(`${escapeCell(label)},${escapeCell(String(value ?? ''))}`);
  }
  return lines.join('\r\n');
}

// ─── CSV فروش‌های بازه ────────────────────────────────────────────────────────
function buildSalesRangeCsv(rows) {
  const header = 'date,branch,cash,pos,transfer,online,total,order_count,note';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.date, escapeCell(r.branch),
      r.cash || 0, r.pos || 0, r.transfer || 0, r.online || 0,
      r.total || 0, r.order_count || 0,
      escapeCell(r.note),
    ].join(','));
  }
  return lines.join('\r\n');
}

// ─── CSV مخارج بازه ──────────────────────────────────────────────────────────
function buildExpensesRangeCsv(rows) {
  const header = 'date,branch,category,amount,note';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.date, escapeCell(r.branch),
      escapeCell(r.category), r.amount || 0,
      escapeCell(r.note),
    ].join(','));
  }
  return lines.join('\r\n');
}

// ─── CSV خریدهای مواد بازه ───────────────────────────────────────────────────
function buildSupplierPurchasesRangeCsv(rows) {
  const header = 'date,supplier,item,quantity,unit,unit_price,total_amount,paid_amount,remaining_amount,note';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.date, escapeCell(r.supplier), escapeCell(r.item),
      r.quantity || 0, escapeCell(r.unit),
      r.unit_price || 0, r.total_amount || 0,
      r.paid_amount || 0, r.remaining_amount || 0,
      escapeCell(r.note),
    ].join(','));
  }
  return lines.join('\r\n');
}

// ─── CSV پرداخت‌های تأمین‌کننده بازه ────────────────────────────────────────
function buildSupplierPaymentsRangeCsv(rows) {
  const header = 'date,supplier,amount,method,note';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.date, escapeCell(r.supplier),
      r.amount || 0, escapeCell(r.method),
      escapeCell(r.note),
    ].join(','));
  }
  return lines.join('\r\n');
}

// ─── CSV تراکنش‌های پرسنل بازه ───────────────────────────────────────────────
function buildPayrollRangeCsv(rows) {
  const header = 'date,staff_name,role,type,amount,note';
  const lines = [header];
  for (const r of rows) {
    lines.push([
      r.date, escapeCell(r.staff_name),
      escapeCell(r.role), escapeCell(r.type),
      r.amount || 0,
      escapeCell(r.note),
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
  buildInventoryCsv,
  buildStaffTransactionsCsv,
  // Phase 8F — خروجی حسابداری کامل
  getSalesForRangeExport,
  getExpensesForRangeExport,
  getSupplierPurchasesForRangeExport,
  getSupplierPaymentsForRangeExport,
  getPayrollTransactionsForRangeExport,
  buildAccountingSummaryCsv,
  buildSalesRangeCsv,
  buildExpensesRangeCsv,
  buildSupplierPurchasesRangeCsv,
  buildSupplierPaymentsRangeCsv,
  buildPayrollRangeCsv,
};
