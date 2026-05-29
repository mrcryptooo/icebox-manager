'use strict';
const { query } = require('../db/database');

// ─── گزارش کامل حسابداری مدیریتی (Phase 8E) ─────────────────────────────────
// این گزارش سود تقریبی مدیریتی است، نه گزارش رسمی مالیاتی.
async function getFullAccountingReport(businessId, startDate, endDate) {

  // ── ۱. فروش ─────────────────────────────────────────────────────────────────
  const salesResult = await query(`
    SELECT
      COALESCE(SUM(cash_amount), 0)                                                     AS cash,
      COALESCE(SUM(pos_amount), 0)                                                      AS pos,
      COALESCE(SUM(card_transfer_amount), 0)                                            AS card_transfer,
      COALESCE(SUM(online_amount), 0)                                                   AS online,
      COALESCE(SUM(cash_amount + pos_amount + card_transfer_amount + online_amount), 0) AS total,
      COALESCE(SUM(order_count), 0)                                                     AS order_count
    FROM sales
    WHERE business_id = $1
      AND sale_date BETWEEN $2 AND $3
      AND deleted_at IS NULL
  `, [businessId, startDate, endDate]);

  const sr         = salesResult.rows[0];
  const salesTotal = Number(sr.total)       || 0;
  const orderCount = Number(sr.order_count) || 0;
  const sales = {
    cash:          Number(sr.cash)         || 0,
    pos:           Number(sr.pos)          || 0,
    cardTransfer:  Number(sr.card_transfer)|| 0,
    online:        Number(sr.online)       || 0,
    total:         salesTotal,
    orderCount,
    avgOrderValue: orderCount > 0 ? Math.round(salesTotal / orderCount) : 0,
  };

  // ── ۲. مخارج ────────────────────────────────────────────────────────────────
  const expResult = await query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE business_id = $1
      AND expense_date BETWEEN $2 AND $3
      AND deleted_at IS NULL
  `, [businessId, startDate, endDate]);
  const expTotal = Number(expResult.rows[0]?.total) || 0;

  const catResult = await query(`
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE business_id = $1
      AND expense_date BETWEEN $2 AND $3
      AND deleted_at IS NULL
    GROUP BY category
    ORDER BY total DESC
    LIMIT 5
  `, [businessId, startDate, endDate]);
  const categories   = catResult.rows.map(r => ({ category: r.category, total: Number(r.total) || 0 }));
  const topCategory  = categories.length > 0 ? categories[0] : null;
  const expenses = { total: expTotal, categories, topCategory };

  // ── ۳. خریدهای مواد (در بازه) ───────────────────────────────────────────────
  const purchResult = await query(`
    SELECT
      COALESCE(SUM(total_amount), 0) AS total_purchases,
      COALESCE(SUM(paid_amount),  0) AS paid_at_purchase
    FROM supplier_purchases
    WHERE business_id = $1
      AND purchase_date BETWEEN $2 AND $3
      AND deleted_at IS NULL
  `, [businessId, startDate, endDate]);
  const purchInPeriod     = Number(purchResult.rows[0]?.total_purchases)  || 0;
  const paidAtPurchIn     = Number(purchResult.rows[0]?.paid_at_purchase) || 0;

  // پرداخت‌های بعدی در بازه
  const laterPayResult = await query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM supplier_payments
    WHERE business_id = $1
      AND payment_date BETWEEN $2 AND $3
  `, [businessId, startDate, endDate]);
  const laterPayInPeriod = Number(laterPayResult.rows[0]?.total) || 0;

  // بدهی کل فعلی (all-time)
  const allPurchResult = await query(`
    SELECT
      COALESCE(SUM(total_amount), 0) AS total_purchases,
      COALESCE(SUM(paid_amount),  0) AS paid_at_purchase
    FROM supplier_purchases
    WHERE business_id = $1 AND deleted_at IS NULL
  `, [businessId]);
  const allLaterResult = await query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM supplier_payments
    WHERE business_id = $1
  `, [businessId]);
  const allPurch     = Number(allPurchResult.rows[0]?.total_purchases)  || 0;
  const allPaidBuy   = Number(allPurchResult.rows[0]?.paid_at_purchase) || 0;
  const allLater     = Number(allLaterResult.rows[0]?.total)             || 0;
  const currentDebt  = Math.max(0, allPurch - allPaidBuy - allLater);

  // تعداد تأمین‌کنندگان بدهکار
  const debtorResult = await query(`
    SELECT COUNT(*) AS cnt
    FROM (
      SELECT s.id,
        GREATEST(0,
          COALESCE((
            SELECT SUM(sp.total_amount - sp.paid_amount)
            FROM supplier_purchases sp
            WHERE sp.supplier_id = s.id AND sp.business_id = $1
              AND sp.deleted_at IS NULL
          ), 0)
          - COALESCE((
            SELECT SUM(p.amount)
            FROM supplier_payments p
            WHERE p.supplier_id = s.id AND p.business_id = $1
          ), 0)
        ) AS debt
      FROM suppliers s
      WHERE s.business_id = $1 AND s.is_active = 1
    ) sub
    WHERE sub.debt > 0
  `, [businessId]);
  const debtorCount = Number(debtorResult.rows[0]?.cnt) || 0;

  const purchases = {
    totalAmount:    purchInPeriod,
    paidAtPurchase: paidAtPurchIn,
    laterPayments:  laterPayInPeriod,
    currentDebt,
    debtorCount,
  };

  // ── ۴. انبار ─────────────────────────────────────────────────────────────────
  const invCountResult = await query(`
    SELECT COUNT(*) AS cnt
    FROM inventory_items
    WHERE business_id = $1 AND status = 'active'
  `, [businessId]);
  const totalItems = Number(invCountResult.rows[0]?.cnt) || 0;

  const lowResult = await query(`
    SELECT COUNT(*) AS cnt FROM (
      SELECT i.id,
        COALESCE(SUM(
          CASE
            WHEN m.movement_type = 'in'         THEN  m.quantity
            WHEN m.movement_type = 'out'        THEN -m.quantity
            WHEN m.movement_type = 'adjustment' THEN  m.quantity
            ELSE 0
          END
        ), 0) AS stock,
        i.min_stock
      FROM inventory_items i
      LEFT JOIN inventory_movements m
        ON m.item_id = i.id AND m.business_id = i.business_id
      WHERE i.business_id = $1 AND i.status = 'active'
      GROUP BY i.id, i.min_stock
      HAVING COALESCE(SUM(
        CASE
          WHEN m.movement_type = 'in'         THEN  m.quantity
          WHEN m.movement_type = 'out'        THEN -m.quantity
          WHEN m.movement_type = 'adjustment' THEN  m.quantity
          ELSE 0
        END
      ), 0) <= i.min_stock
    ) sub
  `, [businessId]);
  const lowStockCount = Number(lowResult.rows[0]?.cnt) || 0;
  const inventory = { totalItems, lowStockCount };

  // ── ۵. پرسنل (در بازه) ──────────────────────────────────────────────────────
  // حقوق پایه کل پرسنل فعال (بودجه ماهانه تقریبی)
  const baseSalaryResult = await query(`
    SELECT COALESCE(SUM(pp.base_salary), 0) AS total_base_salary
    FROM business_users bu
    LEFT JOIN payroll_profiles pp
      ON pp.business_user_id = bu.id AND pp.business_id = bu.business_id
    WHERE bu.business_id = $1
      AND bu.is_active = 1
      AND bu.role NOT IN ('business_owner', 'super_admin')
  `, [businessId]);
  const baseSalaryTotal = Number(baseSalaryResult.rows[0]?.total_base_salary) || 0;

  const txResult = await query(`
    SELECT transaction_type, COALESCE(SUM(amount), 0) AS total
    FROM staff_transactions
    WHERE business_id = $1
      AND transaction_date BETWEEN $2 AND $3
    GROUP BY transaction_type
  `, [businessId, startDate, endDate]);
  const txTotals = {};
  for (const r of txResult.rows) txTotals[r.transaction_type] = Number(r.total) || 0;

  // مانده کل پرسنل (all-time)
  const balanceResult = await query(`
    SELECT COALESCE(SUM(
      COALESCE(pp.base_salary, 0)
      + COALESCE(tx.bonus, 0)
      + COALESCE(tx.adjustment, 0)
      - COALESCE(tx.salary_payment, 0)
      - COALESCE(tx.advance, 0)
      - COALESCE(tx.internal_consumption, 0)
      - COALESCE(tx.deduction, 0)
    ), 0) AS total_balance
    FROM business_users bu
    LEFT JOIN payroll_profiles pp
      ON pp.business_user_id = bu.id AND pp.business_id = bu.business_id
    LEFT JOIN (
      SELECT business_user_id,
        COALESCE(SUM(CASE WHEN transaction_type='salary_payment'       THEN amount ELSE 0 END),0) AS salary_payment,
        COALESCE(SUM(CASE WHEN transaction_type='advance'              THEN amount ELSE 0 END),0) AS advance,
        COALESCE(SUM(CASE WHEN transaction_type='internal_consumption' THEN amount ELSE 0 END),0) AS internal_consumption,
        COALESCE(SUM(CASE WHEN transaction_type='bonus'                THEN amount ELSE 0 END),0) AS bonus,
        COALESCE(SUM(CASE WHEN transaction_type='deduction'            THEN amount ELSE 0 END),0) AS deduction,
        COALESCE(SUM(CASE WHEN transaction_type='adjustment'           THEN amount ELSE 0 END),0) AS adjustment
      FROM staff_transactions
      WHERE business_id = $1
      GROUP BY business_user_id
    ) tx ON tx.business_user_id = bu.id
    WHERE bu.business_id = $1
      AND bu.is_active = 1
      AND bu.role NOT IN ('business_owner', 'super_admin')
  `, [businessId]);
  const totalStaffBalance = Number(balanceResult.rows[0]?.total_balance) || 0;

  const payroll = {
    baseSalaryTotal,
    salaryPayment:       txTotals['salary_payment']       || 0,
    advance:             txTotals['advance']              || 0,
    internalConsumption: txTotals['internal_consumption'] || 0,
    bonus:               txTotals['bonus']                || 0,
    deduction:           txTotals['deduction']            || 0,
    totalStaffBalance,
  };

  // ── ۶. جمع‌بندی ──────────────────────────────────────────────────────────────
  const cashIn  = sales.total;
  const cashOut = expenses.total
    + purchases.paidAtPurchase
    + purchases.laterPayments
    + payroll.salaryPayment
    + payroll.advance
    + payroll.internalConsumption
    + payroll.bonus;
  const netCash          = cashIn - cashOut;
  const obligations      = purchases.currentDebt + Math.max(0, payroll.totalStaffBalance);
  const afterObligations = netCash - obligations;
  const summary = { cashIn, cashOut, netCash, obligations, afterObligations };

  return { sales, expenses, purchases, inventory, payroll, summary };
}

module.exports = { getFullAccountingReport };
