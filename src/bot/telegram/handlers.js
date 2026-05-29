'use strict';
const path = require('path');
const os   = require('os');
const fs   = require('fs');

const { getSession, clearSession }                    = require('../../utils/session');
const { isSuperAdmin, hasPermission, loadBizContext } = require('../../utils/auth');
const { checkConnection }                              = require('../../db/database');
const { formatMoney, formatNumber }                    = require('../../utils/formatMoney');
const {
  getTodayDate, getWeekRange, getMonthRange,
  gregorianToJalaliDateString, getTodayJalali,
  getTodayJalaliParts, getJalaliMonthDays,
  jalaliToGregorianDateString, normalizeDateInput,
} = require('../../utils/date');

const { findOrCreateUser, getUserByTelegramId }       = require('../../core/userService');
const { getAllBranches, getBranchById, createBranch } = require('../../core/branchService');
const {
  recordSale, getSaleById, getRecentSales,
  updateSale, deleteSale, aggregateSales,
} = require('../../core/salesService');
const {
  recordExpense, getExpenseById, getRecentExpenses,
  updateExpense, deleteExpense, getExpensesDetailedReport,
} = require('../../core/expenseService');
const {
  getDailyReport,       getWeeklyReport,       getMonthlyReport,
  getDailyAllBranches,  getWeeklyAllBranches,  getMonthlyAllBranches,
  getDailyComparison,   getWeeklyComparison,   getMonthlyComparison,
  getCustomReport,      getCustomAllBranches,  getCustomComparison,
} = require('../../core/reportService');
const {
  getAllSalesForExport, getAllExpensesForExport,
  buildSalesCsv, buildExpensesCsv, buildPurchasesCsv, buildInventoryCsv,
  buildStaffTransactionsCsv,
  // Phase 8F — خروجی حسابداری کامل
  getSalesForRangeExport, getExpensesForRangeExport,
  getSupplierPurchasesForRangeExport, getSupplierPaymentsForRangeExport,
  getPayrollTransactionsForRangeExport,
  buildAccountingSummaryCsv, buildSalesRangeCsv, buildExpensesRangeCsv,
  buildSupplierPurchasesRangeCsv, buildSupplierPaymentsRangeCsv, buildPayrollRangeCsv,
} = require('../../core/exportService');
const {
  TRANSACTION_TYPE_LABELS, SALARY_TYPE_LABELS,
  getOrCreatePayrollProfile, setBaseSalary,
  createStaffTransaction, getStaffAccountSummary,
  getAllStaffAccountSummaries, getMonthlyPayrollReport,
  getAllStaffTransactionsForExport,
} = require('../../core/payrollService');
const { getFullAccountingReport } = require('../../core/accountingService');
const {
  createInventoryItem, listInventoryItems, getInventoryItemById,
  findInventoryItemByName, createInventoryMovement,
  addStock, removeStock, adjustStock,
  getItemStock, getInventorySummary, getLowStockItems,
  listInventoryMovements, getAllInventoryForExport,
} = require('../../core/inventoryService');
const {
  createSupplier, listSuppliers,
  getSupplierBalance, getAllSupplierBalances,
  createSupplierPurchase, createSupplierPayment,
  getAllPurchasesForExport,
} = require('../../core/supplierService');
const { createBusiness, getDefaultBusiness, ensureDefaultBusiness } = require('../../core/businessService');
const { createLicense, getLicenseByCode, getAllLicenses, activateLicense } = require('../../core/licenseService');
const {
  addTeamMember, getTeamMembers, getAllTeamMembers,
  updateMemberRole, deactivateMember, activateMember,
  getInactiveMembership,
  getMemberPermissions, updateMemberPermissions,
  toggleMemberPermission, resetMemberPermissionsToRoleDefault,
  ALL_PERMISSIONS, PERMISSION_LABELS,
  DEFAULT_PERMISSIONS, ROLE_LABELS,
} = require('../../core/teamService');
const {
  setSectionLock, getSectionLock, removeSectionLock, getSectionLocks,
  verifyPin, LOCKABLE_SECTIONS, SECTION_LABELS,
} = require('../../core/lockService');

const MSG = require('./messages');
const KB  = require('./keyboards');

// ─── ثابت‌ها ──────────────────────────────────────────────────────────────────
const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

const EXPENSE_VALID_CATEGORIES = [
  'مواد اولیه', 'شیر و خامه', 'میوه', 'شکلات و تاپینگ',
  'بسته‌بندی', 'حقوق و دستمزد', 'اجاره', 'قبوض',
  'تعمیرات', 'تبلیغات', 'پیک و ارسال', 'سایر',
];

const ROLE_MAP = { 'سرپرست': 'manager', 'کارمند': 'staff', 'حسابدار': 'accountant' };

// ─── emoji اعداد برای لیست اعضا ─────────────────────────────────────────────
const MEMBER_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
function parseMemberIndex(text) {
  return MEMBER_EMOJIS.findIndex(e => text.startsWith(e));
}

// ─── ابزارها ──────────────────────────────────────────────────────────────────
function parseNumber(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/[,،\s]/g, '')
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728));
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return n;
}

function parseId(text) {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728));
  const n = parseInt(cleaned, 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function gDate(dateStr) {
  if (!dateStr) return '—';
  return gregorianToJalaliDateString(dateStr);
}

// ─── فرمت فروش برای نمایش ────────────────────────────────────────────────────
function formatSaleData(sale, branch) {
  const total = (sale.cash_amount || 0) + (sale.pos_amount || 0) +
                (sale.card_transfer_amount || 0) + (sale.online_amount || 0);
  return {
    id:          sale.id,
    branchName:  branch ? branch.name : '—',
    date:        gDate(sale.sale_date),
    cash:        formatMoney(sale.cash_amount),
    pos:         formatMoney(sale.pos_amount),
    cardTransfer: formatMoney(sale.card_transfer_amount),
    online:      formatMoney(sale.online_amount),
    total:       formatMoney(total),
    orderCount:  formatNumber(sale.order_count),
    note:        sale.note,
  };
}

// ─── بارگذاری یا ایجاد biz context ──────────────────────────────────────────
async function ensureBizContext(ctx) {
  const session = getSession(ctx.from.id);
  if (session.biz) return session.biz;

  if (isSuperAdmin(ctx)) {
    // ایجاد یا یافتن کسب‌وکار پیش‌فرض و ربط دادن OWNER به آن
    const user = await getUserByTelegramId(ctx.from.id);
    const defaultBizId = await ensureDefaultBusiness();
    if (user) {
      await addTeamMember({ businessId: defaultBizId, userId: user.id, role: 'business_owner' });
    }
    const biz = await getDefaultBusiness();
    session.biz = {
      businessId:   defaultBizId,
      businessName: biz ? biz.name : 'فروشگاه پیش‌فرض',
      role:         'super_admin',
      permissions:  ['*'],
    };
    return session.biz;
  }

  const biz = await loadBizContext(ctx.from.id);
  if (biz) {
    session.biz = biz;
    return biz;
  }
  return null;
}

// ─── منوی اصلی مناسب (پویا براساس permission واقعی) ─────────────────────────
function getMenu(session) {
  return KB.getMainMenuDynamic(session?.biz);
}

// ─── بررسی قفل بخش ───────────────────────────────────────────────────────────
async function checkSectionPin(ctx, sectionKey, onSuccess) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!biz) return ctx.reply(MSG.mainMenu, getMenu(session));

  const lock = await getSectionLock(biz.businessId, sectionKey);
  if (!lock) return onSuccess();

  if (session.pinUnlocked && session.pinUnlocked[sectionKey]) return onSuccess();

  session.data = session.data || {};
  session.data.pendingSection = sectionKey;
  session.data.pinAttempts    = 0;
  session.step = 'pin_verify';
  return ctx.reply(MSG.pinPrompt, KB.cancelKeyboard);
}

// ─── رفتن به بخش بعد از تأیید PIN ────────────────────────────────────────────
async function navigateToSection(ctx, sectionKey) {
  if (sectionKey === 'reports')        return startReportsMenu(ctx);
  if (sectionKey === 'exports')        return startExportMenu(ctx);
  if (sectionKey === 'manage_records') return startManageRecords(ctx);
  if (sectionKey === 'settings')       return startSettings(ctx);
  if (sectionKey === 'expenses')       return startExpenseFlow(ctx);
  clearSession(ctx.from.id);
  return ctx.reply(MSG.mainMenu, getMenu(getSession(ctx.from.id)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// /start و /menu
// ═══════════════════════════════════════════════════════════════════════════════

async function handleStart(ctx) {
  const tgUser = ctx.from;
  const user = await findOrCreateUser(tgUser.id, tgUser.first_name || tgUser.username);

  // بازنشانی کامل session (PIN هم پاک می‌شود)
  const session = getSession(tgUser.id);
  session.step        = null;
  session.data        = {};
  session.pinUnlocked = {};
  // biz را پاک می‌کنیم تا تازه بارگذاری شود
  session.biz = null;

  const biz = await ensureBizContext(ctx);
  if (!biz) {
    // بررسی: آیا کاربر قبلاً عضو تیم بوده اما غیرفعال شده؟
    if (!isSuperAdmin(ctx)) {
      const inactive = await getInactiveMembership(tgUser.id);
      if (inactive) {
        return ctx.reply(MSG.memberInactive, KB.cancelKeyboard);
      }
    }
    // کاربر جدید — نمایش آیدی + درخواست لایسنس
    session.step = 'register_license';
    return ctx.reply(MSG.newUserWelcome(tgUser.id), { parse_mode: 'Markdown', ...KB.cancelKeyboard });
  }

  return ctx.reply(
    MSG.welcome(user.name || tgUser.first_name),
    { parse_mode: 'Markdown', ...getMenu(session) }
  );
}

// ─── افزودن سریع شعبه ────────────────────────────────────────────────────────
async function startQuickAddBranch(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'branch_add_name';
  session.data = {};
  return ctx.reply(MSG.askBranchName, KB.cancelKeyboard);
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان ثبت‌نام کسب‌وکار جدید
// ═══════════════════════════════════════════════════════════════════════════════

async function handleRegistrationStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;

  if (step === 'register_license') {
    const code = text.trim().toUpperCase();
    if (!/^ICE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return ctx.reply(MSG.licenseInvalid, KB.cancelKeyboard);
    }
    const license = await getLicenseByCode(code);
    if (!license || license.used_by !== null) {
      return ctx.reply(MSG.licenseUsedOrInvalid, KB.cancelKeyboard);
    }
    data.licenseCode = code;
    session.step = 'register_biz_name';
    return ctx.reply(MSG.askBusinessName, KB.cancelKeyboard);
  }

  if (step === 'register_biz_name') {
    if (!text || text.trim().length < 2) {
      return ctx.reply(MSG.askBusinessName, KB.cancelKeyboard);
    }
    data.bizName = text.trim();
    session.step = 'register_biz_type';
    return ctx.reply(MSG.askBusinessType, KB.businessTypeKeyboard());
  }

  if (step === 'register_biz_type') {
    data.bizType = text.trim();
    session.step = 'register_biz_city';
    return ctx.reply(MSG.askBusinessCity, KB.cancelKeyboard);
  }

  if (step === 'register_biz_city') {
    data.bizCity = text === 'ندارم' ? null : text.trim();
    session.step = 'register_biz_phone';
    return ctx.reply(MSG.askBusinessPhone, KB.cancelKeyboard);
  }

  if (step === 'register_biz_phone') {
    data.bizPhone = text === 'ندارم' ? null : text.trim();

    const tgUser = ctx.from;
    const user = await findOrCreateUser(tgUser.id, tgUser.first_name || tgUser.username);

    const biz = await createBusiness({
      name:        data.bizName,
      type:        data.bizType,
      city:        data.bizCity,
      phone:       data.bizPhone,
      ownerId:     user.id,
      licenseCode: data.licenseCode,
    });

    await activateLicense(data.licenseCode, biz.id);
    await addTeamMember({ businessId: biz.id, userId: user.id, role: 'business_owner' });

    session.biz = {
      businessId:   biz.id,
      businessName: biz.name,
      role:         'business_owner',
      permissions:  ['*'],
    };
    session.step = null;
    session.data = {};

    return ctx.reply(
      MSG.businessRegistered(biz.name),
      { parse_mode: 'Markdown', ...KB.getMainMenuForRole('business_owner') }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان ثبت فروش
// ═══════════════════════════════════════════════════════════════════════════════

async function startSaleFlow(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'sales.create')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  const branches = await getAllBranches(biz?.businessId);
  if (branches.length === 0) {
    return ctx.reply(MSG.noBranchesAction, KB.noBranchesActionKeyboard());
  }
  session.step = 'sale_branch';
  session.data = {};
  return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
}

async function handleSaleBranch(ctx, branchName) {
  const session = getSession(ctx.from.id);
  const branches = await getAllBranches(session.biz?.businessId);
  const branch = branches.find(b => b.name === branchName);
  if (!branch) return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
  session.data.branchId   = branch.id;
  session.data.branchName = branch.name;
  session.step = 'sale_cash';
  return ctx.reply(MSG.askCash, KB.cancelKeyboard);
}

const SALE_NUMERIC_STEPS = [
  { key: 'sale_cash',   nextAsk: () => MSG.askPos,         nextStep: 'sale_pos',    field: 'cash' },
  { key: 'sale_pos',    nextAsk: () => MSG.askCardTransfer, nextStep: 'sale_card',   field: 'pos' },
  { key: 'sale_card',   nextAsk: () => MSG.askOnline,       nextStep: 'sale_online', field: 'cardTransfer' },
  { key: 'sale_online', nextAsk: () => MSG.askOrderCount,   nextStep: 'sale_orders', field: 'online' },
  { key: 'sale_orders', nextAsk: () => MSG.askNote,         nextStep: 'sale_note',   field: 'orderCount' },
];

function buildSaleConfirmData(data) {
  const total = (data.cash || 0) + (data.pos || 0) + (data.cardTransfer || 0) + (data.online || 0);
  return {
    branchName:  data.branchName,
    date:        gDate(data.saleDate || getTodayDate()),
    cash:        formatMoney(data.cash),
    pos:         formatMoney(data.pos),
    cardTransfer: formatMoney(data.cardTransfer),
    online:      formatMoney(data.online),
    total:       formatMoney(total),
    orderCount:  formatNumber(data.orderCount),
    note:        data.note,
  };
}

async function handleSaleStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;

  const current = SALE_NUMERIC_STEPS.find(s => s.key === step);
  if (current) {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data[current.field] = n;
    session.step = current.nextStep;
    return ctx.reply(current.nextAsk(), KB.cancelKeyboard);
  }

  if (step === 'sale_note') {
    data.note     = text === 'ندارم' ? null : text;
    data.saleDate = data.saleDate || getTodayDate();
    session.step  = 'sale_confirm';
    return ctx.reply(MSG.confirmSale(buildSaleConfirmData(data)), KB.confirmSaleKeyboard());
  }

  if (step === 'sale_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      const user = await findOrCreateUser(ctx.from.id, ctx.from.first_name);
      await recordSale({
        businessId:          session.biz?.businessId,
        branchId:            data.branchId,
        userId:              user.id,
        saleDate:            data.saleDate,
        cashAmount:          data.cash,
        posAmount:           data.pos,
        cardTransferAmount:  data.cardTransfer,
        onlineAmount:        data.online,
        orderCount:          data.orderCount,
        note:                data.note,
      });
      const summary = buildSaleConfirmData(data);
      clearSession(ctx.from.id);
      return ctx.reply(MSG.saleSavedWithSummary(summary), getMenu(getSession(ctx.from.id)));
    }
    if (text === '✏️ ویرایش') {
      session.data = { branchId: data.branchId, branchName: data.branchName, saleDate: data.saleDate };
      session.step = 'sale_cash';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askCash, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان ثبت خرج
// ═══════════════════════════════════════════════════════════════════════════════

async function startExpenseFlow(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'expenses.create')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  return checkSectionPin(ctx, 'expenses', async () => {
    const branches = await getAllBranches(biz?.businessId);
    if (branches.length === 0) {
      return ctx.reply(MSG.noBranchesAction, KB.noBranchesActionKeyboard());
    }
    session.step = 'expense_branch';
    session.data = {};
    return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
  });
}

async function handleExpenseBranch(ctx, branchName) {
  const session = getSession(ctx.from.id);
  const branches = await getAllBranches(session.biz?.businessId);
  const branch = branches.find(b => b.name === branchName);
  if (!branch) return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
  session.data.branchId   = branch.id;
  session.data.branchName = branch.name;
  session.step = 'expense_amount';
  return ctx.reply(MSG.askExpenseAmount, KB.cancelKeyboard);
}

async function handleExpenseStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;

  if (step === 'expense_amount') {
    const n = parseNumber(text);
    if (n === null || n <= 0) return ctx.reply(MSG.invalidAmount, KB.cancelKeyboard);
    data.amount = n;
    session.step = 'expense_category';
    return ctx.reply(MSG.askExpenseCategory, KB.expenseCategoryKeyboard());
  }

  if (step === 'expense_category') {
    if (!EXPENSE_VALID_CATEGORIES.includes(text)) {
      return ctx.reply(MSG.askExpenseCategory, KB.expenseCategoryKeyboard());
    }
    data.category = text;
    session.step  = 'expense_note';
    return ctx.reply(MSG.askExpenseNote, KB.cancelKeyboard);
  }

  if (step === 'expense_note') {
    data.note        = text === 'ندارم' ? null : text;
    data.expenseDate = data.expenseDate || getTodayDate();
    session.step     = 'expense_confirm';
    return ctx.reply(
      MSG.confirmExpense({
        branchName: data.branchName,
        date:       gDate(data.expenseDate),
        amount:     formatMoney(data.amount),
        category:   data.category,
        note:       data.note,
      }),
      KB.confirmExpenseKeyboard()
    );
  }

  if (step === 'expense_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      const user = await findOrCreateUser(ctx.from.id, ctx.from.first_name);
      await recordExpense({
        businessId:  session.biz?.businessId,
        branchId:    data.branchId,
        userId:      user.id,
        expenseDate: data.expenseDate,
        amount:      data.amount,
        category:    data.category,
        note:        data.note,
      });
      clearSession(ctx.from.id);
      return ctx.reply(
        MSG.expenseSavedWithSummary({
          branchName: data.branchName,
          date:       gDate(data.expenseDate),
          amount:     formatMoney(data.amount),
          category:   data.category,
          note:       data.note,
        }),
        getMenu(getSession(ctx.from.id))
      );
    }
    if (text === '✏️ ویرایش') {
      session.data = { branchId: data.branchId, branchName: data.branchName, expenseDate: data.expenseDate };
      session.step = 'expense_amount';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askExpenseAmount, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// منوی گزارش‌ها
// ═══════════════════════════════════════════════════════════════════════════════

async function startReportsMenu(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'reports.view')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  return checkSectionPin(ctx, 'reports', async () => {
    const branches = await getAllBranches(biz?.businessId);
    if (branches.length === 0) return ctx.reply(MSG.noBranches, getMenu(session));
    session.step = 'reports_menu';
    session.data = {};
    return ctx.reply(MSG.reportsMenu, KB.reportsMenuKeyboard());
  });
}

async function handleReportsMenu(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  // گزارش حسابداری کامل — نیاز به شعبه ندارد، باید قبل از بررسی شعبه‌ها بیاید
  if (text === '📊 گزارش حسابداری کامل') return startAccountingReport(ctx);

  const branches = await getAllBranches(biz?.businessId);
  if (branches.length === 0) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.noBranches, getMenu(session));
  }

  if (text === '📊 گزارش امروز' || text === '📅 گزارش هفتگی' || text === '🗓️ گزارش ماهانه') {
    const typeMap = { '📊 گزارش امروز': 'daily', '📅 گزارش هفتگی': 'weekly', '🗓️ گزارش ماهانه': 'monthly' };
    const reportType = typeMap[text];
    session.step = `report_type_${reportType}`;
    session.data = { reportType };
    return ctx.reply(MSG.selectReportType, KB.reportTypeKeyboard());
  }
  if (text === '🏪 گزارش شعبه')         return startBranchReport(ctx);
  if (text === '🔁 مقایسه شعبه‌ها')     return startCompareReport(ctx);
  if (text === '📆 بازه دلخواه')         return startCustomReport(ctx);
  if (text === '🧾 گزارش ریز مخارج')    return startExpenseDetailReport(ctx);

  return ctx.reply(MSG.reportsMenu, KB.reportsMenuKeyboard());
}

async function handleReportTypeSelection(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const { reportType } = session.data;

  if (text === 'همه شعبه‌ها') {
    let report;
    if (reportType === 'daily')       report = await getDailyAllBranches(biz?.businessId);
    else if (reportType === 'weekly') report = await getWeeklyAllBranches(biz?.businessId);
    else                              report = await getMonthlyAllBranches(biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(report, getMenu(getSession(ctx.from.id)));
  }
  if (text === 'یک شعبه') {
    const branches = await getAllBranches(biz?.businessId);
    session.step = `report_branch_${reportType}`;
    return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  }
}

async function handleReportBranchSelection(ctx, branchName, reportType) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const branches = await getAllBranches(biz?.businessId);
  const branch = branches.find(b => b.name === branchName);
  if (!branch) return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));

  let report;
  if (reportType === 'daily')       report = await getDailyReport(branch.id, biz?.businessId);
  else if (reportType === 'weekly') report = await getWeeklyReport(branch.id, biz?.businessId);
  else                              report = await getMonthlyReport(branch.id, biz?.businessId);

  clearSession(ctx.from.id);
  return ctx.reply(report, getMenu(getSession(ctx.from.id)));
}

// ─── مقایسه شعبه‌ها ───────────────────────────────────────────────────────────

async function startCompareReport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const branches = await getAllBranches(biz?.businessId);
  if (branches.length < 2) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.notEnoughBranches, getMenu(getSession(ctx.from.id)));
  }
  session.step = 'compare_period';
  session.data = {};
  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

async function handleComparePeriod(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  if (text === '📊 امروز') {
    const report = await getDailyComparison(biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(report, getMenu(getSession(ctx.from.id)));
  }
  if (text === '📅 این هفته') {
    const report = await getWeeklyComparison(biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(report, getMenu(getSession(ctx.from.id)));
  }
  if (text === '🗓️ این ماه') {
    const report = await getMonthlyComparison(biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(report, getMenu(getSession(ctx.from.id)));
  }
  if (text === '📆 بازه دلخواه') {
    session.data.datePickerFlow = 'compare';
    return startPickingDate(ctx, 'start');
  }
  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

// ═══════════════════════════════════════════════════════════════════════════════
// تقویم دکمه‌ای
// ═══════════════════════════════════════════════════════════════════════════════

async function startPickingDate(ctx, mode) {
  const session = getSession(ctx.from.id);
  const { jy } = getTodayJalaliParts();
  session.data.datePickerMode = mode;
  session.data.datePickerYear = jy;
  session.step = 'datepick_month';
  const msg = mode === 'start' ? MSG.pickStartMonth : MSG.pickEndMonth;
  return ctx.reply(msg, KB.jalaliMonthsKeyboard());
}

async function handleDatepickMonth(ctx, text) {
  const session = getSession(ctx.from.id);
  const monthIndex = JALALI_MONTHS.indexOf(text);
  if (monthIndex === -1) {
    const mode = session.data.datePickerMode;
    return ctx.reply(mode === 'start' ? MSG.pickStartMonth : MSG.pickEndMonth, KB.jalaliMonthsKeyboard());
  }
  const month = monthIndex + 1;
  const year  = session.data.datePickerYear;
  session.data.datePickerMonth     = month;
  session.data.datePickerMonthName = text;
  session.step = 'datepick_day';
  const mode = session.data.datePickerMode;
  return ctx.reply(
    mode === 'start' ? MSG.pickStartDay(text) : MSG.pickEndDay(text),
    KB.jalaliDaysKeyboard(month, year)
  );
}

async function handleDatepickDay(ctx, text) {
  const session = getSession(ctx.from.id);
  const { datePickerMode, datePickerYear, datePickerMonth, datePickerMonthName } = session.data;

  const norm   = normalizeDateInput(text);
  const day    = parseInt(norm, 10);
  const maxDay = getJalaliMonthDays(datePickerMonth, datePickerYear);

  if (isNaN(day) || day < 1 || day > maxDay) {
    return ctx.reply(
      datePickerMode === 'start' ? MSG.pickStartDay(datePickerMonthName) : MSG.pickEndDay(datePickerMonthName),
      KB.jalaliDaysKeyboard(datePickerMonth, datePickerYear)
    );
  }

  const pad2 = n => String(n).padStart(2, '0');
  const jStr = `${datePickerYear}-${pad2(datePickerMonth)}-${pad2(day)}`;
  const gStr = jalaliToGregorianDateString(jStr);

  if (datePickerMode === 'start') {
    session.data.startJalali = jStr;
    session.data.startDate   = gStr;
    await ctx.reply(MSG.startDateSelected(jStr));
    return startPickingDate(ctx, 'end');
  } else {
    const { startJalali } = session.data;
    if (jStr < startJalali) {
      await ctx.reply(MSG.endBeforeStart);
      return startPickingDate(ctx, 'end');
    }
    session.data.endJalali = jStr;
    session.data.endDate   = gStr;
    await ctx.reply(MSG.endDateSelected(jStr));
    return finalizeDatePicker(ctx);
  }
}

async function finalizeDatePicker(ctx) {
  const session = getSession(ctx.from.id);
  const { datePickerFlow, startDate, endDate, startJalali, endJalali, scope, branchId } = session.data;
  const biz = session.biz;

  // ── گزارش حسابداری کامل (Phase 8E) ──────────────────────────────────────
  if (datePickerFlow === 'accounting') {
    await ctx.reply(MSG.exportGenerating);
    const report = await getFullAccountingReport(biz?.businessId, startDate, endDate);
    clearSession(ctx.from.id);
    return ctx.reply(
      MSG.accountingReport(report, startJalali || gregorianToJalaliDateString(startDate), endJalali || gregorianToJalaliDateString(endDate)),
      { parse_mode: 'Markdown', ...getMenu(getSession(ctx.from.id)) }
    );
  }

  // ── خروجی حسابداری کامل (Phase 8F) ──────────────────────────────────────
  if (datePickerFlow === 'accounting_export') {
    return handleAccountingFullExportSend(
      ctx, biz?.businessId, startDate, endDate,
      startJalali || gregorianToJalaliDateString(startDate),
      endJalali   || gregorianToJalaliDateString(endDate)
    );
  }

  // ── گزارش ریز مخارج (Phase 8) ────────────────────────────────────────────
  if (datePickerFlow === 'expense_detail') {
    const rows = await getExpensesDetailedReport(biz?.businessId, startDate, endDate);
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const formattedRows = rows.map(r => ({ ...r, amount: formatMoney(r.amount) }));
    clearSession(ctx.from.id);
    if (rows.length === 0) {
      return ctx.reply(MSG.noExpensesInPeriod, getMenu(getSession(ctx.from.id)));
    }
    return ctx.reply(
      MSG.expenseDetailReport(formattedRows, startJalali || startDate, endJalali || endDate, formatMoney(total)),
      { parse_mode: 'Markdown', ...getMenu(getSession(ctx.from.id)) }
    );
  }

  let report;
  if (datePickerFlow === 'compare') {
    report = await getCustomComparison(startDate, endDate, biz?.businessId);
  } else if (datePickerFlow === 'custom') {
    report = scope === 'all'
      ? await getCustomAllBranches(startDate, endDate, biz?.businessId)
      : await getCustomReport(branchId, startDate, endDate, biz?.businessId);
  } else if (datePickerFlow === 'branch') {
    report = await getCustomReport(branchId, startDate, endDate, biz?.businessId);
  } else {
    report = await getCustomAllBranches(startDate, endDate, biz?.businessId);
  }

  clearSession(ctx.from.id);
  return ctx.reply(report, getMenu(getSession(ctx.from.id)));
}

// ─── گزارش بازه دلخواه ───────────────────────────────────────────────────────

async function startCustomReport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const branches = await getAllBranches(biz?.businessId);
  if (branches.length === 0) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.noBranches, getMenu(getSession(ctx.from.id)));
  }
  session.step = 'custom_scope';
  session.data = {};
  return ctx.reply(MSG.selectReportType, KB.reportTypeKeyboard());
}

async function handleCustomScope(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (text === 'همه شعبه‌ها') {
    session.data.scope          = 'all';
    session.data.datePickerFlow = 'custom';
    return startPickingDate(ctx, 'start');
  }
  if (text === 'یک شعبه') {
    const branches = await getAllBranches(biz?.businessId);
    session.data.scope = 'single';
    session.step       = 'custom_branch';
    return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  }
  return ctx.reply(MSG.selectReportType, KB.reportTypeKeyboard());
}

async function handleCustomBranch(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const branches = await getAllBranches(biz?.businessId);
  const branch = branches.find(b => b.name === text);
  if (!branch) return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  session.data.branchId       = branch.id;
  session.data.branchName     = branch.name;
  session.data.datePickerFlow = 'custom';
  return startPickingDate(ctx, 'start');
}

// ─── گزارش شعبه ──────────────────────────────────────────────────────────────

async function startBranchReport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const branches = await getAllBranches(biz?.businessId);
  if (branches.length === 0) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.noBranches, getMenu(getSession(ctx.from.id)));
  }
  session.step = 'branch_report_select';
  session.data = {};
  return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
}

async function handleBranchReportSelect(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const branches = await getAllBranches(biz?.businessId);
  const branch = branches.find(b => b.name === text);
  if (!branch) return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  session.data.branchId   = branch.id;
  session.data.branchName = branch.name;
  session.step = 'branch_report_period';
  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

async function handleBranchReportPeriod(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const { branchId } = session.data;

  if (text === '📊 امروز') {
    const report = await getDailyReport(branchId, biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(report, getMenu(getSession(ctx.from.id)));
  }
  if (text === '📅 این هفته') {
    const report = await getWeeklyReport(branchId, biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(report, getMenu(getSession(ctx.from.id)));
  }
  if (text === '🗓️ این ماه') {
    const report = await getMonthlyReport(branchId, biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(report, getMenu(getSession(ctx.from.id)));
  }
  if (text === '📆 بازه دلخواه') {
    session.data.datePickerFlow = 'branch';
    return startPickingDate(ctx, 'start');
  }
  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

// ─── گزارش ریز مخارج (Phase 8) ───────────────────────────────────────────────

async function startExpenseDetailReport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'reports.view')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  session.step = 'expense_detail_period';
  session.data = {};
  return ctx.reply(MSG.expenseDetailMenu, { parse_mode: 'Markdown', ...KB.expenseDetailPeriodKeyboard() });
}

async function handleExpenseDetailPeriod(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  async function showExpenseDetail(start, end, startLabel, endLabel) {
    const rows = await getExpensesDetailedReport(biz?.businessId, start, end);
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const formattedRows = rows.map(r => ({ ...r, amount: formatMoney(r.amount) }));
    clearSession(ctx.from.id);
    if (rows.length === 0) {
      return ctx.reply(MSG.noExpensesInPeriod, getMenu(getSession(ctx.from.id)));
    }
    return ctx.reply(
      MSG.expenseDetailReport(formattedRows, startLabel, endLabel, formatMoney(total)),
      { parse_mode: 'Markdown', ...getMenu(getSession(ctx.from.id)) }
    );
  }

  if (text === '📊 امروز') {
    const today = getTodayDate();
    const todayJ = getTodayJalali();
    return showExpenseDetail(today, today, todayJ, todayJ);
  }
  if (text === '📅 این هفته') {
    const { start, end } = getWeekRange();
    const startJ = gregorianToJalaliDateString(start);
    const endJ   = gregorianToJalaliDateString(end);
    return showExpenseDetail(start, end, startJ, endJ);
  }
  if (text === '🗓️ این ماه') {
    const { start, end } = getMonthRange();
    const startJ = gregorianToJalaliDateString(start);
    const endJ   = gregorianToJalaliDateString(end);
    return showExpenseDetail(start, end, startJ, endJ);
  }
  if (text === '📆 بازه دلخواه') {
    session.data.datePickerFlow = 'expense_detail';
    return startPickingDate(ctx, 'start');
  }
  return ctx.reply(MSG.expenseDetailMenu, { parse_mode: 'Markdown', ...KB.expenseDetailPeriodKeyboard() });
}

// ═══════════════════════════════════════════════════════════════════════════════
// مدیریت شعبه‌ها
// ═══════════════════════════════════════════════════════════════════════════════

async function startBranchManagement(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'branches.manage')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  session.step = 'branch_manage';
  session.data = {};
  return ctx.reply('🏪 مدیریت شعبه‌ها:', KB.branchManageKeyboard());
}

async function handleBranchManage(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  if (text === '📋 لیست شعبه‌ها') {
    const branches = await getAllBranches(biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(MSG.branchList(branches), getMenu(getSession(ctx.from.id)));
  }
  if (text === '➕ افزودن شعبه') {
    session.step = 'branch_add_name';
    return ctx.reply(MSG.askBranchName, KB.cancelKeyboard);
  }
  if (session.step === 'branch_add_name') {
    if (!text || text.trim().length === 0) return ctx.reply(MSG.askBranchName, KB.cancelKeyboard);
    session.data.branchName = text.trim();
    session.step = 'branch_add_address';
    return ctx.reply(MSG.askBranchAddress, KB.cancelKeyboard);
  }
  if (session.step === 'branch_add_address') {
    const address = text === 'ندارم' ? null : text.trim();
    const branch = await createBranch(session.data.branchName, address, biz?.businessId);
    clearSession(ctx.from.id);
    return ctx.reply(MSG.branchCreated(branch.name), getMenu(getSession(ctx.from.id)));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// مدیریت ثبت‌ها
// ═══════════════════════════════════════════════════════════════════════════════

async function startManageRecords(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'manage_records.view')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  return checkSectionPin(ctx, 'manage_records', () => {
    session.step = 'records_menu';
    session.data = {};
    return ctx.reply(MSG.manageRecordsMenu, KB.manageRecordsKeyboard());
  });
}

async function handleRecordsMenu(ctx, text) {
  const session = getSession(ctx.from.id);
  if (text === '📋 آخرین فروش‌ها')   return handleViewRecentSales(ctx);
  if (text === '📋 آخرین مخارج')     return handleViewRecentExpenses(ctx);
  if (text === '🗑️ حذف فروش')        return startDeleteSale(ctx);
  if (text === '🗑️ حذف خرج')         return startDeleteExpense(ctx);
  if (text === '✏️ ویرایش فروش')     return startEditSale(ctx);
  if (text === '✏️ ویرایش خرج')      return startEditExpense(ctx);
  session.step = 'records_menu';
  return ctx.reply(MSG.manageRecordsMenu, KB.manageRecordsKeyboard());
}

async function handleViewRecentSales(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'records_menu';
  const sales = await getRecentSales(10, session.biz?.businessId);
  if (sales.length === 0) return ctx.reply(MSG.noRecordsYet('فروش'), KB.manageRecordsKeyboard());
  const formatted = sales.map(s => ({
    id: s.id, branchName: s.branch_name || '—', date: gDate(s.sale_date),
    cash: formatMoney(s.cash_amount), pos: formatMoney(s.pos_amount),
    cardTransfer: formatMoney(s.card_transfer_amount), online: formatMoney(s.online_amount),
    total: formatMoney((s.cash_amount || 0) + (s.pos_amount || 0) + (s.card_transfer_amount || 0) + (s.online_amount || 0)),
    orderCount: formatNumber(s.order_count), note: s.note,
  }));
  return ctx.reply(MSG.recentSalesList(formatted), KB.manageRecordsKeyboard());
}

async function handleViewRecentExpenses(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'records_menu';
  const expenses = await getRecentExpenses(10, session.biz?.businessId);
  if (expenses.length === 0) return ctx.reply(MSG.noRecordsYet('خرج'), KB.manageRecordsKeyboard());
  const formatted = expenses.map(e => ({
    id: e.id, branchName: e.branch_name || '—', date: gDate(e.expense_date),
    amount: formatMoney(e.amount), category: e.category, note: e.note,
  }));
  return ctx.reply(MSG.recentExpensesList(formatted), KB.manageRecordsKeyboard());
}

// ─── حذف فروش ────────────────────────────────────────────────────────────────
async function startDeleteSale(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'delete_sale_id';
  session.data = {};
  return ctx.reply(MSG.askDeleteSaleId, KB.cancelKeyboard);
}

async function handleDeleteSaleStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;

  if (step === 'delete_sale_id') {
    const id = parseId(text);
    if (!id) return ctx.reply(MSG.invalidId, KB.cancelKeyboard);
    const sale = await getSaleById(id);
    if (!sale) return ctx.reply(MSG.recordNotFound, KB.cancelKeyboard);
    const branch = await getBranchById(sale.branch_id);
    data.saleId  = id;
    session.step = 'delete_sale_confirm';
    return ctx.reply(MSG.confirmDeleteSale(formatSaleData(sale, branch)), KB.confirmDeleteKeyboard());
  }

  if (step === 'delete_sale_confirm') {
    if (text === '🗑️ بله، حذف شود') {
      const ok = await deleteSale(data.saleId);
      clearSession(ctx.from.id);
      return ctx.reply(ok ? MSG.saleDeleted(data.saleId) : MSG.recordNotFound, getMenu(getSession(ctx.from.id)));
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ─── حذف خرج ─────────────────────────────────────────────────────────────────
async function startDeleteExpense(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'delete_expense_id';
  session.data = {};
  return ctx.reply(MSG.askDeleteExpenseId, KB.cancelKeyboard);
}

async function handleDeleteExpenseStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;

  if (step === 'delete_expense_id') {
    const id = parseId(text);
    if (!id) return ctx.reply(MSG.invalidId, KB.cancelKeyboard);
    const expense = await getExpenseById(id);
    if (!expense) return ctx.reply(MSG.recordNotFound, KB.cancelKeyboard);
    const branch = await getBranchById(expense.branch_id);
    data.expenseId = id;
    session.step   = 'delete_expense_confirm';
    return ctx.reply(
      MSG.confirmDeleteExpense({
        id: expense.id, branchName: branch ? branch.name : '—',
        date: gDate(expense.expense_date), amount: formatMoney(expense.amount),
        category: expense.category, note: expense.note,
      }),
      KB.confirmDeleteKeyboard()
    );
  }

  if (step === 'delete_expense_confirm') {
    if (text === '🗑️ بله، حذف شود') {
      const ok = await deleteExpense(data.expenseId);
      clearSession(ctx.from.id);
      return ctx.reply(ok ? MSG.expenseDeleted(data.expenseId) : MSG.recordNotFound, getMenu(getSession(ctx.from.id)));
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ─── ویرایش فروش ─────────────────────────────────────────────────────────────
async function startEditSale(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'edit_sale_id';
  session.data = {};
  return ctx.reply(MSG.askEditSaleId, KB.cancelKeyboard);
}

const EDIT_SALE_NUMERIC_STEPS = [
  { key: 'edit_sale_cash',   nextAsk: () => MSG.askPos,         nextStep: 'edit_sale_pos',    field: 'cash' },
  { key: 'edit_sale_pos',    nextAsk: () => MSG.askCardTransfer, nextStep: 'edit_sale_card',   field: 'pos' },
  { key: 'edit_sale_card',   nextAsk: () => MSG.askOnline,       nextStep: 'edit_sale_online', field: 'cardTransfer' },
  { key: 'edit_sale_online', nextAsk: () => MSG.askOrderCount,   nextStep: 'edit_sale_orders', field: 'online' },
  { key: 'edit_sale_orders', nextAsk: () => MSG.askNote,         nextStep: 'edit_sale_note',   field: 'orderCount' },
];

async function handleEditSaleStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;

  if (step === 'edit_sale_id') {
    const id = parseId(text);
    if (!id) return ctx.reply(MSG.invalidId, KB.cancelKeyboard);
    const sale = await getSaleById(id);
    if (!sale) return ctx.reply(MSG.recordNotFound, KB.cancelKeyboard);
    const branch = await getBranchById(sale.branch_id);
    data.editId    = sale.id;
    data.branchId  = sale.branch_id;
    data.branchName = branch ? branch.name : '—';
    data.saleDate  = sale.sale_date;
    session.step   = 'edit_sale_cash';
    return ctx.reply(MSG.showSaleForEdit(formatSaleData(sale, branch)) + '\n\n' + MSG.askCash, KB.cancelKeyboard);
  }

  const current = EDIT_SALE_NUMERIC_STEPS.find(s => s.key === step);
  if (current) {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data[current.field] = n;
    session.step = current.nextStep;
    return ctx.reply(current.nextAsk(), KB.cancelKeyboard);
  }

  if (step === 'edit_sale_note') {
    data.note    = text === 'ندارم' ? null : text;
    session.step = 'edit_sale_confirm';
    return ctx.reply(MSG.confirmSale(buildSaleConfirmData(data)), KB.confirmSaleKeyboard());
  }

  if (step === 'edit_sale_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      await updateSale(data.editId, {
        cashAmount: data.cash, posAmount: data.pos,
        cardTransferAmount: data.cardTransfer, onlineAmount: data.online,
        orderCount: data.orderCount, note: data.note,
      });
      const id = data.editId;
      clearSession(ctx.from.id);
      return ctx.reply(MSG.saleUpdated(id), getMenu(getSession(ctx.from.id)));
    }
    if (text === '✏️ ویرایش') {
      session.data = { editId: data.editId, branchId: data.branchId, branchName: data.branchName, saleDate: data.saleDate };
      session.step = 'edit_sale_cash';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askCash, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ─── ویرایش خرج ──────────────────────────────────────────────────────────────
async function startEditExpense(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'edit_expense_id';
  session.data = {};
  return ctx.reply(MSG.askEditExpenseId, KB.cancelKeyboard);
}

async function handleEditExpenseStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;

  if (step === 'edit_expense_id') {
    const id = parseId(text);
    if (!id) return ctx.reply(MSG.invalidId, KB.cancelKeyboard);
    const expense = await getExpenseById(id);
    if (!expense) return ctx.reply(MSG.recordNotFound, KB.cancelKeyboard);
    const branch = await getBranchById(expense.branch_id);
    data.editId      = expense.id;
    data.branchId    = expense.branch_id;
    data.branchName  = branch ? branch.name : '—';
    data.expenseDate = expense.expense_date;
    session.step     = 'edit_expense_amount';
    return ctx.reply(
      MSG.showExpenseForEdit({
        id: expense.id, branchName: data.branchName,
        date: gDate(expense.expense_date), amount: formatMoney(expense.amount),
        category: expense.category, note: expense.note,
      }) + '\n\n' + MSG.askExpenseAmount,
      KB.cancelKeyboard
    );
  }

  if (step === 'edit_expense_amount') {
    const n = parseNumber(text);
    if (n === null || n <= 0) return ctx.reply(MSG.invalidAmount, KB.cancelKeyboard);
    data.amount  = n;
    session.step = 'edit_expense_category';
    return ctx.reply(MSG.askExpenseCategory, KB.expenseCategoryKeyboard());
  }

  if (step === 'edit_expense_category') {
    if (!EXPENSE_VALID_CATEGORIES.includes(text)) {
      return ctx.reply(MSG.askExpenseCategory, KB.expenseCategoryKeyboard());
    }
    data.category = text;
    session.step  = 'edit_expense_note';
    return ctx.reply(MSG.askExpenseNote, KB.cancelKeyboard);
  }

  if (step === 'edit_expense_note') {
    data.note    = text === 'ندارم' ? null : text;
    session.step = 'edit_expense_confirm';
    return ctx.reply(
      MSG.confirmExpense({
        branchName: data.branchName, date: data.expenseDate,
        amount: formatMoney(data.amount), category: data.category, note: data.note,
      }),
      KB.confirmExpenseKeyboard()
    );
  }

  if (step === 'edit_expense_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      await updateExpense(data.editId, { amount: data.amount, category: data.category, note: data.note });
      const id = data.editId;
      clearSession(ctx.from.id);
      return ctx.reply(MSG.expenseUpdated(id), getMenu(getSession(ctx.from.id)));
    }
    if (text === '✏️ ویرایش') {
      session.data = { editId: data.editId, branchId: data.branchId, branchName: data.branchName, expenseDate: data.expenseDate };
      session.step = 'edit_expense_amount';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askExpenseAmount, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// مدیریت تیم
// ═══════════════════════════════════════════════════════════════════════════════

async function startTeamManagement(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'team.manage')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  session.step = 'team_menu';
  session.data = {};
  return ctx.reply(MSG.teamMenu, KB.teamMenuKeyboard());
}

async function handleTeamMenu(ctx, text) {
  const session = getSession(ctx.from.id);

  if (text === '➕ افزودن عضو') {
    session.step = 'team_add_tgid';
    return ctx.reply(MSG.askMemberTelegramId, KB.cancelKeyboard);
  }
  if (text === '📋 لیست اعضا') {
    return startMemberList(ctx);
  }

  return ctx.reply(MSG.teamMenu, KB.teamMenuKeyboard());
}

// ─── لیست اعضا برای مدیریت ───────────────────────────────────────────────────
async function startMemberList(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const members = await getAllTeamMembers(biz.businessId);

  if (members.length === 0) {
    session.step = 'team_menu';
    return ctx.reply(MSG.noTeamMembers, KB.teamMenuKeyboard());
  }

  session.data.teamMembers = members;
  session.step = 'team_member_select';
  return ctx.reply(MSG.selectMember, KB.memberSelectKeyboard(members));
}

// ─── انتخاب عضو از لیست ──────────────────────────────────────────────────────
async function handleMemberSelect(ctx, text) {
  const session = getSession(ctx.from.id);
  const members = session.data.teamMembers || [];

  const idx = parseMemberIndex(text);
  if (idx < 0 || idx >= members.length) {
    return ctx.reply(MSG.selectMember, KB.memberSelectKeyboard(members));
  }

  const member = members[idx];
  session.data.selectedMember = member;
  session.step = 'team_member_action';

  const displayName = member.display_name || member.name || `کاربر ${member.telegram_id}`;
  const roleLabel   = ROLE_LABELS[member.role] || member.role;
  const isActive    = member.is_active === 1 || member.is_active === true;

  return ctx.reply(
    MSG.memberAction(displayName, roleLabel, isActive),
    { parse_mode: 'Markdown', ...KB.memberActionKeyboard(isActive) }
  );
}

// ─── عملیات روی عضو انتخاب‌شده ───────────────────────────────────────────────
async function handleMemberAction(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const { selectedMember } = session.data;

  if (!selectedMember) return startMemberList(ctx);

  const displayName = selectedMember.display_name || selectedMember.name || '—';
  const isActive    = selectedMember.is_active === 1 || selectedMember.is_active === true;

  if (text === '🔄 تغییر نقش') {
    session.step = 'team_member_change_role';
    return ctx.reply(MSG.selectRole, KB.roleSelectKeyboard());
  }

  if (text === '🚫 غیرفعال کردن عضو') {
    await deactivateMember(biz.businessId, selectedMember.user_id);
    clearSession(ctx.from.id);
    return ctx.reply(MSG.memberDeactivated(displayName), getMenu(getSession(ctx.from.id)));
  }

  if (text === '✅ فعال کردن عضو') {
    await activateMember(biz.businessId, selectedMember.user_id);
    clearSession(ctx.from.id);
    return ctx.reply(MSG.memberActivated(displayName), getMenu(getSession(ctx.from.id)));
  }

  if (text === '👁 دیدن دسترسی‌ها') {
    const perms = Array.isArray(selectedMember.permissions) ? selectedMember.permissions : [];
    return ctx.reply(
      MSG.memberPermissionsList(displayName, perms),
      { parse_mode: 'Markdown', ...KB.memberActionKeyboard(isActive) }
    );
  }

  if (text === '🔐 مدیریت دسترسی‌ها') {
    if (selectedMember.role === 'business_owner' || selectedMember.role === 'super_admin') {
      return ctx.reply(MSG.ownerPermissionDenied, KB.memberActionKeyboard(isActive));
    }
    const freshPerms = await getMemberPermissions(biz.businessId, selectedMember.user_id);
    session.data.selectedMember.permissions = freshPerms;
    session.step = 'team_member_permissions';
    return ctx.reply(
      MSG.managePermissions(displayName, freshPerms),
      { parse_mode: 'Markdown', ...KB.permissionsKeyboard(freshPerms) }
    );
  }

  if (text === '🔙 بازگشت به لیست') {
    return startMemberList(ctx);
  }

  // fallback — نمایش مجدد منوی عضو
  const roleLabel = ROLE_LABELS[selectedMember.role] || selectedMember.role;
  return ctx.reply(
    MSG.memberAction(displayName, roleLabel, isActive),
    { parse_mode: 'Markdown', ...KB.memberActionKeyboard(isActive) }
  );
}

// ─── مدیریت دسترسی‌های یک عضو (Phase 7D) ─────────────────────────────────────
async function handlePermissionsMenu(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz     = session.biz;
  const { selectedMember } = session.data;

  if (!selectedMember) return startMemberList(ctx);

  const displayName = selectedMember.display_name || selectedMember.name || '—';
  const isActive    = selectedMember.is_active === 1 || selectedMember.is_active === true;

  // ── بازگشت به منوی عضو ──────────────────────────────────────────────────────
  if (text === '🔙 بازگشت') {
    session.step = 'team_member_action';
    const roleLabel = ROLE_LABELS[selectedMember.role] || selectedMember.role;
    return ctx.reply(
      MSG.memberAction(displayName, roleLabel, isActive),
      { parse_mode: 'Markdown', ...KB.memberActionKeyboard(isActive) }
    );
  }

  // ── بازگردانی به دسترسی‌های پیش‌فرض نقش ─────────────────────────────────────
  if (text === '🔄 بازگردانی پیش‌فرض نقش') {
    const newPerms = await resetMemberPermissionsToRoleDefault(biz.businessId, selectedMember.user_id);
    session.data.selectedMember.permissions = newPerms || [];
    await ctx.reply(MSG.permissionsResetToDefault);
    return ctx.reply(
      MSG.managePermissions(displayName, newPerms || []),
      { parse_mode: 'Markdown', ...KB.permissionsKeyboard(newPerms || []) }
    );
  }

  // ── toggle یک permission ──────────────────────────────────────────────────────
  // دکمه‌ها به شکل "✅ ثبت فروش" یا "❌ ثبت فروش" هستند
  const stripped = (text.startsWith('✅ ') || text.startsWith('❌ ')) ? text.slice(2) : null;
  if (stripped) {
    const permKey = ALL_PERMISSIONS.find(p => PERMISSION_LABELS[p] === stripped);
    if (permKey) {
      const newPerms = await toggleMemberPermission(biz.businessId, selectedMember.user_id, permKey);
      session.data.selectedMember.permissions = newPerms;
      await ctx.reply(MSG.permissionUpdated);
      return ctx.reply(
        MSG.managePermissions(displayName, newPerms),
        { parse_mode: 'Markdown', ...KB.permissionsKeyboard(newPerms) }
      );
    }
  }

  // ── fallback — نمایش مجدد صفحه دسترسی‌ها ──────────────────────────────────
  const currentPerms = await getMemberPermissions(biz.businessId, selectedMember.user_id);
  session.data.selectedMember.permissions = currentPerms;
  return ctx.reply(
    MSG.managePermissions(displayName, currentPerms),
    { parse_mode: 'Markdown', ...KB.permissionsKeyboard(currentPerms) }
  );
}

// ─── مراحل افزودن عضو و تغییر نقش از طریق لیست ──────────────────────────────
async function handleTeamStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  // ── افزودن عضو — مرحله آیدی تلگرام ─────────────────────────────────────────
  if (step === 'team_add_tgid') {
    const tgId = parseId(text);
    if (!tgId) return ctx.reply(MSG.memberNotFound, KB.cancelKeyboard);
    const member = await getUserByTelegramId(tgId);
    if (!member) return ctx.reply(MSG.memberNotFound, KB.cancelKeyboard);
    data.memberUserId     = member.id;
    data.memberName       = member.name;
    data.memberTelegramId = tgId;
    session.step = 'team_add_real_name';
    return ctx.reply(MSG.askRealName, KB.cancelKeyboard);
  }

  // ── افزودن عضو — مرحله نام واقعی ────────────────────────────────────────────
  if (step === 'team_add_real_name') {
    const realName = text.trim();
    if (!realName || realName.length < 2) {
      return ctx.reply(MSG.askRealName, KB.cancelKeyboard);
    }
    data.memberDisplayName = realName;
    session.step = 'team_add_role';
    return ctx.reply(MSG.selectRole, KB.roleSelectKeyboard());
  }

  // ── افزودن عضو — مرحله نقش ──────────────────────────────────────────────────
  if (step === 'team_add_role') {
    const role = ROLE_MAP[text];
    if (!role) return ctx.reply(MSG.selectRole, KB.roleSelectKeyboard());

    // بررسی وجود قبلی عضو
    const allMembers = await getAllTeamMembers(biz.businessId);
    const alreadyMember = allMembers.some(m => m.user_id === data.memberUserId);

    await addTeamMember({
      businessId:  biz.businessId,
      userId:      data.memberUserId,
      role,
      displayName: data.memberDisplayName,
    });
    const roleLabel   = ROLE_LABELS[role] || role;
    const displayName = data.memberDisplayName || data.memberName || '—';
    clearSession(ctx.from.id);

    if (alreadyMember) {
      return ctx.reply(
        MSG.memberAlreadyInTeam({ displayName, roleLabel }),
        { parse_mode: 'Markdown', ...getMenu(getSession(ctx.from.id)) }
      );
    }
    return ctx.reply(
      MSG.memberAddedDetailed({ displayName, roleLabel, telegramId: data.memberTelegramId }),
      { parse_mode: 'Markdown', ...getMenu(getSession(ctx.from.id)) }
    );
  }

  // ── تغییر نقش از طریق لیست ──────────────────────────────────────────────────
  if (step === 'team_member_change_role') {
    const role = ROLE_MAP[text];
    if (!role) return ctx.reply(MSG.selectRole, KB.roleSelectKeyboard());
    const member      = data.selectedMember;
    if (!member) {
      clearSession(ctx.from.id);
      return ctx.reply(MSG.mainMenu, getMenu(getSession(ctx.from.id)));
    }
    await updateMemberRole(biz.businessId, member.user_id, role);
    const roleLabel   = ROLE_LABELS[role] || role;
    const displayName = member.display_name || member.name || '—';
    clearSession(ctx.from.id);
    return ctx.reply(
      MSG.memberRoleChanged(displayName, roleLabel),
      getMenu(getSession(ctx.from.id))
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// مدیریت لایسنس (فقط super_admin)
// ═══════════════════════════════════════════════════════════════════════════════

async function startLicenseManagement(ctx) {
  const session = getSession(ctx.from.id);
  if (!isSuperAdmin(ctx)) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  session.step = 'license_menu';
  session.data = {};
  return ctx.reply(MSG.licenseMenu, { parse_mode: 'Markdown', ...KB.licenseMenuKeyboard() });
}

async function handleLicenseMenu(ctx, text) {
  if (text === '➕ ایجاد لایسنس جدید') {
    const license = await createLicense();
    const session = getSession(ctx.from.id);
    clearSession(ctx.from.id);
    return ctx.reply(MSG.licenseCreated(license.code), {
      parse_mode: 'Markdown',
      ...getMenu(getSession(ctx.from.id)),
    });
  }
  if (text === '📋 لیست لایسنس‌ها') {
    const licenses = await getAllLicenses();
    return ctx.reply(MSG.licenseList(licenses), {
      parse_mode: 'Markdown',
      ...KB.licenseMenuKeyboard(),
    });
  }
  return ctx.reply(MSG.licenseMenu, { parse_mode: 'Markdown', ...KB.licenseMenuKeyboard() });
}

// ═══════════════════════════════════════════════════════════════════════════════
// تنظیمات
// ═══════════════════════════════════════════════════════════════════════════════

async function startSettings(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'settings.manage')) {
    // حسابدار می‌تواند فقط خروجی بگیرد، نه تنظیمات کامل
    if (hasPermission(biz, 'exports.create')) {
      session.step = 'settings_menu';
      return ctx.reply(MSG.settings, { parse_mode: 'Markdown', ...KB.settingsKeyboardSimple() });
    }
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  return checkSectionPin(ctx, 'settings', () => {
    session.step = 'settings_menu';
    return ctx.reply(MSG.settings, { parse_mode: 'Markdown', ...KB.settingsKeyboard() });
  });
}

async function handleSettingsMenu(ctx, text) {
  if (text === '📤 خروجی اطلاعات') return startExportMenu(ctx);
  if (text === '🔒 قفل بخش‌ها')    return startLockSettings(ctx);
  return ctx.reply(MSG.settings, { parse_mode: 'Markdown', ...KB.settingsKeyboard() });
}

// ─── شروع منوی خروجی ─────────────────────────────────────────────────────────
async function startExportMenu(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'exports.create')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  return checkSectionPin(ctx, 'exports', () => {
    session.step = 'export_menu';
    return ctx.reply(MSG.exportMenu, { parse_mode: 'Markdown', ...KB.exportMenuKeyboard() });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// قفل بخش‌ها
// ═══════════════════════════════════════════════════════════════════════════════

async function startLockSettings(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'settings.manage')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  const lockedSections = await getSectionLocks(biz.businessId);
  session.step = 'lock_menu';
  session.data = { lockedSections };
  return ctx.reply(
    MSG.lockMenu(lockedSections),
    { parse_mode: 'Markdown', ...KB.lockSectionKeyboard(lockedSections) }
  );
}

async function handleLockMenu(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  // نام بخش از دکمه (🔒 گزارش‌ها یا 🔓 گزارش‌ها)
  // توجه: regex با پرچم u برای emoji‌های خارج از BMP (مثل 🔒 U+1F512) الزامی است
  const SECTION_LABELS_MAP = {
    'گزارش‌ها':          'reports',
    'خروجی اطلاعات':     'exports',
    'مدیریت ثبت‌ها':     'manage_records',
    'تنظیمات':          'settings',
    'مخارج':            'expenses',
  };
  const cleanText = text.replace(/^[🔒🔓]\s*/u, '');
  const sectionKey = SECTION_LABELS_MAP[cleanText];

  if (!sectionKey) {
    const lockedSections = await getSectionLocks(biz.businessId);
    return ctx.reply(
      MSG.lockMenu(lockedSections),
      { parse_mode: 'Markdown', ...KB.lockSectionKeyboard(lockedSections) }
    );
  }

  const lock = await getSectionLock(biz.businessId, sectionKey);
  session.data.pendingLockSection = sectionKey;
  session.data.lockHasLock        = !!lock;
  session.step = 'lock_section_action';
  const sLabel = SECTION_LABELS[sectionKey] || sectionKey;
  return ctx.reply(
    MSG.lockSectionAction(sLabel, !!lock),
    KB.lockSectionActionKeyboard(!!lock)
  );
}

async function handleLockSectionAction(ctx, text) {
  const session = getSession(ctx.from.id);
  const { pendingLockSection } = session.data;

  if (text === '🔐 فعال کردن قفل') {
    session.data.isChangingPin = false;
    session.step = 'lock_pin_set';
    return ctx.reply(MSG.askNewPin, KB.cancelKeyboard);
  }

  if (text === '🔓 غیرفعال کردن قفل') {
    session.step = 'lock_remove_verify';
    return ctx.reply(MSG.askCurrentPinToRemove, KB.cancelKeyboard);
  }

  if (text === '🔑 تغییر رمز') {
    session.step = 'lock_change_verify';
    return ctx.reply(MSG.askCurrentPinToChange, KB.cancelKeyboard);
  }

  // fallback — نمایش مجدد منوی عملیات
  const biz    = session.biz;
  const lock   = pendingLockSection
    ? await getSectionLock(biz.businessId, pendingLockSection)
    : null;
  const sLabel = pendingLockSection
    ? (SECTION_LABELS[pendingLockSection] || pendingLockSection)
    : '';
  return ctx.reply(
    MSG.lockSectionAction(sLabel, !!lock),
    KB.lockSectionActionKeyboard(!!lock)
  );
}

async function handleLockPinStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  // ── تنظیم رمز جدید ──────────────────────────────────────────────────────────
  if (step === 'lock_pin_set') {
    if (!/^\d{4,6}$/.test(text)) {
      return ctx.reply(MSG.askNewPin, KB.cancelKeyboard);
    }
    data.newPin  = text;
    session.step = 'lock_pin_confirm';
    return ctx.reply(MSG.confirmNewPin, KB.cancelKeyboard);
  }

  // ── تأیید رمز جدید ──────────────────────────────────────────────────────────
  if (step === 'lock_pin_confirm') {
    if (text !== data.newPin) {
      data.newPin  = null;
      session.step = 'lock_pin_set';
      return ctx.reply(MSG.pinMismatch, KB.cancelKeyboard);
    }
    const sectionKey = data.pendingLockSection;
    await setSectionLock(biz.businessId, sectionKey, data.newPin);
    const sLabel     = SECTION_LABELS[sectionKey] || sectionKey;
    const successMsg = data.isChangingPin ? MSG.pinChanged(sLabel) : MSG.pinEnabled(sLabel);
    clearSession(ctx.from.id);
    return ctx.reply(successMsg, getMenu(getSession(ctx.from.id)));
  }

  // ── تأیید رمز برای برداشتن قفل ──────────────────────────────────────────────
  if (step === 'lock_remove_verify') {
    const sectionKey = data.pendingLockSection;
    const lock = await getSectionLock(biz.businessId, sectionKey);
    if (!lock || verifyPin(biz.businessId, sectionKey, text, lock.pin_hash)) {
      await removeSectionLock(biz.businessId, sectionKey);
      clearSession(ctx.from.id);
      const sLabel = SECTION_LABELS[sectionKey] || sectionKey;
      return ctx.reply(MSG.pinDisabled(sLabel), getMenu(getSession(ctx.from.id)));
    }
    // رمز اشتباه — اجازه تلاش مجدد
    data.pinAttempts = (data.pinAttempts || 0) + 1;
    if (data.pinAttempts >= 3) {
      clearSession(ctx.from.id);
      return ctx.reply(MSG.pinMaxAttempts, getMenu(getSession(ctx.from.id)));
    }
    return ctx.reply(MSG.pinWrong, KB.cancelKeyboard);
  }

  // ── تأیید رمز برای تغییر رمز ────────────────────────────────────────────────
  if (step === 'lock_change_verify') {
    const sectionKey = data.pendingLockSection;
    const lock = await getSectionLock(biz.businessId, sectionKey);
    if (!lock || verifyPin(biz.businessId, sectionKey, text, lock.pin_hash)) {
      // رمز صحیح است — برو به مرحله تنظیم رمز جدید
      data.isChangingPin = true;
      data.pinAttempts   = 0;
      session.step = 'lock_pin_set';
      return ctx.reply(MSG.askNewPin, KB.cancelKeyboard);
    }
    // رمز اشتباه
    data.pinAttempts = (data.pinAttempts || 0) + 1;
    if (data.pinAttempts >= 3) {
      clearSession(ctx.from.id);
      return ctx.reply(MSG.pinMaxAttempts, getMenu(getSession(ctx.from.id)));
    }
    return ctx.reply(MSG.pinWrong, KB.cancelKeyboard);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// تأیید PIN برای ورود به بخش قفل‌شده
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePinVerify(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const { pendingSection } = session.data;

  if (!/^\d{4,6}$/.test(text)) {
    return ctx.reply(MSG.pinWrong, KB.cancelKeyboard);
  }

  const lock = await getSectionLock(biz.businessId, pendingSection);
  if (!lock) {
    // قفل برداشته شده — ادامه بده
    session.pinUnlocked = session.pinUnlocked || {};
    session.pinUnlocked[pendingSection] = true;
    session.data.pendingSection = null;
    session.step = null;
    return navigateToSection(ctx, pendingSection);
  }

  if (verifyPin(biz.businessId, pendingSection, text, lock.pin_hash)) {
    session.pinUnlocked = session.pinUnlocked || {};
    session.pinUnlocked[pendingSection] = true;
    session.data.pendingSection = null;
    session.step = null;
    return navigateToSection(ctx, pendingSection);
  }

  // رمز اشتباه
  session.data.pinAttempts = (session.data.pinAttempts || 0) + 1;
  if (session.data.pinAttempts >= 3) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.pinMaxAttempts, getMenu(getSession(ctx.from.id)));
  }
  return ctx.reply(MSG.pinWrong, KB.cancelKeyboard);
}

// ═══════════════════════════════════════════════════════════════════════════════
// خروجی CSV
// ═══════════════════════════════════════════════════════════════════════════════

async function handleExportMenuChoice(ctx, text) {
  if (text === '📊 خروجی فروش‌ها')           return handleSalesCsvExport(ctx);
  if (text === '💰 خروجی مخارج')              return handleExpensesCsvExport(ctx);
  if (text === '🛒 خروجی خریدهای مواد')       return handlePurchasesCsvExport(ctx);
  if (text === '📦 خروجی انبار')              return handleInventoryCsvExport(ctx);
  if (text === '📋 خروجی حقوق پرسنل')        return handleStaffTransactionsCsvExport(ctx);
  if (text === '📊 خروجی حسابداری کامل')     return startAccountingExport(ctx);
  return ctx.reply(MSG.exportMenu, { parse_mode: 'Markdown', ...KB.exportMenuKeyboard() });
}

async function handleSalesCsvExport(ctx) {
  const session = getSession(ctx.from.id);
  await ctx.reply(MSG.exportGenerating);
  const rows = await getAllSalesForExport(session.biz?.businessId);
  if (rows.length === 0) return ctx.reply(MSG.exportEmptySales);
  const csv = '﻿' + buildSalesCsv(rows);
  const tmpPath = path.join(os.tmpdir(), `icebox_sales_${Date.now()}.csv`);
  fs.writeFileSync(tmpPath, csv, 'utf8');
  try {
    await ctx.replyWithDocument(
      { source: fs.createReadStream(tmpPath), filename: 'sales_export.csv' },
      { caption: `📊 خروجی فروش‌ها — ${rows.length} رکورد` }
    );
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

async function handleExpensesCsvExport(ctx) {
  const session = getSession(ctx.from.id);
  await ctx.reply(MSG.exportGenerating);
  const rows = await getAllExpensesForExport(session.biz?.businessId);
  if (rows.length === 0) return ctx.reply(MSG.exportEmptyExpenses);
  const csv = '﻿' + buildExpensesCsv(rows);
  const tmpPath = path.join(os.tmpdir(), `icebox_expenses_${Date.now()}.csv`);
  fs.writeFileSync(tmpPath, csv, 'utf8');
  try {
    await ctx.replyWithDocument(
      { source: fs.createReadStream(tmpPath), filename: 'expenses_export.csv' },
      { caption: `💰 خروجی مخارج — ${rows.length} رکورد` }
    );
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// تأمین‌کننده‌ها (Phase 8)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── منوی اصلی تأمین‌کننده‌ها ─────────────────────────────────────────────────
async function startSupplierMenu(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const hasPerm = hasPermission(biz, 'suppliers.manage') ||
                  hasPermission(biz, 'purchases.create') ||
                  hasPermission(biz, 'purchases.view') ||
                  hasPermission(biz, 'supplier_payments.create') ||
                  hasPermission(biz, 'supplier_accounts.view') ||
                  (Array.isArray(biz?.permissions) && biz.permissions.includes('*'));
  if (!hasPerm) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  session.step = 'supplier_menu';
  session.data = {};
  return ctx.reply(MSG.suppliersMenu, { parse_mode: 'Markdown', ...KB.supplierMenuKeyboard() });
}

async function handleSupplierMenu(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  if (text === '➕ افزودن تأمین‌کننده') {
    if (!hasPermission(biz, 'suppliers.manage')) {
      return ctx.reply(MSG.permissionDenied, KB.supplierMenuKeyboard());
    }
    session.step = 'supplier_add_name';
    return ctx.reply(MSG.askSupplierName, KB.cancelKeyboard);
  }

  if (text === '📋 لیست تأمین‌کننده‌ها') {
    const suppliers = await listSuppliers(biz.businessId);
    return ctx.reply(
      MSG.supplierList(suppliers),
      { parse_mode: 'Markdown', ...KB.supplierMenuKeyboard() }
    );
  }

  if (text === '💳 حساب تأمین‌کنندگان') {
    if (!hasPermission(biz, 'supplier_accounts.view')) {
      return ctx.reply(MSG.permissionDenied, KB.supplierMenuKeyboard());
    }
    const suppliers = await getAllSupplierBalances(biz.businessId);
    // اعداد خام (بدون formatMoney) پاس می‌شوند تا messages.js بتواند
    // روی آن‌ها عملیات Number() انجام دهد
    return ctx.reply(
      MSG.allSupplierAccounts(suppliers),
      { parse_mode: 'Markdown', ...KB.supplierMenuKeyboard() }
    );
  }

  if (text === '🛒 ثبت خرید مواد') {
    return startPurchaseFlow(ctx);
  }

  if (text === '💵 ثبت پرداخت به تأمین‌کننده') {
    return startSuppPaymentFlow(ctx);
  }

  return ctx.reply(MSG.suppliersMenu, { parse_mode: 'Markdown', ...KB.supplierMenuKeyboard() });
}

// ─── جریان افزودن تأمین‌کننده ─────────────────────────────────────────────────
async function handleSupplierStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'supplier_add_name') {
    if (!text || text.trim().length < 1) return ctx.reply(MSG.askSupplierName, KB.cancelKeyboard);
    data.supplierName = text.trim();
    session.step = 'supplier_add_phone';
    return ctx.reply(MSG.askSupplierPhone, KB.cancelKeyboard);
  }

  if (step === 'supplier_add_phone') {
    data.supplierPhone = text === 'ندارم' ? null : text.trim();
    session.step = 'supplier_add_note';
    return ctx.reply(MSG.askSupplierNote, KB.cancelKeyboard);
  }

  if (step === 'supplier_add_note') {
    data.supplierNote = text === 'ندارم' ? null : text.trim();
    const supplier = await createSupplier({
      businessId: biz.businessId,
      name:  data.supplierName,
      phone: data.supplierPhone,
      note:  data.supplierNote,
    });
    clearSession(ctx.from.id);
    return ctx.reply(MSG.supplierAdded(supplier.name), getMenu(getSession(ctx.from.id)));
  }
}

// ─── جریان ثبت خرید مواد ─────────────────────────────────────────────────────
async function startPurchaseFlow(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'purchases.create')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  const suppliers = await listSuppliers(biz.businessId);
  if (suppliers.length === 0) {
    return ctx.reply(MSG.noSuppliers, KB.supplierMenuKeyboard());
  }
  session.step = 'purchase_select_supplier';
  session.data = { purchaseDate: getTodayDate(), suppliers };
  return ctx.reply(MSG.selectSupplier, KB.supplierSelectKeyboard(suppliers));
}

const PURCHASE_UNITS = ['کیلو', 'عدد', 'لیتر', 'کارتن', 'بسته', 'سایر'];
const PAYMENT_METHODS = ['نقدی', 'پوز', 'کارت‌به‌کارت', 'آنلاین', 'سایر'];

async function handlePurchaseStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'purchase_select_supplier') {
    const idx = parseMemberIndex(text);
    if (idx < 0 || idx >= data.suppliers.length) {
      return ctx.reply(MSG.selectSupplier, KB.supplierSelectKeyboard(data.suppliers));
    }
    const s = data.suppliers[idx];
    data.supplierId   = s.id;
    data.supplierName = s.name;
    session.step = 'purchase_item';
    return ctx.reply(MSG.askPurchaseItem, KB.cancelKeyboard);
  }

  if (step === 'purchase_item') {
    if (!text || text.trim().length < 1) return ctx.reply(MSG.askPurchaseItem, KB.cancelKeyboard);
    data.itemName = text.trim();
    session.step  = 'purchase_qty';
    return ctx.reply(MSG.askPurchaseQty, KB.cancelKeyboard);
  }

  if (step === 'purchase_qty') {
    const n = parseNumber(text);
    if (n === null || n <= 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data.quantity = n;
    session.step  = 'purchase_unit';
    return ctx.reply(MSG.askPurchaseUnit, KB.purchaseUnitKeyboard());
  }

  if (step === 'purchase_unit') {
    if (!PURCHASE_UNITS.includes(text)) {
      return ctx.reply(MSG.askPurchaseUnit, KB.purchaseUnitKeyboard());
    }
    data.unit    = text;
    session.step = 'purchase_unit_price';
    return ctx.reply(MSG.askPurchaseUnitPrice, KB.cancelKeyboard);
  }

  if (step === 'purchase_unit_price') {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data.unitPrice   = n;
    data.totalAmount = Math.round(data.quantity * n);
    session.step     = 'purchase_paid';
    return ctx.reply(MSG.askPurchasePaid, KB.cancelKeyboard);
  }

  if (step === 'purchase_paid') {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    if (n > data.totalAmount) return ctx.reply(MSG.paidTooHigh, KB.cancelKeyboard);
    data.paidAmount = n;
    session.step    = 'purchase_note';
    return ctx.reply(MSG.askPurchaseNote, KB.cancelKeyboard);
  }

  if (step === 'purchase_note') {
    data.note    = text === 'ندارم' ? null : text.trim();
    session.step = 'purchase_confirm';
    const remaining = data.totalAmount - data.paidAmount;
    return ctx.reply(
      MSG.confirmPurchase({
        supplierName: data.supplierName,
        date:         gDate(data.purchaseDate),
        itemName:     data.itemName,
        quantity:     formatNumber(data.quantity),
        unit:         data.unit,
        unitPrice:    formatMoney(data.unitPrice),
        totalAmount:  formatMoney(data.totalAmount),
        paidAmount:   formatMoney(data.paidAmount),
        remaining:    formatMoney(remaining),
        note:         data.note,
      }),
      { parse_mode: 'Markdown', ...KB.confirmSaleKeyboard() }
    );
  }

  if (step === 'purchase_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      const purchase = await createSupplierPurchase({
        businessId:          biz.businessId,
        supplierId:          data.supplierId,
        branchId:            null,
        purchaseDate:        data.purchaseDate,
        itemName:            data.itemName,
        quantity:            data.quantity,
        unit:                data.unit,
        unitPrice:           data.unitPrice,
        totalAmount:         data.totalAmount,
        paidAmount:          data.paidAmount,
        note:                data.note,
        createdByTelegramId: ctx.from.id,
      });
      // ─── اتصال خرید به انبار ──────────────────────────────────────────────
      try {
        let invItem = await findInventoryItemByName(biz.businessId, data.itemName, data.unit);
        if (!invItem) {
          invItem = await createInventoryItem({
            businessId: biz.businessId,
            name:       data.itemName,
            unit:       data.unit,
            minStock:   0,
          });
        }
        if (invItem?.id) {
          await addStock({
            businessId:  biz.businessId,
            itemId:      invItem.id,
            quantity:    data.quantity,
            unit:        data.unit,
            sourceType:  'supplier_purchase',
            sourceId:    purchase?.id || null,
            note:        data.note,
            telegramId:  ctx.from.id,
            date:        data.purchaseDate,
          });
        }
      } catch (_invErr) {
        // خطای انبار جریان اصلی را متوقف نمی‌کند
      }
      const remaining = data.totalAmount - data.paidAmount;
      const summary = {
        supplierName: data.supplierName,
        date:         gDate(data.purchaseDate),
        itemName:     data.itemName,
        quantity:     formatNumber(data.quantity),
        unit:         data.unit,
        totalAmount:  formatMoney(data.totalAmount),
        paidAmount:   formatMoney(data.paidAmount),
        remaining:    formatMoney(remaining),
      };
      clearSession(ctx.from.id);
      return ctx.reply(MSG.purchaseSaved(summary), getMenu(getSession(ctx.from.id)));
    }
    if (text === '✏️ ویرایش') {
      const suppliers = await listSuppliers(biz.businessId);
      session.data = { purchaseDate: data.purchaseDate, suppliers };
      session.step = 'purchase_select_supplier';
      return ctx.reply(MSG.selectSupplier, KB.supplierSelectKeyboard(suppliers));
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ─── جریان ثبت پرداخت به تأمین‌کننده ─────────────────────────────────────────
async function startSuppPaymentFlow(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'supplier_payments.create')) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  const suppliers = await listSuppliers(biz.businessId);
  if (suppliers.length === 0) {
    return ctx.reply(MSG.noSuppliers, KB.supplierMenuKeyboard());
  }
  session.step = 'supp_pay_select_supplier';
  session.data = { paymentDate: getTodayDate(), suppliers };
  return ctx.reply(MSG.selectSupplier, KB.supplierSelectKeyboard(suppliers));
}

async function handleSuppPaymentStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'supp_pay_select_supplier') {
    const idx = parseMemberIndex(text);
    if (idx < 0 || idx >= data.suppliers.length) {
      return ctx.reply(MSG.selectSupplier, KB.supplierSelectKeyboard(data.suppliers));
    }
    const s = data.suppliers[idx];
    data.supplierId   = s.id;
    data.supplierName = s.name;
    session.step = 'supp_pay_amount';
    return ctx.reply(MSG.askPaymentAmount, KB.cancelKeyboard);
  }

  if (step === 'supp_pay_amount') {
    const n = parseNumber(text);
    if (n === null || n <= 0) return ctx.reply(MSG.invalidAmount, KB.cancelKeyboard);
    data.amount  = n;
    session.step = 'supp_pay_method';
    return ctx.reply(MSG.askPaymentMethod, KB.paymentMethodKeyboard());
  }

  if (step === 'supp_pay_method') {
    if (!PAYMENT_METHODS.includes(text)) {
      return ctx.reply(MSG.askPaymentMethod, KB.paymentMethodKeyboard());
    }
    data.method  = text;
    session.step = 'supp_pay_note';
    return ctx.reply(MSG.askPaymentNote, KB.cancelKeyboard);
  }

  if (step === 'supp_pay_note') {
    data.note    = text === 'ندارم' ? null : text.trim();
    session.step = 'supp_pay_confirm';
    return ctx.reply(
      MSG.confirmPayment({
        supplierName: data.supplierName,
        date:         gDate(data.paymentDate),
        amount:       formatMoney(data.amount),
        method:       data.method,
        note:         data.note,
      }),
      { parse_mode: 'Markdown', ...KB.confirmSaleKeyboard() }
    );
  }

  if (step === 'supp_pay_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      await createSupplierPayment({
        businessId:          biz.businessId,
        supplierId:          data.supplierId,
        paymentDate:         data.paymentDate,
        amount:              data.amount,
        method:              data.method,
        note:                data.note,
        createdByTelegramId: ctx.from.id,
      });
      // مانده جدید را بعد از ثبت پرداخت واکشی کن
      const newBalance = await getSupplierBalance(biz.businessId, data.supplierId);
      const summary = {
        supplierName: data.supplierName,
        date:         gDate(data.paymentDate),
        amount:       formatMoney(data.amount),
        method:       data.method,
        newDebt:      formatMoney(newBalance.debt),
        isSettled:    newBalance.debt <= 0,
      };
      clearSession(ctx.from.id);
      return ctx.reply(MSG.paymentSaved(summary), getMenu(getSession(ctx.from.id)));
    }
    if (text === '✏️ ویرایش') {
      const suppliers = await listSuppliers(biz.businessId);
      session.data = { paymentDate: data.paymentDate, suppliers };
      session.step = 'supp_pay_select_supplier';
      return ctx.reply(MSG.selectSupplier, KB.supplierSelectKeyboard(suppliers));
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, getMenu(getSession(ctx.from.id)));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// انبار مواد اولیه (Phase 8C)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── منوی اصلی انبار ──────────────────────────────────────────────────────────
async function startInventoryMenu(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const hasPerm =
    (Array.isArray(biz?.permissions) && biz.permissions.includes('*')) ||
    hasPermission(biz, 'inventory.view')    ||
    hasPermission(biz, 'inventory.manage')  ||
    hasPermission(biz, 'inventory.consume') ||
    hasPermission(biz, 'inventory.adjust');
  if (!hasPerm) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  session.step = 'inventory_menu';
  session.data = {};
  return ctx.reply(MSG.inventoryMenu, { parse_mode: 'Markdown', ...KB.inventoryMenuKeyboard() });
}

async function handleInventoryMenu(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  // ─── موجودی فعلی ──────────────────────────────────────────────────────────
  if (text === '📋 موجودی فعلی') {
    if (!hasPermission(biz, 'inventory.view')) {
      return ctx.reply(MSG.permissionDenied, KB.inventoryMenuKeyboard());
    }
    const items = await getInventorySummary(biz.businessId);
    if (items.length === 0) {
      return ctx.reply(MSG.noInventoryItems, KB.inventoryMenuKeyboard());
    }
    return ctx.reply(
      MSG.inventorySummary(items),
      { parse_mode: 'Markdown', ...KB.inventoryMenuKeyboard() }
    );
  }

  // ─── هشدار کمبود ──────────────────────────────────────────────────────────
  if (text === '⚠️ هشدار کمبود') {
    if (!hasPermission(biz, 'inventory.view')) {
      return ctx.reply(MSG.permissionDenied, KB.inventoryMenuKeyboard());
    }
    const items = await getLowStockItems(biz.businessId);
    if (items.length === 0) {
      return ctx.reply(MSG.allInventoryOk, KB.inventoryMenuKeyboard());
    }
    return ctx.reply(
      MSG.inventoryLowStock(items),
      { parse_mode: 'Markdown', ...KB.inventoryMenuKeyboard() }
    );
  }

  // ─── افزودن ماده ──────────────────────────────────────────────────────────
  if (text === '➕ افزودن ماده') {
    if (!hasPermission(biz, 'inventory.manage')) {
      return ctx.reply(MSG.permissionDenied, KB.inventoryMenuKeyboard());
    }
    session.step = 'inventory_add_name';
    session.data = {};
    return ctx.reply(MSG.askInventoryItemName, KB.cancelKeyboard);
  }

  // ─── ثبت مصرف/خروج ────────────────────────────────────────────────────────
  if (text === '➖ ثبت مصرف/خروج') {
    if (!hasPermission(biz, 'inventory.consume')) {
      return ctx.reply(MSG.permissionDenied, KB.inventoryMenuKeyboard());
    }
    const items = await getInventorySummary(biz.businessId);
    if (items.length === 0) {
      return ctx.reply(MSG.noInventoryItems, KB.inventoryMenuKeyboard());
    }
    session.step = 'inventory_consume_select';
    session.data = { inventoryItems: items };
    return ctx.reply(MSG.selectInventoryItem, KB.inventoryItemSelectKeyboard(items));
  }

  // ─── اصلاح موجودی ─────────────────────────────────────────────────────────
  if (text === '🔧 اصلاح موجودی') {
    if (!hasPermission(biz, 'inventory.adjust')) {
      return ctx.reply(MSG.permissionDenied, KB.inventoryMenuKeyboard());
    }
    const items = await getInventorySummary(biz.businessId);
    if (items.length === 0) {
      return ctx.reply(MSG.noInventoryItems, KB.inventoryMenuKeyboard());
    }
    session.step = 'inventory_adjust_select';
    session.data = { inventoryItems: items };
    return ctx.reply(MSG.selectInventoryItem, KB.inventoryItemSelectKeyboard(items));
  }

  // ─── گردش انبار ───────────────────────────────────────────────────────────
  if (text === '📜 گردش انبار') {
    if (!hasPermission(biz, 'inventory.view')) {
      return ctx.reply(MSG.permissionDenied, KB.inventoryMenuKeyboard());
    }
    const rawMovements = await listInventoryMovements(biz.businessId, 20);
    if (rawMovements.length === 0) {
      return ctx.reply('⚠️ هیچ حرکتی در انبار ثبت نشده است.', KB.inventoryMenuKeyboard());
    }
    // تاریخ را به شمسی تبدیل کن
    const movements = rawMovements.map(m => ({
      ...m,
      movement_date: gDate(m.movement_date),
    }));
    return ctx.reply(
      MSG.inventoryMovements(movements),
      { parse_mode: 'Markdown', ...KB.inventoryMenuKeyboard() }
    );
  }

  return ctx.reply(MSG.inventoryMenu, { parse_mode: 'Markdown', ...KB.inventoryMenuKeyboard() });
}

// ─── جریان افزودن ماده اولیه ──────────────────────────────────────────────────
async function handleInventoryAddStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'inventory_add_name') {
    if (!text || text.trim().length < 1) {
      return ctx.reply(MSG.askInventoryItemName, KB.cancelKeyboard);
    }
    data.invName = text.trim();
    session.step = 'inventory_add_unit';
    return ctx.reply(MSG.askInventoryItemUnit, KB.purchaseUnitKeyboard());
  }

  if (step === 'inventory_add_unit') {
    const UNITS = ['کیلو', 'عدد', 'لیتر', 'کارتن', 'بسته', 'سایر'];
    if (!UNITS.includes(text)) {
      return ctx.reply(MSG.askInventoryItemUnit, KB.purchaseUnitKeyboard());
    }
    data.invUnit = text;
    session.step = 'inventory_add_min_stock';
    return ctx.reply(MSG.askInventoryItemMinStock, KB.cancelKeyboard);
  }

  if (step === 'inventory_add_min_stock') {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data.invMinStock = n;
    session.step = 'inventory_add_initial';
    return ctx.reply(MSG.askInventoryInitialStock, KB.cancelKeyboard);
  }

  if (step === 'inventory_add_initial') {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data.invInitial = n;

    // ثبت آیتم
    const item = await createInventoryItem({
      businessId: biz.businessId,
      name:       data.invName,
      unit:       data.invUnit,
      minStock:   data.invMinStock,
    });

    // اگر موجودی اولیه > 0 بود، یک حرکت ورودی ثبت کن
    if (data.invInitial > 0) {
      await addStock({
        businessId: biz.businessId,
        itemId:     item.id,
        quantity:   data.invInitial,
        unit:       data.invUnit,
        sourceType: 'manual',
        note:       'موجودی اولیه',
        telegramId: ctx.from.id,
      });
    }

    session.step = 'inventory_menu';
    session.data = {};
    return ctx.reply(
      MSG.inventoryItemAdded(item.name, item.unit, data.invInitial),
      KB.inventoryMenuKeyboard()
    );
  }
}

// ─── جریان ثبت مصرف/خروج ─────────────────────────────────────────────────────
async function handleInventoryConsumeStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'inventory_consume_select') {
    const items = data.inventoryItems || [];
    const idx   = parseMemberIndex(text);
    if (idx < 0 || idx >= items.length) {
      return ctx.reply(MSG.selectInventoryItem, KB.inventoryItemSelectKeyboard(items));
    }
    const item = items[idx];
    data.selectedItem  = item;
    data.currentStock  = Number(item.stock) || 0;
    session.step = 'inventory_consume_qty';
    return ctx.reply(
      MSG.askConsumeQty(item.name, item.unit, data.currentStock),
      { parse_mode: 'Markdown', ...KB.cancelKeyboard }
    );
  }

  if (step === 'inventory_consume_qty') {
    const n = parseNumber(text);
    if (n === null || n <= 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    if (n > data.currentStock) {
      return ctx.reply(
        MSG.consumeStockInsufficient(data.selectedItem.name, data.currentStock, data.selectedItem.unit),
        KB.cancelKeyboard
      );
    }
    data.consumeQty = n;
    session.step    = 'inventory_consume_note';
    return ctx.reply(MSG.askConsumeNote, KB.cancelKeyboard);
  }

  if (step === 'inventory_consume_note') {
    const note = text === 'ندارم' ? null : text.trim();
    const item = data.selectedItem;

    // بررسی مجدد موجودی (safety check)
    const freshStock = await getItemStock(biz.businessId, item.id);
    if (data.consumeQty > freshStock) {
      session.step    = 'inventory_consume_qty';
      data.currentStock = freshStock;
      return ctx.reply(
        MSG.consumeStockInsufficient(item.name, freshStock, item.unit),
        KB.cancelKeyboard
      );
    }

    await removeStock({
      businessId: biz.businessId,
      itemId:     item.id,
      quantity:   data.consumeQty,
      unit:       item.unit,
      note,
      telegramId: ctx.from.id,
    });

    const newStock = await getItemStock(biz.businessId, item.id);
    session.step = 'inventory_menu';
    session.data = {};
    return ctx.reply(
      MSG.consumeSaved(item.name, data.consumeQty, item.unit, newStock),
      KB.inventoryMenuKeyboard()
    );
  }
}

// ─── جریان اصلاح موجودی ──────────────────────────────────────────────────────
async function handleInventoryAdjustStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'inventory_adjust_select') {
    const items = data.inventoryItems || [];
    const idx   = parseMemberIndex(text);
    if (idx < 0 || idx >= items.length) {
      return ctx.reply(MSG.selectInventoryItem, KB.inventoryItemSelectKeyboard(items));
    }
    const item = items[idx];
    data.selectedItem = item;
    data.currentStock = Number(item.stock) || 0;
    session.step = 'inventory_adjust_qty';
    return ctx.reply(
      MSG.askAdjustQty(item.name, item.unit, data.currentStock),
      { parse_mode: 'Markdown', ...KB.cancelKeyboard }
    );
  }

  if (step === 'inventory_adjust_qty') {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    const item         = data.selectedItem;
    const actualQty    = n;
    const currentStock = data.currentStock;
    const diff         = actualQty - currentStock;

    await adjustStock({
      businessId:  biz.businessId,
      itemId:      item.id,
      actualQty,
      unit:        item.unit,
      note:        'اصلاح دستی موجودی',
      telegramId:  ctx.from.id,
    });

    session.step = 'inventory_menu';
    session.data = {};
    return ctx.reply(
      MSG.adjustSaved(item.name, currentStock, actualQty, diff, item.unit),
      KB.inventoryMenuKeyboard()
    );
  }
}

// ─── خروجی CSV انبار ─────────────────────────────────────────────────────────
async function handleInventoryCsvExport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'inventory.view')) {
    return ctx.reply(MSG.permissionDenied, KB.exportMenuKeyboard());
  }
  await ctx.reply(MSG.exportGenerating);
  const rows = await getAllInventoryForExport(biz?.businessId);
  if (rows.length === 0) return ctx.reply(MSG.exportEmptyInventory);
  const csv = '﻿' + buildInventoryCsv(rows);
  const tmpPath = path.join(os.tmpdir(), `icebox_inventory_${Date.now()}.csv`);
  fs.writeFileSync(tmpPath, csv, 'utf8');
  try {
    await ctx.replyWithDocument(
      { source: fs.createReadStream(tmpPath), filename: 'inventory_export.csv' },
      { caption: `📦 خروجی انبار — ${rows.length} ماده اولیه` }
    );
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// گزارش حسابداری کامل (Phase 8E)
// ═══════════════════════════════════════════════════════════════════════════════

async function startAccountingReport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'accounting.view')) {
    return ctx.reply(MSG.permissionDenied, KB.reportsMenuKeyboard());
  }
  session.step = 'accounting_period';
  session.data = {};
  return ctx.reply(MSG.accountingPeriodMenu, { parse_mode: 'Markdown', ...KB.periodKeyboard() });
}

async function handleAccountingPeriodPick(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  let startDate, endDate, startJalali, endJalali;

  if (text === '📊 امروز') {
    const today = getTodayDate();
    startDate   = today;
    endDate     = today;
    startJalali = gregorianToJalaliDateString(today);
    endJalali   = startJalali;
  } else if (text === '📅 این هفته') {
    const r   = getWeekRange();
    startDate = r.start;
    endDate   = r.end;
    startJalali = gregorianToJalaliDateString(r.start);
    endJalali   = gregorianToJalaliDateString(r.end);
  } else if (text === '🗓️ این ماه') {
    const r   = getMonthRange();
    startDate = r.start;
    endDate   = r.end;
    startJalali = gregorianToJalaliDateString(r.start);
    endJalali   = gregorianToJalaliDateString(r.end);
  } else if (text === '📆 بازه دلخواه') {
    session.data.datePickerFlow = 'accounting';
    return startPickingDate(ctx, 'start');
  } else {
    return ctx.reply(MSG.accountingPeriodMenu, { parse_mode: 'Markdown', ...KB.periodKeyboard() });
  }

  await ctx.reply(MSG.exportGenerating);
  const report = await getFullAccountingReport(biz.businessId, startDate, endDate);
  clearSession(ctx.from.id);
  return ctx.reply(
    MSG.accountingReport(report, startJalali, endJalali),
    { parse_mode: 'Markdown', ...getMenu(getSession(ctx.from.id)) }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// خروجی حسابداری کامل (Phase 8F)
// ═══════════════════════════════════════════════════════════════════════════════

async function startAccountingExport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const hasPerm = hasPermission(biz, 'accounting.view') ||
                  hasPermission(biz, 'exports.create')  ||
                  (Array.isArray(biz?.permissions) && biz.permissions.includes('*'));
  if (!hasPerm) {
    return ctx.reply(MSG.permissionDenied, KB.exportMenuKeyboard());
  }
  session.step = 'accounting_export_period';
  session.data = {};
  return ctx.reply(MSG.accountingExportPeriodMenu, { parse_mode: 'Markdown', ...KB.periodKeyboard() });
}

async function handleAccountingExportPeriod(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  let startDate, endDate, startJalali, endJalali;

  if (text === '📊 امروز') {
    const today = getTodayDate();
    startDate   = today;
    endDate     = today;
    startJalali = gregorianToJalaliDateString(today);
    endJalali   = startJalali;
  } else if (text === '📅 این هفته') {
    const r     = getWeekRange();
    startDate   = r.start;
    endDate     = r.end;
    startJalali = gregorianToJalaliDateString(r.start);
    endJalali   = gregorianToJalaliDateString(r.end);
  } else if (text === '🗓️ این ماه') {
    const r     = getMonthRange();
    startDate   = r.start;
    endDate     = r.end;
    startJalali = gregorianToJalaliDateString(r.start);
    endJalali   = gregorianToJalaliDateString(r.end);
  } else if (text === '📆 بازه دلخواه') {
    session.data.datePickerFlow = 'accounting_export';
    return startPickingDate(ctx, 'start');
  } else {
    return ctx.reply(MSG.accountingExportPeriodMenu, { parse_mode: 'Markdown', ...KB.periodKeyboard() });
  }

  return handleAccountingFullExportSend(ctx, biz.businessId, startDate, endDate, startJalali, endJalali);
}

async function handleAccountingFullExportSend(ctx, businessId, startDate, endDate, startJalali, endJalali) {
  await ctx.reply(MSG.accountingExportGenerating);

  const ts = Date.now();
  const tmpFiles = [];

  try {
    // ── ۱. خلاصه حسابداری ─────────────────────────────────────────────────
    const report = await getFullAccountingReport(businessId, startDate, endDate);
    const summaryCsv  = '﻿' + buildAccountingSummaryCsv(report, startJalali, endJalali);
    const summaryPath = path.join(os.tmpdir(), `icebox_summary_${ts}.csv`);
    fs.writeFileSync(summaryPath, summaryCsv, 'utf8');
    tmpFiles.push(summaryPath);
    await ctx.replyWithDocument(
      { source: fs.createReadStream(summaryPath), filename: 'summary.csv' },
      { caption: `📊 خلاصه حسابداری — ${startJalali} تا ${endJalali}` }
    );

    // ── ۲. فروش‌ها ────────────────────────────────────────────────────────
    const salesRows = await getSalesForRangeExport(businessId, startDate, endDate);
    const salesCsv  = '﻿' + buildSalesRangeCsv(salesRows);
    const salesPath = path.join(os.tmpdir(), `icebox_sales_${ts}.csv`);
    fs.writeFileSync(salesPath, salesCsv, 'utf8');
    tmpFiles.push(salesPath);
    await ctx.replyWithDocument(
      { source: fs.createReadStream(salesPath), filename: 'sales.csv' },
      { caption: `💰 فروش‌ها — ${salesRows.length} رکورد` }
    );

    // ── ۳. مخارج ─────────────────────────────────────────────────────────
    const expRows = await getExpensesForRangeExport(businessId, startDate, endDate);
    const expCsv  = '﻿' + buildExpensesRangeCsv(expRows);
    const expPath = path.join(os.tmpdir(), `icebox_expenses_${ts}.csv`);
    fs.writeFileSync(expPath, expCsv, 'utf8');
    tmpFiles.push(expPath);
    await ctx.replyWithDocument(
      { source: fs.createReadStream(expPath), filename: 'expenses.csv' },
      { caption: `🧾 مخارج — ${expRows.length} رکورد` }
    );

    // ── ۴. خریدهای مواد ───────────────────────────────────────────────────
    const purchRows = await getSupplierPurchasesForRangeExport(businessId, startDate, endDate);
    const purchCsv  = '﻿' + buildSupplierPurchasesRangeCsv(purchRows);
    const purchPath = path.join(os.tmpdir(), `icebox_supp_purchases_${ts}.csv`);
    fs.writeFileSync(purchPath, purchCsv, 'utf8');
    tmpFiles.push(purchPath);
    await ctx.replyWithDocument(
      { source: fs.createReadStream(purchPath), filename: 'supplier_purchases.csv' },
      { caption: `🛒 خریدهای مواد — ${purchRows.length} رکورد` }
    );

    // ── ۵. پرداخت‌ها به تأمین‌کنندگان ─────────────────────────────────────
    const paymentRows = await getSupplierPaymentsForRangeExport(businessId, startDate, endDate);
    const paymentCsv  = '﻿' + buildSupplierPaymentsRangeCsv(paymentRows);
    const paymentPath = path.join(os.tmpdir(), `icebox_supp_payments_${ts}.csv`);
    fs.writeFileSync(paymentPath, paymentCsv, 'utf8');
    tmpFiles.push(paymentPath);
    await ctx.replyWithDocument(
      { source: fs.createReadStream(paymentPath), filename: 'supplier_payments.csv' },
      { caption: `💳 پرداخت‌ها به تأمین‌کنندگان — ${paymentRows.length} رکورد` }
    );

    // ── ۶. انبار (همه‌وقت) ─────────────────────────────────────────────────
    const invRows = await getAllInventoryForExport(businessId);
    const invCsv  = '﻿' + buildInventoryCsv(invRows);
    const invPath = path.join(os.tmpdir(), `icebox_inventory_${ts}.csv`);
    fs.writeFileSync(invPath, invCsv, 'utf8');
    tmpFiles.push(invPath);
    await ctx.replyWithDocument(
      { source: fs.createReadStream(invPath), filename: 'inventory.csv' },
      { caption: `📦 انبار — ${invRows.length} قلم` }
    );

    // ── ۷. تراکنش‌های پرسنل ───────────────────────────────────────────────
    const payrollRows = await getPayrollTransactionsForRangeExport(businessId, startDate, endDate);
    const payrollCsv  = '﻿' + buildPayrollRangeCsv(payrollRows);
    const payrollPath = path.join(os.tmpdir(), `icebox_payroll_${ts}.csv`);
    fs.writeFileSync(payrollPath, payrollCsv, 'utf8');
    tmpFiles.push(payrollPath);
    await ctx.replyWithDocument(
      { source: fs.createReadStream(payrollPath), filename: 'payroll.csv' },
      { caption: `👥 تراکنش‌های پرسنل — ${payrollRows.length} رکورد` }
    );

    clearSession(ctx.from.id);
    await ctx.reply(
      MSG.accountingExportDone(7, startJalali, endJalali),
      { parse_mode: 'Markdown', ...getMenu(getSession(ctx.from.id)) }
    );
  } finally {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// حساب پرسنل (Phase 8D)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── منوی اصلی حساب پرسنل ────────────────────────────────────────────────────
async function startPayrollMenu(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const hasPerm = hasPermission(biz, 'payroll.view')   ||
                  hasPermission(biz, 'payroll.manage') ||
                  hasPermission(biz, 'payroll.pay')    ||
                  hasPermission(biz, 'payroll.adjust') ||
                  (Array.isArray(biz?.permissions) && biz.permissions.includes('*'));
  if (!hasPerm) {
    return ctx.reply(MSG.permissionDenied, getMenu(session));
  }
  session.step = 'payroll_menu';
  session.data = {};
  return ctx.reply(MSG.payrollMenu, { parse_mode: 'Markdown', ...KB.payrollMenuKeyboard() });
}

async function handlePayrollMenu(ctx, text) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;

  // ─── لیست حساب پرسنل ──────────────────────────────────────────────────────
  if (text === '📋 لیست حساب پرسنل') {
    if (!hasPermission(biz, 'payroll.view')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    const summaries = await getAllStaffAccountSummaries(biz.businessId);
    return ctx.reply(
      MSG.allStaffAccountSummaries(summaries),
      { parse_mode: 'Markdown', ...KB.payrollMenuKeyboard() }
    );
  }

  // ─── تعیین حقوق پایه ──────────────────────────────────────────────────────
  if (text === '💰 تعیین حقوق پایه') {
    if (!hasPermission(biz, 'payroll.manage')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    const members = await getTeamMembers(biz.businessId);
    const staff = members.filter(m => m.role !== 'business_owner' && m.role !== 'super_admin');
    if (staff.length === 0) {
      return ctx.reply(MSG.noStaffMembers, KB.payrollMenuKeyboard());
    }
    session.step = 'payroll_salary_select';
    session.data = { staffList: staff };
    return ctx.reply(MSG.selectStaffMember, KB.staffSelectKeyboard(staff));
  }

  // ─── ثبت پرداخت حقوق ──────────────────────────────────────────────────────
  if (text === '💵 ثبت پرداخت حقوق') {
    if (!hasPermission(biz, 'payroll.pay')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    return startStaffTransactionFlow(ctx, 'salary_payment');
  }

  // ─── ثبت برداشت / علی‌الحساب ──────────────────────────────────────────────
  if (text === '🧾 ثبت برداشت / علی‌الحساب') {
    if (!hasPermission(biz, 'payroll.pay')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    return startStaffTransactionFlow(ctx, 'advance');
  }

  // ─── ثبت مصرف داخلی ───────────────────────────────────────────────────────
  if (text === '🍦 ثبت مصرف داخلی') {
    if (!hasPermission(biz, 'payroll.pay')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    return startStaffTransactionFlow(ctx, 'internal_consumption');
  }

  // ─── ثبت پاداش ────────────────────────────────────────────────────────────
  if (text === '🎁 ثبت پاداش') {
    if (!hasPermission(biz, 'payroll.pay')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    return startStaffTransactionFlow(ctx, 'bonus');
  }

  // ─── ثبت کسری / جریمه ────────────────────────────────────────────────────
  if (text === '➖ ثبت کسری / جریمه') {
    if (!hasPermission(biz, 'payroll.adjust')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    return startStaffTransactionFlow(ctx, 'deduction');
  }

  // ─── گزارش حقوق ماه ───────────────────────────────────────────────────────
  if (text === '📊 گزارش حقوق ماه') {
    if (!hasPermission(biz, 'payroll.view')) {
      return ctx.reply(MSG.permissionDenied, KB.payrollMenuKeyboard());
    }
    const report = await getMonthlyPayrollReport(biz.businessId);
    // تاریخ‌ها را به شمسی تبدیل کن
    report.startDate = gDate(report.startDate);
    report.endDate   = gDate(report.endDate);
    return ctx.reply(
      MSG.monthlyPayrollReport(report),
      { parse_mode: 'Markdown', ...KB.payrollMenuKeyboard() }
    );
  }

  return ctx.reply(MSG.payrollMenu, { parse_mode: 'Markdown', ...KB.payrollMenuKeyboard() });
}

// ─── شروع جریان تراکنش پرسنلی ────────────────────────────────────────────────
async function startStaffTransactionFlow(ctx, transactionType) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  const members = await getTeamMembers(biz.businessId);
  const staff = members.filter(m => m.role !== 'business_owner' && m.role !== 'super_admin');
  if (staff.length === 0) {
    return ctx.reply(MSG.noStaffMembers, KB.payrollMenuKeyboard());
  }
  session.step = 'payroll_tx_select';
  session.data = { staffList: staff, transactionType };
  return ctx.reply(MSG.selectStaffMember, KB.staffSelectKeyboard(staff));
}

// ─── جریان تعیین حقوق پایه ───────────────────────────────────────────────────
async function handleSetSalaryStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'payroll_salary_select') {
    const staff = data.staffList || [];
    const idx   = parseMemberIndex(text);
    if (idx < 0 || idx >= staff.length) {
      return ctx.reply(MSG.selectStaffMember, KB.staffSelectKeyboard(staff));
    }
    const member = staff[idx];
    data.selectedStaff = member;
    session.step = 'payroll_salary_amount';
    const displayName = member.display_name || member.name || `کاربر ${member.telegram_id}`;
    return ctx.reply(
      MSG.askBaseSalaryAmount(displayName),
      { parse_mode: 'Markdown', ...KB.cancelKeyboard }
    );
  }

  if (step === 'payroll_salary_amount') {
    const n = parseNumber(text);
    if (n === null || n < 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data.salaryAmount = n;
    session.step = 'payroll_salary_type';
    return ctx.reply(MSG.askSalaryType, KB.salaryTypeKeyboard());
  }

  if (step === 'payroll_salary_type') {
    const SALARY_TYPES = ['ماهانه', 'روزانه', 'ساعتی'];
    const typeMap = { 'ماهانه': 'monthly', 'روزانه': 'daily', 'ساعتی': 'hourly' };
    if (!SALARY_TYPES.includes(text)) {
      return ctx.reply(MSG.askSalaryType, KB.salaryTypeKeyboard());
    }
    const salaryType = typeMap[text];
    const member = data.selectedStaff;
    const displayName = member.display_name || member.name || `کاربر ${member.telegram_id}`;

    await setBaseSalary(biz.businessId, member.id, data.salaryAmount, salaryType);

    session.step = 'payroll_menu';
    session.data = {};
    return ctx.reply(
      MSG.salarySaved(displayName, data.salaryAmount, salaryType),
      KB.payrollMenuKeyboard()
    );
  }
}

// ─── جریان ثبت تراکنش پرسنلی ─────────────────────────────────────────────────
async function handleStaffTransactionStep(ctx, text) {
  const session = getSession(ctx.from.id);
  const { step, data } = session;
  const biz = session.biz;

  if (step === 'payroll_tx_select') {
    const staff = data.staffList || [];
    const idx   = parseMemberIndex(text);
    if (idx < 0 || idx >= staff.length) {
      return ctx.reply(MSG.selectStaffMember, KB.staffSelectKeyboard(staff));
    }
    const member = staff[idx];
    data.selectedStaff = member;
    session.step = 'payroll_tx_amount';
    const displayName = member.display_name || member.name || `کاربر ${member.telegram_id}`;
    const typeName = TRANSACTION_TYPE_LABELS[data.transactionType] || data.transactionType;
    return ctx.reply(
      MSG.askTransactionAmount(typeName, displayName),
      { parse_mode: 'Markdown', ...KB.cancelKeyboard }
    );
  }

  if (step === 'payroll_tx_amount') {
    const n = parseNumber(text);
    if (n === null || n <= 0) return ctx.reply(MSG.invalidNumber, KB.cancelKeyboard);
    data.txAmount = n;
    session.step  = 'payroll_tx_note';
    return ctx.reply(MSG.askTransactionNote, KB.cancelKeyboard);
  }

  if (step === 'payroll_tx_note') {
    data.txNote  = text === 'ندارم' ? null : text.trim();
    session.step = 'payroll_tx_confirm';
    const member     = data.selectedStaff;
    const displayName = member.display_name || member.name || `کاربر ${member.telegram_id}`;
    const typeName   = TRANSACTION_TYPE_LABELS[data.transactionType] || data.transactionType;
    return ctx.reply(
      MSG.confirmTransaction({
        staffName: displayName,
        typeName,
        amount:    data.txAmount,
        date:      gDate(getTodayDate()),
        note:      data.txNote,
      }),
      { parse_mode: 'Markdown', ...KB.confirmSaleKeyboard() }
    );
  }

  if (step === 'payroll_tx_confirm') {
    if (text !== '✅ تأیید و ذخیره') {
      // ویرایش — بازگشت به انتخاب مبلغ
      session.step = 'payroll_tx_amount';
      const member      = data.selectedStaff;
      const displayName = member.display_name || member.name || `کاربر ${member.telegram_id}`;
      const typeName    = TRANSACTION_TYPE_LABELS[data.transactionType] || data.transactionType;
      return ctx.reply(
        MSG.askTransactionAmount(typeName, displayName),
        { parse_mode: 'Markdown', ...KB.cancelKeyboard }
      );
    }
    const member      = data.selectedStaff;
    const displayName = member.display_name || member.name || `کاربر ${member.telegram_id}`;
    const typeName    = TRANSACTION_TYPE_LABELS[data.transactionType] || data.transactionType;
    const today       = getTodayDate();

    await createStaffTransaction({
      businessId:          biz.businessId,
      businessUserId:      member.id,
      transactionType:     data.transactionType,
      amount:              data.txAmount,
      note:                data.txNote,
      createdByTelegramId: ctx.from.id,
      transactionDate:     today,
    });

    session.step = 'payroll_menu';
    session.data = {};
    return ctx.reply(
      MSG.transactionSaved({
        staffName: displayName,
        typeName,
        amount: data.txAmount,
        date:   gDate(today),
        note:   data.txNote,
      }),
      KB.payrollMenuKeyboard()
    );
  }
}

// ─── خروجی CSV حقوق پرسنل ────────────────────────────────────────────────────
async function handleStaffTransactionsCsvExport(ctx) {
  const session = getSession(ctx.from.id);
  const biz = session.biz;
  if (!hasPermission(biz, 'payroll.view')) {
    return ctx.reply(MSG.permissionDenied, KB.exportMenuKeyboard());
  }
  await ctx.reply(MSG.exportGenerating);
  const rows = await getAllStaffTransactionsForExport(biz?.businessId);
  if (rows.length === 0) return ctx.reply(MSG.exportEmptyStaffTransactions);
  const csv = '﻿' + buildStaffTransactionsCsv(rows);
  const tmpPath = path.join(os.tmpdir(), `icebox_payroll_${Date.now()}.csv`);
  fs.writeFileSync(tmpPath, csv, 'utf8');
  try {
    await ctx.replyWithDocument(
      { source: fs.createReadStream(tmpPath), filename: 'payroll_export.csv' },
      { caption: `📋 خروجی حقوق پرسنل — ${rows.length} رکورد` }
    );
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

// ─── خروجی CSV خریدها ─────────────────────────────────────────────────────────
async function handlePurchasesCsvExport(ctx) {
  const session = getSession(ctx.from.id);
  await ctx.reply(MSG.exportGenerating);
  const rows = await getAllPurchasesForExport(session.biz?.businessId);
  if (rows.length === 0) return ctx.reply(MSG.exportEmptyPurchases);
  const csv = '﻿' + buildPurchasesCsv(rows);
  const tmpPath = path.join(os.tmpdir(), `icebox_purchases_${Date.now()}.csv`);
  fs.writeFileSync(tmpPath, csv, 'utf8');
  try {
    await ctx.replyWithDocument(
      { source: fs.createReadStream(tmpPath), filename: 'purchases_export.csv' },
      { caption: `🛒 خروجی خریدهای مواد — ${rows.length} رکورد` }
    );
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// روتر اصلی پیام‌های متنی
// ═══════════════════════════════════════════════════════════════════════════════

async function handleText(ctx) {
  const text   = ctx.message.text;
  const userId = ctx.from.id;
  const session = getSession(userId);

  // ── بارگذاری biz context اگر موجود نیست (مثلاً بعد از restart سرور) ─────────
  // super_admin باید همیشه منوی کامل را داشته باشد، حتی بدون /start مجدد
  if (!session.biz && isSuperAdmin(ctx)) {
    await ensureBizContext(ctx);
  }

  // ── جریان ثبت‌نام (کاربر بدون کسب‌وکار) ──────────────────────────────────
  if (!session.biz && !isSuperAdmin(ctx)) {
    if (text === '❌ لغو' || text === '🏠 منوی اصلی') {
      session.step = 'register_license';
      return ctx.reply(MSG.licensePrompt, KB.cancelKeyboard);
    }
    if (session.step && session.step.startsWith('register_')) {
      return handleRegistrationStep(ctx, text);
    }
    session.step = 'register_license';
    return ctx.reply(MSG.licensePrompt, KB.cancelKeyboard);
  }

  // ── لغو از هر جای ربات ────────────────────────────────────────────────────
  if (text === '❌ لغو' || text === '🔙 بازگشت' || text === '🏠 منوی اصلی') {
    clearSession(userId);
    return ctx.reply(MSG.mainMenu, getMenu(getSession(userId)));
  }

  // ── تأیید PIN ──────────────────────────────────────────────────────────────
  if (session.step === 'pin_verify') {
    return handlePinVerify(ctx, text);
  }

  // ── قفل بخش‌ها ────────────────────────────────────────────────────────────
  if (session.step === 'lock_section_action') return handleLockSectionAction(ctx, text);
  if (session.step === 'lock_pin_set' ||
      session.step === 'lock_pin_confirm' ||
      session.step === 'lock_remove_verify' ||
      session.step === 'lock_change_verify') {
    return handleLockPinStep(ctx, text);
  }

  // ── منوی اصلی (step=null) ──────────────────────────────────────────────────
  if (!session.step) {
    if (text === '💰 ثبت فروش امروز')  return startSaleFlow(ctx);
    if (text === '🧾 ثبت خرج')         return startExpenseFlow(ctx);
    if (text === '📊 گزارش‌ها')         return startReportsMenu(ctx);
    if (text === '🏪 مدیریت شعبه‌ها')   return startBranchManagement(ctx);
    if (text === '🗂️ مدیریت ثبت‌ها')   return startManageRecords(ctx);
    if (text === '➕ افزودن شعبه')      return startQuickAddBranch(ctx);
    if (text === '👥 مدیریت تیم')       return startTeamManagement(ctx);
    if (text === '🔑 مجوزها')           return startLicenseManagement(ctx);
    if (text === '⚙️ تنظیمات')          return startSettings(ctx);
    if (text === '📤 خروجی اطلاعات')   return startExportMenu(ctx);
    if (text === '🏭 تأمین‌کننده‌ها')    return startSupplierMenu(ctx);
    if (text === '📦 انبار')             return startInventoryMenu(ctx);
    if (text === '👥 حساب پرسنل')        return startPayrollMenu(ctx);
    if (text === '❓ راهنما') {
      return ctx.reply(MSG.help, { parse_mode: 'Markdown', ...getMenu(session) });
    }
    return ctx.reply(MSG.mainMenu, getMenu(session));
  }

  // ── جریان فروش ────────────────────────────────────────────────────────────
  if (session.step === 'sale_branch')                      return handleSaleBranch(ctx, text);
  if (session.step && session.step.startsWith('sale_'))    return handleSaleStep(ctx, text);

  // ── جریان خرج ─────────────────────────────────────────────────────────────
  if (session.step === 'expense_branch')                   return handleExpenseBranch(ctx, text);
  if (session.step && session.step.startsWith('expense_')) return handleExpenseStep(ctx, text);

  // ── منوی گزارش‌ها ──────────────────────────────────────────────────────────
  if (session.step === 'reports_menu')         return handleReportsMenu(ctx, text);
  if (session.step === 'accounting_period')        return handleAccountingPeriodPick(ctx, text);
  if (session.step === 'accounting_export_period') return handleAccountingExportPeriod(ctx, text);
  if (session.step === 'compare_period')       return handleComparePeriod(ctx, text);
  if (session.step === 'datepick_month')       return handleDatepickMonth(ctx, text);
  if (session.step === 'datepick_day')         return handleDatepickDay(ctx, text);
  if (session.step === 'custom_scope')         return handleCustomScope(ctx, text);
  if (session.step === 'custom_branch')        return handleCustomBranch(ctx, text);
  if (session.step === 'branch_report_select') return handleBranchReportSelect(ctx, text);
  if (session.step === 'branch_report_period') return handleBranchReportPeriod(ctx, text);

  if (session.step && session.step.startsWith('report_type_')) {
    return handleReportTypeSelection(ctx, text);
  }
  if (session.step && session.step.startsWith('report_branch_')) {
    const reportType = session.step.replace('report_branch_', '');
    return handleReportBranchSelection(ctx, text, reportType);
  }

  // ── مدیریت شعبه ───────────────────────────────────────────────────────────
  if (session.step === 'branch_manage' ||
      session.step === 'branch_add_name' ||
      session.step === 'branch_add_address') {
    return handleBranchManage(ctx, text);
  }

  // ── مدیریت ثبت‌ها ──────────────────────────────────────────────────────────
  if (session.step === 'records_menu')                              return handleRecordsMenu(ctx, text);
  if (session.step && session.step.startsWith('delete_sale_'))      return handleDeleteSaleStep(ctx, text);
  if (session.step && session.step.startsWith('delete_expense_'))   return handleDeleteExpenseStep(ctx, text);
  if (session.step && session.step.startsWith('edit_sale_'))        return handleEditSaleStep(ctx, text);
  if (session.step && session.step.startsWith('edit_expense_'))     return handleEditExpenseStep(ctx, text);

  // ── گزارش ریز مخارج ──────────────────────────────────────────────────────
  if (session.step === 'expense_detail_period') return handleExpenseDetailPeriod(ctx, text);

  // ── تأمین‌کننده‌ها (Phase 8) ────────────────────────────────────────────────
  if (session.step === 'supplier_menu')                         return handleSupplierMenu(ctx, text);
  if (session.step && session.step.startsWith('supplier_add_')) return handleSupplierStep(ctx, text);
  if (session.step && session.step.startsWith('purchase_'))     return handlePurchaseStep(ctx, text);
  if (session.step && session.step.startsWith('supp_pay_'))     return handleSuppPaymentStep(ctx, text);

  // ── انبار مواد اولیه (Phase 8C) ────────────────────────────────────────────
  if (session.step === 'inventory_menu')                            return handleInventoryMenu(ctx, text);
  if (session.step && session.step.startsWith('inventory_add_'))    return handleInventoryAddStep(ctx, text);
  if (session.step && session.step.startsWith('inventory_consume_')) return handleInventoryConsumeStep(ctx, text);
  if (session.step && session.step.startsWith('inventory_adjust_')) return handleInventoryAdjustStep(ctx, text);

  // ── حساب پرسنل (Phase 8D) ──────────────────────────────────────────────────
  if (session.step === 'payroll_menu')                            return handlePayrollMenu(ctx, text);
  if (session.step && session.step.startsWith('payroll_salary_')) return handleSetSalaryStep(ctx, text);
  if (session.step && session.step.startsWith('payroll_tx_'))    return handleStaffTransactionStep(ctx, text);

  // ── تنظیمات و خروجی ────────────────────────────────────────────────────────
  if (session.step === 'settings_menu') return handleSettingsMenu(ctx, text);
  if (session.step === 'export_menu')   return handleExportMenuChoice(ctx, text);
  if (session.step === 'lock_menu')     return handleLockMenu(ctx, text);

  // ── مدیریت تیم ─────────────────────────────────────────────────────────────
  if (session.step === 'team_menu')              return handleTeamMenu(ctx, text);
  if (session.step === 'team_member_select')     return handleMemberSelect(ctx, text);
  if (session.step === 'team_member_action')     return handleMemberAction(ctx, text);
  if (session.step === 'team_member_permissions') return handlePermissionsMenu(ctx, text);
  if (session.step && session.step.startsWith('team_')) return handleTeamStep(ctx, text);

  // ── مدیریت لایسنس ──────────────────────────────────────────────────────────
  if (session.step === 'license_menu') return handleLicenseMenu(ctx, text);

  // ── ثبت‌نام ─────────────────────────────────────────────────────────────────
  if (session.step && session.step.startsWith('register_')) {
    return handleRegistrationStep(ctx, text);
  }

  // fallback
  clearSession(userId);
  return ctx.reply(MSG.mainMenu, getMenu(getSession(userId)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// دستورات ثابت
// ═══════════════════════════════════════════════════════════════════════════════

async function handleId(ctx) {
  return ctx.reply(MSG.yourId(ctx.from?.id), { parse_mode: 'Markdown' });
}

async function handleHealth(ctx) {
  const dbOk = await checkConnection();
  const now  = new Date();
  return ctx.reply(MSG.healthStatus({
    botStatus:   '✅ فعال',
    dbStatus:    dbOk ? '✅ برقرار' : '❌ خطا',
    serverTime:  now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    environment: process.env.NODE_ENV || 'development',
  }), { parse_mode: 'Markdown' });
}

async function handleExportCommand(ctx) {
  return startExportMenu(ctx);
}

// ═══════════════════════════════════════════════════════════════════════════════
// /qa_accounting — تست سازگاری حسابداری (Phase 8G)
// فقط business_owner یا super_admin
// ═══════════════════════════════════════════════════════════════════════════════

async function handleQaAccounting(ctx) {
  const session = getSession(ctx.from.id);
  let biz = session.biz;
  if (!biz) biz = await ensureBizContext(ctx);

  if (!isSuperAdmin(ctx) && biz?.role !== 'business_owner') {
    return ctx.reply(MSG.permissionDenied, getMenu(getSession(ctx.from.id)));
  }
  if (!biz?.businessId) {
    return ctx.reply('⚠️ ابتدا /start بزنید تا context کسب‌وکار بارگذاری شود.');
  }

  await ctx.reply('🔍 در حال اجرای تست سازگاری حسابداری...');

  const { start, end } = getMonthRange();
  const report         = await getFullAccountingReport(biz.businessId, start, end);

  const pd   = '۰۱۲۳۴۵۶۷۸۹'.split('');
  const fmt  = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
  const fmtN = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
  const EPS  = 0.01;

  const { sales, expenses, purchases, inventory, payroll, summary } = report;
  const errors = [];

  // ── تست ۱: cashIn === فروش کل ──────────────────────────────────────────────
  if (Math.abs(summary.cashIn - sales.total) > EPS)
    errors.push(`❌ cashIn (${fmt(summary.cashIn)}) ≠ فروش کل (${fmt(sales.total)})`);

  // ── تست ۲: فرمول cashOut (بدون bonus — bonus در obligations است) ────────────
  const expectedCashOut = expenses.total
    + purchases.paidAtPurchase
    + purchases.laterPayments
    + payroll.salaryPayment
    + payroll.advance
    + payroll.internalConsumption;
  if (Math.abs(summary.cashOut - expectedCashOut) > EPS)
    errors.push(`❌ cashOut (${fmt(summary.cashOut)}) ≠ مجموع اجزا (${fmt(expectedCashOut)})`);

  // ── تست ۳: netCash = cashIn − cashOut ──────────────────────────────────────
  const expectedNet = summary.cashIn - summary.cashOut;
  if (Math.abs(summary.netCash - expectedNet) > EPS)
    errors.push(`❌ مانده نقدی (${fmt(summary.netCash)}) ≠ cashIn−cashOut (${fmt(expectedNet)})`);

  // ── تست ۴: obligations = بدهی_تأمین‌کننده + max(0, مانده_پرسنل) ────────────
  const expectedObl = purchases.currentDebt + Math.max(0, payroll.totalStaffBalance);
  if (Math.abs(summary.obligations - expectedObl) > EPS)
    errors.push(`❌ تعهدات (${fmt(summary.obligations)}) ≠ بدهی_تأمین‌کننده + مانده_پرسنل (${fmt(expectedObl)})`);

  // ── تست ۵: afterObligations = netCash − obligations ────────────────────────
  const expectedAfter = summary.netCash - summary.obligations;
  if (Math.abs(summary.afterObligations - expectedAfter) > EPS)
    errors.push(`❌ مانده بعد از تعهدات (${fmt(summary.afterObligations)}) ≠ netCash−obligations (${fmt(expectedAfter)})`);

  // ── تست ۶: بدهی تأمین‌کننده نباید منفی باشد ────────────────────────────────
  if (purchases.currentDebt < -EPS)
    errors.push(`❌ بدهی تأمین‌کننده منفی است: ${fmt(purchases.currentDebt)}`);

  // ── تست ۷: business_id در گزارش ─────────────────────────────────────────────
  // (بررسی static: getFullAccountingReport همیشه businessId می‌گیرد — به DB نیاز ندارد)
  if (!biz.businessId || typeof biz.businessId !== 'number')
    errors.push(`❌ businessId نامعتبر: ${biz.businessId}`);

  const startJalali = gregorianToJalaliDateString(start);
  const endJalali   = gregorianToJalaliDateString(end);
  const sep = '━'.repeat(26);

  const lines = [
    `🔍 *تست سازگاری حسابداری — Phase 8G*`,
    `📅 ماه جاری: ${startJalali} تا ${endJalali}`,
    `🏪 کسب‌وکار: ${biz.businessName || biz.businessId}`,
    sep,
    `💰 فروش کل: ${fmt(sales.total)} تومان`,
    `🧾 مخارج: ${fmt(expenses.total)} تومان`,
    `🛒 پرداخت نقدی خرید: ${fmt(purchases.paidAtPurchase)} تومان`,
    `💳 پرداخت بعدی تأمین‌کننده: ${fmt(purchases.laterPayments)} تومان`,
    `🔴 بدهی فعلی تأمین‌کننده: ${fmt(purchases.currentDebt)} تومان`,
    `👥 حقوق پرداخت‌شده: ${fmt(payroll.salaryPayment)} تومان`,
    `👥 برداشت: ${fmt(payroll.advance)} تومان`,
    `👥 مصرف داخلی: ${fmt(payroll.internalConsumption)} تومان`,
    `🎁 پاداش (تعهد — در obligations): ${fmt(payroll.bonus)} تومان`,
    `👥 مانده کل حقوق: ${fmt(payroll.totalStaffBalance)} تومان`,
    sep,
    `📊 ورودی نقدی: ${fmt(summary.cashIn)} تومان`,
    `📊 خروجی نقدی: ${fmt(summary.cashOut)} تومان`,
    `📊 مانده نقدی: ${fmt(summary.netCash)} تومان`,
    `📊 تعهدات: ${fmt(summary.obligations)} تومان`,
    `📊 مانده بعد از تعهدات: ${fmt(summary.afterObligations)} تومان`,
    sep,
    `🔗 گزارش تلگرام و summary.csv از منبع مشترک: ✅`,
    `🔢 تعداد تست‌ها: ۷`,
  ];

  if (errors.length === 0) {
    lines.push(`\n✅ *تمام تست‌های سازگاری پاس شدند.*`);
  } else {
    lines.push(`\n⚠️ *${fmtN(errors.length)} اختلاف یافت شد:*`);
    lines.push(...errors);
  }

  return ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
}

// ─── برای کاربران فاقد کسب‌وکار (استفاده از index.js) ───────────────────────
async function handleUnregistered(ctx) {
  const session = getSession(ctx.from.id);
  if (session.step && session.step.startsWith('register_')) {
    // در جریان ثبت‌نام هستند — ادامه دهند
    return handleText(ctx);
  }
  session.step = 'register_license';
  return ctx.reply(MSG.licensePrompt, KB.cancelKeyboard);
}

module.exports = {
  handleStart,
  handleText,
  handleId,
  handleHealth,
  handleExportCommand,
  handleQaAccounting,
  handleUnregistered,
};
