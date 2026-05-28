'use strict';
const { query } = require('../db/database');
const { getTodayDate } = require('../utils/date');

// ─── ایجاد آیتم انبار ─────────────────────────────────────────────────────────
async function createInventoryItem({ businessId, name, unit = 'عدد', minStock = 0 }) {
  const result = await query(`
    INSERT INTO inventory_items (business_id, name, unit, min_stock, status)
    VALUES ($1, $2, $3, $4, 'active')
    RETURNING *
  `, [businessId, name.trim(), unit, minStock]);
  return result.rows[0];
}

// ─── لیست آیتم‌های فعال ───────────────────────────────────────────────────────
async function listInventoryItems(businessId) {
  const result = await query(`
    SELECT * FROM inventory_items
    WHERE business_id = $1 AND status = 'active'
    ORDER BY name
  `, [businessId]);
  return result.rows;
}

// ─── دریافت آیتم با ID ────────────────────────────────────────────────────────
async function getInventoryItemById(businessId, itemId) {
  const result = await query(`
    SELECT * FROM inventory_items
    WHERE business_id = $1 AND id = $2 AND status = 'active'
  `, [businessId, itemId]);
  return result.rows[0] || null;
}

// ─── یافتن آیتم با نام و واحد (case-insensitive) ─────────────────────────────
async function findInventoryItemByName(businessId, name, unit) {
  const result = await query(`
    SELECT * FROM inventory_items
    WHERE business_id = $1
      AND LOWER(name) = LOWER($2)
      AND unit = $3
      AND status = 'active'
    LIMIT 1
  `, [businessId, name.trim(), unit]);
  return result.rows[0] || null;
}

// ─── ایجاد حرکت انبار ─────────────────────────────────────────────────────────
async function createInventoryMovement({
  businessId, itemId, movementType, quantity,
  unit, sourceType = null, sourceId = null,
  note = null, createdByTelegramId = null,
  movementDate = null,
}) {
  const date = movementDate || getTodayDate();
  const result = await query(`
    INSERT INTO inventory_movements
      (business_id, item_id, movement_type, quantity, unit,
       source_type, source_id, note, created_by_telegram_id, movement_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [businessId, itemId, movementType, quantity, unit,
      sourceType, sourceId, note, createdByTelegramId, date]);
  return result.rows[0];
}

// ─── افزودن موجودی (ورودی) ────────────────────────────────────────────────────
async function addStock({
  businessId, itemId, quantity, unit,
  sourceType = 'manual', sourceId = null,
  note = null, telegramId = null, date = null,
}) {
  return createInventoryMovement({
    businessId, itemId, movementType: 'in', quantity, unit,
    sourceType, sourceId, note, createdByTelegramId: telegramId, movementDate: date,
  });
}

// ─── کاهش موجودی (خروجی) ─────────────────────────────────────────────────────
async function removeStock({
  businessId, itemId, quantity, unit,
  note = null, telegramId = null, date = null,
}) {
  return createInventoryMovement({
    businessId, itemId, movementType: 'out', quantity, unit,
    sourceType: 'usage', note, createdByTelegramId: telegramId, movementDate: date,
  });
}

// ─── محاسبه موجودی فعلی یک آیتم ──────────────────────────────────────────────
async function getItemStock(businessId, itemId) {
  const result = await query(`
    SELECT COALESCE(SUM(
      CASE
        WHEN movement_type = 'in'         THEN quantity
        WHEN movement_type = 'out'        THEN -quantity
        WHEN movement_type = 'adjustment' THEN quantity
        ELSE 0
      END
    ), 0) AS stock
    FROM inventory_movements
    WHERE business_id = $1 AND item_id = $2
  `, [businessId, itemId]);
  return Number(result.rows[0]?.stock || 0);
}

// ─── اصلاح موجودی (محاسبه تفاوت + ثبت adjustment) ───────────────────────────
async function adjustStock({
  businessId, itemId, actualQty, unit,
  note = null, telegramId = null, date = null,
}) {
  const currentStock = await getItemStock(businessId, itemId);
  const diff = actualQty - currentStock;
  return createInventoryMovement({
    businessId, itemId, movementType: 'adjustment', quantity: diff, unit,
    sourceType: 'correction', note, createdByTelegramId: telegramId, movementDate: date,
  });
}

// ─── خلاصه موجودی همه آیتم‌ها ────────────────────────────────────────────────
async function getInventorySummary(businessId) {
  const result = await query(`
    SELECT
      i.id, i.name, i.unit, i.min_stock, i.status,
      COALESCE(SUM(
        CASE
          WHEN m.movement_type = 'in'         THEN m.quantity
          WHEN m.movement_type = 'out'        THEN -m.quantity
          WHEN m.movement_type = 'adjustment' THEN m.quantity
          ELSE 0
        END
      ), 0) AS stock
    FROM inventory_items i
    LEFT JOIN inventory_movements m
      ON m.item_id = i.id AND m.business_id = i.business_id
    WHERE i.business_id = $1 AND i.status = 'active'
    GROUP BY i.id, i.name, i.unit, i.min_stock, i.status
    ORDER BY i.name
  `, [businessId]);
  return result.rows;
}

// ─── آیتم‌های با موجودی کم ────────────────────────────────────────────────────
async function getLowStockItems(businessId) {
  const all = await getInventorySummary(businessId);
  return all.filter(item => Number(item.stock) <= Number(item.min_stock));
}

// ─── آخرین حرکات انبار ───────────────────────────────────────────────────────
async function listInventoryMovements(businessId, limit = 20) {
  const result = await query(`
    SELECT
      m.id, m.movement_type, m.quantity, m.unit,
      m.source_type, m.note, m.movement_date, m.created_at,
      i.name AS item_name
    FROM inventory_movements m
    JOIN inventory_items i ON m.item_id = i.id
    WHERE m.business_id = $1
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT $2
  `, [businessId, limit]);
  return result.rows;
}

// ─── دریافت همه آیتم‌های انبار برای خروجی CSV ────────────────────────────────
async function getAllInventoryForExport(businessId) {
  return getInventorySummary(businessId);
}

module.exports = {
  createInventoryItem,
  listInventoryItems,
  getInventoryItemById,
  findInventoryItemByName,
  createInventoryMovement,
  addStock,
  removeStock,
  adjustStock,
  getItemStock,
  getInventorySummary,
  getLowStockItems,
  listInventoryMovements,
  getAllInventoryForExport,
};
