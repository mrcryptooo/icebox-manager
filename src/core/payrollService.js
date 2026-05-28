'use strict';
const { query } = require('../db/database');
const { getTodayDate, getMonthRange } = require('../utils/date');

// ─── برچسب فارسی نوع تراکنش ──────────────────────────────────────────────────
const TRANSACTION_TYPE_LABELS = {
  salary_payment:       'پرداخت حقوق',
  advance:              'برداشت / علی‌الحساب',
  internal_consumption: 'مصرف داخلی',
  bonus:                'پاداش',
  deduction:            'کسری / جریمه',
  adjustment:           'اصلاح حساب',
};

const SALARY_TYPE_LABELS = {
  monthly: 'ماهانه',
  daily:   'روزانه',
  hourly:  'ساعتی',
};

// ─── دریافت یا ساخت پروفایل حقوقی برای یک عضو ───────────────────────────────
async function getOrCreatePayrollProfile(businessId, businessUserId) {
  const existing = await query(`
    SELECT * FROM payroll_profiles
    WHERE business_id = $1 AND business_user_id = $2
  `, [businessId, businessUserId]);

  if (existing.rows.length > 0) return existing.rows[0];

  const result = await query(`
    INSERT INTO payroll_profiles (business_id, business_user_id, base_salary, salary_type, status)
    VALUES ($1, $2, 0, 'monthly', 'active')
    ON CONFLICT (business_id, business_user_id) DO UPDATE
      SET updated_at = NOW()
    RETURNING *
  `, [businessId, businessUserId]);
  return result.rows[0];
}

// ─── تنظیم حقوق پایه ─────────────────────────────────────────────────────────
async function setBaseSalary(businessId, businessUserId, baseSalary, salaryType = 'monthly') {
  const result = await query(`
    INSERT INTO payroll_profiles (business_id, business_user_id, base_salary, salary_type, status)
    VALUES ($1, $2, $3, $4, 'active')
    ON CONFLICT (business_id, business_user_id) DO UPDATE
      SET base_salary  = EXCLUDED.base_salary,
          salary_type  = EXCLUDED.salary_type,
          updated_at   = NOW()
    RETURNING *
  `, [businessId, businessUserId, baseSalary, salaryType]);
  return result.rows[0];
}

// ─── دریافت پروفایل حقوقی ────────────────────────────────────────────────────
async function getPayrollProfile(businessId, businessUserId) {
  const result = await query(`
    SELECT * FROM payroll_profiles
    WHERE business_id = $1 AND business_user_id = $2
  `, [businessId, businessUserId]);
  return result.rows[0] || null;
}

// ─── ثبت تراکنش پرسنل ────────────────────────────────────────────────────────
async function createStaffTransaction({
  businessId,
  businessUserId,
  transactionType,
  amount,
  note = null,
  createdByTelegramId = null,
  transactionDate = null,
}) {
  const date = transactionDate || getTodayDate();
  const result = await query(`
    INSERT INTO staff_transactions
      (business_id, business_user_id, transaction_type, amount, transaction_date, note, created_by_telegram_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [businessId, businessUserId, transactionType, amount, date, note, createdByTelegramId]);
  return result.rows[0];
}

// ─── لیست تراکنش‌های یک عضو ──────────────────────────────────────────────────
async function listStaffTransactions(businessId, businessUserId, limit = 20) {
  const result = await query(`
    SELECT * FROM staff_transactions
    WHERE business_id = $1 AND business_user_id = $2
    ORDER BY transaction_date DESC, id DESC
    LIMIT $3
  `, [businessId, businessUserId, limit]);
  return result.rows;
}

// ─── خلاصه حساب یک عضو ───────────────────────────────────────────────────────
// مانده = base_salary + bonus + adjustment_pos - salary_payment - advance - internal_consumption - deduction - adjustment_neg
async function getStaffAccountSummary(businessId, businessUserId, startDate = null, endDate = null) {
  const profile = await getPayrollProfile(businessId, businessUserId);

  let dateClause = '';
  const params = [businessId, businessUserId];
  if (startDate && endDate) {
    params.push(startDate, endDate);
    dateClause = `AND transaction_date >= $${params.length - 1} AND transaction_date <= $${params.length}`;
  }

  const txResult = await query(`
    SELECT
      transaction_type,
      COALESCE(SUM(amount), 0) AS total
    FROM staff_transactions
    WHERE business_id = $1 AND business_user_id = $2
      ${dateClause}
    GROUP BY transaction_type
  `, params);

  const totals = {};
  for (const r of txResult.rows) {
    totals[r.transaction_type] = Number(r.total) || 0;
  }

  const baseSalary           = Number(profile?.base_salary)    || 0;
  const salaryPayment        = totals['salary_payment']        || 0;
  const advance              = totals['advance']               || 0;
  const internalConsumption  = totals['internal_consumption']  || 0;
  const bonus                = totals['bonus']                 || 0;
  const deduction            = totals['deduction']             || 0;
  const adjustment           = totals['adjustment']            || 0;

  // مانده قابل پرداخت = حقوق پایه + پاداش + اصلاح - پرداخت حقوق - برداشت - مصرف داخلی - کسری
  const balance = baseSalary + bonus + adjustment
                - salaryPayment - advance - internalConsumption - deduction;

  return {
    profile,
    baseSalary,
    salaryPayment,
    advance,
    internalConsumption,
    bonus,
    deduction,
    adjustment,
    balance,
  };
}

// ─── خلاصه حساب همه پرسنل ────────────────────────────────────────────────────
async function getAllStaffAccountSummaries(businessId) {
  // دریافت همه اعضای فعال (غیر از business_owner)
  const membersResult = await query(`
    SELECT bu.id AS business_user_id, bu.role, bu.display_name,
           u.name, u.telegram_id
    FROM business_users bu
    JOIN users u ON bu.user_id = u.id
    WHERE bu.business_id = $1
      AND bu.is_active = 1
      AND bu.role != 'business_owner'
      AND bu.role != 'super_admin'
    ORDER BY bu.id
  `, [businessId]);

  const summaries = [];
  for (const m of membersResult.rows) {
    const summary = await getStaffAccountSummary(businessId, m.business_user_id);
    summaries.push({
      businessUserId: m.business_user_id,
      displayName:    m.display_name || m.name || `کاربر ${m.telegram_id}`,
      role:           m.role,
      telegramId:     m.telegram_id,
      ...summary,
    });
  }
  return summaries;
}

// ─── گزارش حقوق ماه جاری ─────────────────────────────────────────────────────
async function getMonthlyPayrollReport(businessId, startDate = null, endDate = null) {
  // اگر تاریخ داده نشد، از ماه جاری استفاده کن
  let start = startDate;
  let end   = endDate;
  if (!start || !end) {
    const range = getMonthRange();
    start = range.start;
    end   = range.end;
  }

  const membersResult = await query(`
    SELECT bu.id AS business_user_id, bu.role, bu.display_name,
           u.name, u.telegram_id
    FROM business_users bu
    JOIN users u ON bu.user_id = u.id
    WHERE bu.business_id = $1
      AND bu.is_active = 1
      AND bu.role != 'business_owner'
      AND bu.role != 'super_admin'
    ORDER BY bu.id
  `, [businessId]);

  const rows = [];
  let totalBaseSalary = 0, totalSalaryPayment = 0, totalAdvance = 0;
  let totalConsumption = 0, totalBonus = 0, totalDeduction = 0, totalBalance = 0;

  for (const m of membersResult.rows) {
    const summary = await getStaffAccountSummary(businessId, m.business_user_id, start, end);
    const profileFull = await getPayrollProfile(businessId, m.business_user_id);
    totalBaseSalary    += summary.baseSalary;
    totalSalaryPayment += summary.salaryPayment;
    totalAdvance       += summary.advance;
    totalConsumption   += summary.internalConsumption;
    totalBonus         += summary.bonus;
    totalDeduction     += summary.deduction;
    totalBalance       += summary.balance;
    rows.push({
      businessUserId: m.business_user_id,
      displayName:    m.display_name || m.name || `کاربر ${m.telegram_id}`,
      role:           m.role,
      baseSalary:     Number(profileFull?.base_salary) || 0,
      salaryType:     profileFull?.salary_type || 'monthly',
      ...summary,
    });
  }

  return {
    startDate: start,
    endDate:   end,
    rows,
    totals: {
      baseSalary:          totalBaseSalary,
      salaryPayment:       totalSalaryPayment,
      advance:             totalAdvance,
      internalConsumption: totalConsumption,
      bonus:               totalBonus,
      deduction:           totalDeduction,
      balance:             totalBalance,
    },
  };
}

// ─── دریافت تراکنش‌های همه پرسنل برای خروجی CSV ─────────────────────────────
async function getAllStaffTransactionsForExport(businessId) {
  const result = await query(`
    SELECT
      st.id,
      COALESCE(bu.display_name, u.name, 'نامشخص') AS staff_name,
      bu.role,
      st.transaction_type,
      st.amount,
      st.transaction_date,
      st.note,
      st.created_at
    FROM staff_transactions st
    JOIN business_users bu ON st.business_user_id = bu.id
    JOIN users u ON bu.user_id = u.id
    WHERE st.business_id = $1
    ORDER BY st.transaction_date DESC, st.id DESC
  `, [businessId]);
  return result.rows;
}

module.exports = {
  TRANSACTION_TYPE_LABELS,
  SALARY_TYPE_LABELS,
  getOrCreatePayrollProfile,
  setBaseSalary,
  getPayrollProfile,
  createStaffTransaction,
  listStaffTransactions,
  getStaffAccountSummary,
  getAllStaffAccountSummaries,
  getMonthlyPayrollReport,
  getAllStaffTransactionsForExport,
};
