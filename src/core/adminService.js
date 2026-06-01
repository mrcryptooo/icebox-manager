'use strict';
// ─── Super Admin Service — Phase 9B ──────────────────────────────────────────
// همه queryها READ-ONLY هستند. هیچ INSERT / UPDATE / DELETE وجود ندارد.
const { query } = require('../db/database');

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function isoMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ── ۱. خلاصه کل سیستم ────────────────────────────────────────────────────────
async function getSystemOverview() {
  const today      = isoToday();
  const monthStart = isoMonthStart();

  // همه queryها را به‌صورت موازی اجرا کن
  const [bizRes, licRes, userRes, salesRes, expRes, purchRes, payRes] =
    await Promise.all([
      query('SELECT COUNT(*) AS cnt FROM businesses WHERE is_active = 1'),
      query('SELECT COUNT(*) AS total, COUNT(used_by) AS used_count FROM licenses'),
      query('SELECT COUNT(*) AS cnt FROM users'),
      query(`
        SELECT COALESCE(SUM(cash_amount + pos_amount + card_transfer_amount + online_amount), 0) AS total
        FROM sales
        WHERE sale_date BETWEEN $1 AND $2 AND deleted_at IS NULL
      `, [monthStart, today]),
      query(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE expense_date BETWEEN $1 AND $2 AND deleted_at IS NULL
      `, [monthStart, today]),
      query(`
        SELECT
          COALESCE(SUM(total_amount), 0) AS total_p,
          COALESCE(SUM(paid_amount),  0) AS paid_at_p
        FROM supplier_purchases WHERE deleted_at IS NULL
      `),
      query('SELECT COALESCE(SUM(amount), 0) AS total FROM supplier_payments'),
    ]);

  const totalBusinesses   = Number(bizRes.rows[0]?.cnt)          || 0;
  const totalLicenses     = Number(licRes.rows[0]?.total)         || 0;
  const usedLicenses      = Number(licRes.rows[0]?.used_count)    || 0;
  const totalUsers        = Number(userRes.rows[0]?.cnt)          || 0;
  const totalSales        = Number(salesRes.rows[0]?.total)        || 0;
  const totalExpenses     = Number(expRes.rows[0]?.total)          || 0;
  const totalDebt         = Math.max(0,
    Number(purchRes.rows[0]?.total_p) - Number(purchRes.rows[0]?.paid_at_p) - Number(payRes.rows[0]?.total)
  );

  // مانده کل پرسنل در کل سیستم
  const balRes = await query(`
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
      GROUP BY business_user_id
    ) tx ON tx.business_user_id = bu.id
    WHERE bu.role NOT IN ('business_owner', 'super_admin')
      AND bu.is_active = 1
  `);
  const totalStaffBalance = Number(balRes.rows[0]?.total_balance) || 0;

  return {
    totalBusinesses,
    totalLicenses,
    usedLicenses,
    availableLicenses: totalLicenses - usedLicenses,
    totalUsers,
    totalSales,
    totalExpenses,
    netCash: totalSales - totalExpenses,
    totalDebt,
    totalStaffBalance,
    monthStart,
    today,
  };
}

// ── ۲. لیست کسب‌وکارها با خلاصه مالی این ماه ────────────────────────────────
async function listBusinessesWithFinancialSummary() {
  const today      = isoToday();
  const monthStart = isoMonthStart();

  // همه کسب‌وکارها + مالک (از business_users با role='business_owner')
  const bizResult = await query(`
    SELECT
      b.id, b.name, b.type, b.city, b.phone, b.is_active, b.created_at,
      COALESCE(bu.display_name, u.name) AS owner_display_name,
      u.telegram_id                     AS owner_telegram_id
    FROM businesses b
    LEFT JOIN business_users bu
      ON bu.business_id = b.id AND bu.role = 'business_owner' AND bu.is_active = 1
    LEFT JOIN users u ON u.id = bu.user_id
    WHERE b.is_active = 1
    ORDER BY b.id
    LIMIT 100
  `);

  const results = [];
  for (const biz of bizResult.rows) {
    const id = biz.id;

    const [memberRes, salesRes, expRes, purchRes, payRes, staffBalRes] =
      await Promise.all([
        query(`SELECT COUNT(*) AS cnt FROM business_users
               WHERE business_id = $1 AND is_active = 1`, [id]),
        query(`
          SELECT COALESCE(SUM(cash_amount + pos_amount + card_transfer_amount + online_amount), 0) AS total
          FROM sales
          WHERE business_id = $1 AND sale_date BETWEEN $2 AND $3 AND deleted_at IS NULL
        `, [id, monthStart, today]),
        query(`
          SELECT COALESCE(SUM(amount), 0) AS total
          FROM expenses
          WHERE business_id = $1 AND expense_date BETWEEN $2 AND $3 AND deleted_at IS NULL
        `, [id, monthStart, today]),
        query(`
          SELECT COALESCE(SUM(total_amount), 0) AS total_p,
                 COALESCE(SUM(paid_amount),  0) AS paid_at_p
          FROM supplier_purchases WHERE business_id = $1 AND deleted_at IS NULL
        `, [id]),
        query(`SELECT COALESCE(SUM(amount), 0) AS total
               FROM supplier_payments WHERE business_id = $1`, [id]),
        query(`
          SELECT COALESCE(SUM(
            COALESCE(pp.base_salary, 0)
            + COALESCE(tx.bonus, 0)       + COALESCE(tx.adjustment, 0)
            - COALESCE(tx.salary_payment, 0)
            - COALESCE(tx.advance, 0)
            - COALESCE(tx.internal_consumption, 0)
            - COALESCE(tx.deduction, 0)
          ), 0) AS balance
          FROM business_users bu
          LEFT JOIN payroll_profiles pp
            ON pp.business_user_id = bu.id AND pp.business_id = $1
          LEFT JOIN (
            SELECT business_user_id,
              COALESCE(SUM(CASE WHEN transaction_type='salary_payment'       THEN amount ELSE 0 END),0) AS salary_payment,
              COALESCE(SUM(CASE WHEN transaction_type='advance'              THEN amount ELSE 0 END),0) AS advance,
              COALESCE(SUM(CASE WHEN transaction_type='internal_consumption' THEN amount ELSE 0 END),0) AS internal_consumption,
              COALESCE(SUM(CASE WHEN transaction_type='bonus'                THEN amount ELSE 0 END),0) AS bonus,
              COALESCE(SUM(CASE WHEN transaction_type='deduction'            THEN amount ELSE 0 END),0) AS deduction,
              COALESCE(SUM(CASE WHEN transaction_type='adjustment'           THEN amount ELSE 0 END),0) AS adjustment
            FROM staff_transactions WHERE business_id = $1 GROUP BY business_user_id
          ) tx ON tx.business_user_id = bu.id
          WHERE bu.business_id = $1 AND bu.is_active = 1
            AND bu.role NOT IN ('business_owner', 'super_admin')
        `, [id]),
      ]);

    const memberCount  = Number(memberRes.rows[0]?.cnt)      || 0;
    const salesTotal   = Number(salesRes.rows[0]?.total)      || 0;
    const expTotal     = Number(expRes.rows[0]?.total)         || 0;
    const debtTotal    = Math.max(0,
      Number(purchRes.rows[0]?.total_p) - Number(purchRes.rows[0]?.paid_at_p) - Number(payRes.rows[0]?.total)
    );
    const staffBalance = Number(staffBalRes.rows[0]?.balance) || 0;

    results.push({
      ...biz,
      memberCount,
      salesTotal,
      expTotal,
      netCash: salesTotal - expTotal,
      debtTotal,
      staffBalance,
    });
  }
  return { businesses: results, monthStart, today };
}

// ── ۳. جزئیات کامل یک کسب‌وکار برای ادمین ────────────────────────────────────
async function getBusinessAdminDetail(businessId) {
  const bizRes = await query('SELECT * FROM businesses WHERE id = $1', [businessId]);
  const biz = bizRes.rows[0] || null;
  if (!biz) return null;

  const [ownerRes, licRes, teamRes, branchRes] = await Promise.all([
    // مشخصات مالک
    query(`
      SELECT bu.role, bu.display_name, u.name, u.telegram_id
      FROM business_users bu
      LEFT JOIN users u ON u.id = bu.user_id
      WHERE bu.business_id = $1 AND bu.role = 'business_owner' AND bu.is_active = 1
      LIMIT 1
    `, [businessId]),
    // وضعیت لایسنس
    query(`
      SELECT l.id, l.code, l.created_at AS license_created_at,
             l.used_at, (l.used_by IS NOT NULL) AS is_used
      FROM licenses l
      WHERE l.code = $1
    `, [biz.license_code || '']),
    // اعضای تیم
    query(`
      SELECT bu.id, bu.role, bu.is_active, bu.created_at,
             COALESCE(bu.display_name, u.name, 'ناشناس') AS display_name,
             u.telegram_id
      FROM business_users bu
      LEFT JOIN users u ON u.id = bu.user_id
      WHERE bu.business_id = $1
      ORDER BY bu.role, bu.id
    `, [businessId]),
    // شعبه‌ها
    query(`
      SELECT id, name, address, is_active, created_at
      FROM branches WHERE business_id = $1 ORDER BY id
    `, [businessId]),
  ]);

  return {
    biz,
    owner:    ownerRes.rows[0]  || null,
    license:  licRes.rows[0]    || null,
    team:     teamRes.rows,
    branches: branchRes.rows,
  };
}

// ── ۴. فروش‌های اخیر ─────────────────────────────────────────────────────────
async function getBusinessRecentSales(businessId, limit) {
  const lim = limit || 20;
  const result = await query(`
    SELECT
      s.id, s.sale_date,
      s.cash_amount, s.pos_amount, s.card_transfer_amount, s.online_amount,
      (s.cash_amount + s.pos_amount + s.card_transfer_amount + s.online_amount) AS total,
      s.order_count, s.note,
      COALESCE(b.name, '—') AS branch_name
    FROM sales s
    LEFT JOIN branches b ON b.id = s.branch_id
    WHERE s.business_id = $1 AND s.deleted_at IS NULL
    ORDER BY s.sale_date DESC, s.id DESC
    LIMIT $2
  `, [businessId, lim]);
  return result.rows;
}

// ── ۵. مخارج اخیر ────────────────────────────────────────────────────────────
async function getBusinessRecentExpenses(businessId, limit) {
  const lim = limit || 20;
  const result = await query(`
    SELECT
      e.id, e.expense_date, e.amount, e.category, e.note,
      COALESCE(b.name, '—') AS branch_name
    FROM expenses e
    LEFT JOIN branches b ON b.id = e.branch_id
    WHERE e.business_id = $1 AND e.deleted_at IS NULL
    ORDER BY e.expense_date DESC, e.id DESC
    LIMIT $2
  `, [businessId, lim]);
  return result.rows;
}

// ── ۶. خریدهای مواد اخیر ─────────────────────────────────────────────────────
async function getBusinessRecentPurchases(businessId, limit) {
  const lim = limit || 20;
  const result = await query(`
    SELECT
      sp.id, sp.purchase_date, sp.item_name, sp.quantity, sp.unit,
      sp.unit_price, sp.total_amount, sp.paid_amount,
      (sp.total_amount - sp.paid_amount) AS remaining,
      sp.note,
      COALESCE(s.name, '—') AS supplier_name
    FROM supplier_purchases sp
    LEFT JOIN suppliers s ON s.id = sp.supplier_id
    WHERE sp.business_id = $1 AND sp.deleted_at IS NULL
    ORDER BY sp.purchase_date DESC, sp.id DESC
    LIMIT $2
  `, [businessId, lim]);
  return result.rows;
}

// ── ۷. پرداخت‌های اخیر به تأمین‌کنندگان ─────────────────────────────────────
async function getBusinessRecentSupplierPayments(businessId, limit) {
  const lim = limit || 20;
  const result = await query(`
    SELECT
      p.id, p.payment_date, p.amount, p.method, p.note,
      COALESCE(s.name, '—') AS supplier_name
    FROM supplier_payments p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.business_id = $1
    ORDER BY p.payment_date DESC, p.id DESC
    LIMIT $2
  `, [businessId, lim]);
  return result.rows;
}

// ── ۸. موجودی انبار ──────────────────────────────────────────────────────────
async function getBusinessInventorySummary(businessId) {
  const result = await query(`
    SELECT
      i.id, i.name, i.unit, i.min_stock, i.status,
      COALESCE(SUM(
        CASE
          WHEN m.movement_type = 'in'         THEN  m.quantity
          WHEN m.movement_type = 'out'        THEN -m.quantity
          WHEN m.movement_type = 'adjustment' THEN  m.quantity
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

// ── ۹. خلاصه حقوق پرسنل ─────────────────────────────────────────────────────
async function getBusinessPayrollSummary(businessId) {
  const result = await query(`
    SELECT
      bu.id AS business_user_id,
      COALESCE(bu.display_name, u.name, 'ناشناس') AS display_name,
      bu.role,
      u.telegram_id,
      COALESCE(pp.base_salary, 0)                         AS base_salary,
      COALESCE(tx.salary_payment,       0)                AS salary_payment,
      COALESCE(tx.advance,              0)                AS advance,
      COALESCE(tx.internal_consumption, 0)                AS internal_consumption,
      COALESCE(tx.bonus,                0)                AS bonus,
      COALESCE(tx.deduction,            0)                AS deduction,
      COALESCE(tx.adjustment,           0)                AS adjustment,
      (
        COALESCE(pp.base_salary, 0)
        + COALESCE(tx.bonus,       0) + COALESCE(tx.adjustment, 0)
        - COALESCE(tx.salary_payment,       0)
        - COALESCE(tx.advance,              0)
        - COALESCE(tx.internal_consumption, 0)
        - COALESCE(tx.deduction,            0)
      ) AS balance
    FROM business_users bu
    LEFT JOIN users u ON u.id = bu.user_id
    LEFT JOIN payroll_profiles pp
      ON pp.business_user_id = bu.id AND pp.business_id = $1
    LEFT JOIN (
      SELECT business_user_id,
        COALESCE(SUM(CASE WHEN transaction_type='salary_payment'       THEN amount ELSE 0 END),0) AS salary_payment,
        COALESCE(SUM(CASE WHEN transaction_type='advance'              THEN amount ELSE 0 END),0) AS advance,
        COALESCE(SUM(CASE WHEN transaction_type='internal_consumption' THEN amount ELSE 0 END),0) AS internal_consumption,
        COALESCE(SUM(CASE WHEN transaction_type='bonus'                THEN amount ELSE 0 END),0) AS bonus,
        COALESCE(SUM(CASE WHEN transaction_type='deduction'            THEN amount ELSE 0 END),0) AS deduction,
        COALESCE(SUM(CASE WHEN transaction_type='adjustment'           THEN amount ELSE 0 END),0) AS adjustment
      FROM staff_transactions WHERE business_id = $1 GROUP BY business_user_id
    ) tx ON tx.business_user_id = bu.id
    WHERE bu.business_id = $1 AND bu.is_active = 1
      AND bu.role NOT IN ('business_owner', 'super_admin')
    ORDER BY bu.role, bu.id
  `, [businessId]);
  return result.rows;
}

module.exports = {
  getSystemOverview,
  listBusinessesWithFinancialSummary,
  getBusinessAdminDetail,
  getBusinessRecentSales,
  getBusinessRecentExpenses,
  getBusinessRecentPurchases,
  getBusinessRecentSupplierPayments,
  getBusinessInventorySummary,
  getBusinessPayrollSummary,
};
