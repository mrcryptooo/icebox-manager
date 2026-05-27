const path = require('path');
const os   = require('os');
const fs   = require('fs');

const MSG = require('./messages');
const KB = require('./keyboards');
const { isOwner } = require('../../utils/auth');
const { checkConnection } = require('../../db/database');
const { findOrCreateUser } = require('../../core/userService');
const { getAllBranches, getBranchById, createBranch } = require('../../core/branchService');
const {
  recordSale, getSaleById, getRecentSales, updateSale, deleteSale,
} = require('../../core/salesService');
const {
  recordExpense, getExpenseById, getRecentExpenses, updateExpense, deleteExpense,
} = require('../../core/expenseService');
const {
  getDailyReport, getWeeklyReport, getMonthlyReport,
  getDailyAllBranches, getWeeklyAllBranches, getMonthlyAllBranches,
  getDailyComparison, getWeeklyComparison, getMonthlyComparison,
  getCustomReport, getCustomAllBranches, getCustomComparison,
} = require('../../core/reportService');
const {
  getAllSalesForExport, getAllExpensesForExport,
  buildSalesCsv, buildExpensesCsv,
} = require('../../core/exportService');
const {
  getTodayDate,
  isValidDate,
  isValidJalaliDate,
  jalaliToGregorianDateString,
  gregorianToJalaliDateString,
  normalizeDateInput,
  getJalaliMonthDays,
  getTodayJalaliParts,
} = require('../../utils/date');
const { formatMoney, formatNumber } = require('../../utils/formatMoney');

// ─── Session store ────────────────────────────────────────────────────────────
const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) sessions[userId] = { step: null, data: {} };
  return sessions[userId];
}

function clearSession(userId) {
  sessions[userId] = { step: null, data: {} };
}

// ─── تبدیل عدد — فارسی/عربی/انگلیسی همه قبول می‌شوند ───────────────────────
function parseNumber(text) {
  const normalized = text
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[,،٬\s]/g, '')
    .trim();
  const n = Number(normalized);
  return isNaN(n) ? null : n;
}

function parseId(text) {
  const n = parseNumber(text);
  if (n === null || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

// ─── نام ماه‌های شمسی (برای تقویم دکمه‌ای) ───────────────────────────────────
const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

// تبدیل تاریخ میلادی ذخیره‌شده در دیتابیس به شمسی برای نمایش
function gDate(gregorianStr) {
  return gregorianToJalaliDateString(gregorianStr || '');
}

// ─── فرمت فروش برای نمایش ────────────────────────────────────────────────────
function formatSaleData(sale, branch) {
  const total = (sale.cash_amount || 0) + (sale.pos_amount || 0) +
                (sale.card_transfer_amount || 0) + (sale.online_amount || 0);
  return {
    id: sale.id,
    branchName: branch ? branch.name : '—',
    date: gDate(sale.sale_date),
    cash: formatMoney(sale.cash_amount),
    pos: formatMoney(sale.pos_amount),
    cardTransfer: formatMoney(sale.card_transfer_amount),
    online: formatMoney(sale.online_amount),
    total: formatMoney(total),
    orderCount: formatNumber(sale.order_count),
    note: sale.note,
  };
}

// ─── /start و /menu ───────────────────────────────────────────────────────────
async function handleStart(ctx) {
  const tgUser = ctx.from;
  const user = await findOrCreateUser(tgUser.id, tgUser.first_name || tgUser.username);
  clearSession(tgUser.id);
  await ctx.reply(MSG.welcome(user.name || tgUser.first_name), { parse_mode: 'Markdown', ...KB.mainMenu });
}

// ─── افزودن سریع شعبه (از کیبورد «بدون شعبه») ───────────────────────────────
async function startQuickAddBranch(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'branch_add_name';
  session.data = {};
  return ctx.reply(MSG.askBranchName, KB.cancelKeyboard);
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان ثبت فروش
// ═══════════════════════════════════════════════════════════════════════════════

async function startSaleFlow(ctx) {
  const branches = await getAllBranches();
  if (branches.length === 0) {
    return ctx.reply(MSG.noBranchesAction, KB.noBranchesActionKeyboard());
  }
  const session = getSession(ctx.from.id);
  session.step = 'sale_branch';
  session.data = {};
  return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
}

async function handleSaleBranch(ctx, branchName) {
  const branches = await getAllBranches();
  const branch = branches.find(b => b.name === branchName);
  if (!branch) return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
  const session = getSession(ctx.from.id);
  session.data.branchId = branch.id;
  session.data.branchName = branch.name;
  session.step = 'sale_cash';
  return ctx.reply(MSG.askCash, KB.cancelKeyboard);
}

const SALE_NUMERIC_STEPS = [
  { key: 'sale_cash',   nextAsk: () => MSG.askPos,          nextStep: 'sale_pos',    field: 'cash' },
  { key: 'sale_pos',    nextAsk: () => MSG.askCardTransfer,  nextStep: 'sale_card',   field: 'pos' },
  { key: 'sale_card',   nextAsk: () => MSG.askOnline,        nextStep: 'sale_online', field: 'cardTransfer' },
  { key: 'sale_online', nextAsk: () => MSG.askOrderCount,    nextStep: 'sale_orders', field: 'online' },
  { key: 'sale_orders', nextAsk: () => MSG.askNote,          nextStep: 'sale_note',   field: 'orderCount' },
];

function buildSaleConfirmData(data) {
  const total = (data.cash || 0) + (data.pos || 0) + (data.cardTransfer || 0) + (data.online || 0);
  return {
    branchName: data.branchName,
    date: gDate(data.saleDate || getTodayDate()),
    cash: formatMoney(data.cash),
    pos: formatMoney(data.pos),
    cardTransfer: formatMoney(data.cardTransfer),
    online: formatMoney(data.online),
    total: formatMoney(total),
    orderCount: formatNumber(data.orderCount),
    note: data.note,
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
    data.note = text === 'ندارم' ? null : text;
    data.saleDate = data.saleDate || getTodayDate();
    session.step = 'sale_confirm';
    return ctx.reply(MSG.confirmSale(buildSaleConfirmData(data)), KB.confirmSaleKeyboard());
  }

  if (step === 'sale_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      const user = await findOrCreateUser(ctx.from.id, ctx.from.first_name);
      await recordSale({
        branchId: data.branchId, userId: user.id, saleDate: data.saleDate,
        cashAmount: data.cash, posAmount: data.pos,
        cardTransferAmount: data.cardTransfer, onlineAmount: data.online,
        orderCount: data.orderCount, note: data.note,
      });
      const summary = buildSaleConfirmData(data);
      clearSession(ctx.from.id);
      return ctx.reply(MSG.saleSavedWithSummary(summary), KB.mainMenu);
    }
    if (text === '✏️ ویرایش') {
      session.data = { branchId: data.branchId, branchName: data.branchName, saleDate: data.saleDate };
      session.step = 'sale_cash';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askCash, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, KB.mainMenu);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان ثبت خرج
// ═══════════════════════════════════════════════════════════════════════════════

async function startExpenseFlow(ctx) {
  const branches = await getAllBranches();
  if (branches.length === 0) {
    return ctx.reply(MSG.noBranchesAction, KB.noBranchesActionKeyboard());
  }
  const session = getSession(ctx.from.id);
  session.step = 'expense_branch';
  session.data = {};
  return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
}

async function handleExpenseBranch(ctx, branchName) {
  const branches = await getAllBranches();
  const branch = branches.find(b => b.name === branchName);
  if (!branch) return ctx.reply(MSG.selectBranch, KB.branchKeyboard(branches));
  const session = getSession(ctx.from.id);
  session.data.branchId = branch.id;
  session.data.branchName = branch.name;
  session.step = 'expense_amount';
  return ctx.reply(MSG.askExpenseAmount, KB.cancelKeyboard);
}

const EXPENSE_VALID_CATEGORIES = [
  'مواد اولیه', 'شیر و خامه', 'میوه', 'شکلات و تاپینگ',
  'بسته‌بندی', 'حقوق و دستمزد', 'اجاره', 'قبوض',
  'تعمیرات', 'تبلیغات', 'پیک و ارسال', 'سایر',
];

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
    session.step = 'expense_note';
    return ctx.reply(MSG.askExpenseNote, KB.cancelKeyboard);
  }

  if (step === 'expense_note') {
    data.note = text === 'ندارم' ? null : text;
    data.expenseDate = data.expenseDate || getTodayDate();
    session.step = 'expense_confirm';
    return ctx.reply(
      MSG.confirmExpense({
        branchName: data.branchName, date: gDate(data.expenseDate),
        amount: formatMoney(data.amount), category: data.category, note: data.note,
      }),
      KB.confirmExpenseKeyboard()
    );
  }

  if (step === 'expense_confirm') {
    if (text === '✅ تأیید و ذخیره') {
      const user = await findOrCreateUser(ctx.from.id, ctx.from.first_name);
      await recordExpense({
        branchId: data.branchId, userId: user.id, expenseDate: data.expenseDate,
        amount: data.amount, category: data.category, note: data.note,
      });
      clearSession(ctx.from.id);
      return ctx.reply(
        MSG.expenseSavedWithSummary({
          branchName: data.branchName, date: gDate(data.expenseDate),
          amount: formatMoney(data.amount), category: data.category, note: data.note,
        }),
        KB.mainMenu
      );
    }
    if (text === '✏️ ویرایش') {
      session.data = { branchId: data.branchId, branchName: data.branchName, expenseDate: data.expenseDate };
      session.step = 'expense_amount';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askExpenseAmount, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, KB.mainMenu);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان گزارش (کلاسیک — daily/weekly/monthly)
// ═══════════════════════════════════════════════════════════════════════════════

async function startReportFlow(ctx, reportType) {
  const branches = await getAllBranches();
  if (branches.length === 0) return ctx.reply(MSG.noBranches, KB.mainMenu);
  const session = getSession(ctx.from.id);
  session.step = `report_type_${reportType}`;
  session.data = { reportType };
  return ctx.reply(MSG.selectReportType, KB.reportTypeKeyboard());
}

async function handleReportTypeSelection(ctx, text) {
  const session = getSession(ctx.from.id);
  const { reportType } = session.data;

  if (text === 'همه شعبه‌ها') {
    let report;
    if (reportType === 'daily')        report = await getDailyAllBranches();
    else if (reportType === 'weekly')  report = await getWeeklyAllBranches();
    else                               report = await getMonthlyAllBranches();
    clearSession(ctx.from.id);
    return ctx.reply(report, KB.mainMenu);
  }

  if (text === 'یک شعبه') {
    const branches = await getAllBranches();
    session.step = `report_branch_${reportType}`;
    return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  }
}

async function handleReportBranchSelection(ctx, branchName, reportType) {
  const branches = await getAllBranches();
  const branch = branches.find(b => b.name === branchName);
  if (!branch) return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));

  let report;
  if (reportType === 'daily')        report = await getDailyReport(branch.id);
  else if (reportType === 'weekly')  report = await getWeeklyReport(branch.id);
  else                               report = await getMonthlyReport(branch.id);

  clearSession(ctx.from.id);
  return ctx.reply(report, KB.mainMenu);
}

// ═══════════════════════════════════════════════════════════════════════════════
// منوی گزارش‌ها (Phase 4)
// ═══════════════════════════════════════════════════════════════════════════════

async function startReportsMenu(ctx) {
  const branches = await getAllBranches();
  if (branches.length === 0) return ctx.reply(MSG.noBranches, KB.mainMenu);
  const session = getSession(ctx.from.id);
  session.step = 'reports_menu';
  session.data = {};
  return ctx.reply(MSG.reportsMenu, KB.reportsMenuKeyboard());
}

async function handleReportsMenu(ctx, text) {
  const branches = await getAllBranches();
  if (branches.length === 0) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.noBranches, KB.mainMenu);
  }
  const session = getSession(ctx.from.id);

  if (text === '📊 گزارش امروز' || text === '📅 گزارش هفتگی' || text === '🗓️ گزارش ماهانه') {
    const typeMap = {
      '📊 گزارش امروز':  'daily',
      '📅 گزارش هفتگی':  'weekly',
      '🗓️ گزارش ماهانه': 'monthly',
    };
    const reportType = typeMap[text];
    session.step = `report_type_${reportType}`;
    session.data = { reportType };
    return ctx.reply(MSG.selectReportType, KB.reportTypeKeyboard());
  }

  if (text === '🏪 گزارش شعبه')      return startBranchReport(ctx);
  if (text === '🔁 مقایسه شعبه‌ها')  return startCompareReport(ctx);
  if (text === '📆 بازه دلخواه')      return startCustomReport(ctx);

  return ctx.reply(MSG.reportsMenu, KB.reportsMenuKeyboard());
}

// ─── مقایسه شعبه‌ها ───────────────────────────────────────────────────────────

async function startCompareReport(ctx) {
  const branches = await getAllBranches();
  if (branches.length < 2) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.notEnoughBranches, KB.mainMenu);
  }
  const session = getSession(ctx.from.id);
  session.step = 'compare_period';
  session.data = {};
  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

async function handleComparePeriod(ctx, text) {
  const session = getSession(ctx.from.id);

  if (text === '📊 امروز') {
    const report = await getDailyComparison();
    clearSession(ctx.from.id);
    return ctx.reply(report, KB.mainMenu);
  }
  if (text === '📅 این هفته') {
    const report = await getWeeklyComparison();
    clearSession(ctx.from.id);
    return ctx.reply(report, KB.mainMenu);
  }
  if (text === '🗓️ این ماه') {
    const report = await getMonthlyComparison();
    clearSession(ctx.from.id);
    return ctx.reply(report, KB.mainMenu);
  }
  if (text === '📆 بازه دلخواه') {
    session.data.datePickerFlow = 'compare';
    return startPickingDate(ctx, 'start');
  }

  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

// ═══════════════════════════════════════════════════════════════════════════════
// تقویم دکمه‌ای — flow مشترک برای انتخاب بازه شمسی
// ═══════════════════════════════════════════════════════════════════════════════

async function startPickingDate(ctx, mode) {
  // mode: 'start' | 'end'
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
    const msg = mode === 'start' ? MSG.pickStartMonth : MSG.pickEndMonth;
    return ctx.reply(msg, KB.jalaliMonthsKeyboard());
  }
  const month = monthIndex + 1;
  const year  = session.data.datePickerYear;
  session.data.datePickerMonth     = month;
  session.data.datePickerMonthName = text;
  session.step = 'datepick_day';
  const mode = session.data.datePickerMode;
  const msg  = mode === 'start' ? MSG.pickStartDay(text) : MSG.pickEndDay(text);
  return ctx.reply(msg, KB.jalaliDaysKeyboard(month, year));
}

async function handleDatepickDay(ctx, text) {
  const session = getSession(ctx.from.id);
  const { datePickerMode, datePickerYear, datePickerMonth, datePickerMonthName } = session.data;

  const normalized = normalizeDateInput(text);
  const day    = parseInt(normalized, 10);
  const maxDay = getJalaliMonthDays(datePickerMonth, datePickerYear);

  if (isNaN(day) || day < 1 || day > maxDay) {
    const msg = datePickerMode === 'start'
      ? MSG.pickStartDay(datePickerMonthName)
      : MSG.pickEndDay(datePickerMonthName);
    return ctx.reply(msg, KB.jalaliDaysKeyboard(datePickerMonth, datePickerYear));
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
  const { datePickerFlow, startDate, endDate, scope, branchId } = session.data;

  let report;
  if (datePickerFlow === 'compare') {
    report = await getCustomComparison(startDate, endDate);
  } else if (datePickerFlow === 'custom') {
    report = scope === 'all'
      ? await getCustomAllBranches(startDate, endDate)
      : await getCustomReport(branchId, startDate, endDate);
  } else if (datePickerFlow === 'branch') {
    report = await getCustomReport(branchId, startDate, endDate);
  } else {
    report = await getCustomAllBranches(startDate, endDate);
  }

  clearSession(ctx.from.id);
  return ctx.reply(report, KB.mainMenu);
}

// ─── گزارش بازه دلخواه ───────────────────────────────────────────────────────

async function startCustomReport(ctx) {
  const branches = await getAllBranches();
  if (branches.length === 0) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.noBranches, KB.mainMenu);
  }
  const session = getSession(ctx.from.id);
  session.step = 'custom_scope';
  session.data = {};
  return ctx.reply(MSG.selectReportType, KB.reportTypeKeyboard());
}

async function handleCustomScope(ctx, text) {
  const session = getSession(ctx.from.id);
  if (text === 'همه شعبه‌ها') {
    session.data.scope          = 'all';
    session.data.datePickerFlow = 'custom';
    return startPickingDate(ctx, 'start');
  }
  if (text === 'یک شعبه') {
    const branches = await getAllBranches();
    session.data.scope = 'single';
    session.step       = 'custom_branch';
    return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  }
  return ctx.reply(MSG.selectReportType, KB.reportTypeKeyboard());
}

async function handleCustomBranch(ctx, text) {
  const branches = await getAllBranches();
  const branch = branches.find(b => b.name === text);
  if (!branch) return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  const session = getSession(ctx.from.id);
  session.data.branchId       = branch.id;
  session.data.branchName     = branch.name;
  session.data.datePickerFlow = 'custom';
  return startPickingDate(ctx, 'start');
}

// ═══════════════════════════════════════════════════════════════════════════════
// گزارش شعبه — انتخاب شعبه سپس بازه زمانی
// ═══════════════════════════════════════════════════════════════════════════════

async function startBranchReport(ctx) {
  const branches = await getAllBranches();
  if (branches.length === 0) {
    clearSession(ctx.from.id);
    return ctx.reply(MSG.noBranches, KB.mainMenu);
  }
  const session = getSession(ctx.from.id);
  session.step = 'branch_report_select';
  session.data = {};
  return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
}

async function handleBranchReportSelect(ctx, text) {
  const branches = await getAllBranches();
  const branch = branches.find(b => b.name === text);
  if (!branch) return ctx.reply(MSG.selectBranchForReport, KB.branchKeyboard(branches));
  const session = getSession(ctx.from.id);
  session.data.branchId   = branch.id;
  session.data.branchName = branch.name;
  session.step = 'branch_report_period';
  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

async function handleBranchReportPeriod(ctx, text) {
  const session = getSession(ctx.from.id);
  const { branchId } = session.data;

  if (text === '📊 امروز') {
    const report = await getDailyReport(branchId);
    clearSession(ctx.from.id);
    return ctx.reply(report, KB.mainMenu);
  }
  if (text === '📅 این هفته') {
    const report = await getWeeklyReport(branchId);
    clearSession(ctx.from.id);
    return ctx.reply(report, KB.mainMenu);
  }
  if (text === '🗓️ این ماه') {
    const report = await getMonthlyReport(branchId);
    clearSession(ctx.from.id);
    return ctx.reply(report, KB.mainMenu);
  }
  if (text === '📆 بازه دلخواه') {
    session.data.datePickerFlow = 'branch';
    return startPickingDate(ctx, 'start');
  }
  return ctx.reply(MSG.selectPeriod, KB.periodKeyboard());
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان مدیریت شعبه‌ها
// ═══════════════════════════════════════════════════════════════════════════════

async function startBranchManagement(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'branch_manage';
  session.data = {};
  return ctx.reply('🏪 مدیریت شعبه‌ها:', KB.branchManageKeyboard());
}

async function handleBranchManage(ctx, text) {
  const session = getSession(ctx.from.id);

  if (text === '📋 لیست شعبه‌ها') {
    const branches = await getAllBranches();
    clearSession(ctx.from.id);
    return ctx.reply(MSG.branchList(branches), KB.mainMenu);
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
    const branch = await createBranch(session.data.branchName, address);
    clearSession(ctx.from.id);
    return ctx.reply(MSG.branchCreated(branch.name), KB.mainMenu);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// جریان مدیریت ثبت‌ها
// ═══════════════════════════════════════════════════════════════════════════════

async function startManageRecords(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'records_menu';
  session.data = {};
  return ctx.reply(MSG.manageRecordsMenu, KB.manageRecordsKeyboard());
}

async function handleRecordsMenu(ctx, text) {
  const session = getSession(ctx.from.id);

  if (text === '📋 آخرین فروش‌ها') return handleViewRecentSales(ctx);
  if (text === '📋 آخرین مخارج')   return handleViewRecentExpenses(ctx);
  if (text === '🗑️ حذف فروش')      return startDeleteSale(ctx);
  if (text === '🗑️ حذف خرج')       return startDeleteExpense(ctx);
  if (text === '✏️ ویرایش فروش')   return startEditSale(ctx);
  if (text === '✏️ ویرایش خرج')    return startEditExpense(ctx);

  // هر ورودی نامعتبر: منو را دوباره نشان بده
  session.step = 'records_menu';
  return ctx.reply(MSG.manageRecordsMenu, KB.manageRecordsKeyboard());
}

// ─── نمایش آخرین فروش‌ها ─────────────────────────────────────────────────────
async function handleViewRecentSales(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'records_menu'; // در منو بمان

  const sales = await getRecentSales(10);
  if (sales.length === 0) {
    return ctx.reply(MSG.noRecordsYet('فروش'), KB.manageRecordsKeyboard());
  }
  const formatted = sales.map(s => ({
    id: s.id,
    branchName: s.branch_name || '—',
    date: gDate(s.sale_date),
    cash: formatMoney(s.cash_amount),
    pos: formatMoney(s.pos_amount),
    cardTransfer: formatMoney(s.card_transfer_amount),
    online: formatMoney(s.online_amount),
    total: formatMoney((s.cash_amount || 0) + (s.pos_amount || 0) + (s.card_transfer_amount || 0) + (s.online_amount || 0)),
    orderCount: formatNumber(s.order_count),
    note: s.note,
  }));
  return ctx.reply(MSG.recentSalesList(formatted), KB.manageRecordsKeyboard());
}

// ─── نمایش آخرین مخارج ───────────────────────────────────────────────────────
async function handleViewRecentExpenses(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'records_menu';

  const expenses = await getRecentExpenses(10);
  if (expenses.length === 0) {
    return ctx.reply(MSG.noRecordsYet('خرج'), KB.manageRecordsKeyboard());
  }
  const formatted = expenses.map(e => ({
    id: e.id,
    branchName: e.branch_name || '—',
    date: gDate(e.expense_date),
    amount: formatMoney(e.amount),
    category: e.category,
    note: e.note,
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
    data.saleId = id;
    session.step = 'delete_sale_confirm';
    return ctx.reply(
      MSG.confirmDeleteSale(formatSaleData(sale, branch)),
      KB.confirmDeleteKeyboard()
    );
  }

  if (step === 'delete_sale_confirm') {
    if (text === '🗑️ بله، حذف شود') {
      const ok = await deleteSale(data.saleId);
      clearSession(ctx.from.id);
      if (ok) return ctx.reply(MSG.saleDeleted(data.saleId), KB.mainMenu);
      return ctx.reply(MSG.recordNotFound, KB.mainMenu);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, KB.mainMenu);
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
    session.step = 'delete_expense_confirm';
    return ctx.reply(
      MSG.confirmDeleteExpense({
        id: expense.id,
        branchName: branch ? branch.name : '—',
        date: gDate(expense.expense_date),
        amount: formatMoney(expense.amount),
        category: expense.category,
        note: expense.note,
      }),
      KB.confirmDeleteKeyboard()
    );
  }

  if (step === 'delete_expense_confirm') {
    if (text === '🗑️ بله، حذف شود') {
      const ok = await deleteExpense(data.expenseId);
      clearSession(ctx.from.id);
      if (ok) return ctx.reply(MSG.expenseDeleted(data.expenseId), KB.mainMenu);
      return ctx.reply(MSG.recordNotFound, KB.mainMenu);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, KB.mainMenu);
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
  { key: 'edit_sale_cash',   nextAsk: () => MSG.askPos,          nextStep: 'edit_sale_pos',    field: 'cash' },
  { key: 'edit_sale_pos',    nextAsk: () => MSG.askCardTransfer,  nextStep: 'edit_sale_card',   field: 'pos' },
  { key: 'edit_sale_card',   nextAsk: () => MSG.askOnline,        nextStep: 'edit_sale_online', field: 'cardTransfer' },
  { key: 'edit_sale_online', nextAsk: () => MSG.askOrderCount,    nextStep: 'edit_sale_orders', field: 'online' },
  { key: 'edit_sale_orders', nextAsk: () => MSG.askNote,          nextStep: 'edit_sale_note',   field: 'orderCount' },
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
    data.saleDate  = sale.sale_date; // تاریخ اصلی حفظ می‌شود
    session.step   = 'edit_sale_cash';

    return ctx.reply(
      MSG.showSaleForEdit(formatSaleData(sale, branch)) + '\n\n' + MSG.askCash,
      KB.cancelKeyboard
    );
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
    data.note = text === 'ندارم' ? null : text;
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
      return ctx.reply(MSG.saleUpdated(id), KB.mainMenu);
    }
    if (text === '✏️ ویرایش') {
      session.data = { editId: data.editId, branchId: data.branchId, branchName: data.branchName, saleDate: data.saleDate };
      session.step = 'edit_sale_cash';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askCash, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, KB.mainMenu);
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

    data.editId     = expense.id;
    data.branchId   = expense.branch_id;
    data.branchName = branch ? branch.name : '—';
    data.expenseDate = expense.expense_date;
    session.step    = 'edit_expense_amount';

    return ctx.reply(
      MSG.showExpenseForEdit({
        id: expense.id,
        branchName: data.branchName,
        date: gDate(expense.expense_date),
        amount: formatMoney(expense.amount),
        category: expense.category,
        note: expense.note,
      }) + '\n\n' + MSG.askExpenseAmount,
      KB.cancelKeyboard
    );
  }

  if (step === 'edit_expense_amount') {
    const n = parseNumber(text);
    if (n === null || n <= 0) return ctx.reply(MSG.invalidAmount, KB.cancelKeyboard);
    data.amount = n;
    session.step = 'edit_expense_category';
    return ctx.reply(MSG.askExpenseCategory, KB.expenseCategoryKeyboard());
  }

  if (step === 'edit_expense_category') {
    if (!EXPENSE_VALID_CATEGORIES.includes(text)) {
      return ctx.reply(MSG.askExpenseCategory, KB.expenseCategoryKeyboard());
    }
    data.category = text;
    session.step = 'edit_expense_note';
    return ctx.reply(MSG.askExpenseNote, KB.cancelKeyboard);
  }

  if (step === 'edit_expense_note') {
    data.note = text === 'ندارم' ? null : text;
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
      await updateExpense(data.editId, {
        amount: data.amount, category: data.category, note: data.note,
      });
      const id = data.editId;
      clearSession(ctx.from.id);
      return ctx.reply(MSG.expenseUpdated(id), KB.mainMenu);
    }
    if (text === '✏️ ویرایش') {
      session.data = { editId: data.editId, branchId: data.branchId, branchName: data.branchName, expenseDate: data.expenseDate };
      session.step = 'edit_expense_amount';
      return ctx.reply(MSG.editStarted + '\n\n' + MSG.askExpenseAmount, KB.cancelKeyboard);
    }
    clearSession(ctx.from.id);
    return ctx.reply(MSG.cancelled, KB.mainMenu);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// روتر اصلی پیام‌های متنی
// ═══════════════════════════════════════════════════════════════════════════════

async function handleText(ctx) {
  const text   = ctx.message.text;
  const userId = ctx.from.id;
  const session = getSession(userId);

  // لغو از هر جای ربات
  if (text === '❌ لغو' || text === '🔙 بازگشت' || text === '🏠 منوی اصلی') {
    clearSession(userId);
    return ctx.reply(MSG.mainMenu, KB.mainMenu);
  }

  // منوی اصلی (step=null)
  if (!session.step) {
    if (text === '💰 ثبت فروش امروز')  return startSaleFlow(ctx);
    if (text === '🧾 ثبت خرج')         return startExpenseFlow(ctx);
    if (text === '📊 گزارش‌ها')         return startReportsMenu(ctx);
    if (text === '🏪 مدیریت شعبه‌ها')   return startBranchManagement(ctx);
    if (text === '🗂️ مدیریت ثبت‌ها')   return startManageRecords(ctx);
    if (text === '➕ افزودن شعبه')      return startQuickAddBranch(ctx);
    if (text === '❓ راهنما') {
      return ctx.reply(MSG.help, { parse_mode: 'Markdown', ...KB.mainMenu });
    }
    if (text === '⚙️ تنظیمات') return startSettings(ctx);
    return ctx.reply(MSG.mainMenu, KB.mainMenu);
  }

  // ── جریان فروش ─────────────────────────────────────────────────────────────
  if (session.step === 'sale_branch') return handleSaleBranch(ctx, text);
  if (session.step && session.step.startsWith('sale_')) return handleSaleStep(ctx, text);

  // ── جریان خرج ──────────────────────────────────────────────────────────────
  if (session.step === 'expense_branch') return handleExpenseBranch(ctx, text);
  if (session.step && session.step.startsWith('expense_')) return handleExpenseStep(ctx, text);

  // ── منوی گزارش‌ها ──────────────────────────────────────────────────────────
  if (session.step === 'reports_menu')          return handleReportsMenu(ctx, text);
  if (session.step === 'compare_period')        return handleComparePeriod(ctx, text);
  if (session.step === 'datepick_month')        return handleDatepickMonth(ctx, text);
  if (session.step === 'datepick_day')          return handleDatepickDay(ctx, text);
  if (session.step === 'custom_scope')          return handleCustomScope(ctx, text);
  if (session.step === 'custom_branch')         return handleCustomBranch(ctx, text);
  if (session.step === 'branch_report_select')  return handleBranchReportSelect(ctx, text);
  if (session.step === 'branch_report_period')  return handleBranchReportPeriod(ctx, text);

  // ── جریان گزارش (کلاسیک) ───────────────────────────────────────────────────
  if (session.step && session.step.startsWith('report_type_')) {
    return handleReportTypeSelection(ctx, text);
  }
  if (session.step && session.step.startsWith('report_branch_')) {
    const reportType = session.step.replace('report_branch_', '');
    return handleReportBranchSelection(ctx, text, reportType);
  }

  // ── جریان مدیریت شعبه ──────────────────────────────────────────────────────
  if (
    session.step === 'branch_manage' ||
    session.step === 'branch_add_name' ||
    session.step === 'branch_add_address'
  ) {
    return handleBranchManage(ctx, text);
  }

  // ── جریان مدیریت ثبت‌ها ────────────────────────────────────────────────────
  if (session.step === 'records_menu') return handleRecordsMenu(ctx, text);
  if (session.step && session.step.startsWith('delete_sale_'))    return handleDeleteSaleStep(ctx, text);
  if (session.step && session.step.startsWith('delete_expense_')) return handleDeleteExpenseStep(ctx, text);
  if (session.step && session.step.startsWith('edit_sale_'))      return handleEditSaleStep(ctx, text);
  if (session.step && session.step.startsWith('edit_expense_'))   return handleEditExpenseStep(ctx, text);

  // ── تنظیمات و خروجی ────────────────────────────────────────────────────────
  if (session.step === 'settings_menu') return handleSettingsMenu(ctx, text);
  if (session.step === 'export_menu')   return handleExportMenuChoice(ctx, text);

  // fallback
  clearSession(userId);
  return ctx.reply(MSG.mainMenu, KB.mainMenu);
}

// ═══════════════════════════════════════════════════════════════════════════════
// /id — آیدی تلگرام (برای همه کاربران)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleId(ctx) {
  const id = ctx.from?.id;
  return ctx.reply(MSG.yourId(id), { parse_mode: 'Markdown' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// /health — وضعیت سیستم (فقط OWNER)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleHealth(ctx) {
  const dbOk = await checkConnection();
  const now = new Date();
  // زمان UTC
  const serverTime = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const data = {
    botStatus:   '✅ فعال',
    dbStatus:    dbOk ? '✅ برقرار' : '❌ خطا',
    serverTime,
    environment: process.env.NODE_ENV || 'development',
  };
  return ctx.reply(MSG.healthStatus(data), { parse_mode: 'Markdown' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// تنظیمات
// ═══════════════════════════════════════════════════════════════════════════════

async function startSettings(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'settings_menu';
  session.data = {};
  return ctx.reply(MSG.settings, { parse_mode: 'Markdown', ...KB.settingsKeyboard() });
}

async function handleSettingsMenu(ctx, text) {
  if (text === '📤 خروجی اطلاعات') {
    const session = getSession(ctx.from.id);
    session.step = 'export_menu';
    return ctx.reply(MSG.exportMenu, { parse_mode: 'Markdown', ...KB.exportMenuKeyboard() });
  }
  return ctx.reply(MSG.settings, { parse_mode: 'Markdown', ...KB.settingsKeyboard() });
}

// ═══════════════════════════════════════════════════════════════════════════════
// خروجی CSV
// ═══════════════════════════════════════════════════════════════════════════════

async function handleExportMenuChoice(ctx, text) {
  if (text === '📊 خروجی فروش‌ها') return handleSalesCsvExport(ctx);
  if (text === '💰 خروجی مخارج')   return handleExpensesCsvExport(ctx);
  // ورودی نامعتبر: منو را دوباره نشان بده
  return ctx.reply(MSG.exportMenu, { parse_mode: 'Markdown', ...KB.exportMenuKeyboard() });
}

async function handleSalesCsvExport(ctx) {
  await ctx.reply(MSG.exportGenerating);
  const rows = await getAllSalesForExport();
  if (rows.length === 0) {
    return ctx.reply(MSG.exportEmptySales);
  }
  const csv = '﻿' + buildSalesCsv(rows); // BOM برای نمایش صحیح در Excel
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
  await ctx.reply(MSG.exportGenerating);
  const rows = await getAllExpensesForExport();
  if (rows.length === 0) {
    return ctx.reply(MSG.exportEmptyExpenses);
  }
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

// ─── دستور /export (ورودی مستقیم) ────────────────────────────────────────────
async function handleExportCommand(ctx) {
  const session = getSession(ctx.from.id);
  session.step = 'export_menu';
  session.data = {};
  return ctx.reply(MSG.exportMenu, { parse_mode: 'Markdown', ...KB.exportMenuKeyboard() });
}

module.exports = { handleStart, handleText, handleId, handleHealth, handleExportCommand };
