const db = require('../db/database');

// ─── ثبت فروش جدید ───────────────────────────────────────────────────────────
function recordSale({ branchId, userId, saleDate, cashAmount, posAmount, cardTransferAmount, onlineAmount, orderCount, note }) {
  const info = db.prepare(`
    INSERT INTO sales (branch_id, user_id, sale_date, cash_amount, pos_amount, card_transfer_amount, online_amount, order_count, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    branchId, userId, saleDate,
    cashAmount || 0,
    posAmount || 0,
    cardTransferAmount || 0,
    onlineAmount || 0,
    orderCount || 0,
    note || null
  );
  return getSaleById(info.lastInsertRowid);
}

// ─── خواندن فروش ─────────────────────────────────────────────────────────────
function getSaleById(id) {
  return db.prepare(
    'SELECT * FROM sales WHERE id = ? AND deleted_at IS NULL'
  ).get(id);
}

function getSalesByBranchAndDate(branchId, date) {
  return db.prepare(
    'SELECT * FROM sales WHERE branch_id = ? AND sale_date = ? AND deleted_at IS NULL ORDER BY created_at DESC'
  ).all(branchId, date);
}

function getSalesByDateRange(branchId, startDate, endDate) {
  if (branchId) {
    return db.prepare(
      'SELECT * FROM sales WHERE branch_id = ? AND sale_date BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY sale_date'
    ).all(branchId, startDate, endDate);
  }
  return db.prepare(
    'SELECT * FROM sales WHERE sale_date BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY sale_date'
  ).all(startDate, endDate);
}

// آخرین N فروش (با نام شعبه)
function getRecentSales(limit = 10) {
  return db.prepare(`
    SELECT s.*, b.name AS branch_name
    FROM sales s
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE s.deleted_at IS NULL
    ORDER BY s.created_at DESC
    LIMIT ?
  `).all(limit);
}

// ─── ویرایش فروش ─────────────────────────────────────────────────────────────
function updateSale(id, { cashAmount, posAmount, cardTransferAmount, onlineAmount, orderCount, note }) {
  db.prepare(`
    UPDATE sales
    SET cash_amount = ?, pos_amount = ?, card_transfer_amount = ?,
        online_amount = ?, order_count = ?, note = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(
    cashAmount || 0,
    posAmount || 0,
    cardTransferAmount || 0,
    onlineAmount || 0,
    orderCount || 0,
    note || null,
    id
  );
  return getSaleById(id);
}

// ─── حذف نرم (soft delete) ────────────────────────────────────────────────────
function deleteSale(id) {
  const result = db.prepare(
    'UPDATE sales SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL'
  ).run(id);
  return result.changes > 0;
}

// ─── جمع‌بندی ─────────────────────────────────────────────────────────────────
function aggregateSales(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.cash += row.cash_amount || 0;
      acc.pos += row.pos_amount || 0;
      acc.cardTransfer += row.card_transfer_amount || 0;
      acc.online += row.online_amount || 0;
      acc.orderCount += row.order_count || 0;
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
