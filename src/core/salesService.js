const { query } = require('../db/database');

// ─── ثبت فروش جدید ───────────────────────────────────────────────────────────
async function recordSale({ branchId, userId, saleDate, cashAmount, posAmount, cardTransferAmount, onlineAmount, orderCount, note }) {
  const result = await query(`
    INSERT INTO sales (branch_id, user_id, sale_date, cash_amount, pos_amount, card_transfer_amount, online_amount, order_count, note)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    branchId, userId, saleDate,
    cashAmount || 0,
    posAmount || 0,
    cardTransferAmount || 0,
    onlineAmount || 0,
    orderCount || 0,
    note || null,
  ]);
  return getSaleById(result.rows[0].id);
}

// ─── خواندن فروش ─────────────────────────────────────────────────────────────
async function getSaleById(id) {
  const result = await query(
    'SELECT * FROM sales WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0] || null;
}

async function getSalesByBranchAndDate(branchId, date) {
  const result = await query(
    'SELECT * FROM sales WHERE branch_id = $1 AND sale_date = $2 AND deleted_at IS NULL ORDER BY created_at DESC',
    [branchId, date]
  );
  return result.rows;
}

async function getSalesByDateRange(branchId, startDate, endDate) {
  if (branchId) {
    const result = await query(
      'SELECT * FROM sales WHERE branch_id = $1 AND sale_date BETWEEN $2 AND $3 AND deleted_at IS NULL ORDER BY sale_date',
      [branchId, startDate, endDate]
    );
    return result.rows;
  }
  const result = await query(
    'SELECT * FROM sales WHERE sale_date BETWEEN $1 AND $2 AND deleted_at IS NULL ORDER BY sale_date',
    [startDate, endDate]
  );
  return result.rows;
}

// آخرین N فروش (با نام شعبه)
async function getRecentSales(limit = 10) {
  const result = await query(`
    SELECT s.*, b.name AS branch_name
    FROM sales s
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE s.deleted_at IS NULL
    ORDER BY s.created_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

// ─── ویرایش فروش ─────────────────────────────────────────────────────────────
async function updateSale(id, { cashAmount, posAmount, cardTransferAmount, onlineAmount, orderCount, note }) {
  await query(`
    UPDATE sales
    SET cash_amount = $1, pos_amount = $2, card_transfer_amount = $3,
        online_amount = $4, order_count = $5, note = $6
    WHERE id = $7 AND deleted_at IS NULL
  `, [
    cashAmount || 0,
    posAmount || 0,
    cardTransferAmount || 0,
    onlineAmount || 0,
    orderCount || 0,
    note || null,
    id,
  ]);
  return getSaleById(id);
}

// ─── حذف نرم (soft delete) ────────────────────────────────────────────────────
async function deleteSale(id) {
  const result = await query(
    'UPDATE sales SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rowCount > 0;
}

// ─── جمع‌بندی (pure — بدون نیاز به async) ────────────────────────────────────
function aggregateSales(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.cash        += row.cash_amount          || 0;
      acc.pos         += row.pos_amount           || 0;
      acc.cardTransfer += row.card_transfer_amount || 0;
      acc.online      += row.online_amount        || 0;
      acc.orderCount  += row.order_count          || 0;
      return acc;
    },
    { cash: 0, pos: 0, cardTransfer: 0, online: 0, orderCount: 0 }
  );
}

module.exports = {
  recordSale,
  getSaleById,
  getSalesByBranchAndDate,
  getSalesByDateRange,
  getRecentSales,
  updateSale,
  deleteSale,
  aggregateSales,
};
