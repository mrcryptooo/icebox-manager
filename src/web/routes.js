'use strict';
// ─── Dashboard Routes — Phase 9A + 9B ────────────────────────────────────────
const { requireAuth, requireSuperAdmin } = require('./auth');
const { getFullAccountingReport } = require('../core/accountingService');
const { getAllSupplierBalances }   = require('../core/supplierService');
const { getInventorySummary }      = require('../core/inventoryService');
const { getAllStaffAccountSummaries } = require('../core/payrollService');
const { getAllBusinesses, getDefaultBusiness, getBusinessById } = require('../core/businessService');

// Phase 9B — admin service
const {
  getSystemOverview,
  listBusinessesWithFinancialSummary,
  getBusinessAdminDetail,
  getBusinessRecentSales,
  getBusinessRecentExpenses,
  getBusinessRecentPurchases,
  getBusinessRecentSupplierPayments,
  getBusinessInventorySummary,
  getBusinessPayrollSummary,
} = require('../core/adminService');

const { dashboardPage }           = require('./views/dashboard');
const { accountingPage }          = require('./views/accounting');
const { suppliersPage }           = require('./views/suppliers');
const { inventoryPage }           = require('./views/inventory');
const { payrollPage }             = require('./views/payroll');
const { businessesPage }          = require('./views/businesses');
const { adminDashboardPage }      = require('./views/adminDashboard');
const { adminBusinessDetailPage } = require('./views/adminBusinessDetail');

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function isoMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fmtDateRange(start, end) {
  // Format as simple date strings for display
  return `${start} تا ${end}`;
}

// Get the businessId for a given telegramId (OWNER_ID maps to default business).
// In multi-business setups, load all businesses for super_admin.
async function getBusinessForUser(telegramId) {
  const biz = await getDefaultBusiness();
  return biz;
}

// ── Route registrar ───────────────────────────────────────────────────────────
function registerRoutes(app) {

  // ─── Home / Dashboard ──────────────────────────────────────────────────────
  app.get('/', requireAuth, async (req, res) => {
    try {
      const biz = await getBusinessForUser(res.locals.telegramId);
      if (!biz) return res.status(404).send('کسب‌وکاری یافت نشد.');
      const startDate = isoMonthStart();
      const endDate   = isoToday();
      const report    = await getFullAccountingReport(biz.id, startDate, endDate);
      res.send(dashboardPage({
        isSuperAdmin: res.locals.isSuperAdmin,
        bizName:   biz.name,
        report,
        dateLabel: fmtDateRange(startDate, endDate),
      }));
    } catch (err) {
      console.error('[Dashboard] Home error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });

  // ─── Accounting ────────────────────────────────────────────────────────────
  app.get('/accounting', requireAuth, async (req, res) => {
    try {
      const biz = await getBusinessForUser(res.locals.telegramId);
      if (!biz) return res.status(404).send('کسب‌وکاری یافت نشد.');
      const startDate = req.query.start || isoMonthStart();
      const endDate   = req.query.end   || isoToday();
      const report    = await getFullAccountingReport(biz.id, startDate, endDate);
      res.send(accountingPage({
        isSuperAdmin: res.locals.isSuperAdmin,
        bizName:   biz.name,
        report,
        startDate,
        endDate,
        dateLabel: fmtDateRange(startDate, endDate),
      }));
    } catch (err) {
      console.error('[Dashboard] Accounting error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  app.get('/suppliers', requireAuth, async (req, res) => {
    try {
      const biz = await getBusinessForUser(res.locals.telegramId);
      if (!biz) return res.status(404).send('کسب‌وکاری یافت نشد.');
      const suppliers = await getAllSupplierBalances(biz.id);
      res.send(suppliersPage({
        isSuperAdmin: res.locals.isSuperAdmin,
        bizName:   biz.name,
        suppliers,
      }));
    } catch (err) {
      console.error('[Dashboard] Suppliers error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });

  // ─── Inventory ─────────────────────────────────────────────────────────────
  app.get('/inventory', requireAuth, async (req, res) => {
    try {
      const biz = await getBusinessForUser(res.locals.telegramId);
      if (!biz) return res.status(404).send('کسب‌وکاری یافت نشد.');
      const items = await getInventorySummary(biz.id);
      res.send(inventoryPage({
        isSuperAdmin: res.locals.isSuperAdmin,
        bizName:   biz.name,
        items,
      }));
    } catch (err) {
      console.error('[Dashboard] Inventory error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });

  // ─── Payroll ───────────────────────────────────────────────────────────────
  app.get('/payroll', requireAuth, async (req, res) => {
    try {
      const biz = await getBusinessForUser(res.locals.telegramId);
      if (!biz) return res.status(404).send('کسب‌وکاری یافت نشد.');
      const staff = await getAllStaffAccountSummaries(biz.id);
      res.send(payrollPage({
        isSuperAdmin: res.locals.isSuperAdmin,
        bizName:   biz.name,
        staff,
      }));
    } catch (err) {
      console.error('[Dashboard] Payroll error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });

  // ─── Businesses (super_admin only) — لیست ساده فازه 9A ──────────────────────
  app.get('/businesses', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const businesses = await getAllBusinesses();
      res.send(businessesPage({ isSuperAdmin: true, businesses }));
    } catch (err) {
      console.error('[Dashboard] Businesses error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });

  // ─── Admin: داشبورد کل سیستم (Phase 9B) ────────────────────────────────────
  app.get('/admin', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const [overview, { businesses: bizList, monthStart, today }] =
        await Promise.all([
          getSystemOverview(),
          listBusinessesWithFinancialSummary(),
        ]);
      res.send(adminDashboardPage({ overview, bizList, monthStart, today }));
    } catch (err) {
      console.error('[Admin] Dashboard error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });

  // ─── Admin: جزئیات یک کسب‌وکار (Phase 9B) ──────────────────────────────────
  app.get('/admin/business/:id', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const bizId = parseInt(req.params.id, 10);
      if (!bizId || isNaN(bizId)) return res.status(400).send('شناسه نامعتبر است.');

      const detail = await getBusinessAdminDetail(bizId);
      if (!detail) return res.status(404).send('کسب‌وکاری با این شناسه یافت نشد.');

      const monthStart = new Date().toISOString().slice(0, 7) + '-01';
      const today      = new Date().toISOString().slice(0, 10);

      const [
        report, recentSales, recentExpenses, suppliers,
        inventory, payroll, recentPurchases, recentSupplierPayments,
      ] = await Promise.all([
        getFullAccountingReport(bizId, monthStart, today),
        getBusinessRecentSales(bizId, 20),
        getBusinessRecentExpenses(bizId, 20),
        getAllSupplierBalances(bizId),
        getBusinessInventorySummary(bizId),
        getBusinessPayrollSummary(bizId),
        getBusinessRecentPurchases(bizId, 20),
        getBusinessRecentSupplierPayments(bizId, 20),
      ]);

      res.send(adminBusinessDetailPage({
        detail, report, recentSales, recentExpenses,
        suppliers, inventory, payroll,
        recentPurchases, recentSupplierPayments,
        monthStart, today,
      }));
    } catch (err) {
      console.error('[Admin] Business detail error:', err);
      res.status(500).send('خطای داخلی سرور.');
    }
  });
}

module.exports = { registerRoutes };
