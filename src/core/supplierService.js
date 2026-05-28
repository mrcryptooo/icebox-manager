'use strict';
const { query } = require('../db/database');

// ─── افزودن تأمین‌کننده ────────────────────────────────────────────────────────
async function createSupplier({ businessId, name, phone, note }) {
  const result = await query(`
    INSERT INTO suppliers (business_id, name, phone, note)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [businessId, name, phone || null, note || null]);
  return result.rows[0];
}

// ─── لیست تأمین‌کننده‌های فعال ────────────────────────────────────────────────
async function listSuppliers(businessId) {
  const result = await query(
    'SELECT * FROM suppliers WHERE business_id = $1 AND is_active = 1 ORDER BY name',
    [businessId]
  );
  return result.rows;
}

// ─── خواندن یک تأمین‌کننده با ID ──────────────────────────────────────────────
async function getSupplierById(id, businessId) {
  const result = await query(
    'SELECT * FROM suppliers WHERE id = $1 AND business_id = $2',
    [id, businessId]
  );
  return result.rows[0] || null;
}

// ─── موجودی حساب یک تأمین‌کننده ───────────────────────────────────────────────
// بدهی = جمع total_amount خریدها − جمع paid_amount خریدها − جمع supplier_payments
async function getSupplierBalance(businessId, supplierId) {
  const purchResult = await query(`
    SELECT
      COALESCE(SUM(total_amount), 0) AS total_purchases,
      COALESCE(SUM(paid_amount),  0) AS paid_at_purchase
    FROM supplier_purchases
    WHERE business_id = $1 AND supplier_id = $2 AND deleted_at IS NULL
  `, [businessId, supplierId]);

  const payResult = await query(`
    SELECT COALESCE(SUM(amount), 0) AS total_payments
    FROM supplier_payments
    WHERE business_id = $1 AND supplier_id = $2
  `, [businessId, supplierId]);

  const totalPurchases = Number(purchResult.rows[0].total_purchases);
  const paidAtPurchase = Number(purchResult.rows[0].paid_at_purchase);
  const totalPayments  = Number(payResult.rows[0].total_payments);
  const debt           = Math.max(0, totalPurchases - paidAtPurchase - totalPayments);
  return { totalPurchases, paidAtPurchase, totalPayments, debt };
}

// ─── موجودی همه تأمین‌کننده‌ها ─────────────────────────────────────────────────
async function getAllSupplierBalances(businessId) {
  const suppliers = await listSuppliers(businessId);
  return Promise.all(suppliers.map(async s => ({
    ...s,
    ...(await getSupplierBalance(businessId, s.id)),
  })));
}

// ─── ثبت خرید از تأمین‌کننده ──────────────────────────────────────────────────
async function createSupplierPurchase({
  businessId, supplierId, branchId, purchaseDate,
  itemName, quantity, unit, unitPrice, totalAmount, paidAmount,
  note, createdByTelegramId,
}) {
  const result = await query(`
    INSERT INTO supplier_purchases
      (business_id, supplier_id, branch_id, purchase_date,
       item_name, quantity, unit, unit_price, total_amount, paid_amount,
       note, created_by_telegram_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    businessId, supplierId, branchId || null, purchaseDate,
    itemName, quantity, unit, unitPrice, totalAmount, paidAmount,
    note || null, createdByTelegramId || null,
  ]);
  return result.rows[0];
}

// ─── لیست خریدهای یک (یا همه) تأمین‌کننده ────────────────────────────────────
async function listSupplierPurchases(businessId, supplierId, limit) {
  const lim = limit || 20;
  if (supplierId) {
    const result = await query(`
      SELECT sp.*, s.name AS supplier_name, b.name AS branch_name
      FROM supplier_purchases sp
      LEFT JOIN suppliers s ON sp.supplier_id = s.id
      LEFT JOIN branches  b ON sp.branch_id   = b.id
      WHERE sp.business_id = $1 AND sp.supplier_id = $2 AND sp.deleted_at IS NULL
      ORDER BY sp.purchase_date DESC, sp.id DESC
      LIMIT $3
    `, [businessId, supplierId, lim]);
    return result.rows;
  }
  const result = await query(`
    SELECT sp.*, s.name AS supplier_name, b.name AS branch_name
    FROM supplier_purchases sp
    LEFT JOIN suppliers s ON sp.supplier_id = s.id
    LEFT JOIN branches  b ON sp.branch_id   = b.id
    WHERE sp.business_id = $1 AND sp.deleted_at IS NULL
    ORDER BY sp.purchase_date DESC, sp.id DESC
    LIMIT $2
  `, [businessId, lim]);
  return result.rows;
}

// ─── ثبت پرداخت به تأمین‌کننده ────────────────────────────────────────────────
async function createSupplierPayment({
  businessId, supplierId, paymentDate, amount, method, note, createdByTelegramId,
}) {
  const result = await query(`
    INSERT INTO supplier_payments
      (business_id, supplier_id, payment_date, amount, method, note, created_by_telegram_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [businessId, supplierId, paymentDate, amount, method, note || null, createdByTelegramId || null]);
  return result.rows[0];
}

// ─── لیست پرداخت‌های یک (یا همه) تأمین‌کننده ─────────────────────────────────
async function listSupplierPayments(businessId, supplierId, limit) {
  const lim = limit || 20;
  if (supplierId) {
    const result = await query(`
      SELECT sp.*, s.name AS supplier_name
      FROM supplier_payments sp
      LEFT JOIN suppliers s ON sp.supplier_id = s.id
      WHERE sp.business_id = $1 AND sp.supplier_id = $2
      ORDER BY sp.payment_date DESC, sp.id DESC
      LIMIT $3
    `, [businessId, supplierId, lim]);
    return result.rows;
  }
  const result = await query(`
    SELECT sp.*, s.name AS supplier_name
    FROM supplier_payments sp
    LEFT JOIN suppliers s ON sp.supplier_id = s.id
    WHERE sp.business_id = $1
    ORDER BY sp.payment_date DESC, sp.id DESC
    LIMIT $2
  `, [businessId, lim]);
  return result.rows;
}

// ─── همه خریدها برای خروجی CSV ────────────────────────────────────────────────
async function getAllPurchasesForExport(businessId) {
  const result = await query(`
    SELECT sp.id, s.name AS supplier_name, b.name AS branch_name,
           sp.purchase_date, sp.item_name, sp.quantity, sp.unit,
           sp.unit_price, sp.total_amount, sp.paid_amount,
           (sp.total_amount - sp.paid_amount) AS remaining_amount,
           sp.note, sp.created_at
    FROM supplier_purchases sp
    LEFT JOIN suppliers s ON sp.supplier_id = s.id
    LEFT JOIN branches  b ON sp.branch_id   = b.id
    WHERE sp.business_id = $1 AND sp.deleted_at IS NULL
    ORDER BY sp.purchase_date DESC, sp.id DESC
  `, [businessId]);
  return result.rows;
}

module.exports = {
  createSupplier,
  listSuppliers,
  getSupplierById,
  getSupplierBalance,
  getAllSupplierBalances,
  createSupplierPurchase,
  listSupplierPurchases,
  createSupplierPayment,
  listSupplierPayments,
  getAllPurchasesForExport,
};
