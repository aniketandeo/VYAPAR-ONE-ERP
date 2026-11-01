import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../../services/storage';
import { Project } from '../../types';
import { formatCurrency, formatDate, formatNumber, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Printer,
  Download,
  X,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  Layers,
  Wallet,
  CheckCircle2,
  Filter,
  BarChart3,
  ShieldCheck,
  Percent,
} from 'lucide-react';

interface ActiveProjectsFinancialPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseState;
}

export const ActiveProjectsFinancialPdfModal: React.FC<ActiveProjectsFinancialPdfModalProps> = ({
  isOpen,
  onClose,
  db,
}) => {
  const { currentUser } = useAuth();

  // Active Projects list
  const activeProjects = useMemo(() => {
    return db.projects.filter((p) => p.status === 'Active' || (p as any).active === true);
  }, [db.projects]);

  // Selected Reporting Month & Year (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Filtered Project IDs (by default all active projects are selected)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() =>
    activeProjects.map((p) => p.id)
  );

  // Month string prefix, e.g. "2026-11"
  const monthPeriodPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', {
    month: 'long',
  });

  // Calculate detailed financial metrics for a single project
  const calculateProjectFinancials = (p: Project) => {
    // 1. Units Inventory
    const props = db.properties.filter((item) => item.projectId === p.id);
    const totalUnits = props.length > 0 ? props.length : p.totalUnits || 0;
    const bookedUnits = props.filter((item) => item.status === 'Booked').length;
    const availableUnits = props.filter((item) => item.status === 'Available').length;
    const reservedUnits = props.filter((item) => item.status === 'Reserved').length;
    const bookingPercentage = totalUnits > 0 ? Math.round((bookedUnits / totalUnits) * 100) : 0;

    // 2. Bookings & Sales Value
    const bookings = db.bookings.filter(
      (b) => b.projectId === p.id && b.status !== 'Cancelled'
    );
    const totalBookedRevenue = bookings.reduce(
      (sum, b) => sum + (b.finalTotalAmount || 0),
      0
    );

    // 3. Collections (Customer Receipts)
    const receipts = db.customerReceipts.filter((r) => r.projectId === p.id);
    const receiptCollections = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const bookingReceived = bookings.reduce(
      (sum, b) => sum + (b.amountReceived || 0),
      0
    );
    const totalCollections = Math.max(receiptCollections, bookingReceived);
    const pendingReceivables = Math.max(0, totalBookedRevenue - totalCollections);
    const collectionEfficiency =
      totalBookedRevenue > 0
        ? Math.round((totalCollections / totalBookedRevenue) * 100)
        : 0;

    // 4. Expenditures
    // 4a. Material Purchases
    const materialBills = db.materialPurchases.filter((m) => m.projectId === p.id);
    const totalMaterialCost = materialBills.reduce(
      (sum, m) => sum + (m.billTotal || 0),
      0
    );
    const totalMaterialPaid = materialBills.reduce(
      (sum, m) => sum + (m.amountPaid || 0),
      0
    );
    const totalMaterialDue = materialBills.reduce(
      (sum, m) => sum + (m.outstandingAmount || 0),
      0
    );

    // 4b. Labour Wages
    const labourLogs = db.labourAttendance.filter((a) => a.projectId === p.id);
    const totalLabourWages = labourLogs.reduce(
      (sum, a) => sum + (a.wageCalculated || 0),
      0
    );

    // 4c. Adviser Commissions
    const adviserComms = db.adviserCommissions.filter((c) => c.projectId === p.id);
    const totalCommissions = adviserComms.reduce(
      (sum, c) => sum + (c.eligibleCommission || 0),
      0
    );

    // 4d. Direct Site Expenses
    const directExpenses = db.expenses.filter((e) => e.projectId === p.id);
    const totalDirectExpenses = directExpenses.reduce(
      (sum, e) => sum + (e.totalAmount || 0),
      0
    );

    // 4e. Total Construction & Site Cost
    const totalSiteCost =
      totalMaterialCost + totalLabourWages + totalCommissions + totalDirectExpenses;
    const netProjectMargin = totalCollections - totalSiteCost;
    const projectedFinalMargin = totalBookedRevenue - totalSiteCost;

    // 5. Monthly Specific Slice
    const monthlyBookings = bookings.filter(
      (b) => b.bookingDate && b.bookingDate.startsWith(monthPeriodPrefix)
    );
    const monthlyBookedAmount = monthlyBookings.reduce(
      (sum, b) => sum + (b.finalTotalAmount || 0),
      0
    );

    const monthlyReceipts = receipts.filter(
      (r) => r.paymentDate && r.paymentDate.startsWith(monthPeriodPrefix)
    );
    const monthlyCollections = monthlyReceipts.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );

    const monthlyMaterialBills = materialBills.filter(
      (m) => m.billDate && m.billDate.startsWith(monthPeriodPrefix)
    );
    const monthlyMaterialExpense = monthlyMaterialBills.reduce(
      (sum, m) => sum + (m.billTotal || 0),
      0
    );

    const monthlyLabourLogs = labourLogs.filter(
      (a) => a.date && a.date.startsWith(monthPeriodPrefix)
    );
    const monthlyLabourExpense = monthlyLabourLogs.reduce(
      (sum, a) => sum + (a.wageCalculated || 0),
      0
    );

    const monthlyDirectExpenses = directExpenses.filter(
      (e) => e.expenseDate && e.expenseDate.startsWith(monthPeriodPrefix)
    );
    const monthlyDirectExpenseTotal = monthlyDirectExpenses.reduce(
      (sum, e) => sum + (e.totalAmount || 0),
      0
    );

    const monthlyTotalExpenses =
      monthlyMaterialExpense + monthlyLabourExpense + monthlyDirectExpenseTotal;
    const monthlyNetCashFlow = monthlyCollections - monthlyTotalExpenses;

    return {
      project: p,
      totalUnits,
      bookedUnits,
      availableUnits,
      reservedUnits,
      bookingPercentage,
      totalBookedRevenue,
      totalCollections,
      pendingReceivables,
      collectionEfficiency,
      totalMaterialCost,
      totalMaterialPaid,
      totalMaterialDue,
      totalLabourWages,
      totalCommissions,
      totalDirectExpenses,
      totalSiteCost,
      netProjectMargin,
      projectedFinalMargin,
      monthlyBookingsCount: monthlyBookings.length,
      monthlyBookedAmount,
      monthlyCollections,
      monthlyMaterialExpense,
      monthlyLabourExpense,
      monthlyDirectExpenseTotal,
      monthlyTotalExpenses,
      monthlyNetCashFlow,
    };
  };

  // Compile calculations for selected active projects
  const projectsData = useMemo(() => {
    return activeProjects
      .filter((p) => selectedProjectIds.includes(p.id))
      .map(calculateProjectFinancials);
  }, [activeProjects, selectedProjectIds, db, monthPeriodPrefix]);

  // Portfolio Totals across all selected projects
  const portfolioTotals = useMemo(() => {
    return projectsData.reduce(
      (acc, curr) => ({
        totalProjects: acc.totalProjects + 1,
        totalUnits: acc.totalUnits + curr.totalUnits,
        bookedUnits: acc.bookedUnits + curr.bookedUnits,
        availableUnits: acc.availableUnits + curr.availableUnits,
        reservedUnits: acc.reservedUnits + curr.reservedUnits,
        totalBookedRevenue: acc.totalBookedRevenue + curr.totalBookedRevenue,
        totalCollections: acc.totalCollections + curr.totalCollections,
        pendingReceivables: acc.pendingReceivables + curr.pendingReceivables,
        totalMaterialCost: acc.totalMaterialCost + curr.totalMaterialCost,
        totalLabourWages: acc.totalLabourWages + curr.totalLabourWages,
        totalCommissions: acc.totalCommissions + curr.totalCommissions,
        totalDirectExpenses: acc.totalDirectExpenses + curr.totalDirectExpenses,
        totalSiteCost: acc.totalSiteCost + curr.totalSiteCost,
        netProjectMargin: acc.netProjectMargin + curr.netProjectMargin,
        monthlyBookingsCount: acc.monthlyBookingsCount + curr.monthlyBookingsCount,
        monthlyBookedAmount: acc.monthlyBookedAmount + curr.monthlyBookedAmount,
        monthlyCollections: acc.monthlyCollections + curr.monthlyCollections,
        monthlyTotalExpenses: acc.monthlyTotalExpenses + curr.monthlyTotalExpenses,
        monthlyNetCashFlow: acc.monthlyNetCashFlow + curr.monthlyNetCashFlow,
      }),
      {
        totalProjects: 0,
        totalUnits: 0,
        bookedUnits: 0,
        availableUnits: 0,
        reservedUnits: 0,
        totalBookedRevenue: 0,
        totalCollections: 0,
        pendingReceivables: 0,
        totalMaterialCost: 0,
        totalLabourWages: 0,
        totalCommissions: 0,
        totalDirectExpenses: 0,
        totalSiteCost: 0,
        netProjectMargin: 0,
        monthlyBookingsCount: 0,
        monthlyBookedAmount: 0,
        monthlyCollections: 0,
        monthlyTotalExpenses: 0,
        monthlyNetCashFlow: 0,
      }
    );
  }, [projectsData]);

  // Overall Portfolio Booking & Collection Rates
  const portfolioBookingRate =
    portfolioTotals.totalUnits > 0
      ? Math.round((portfolioTotals.bookedUnits / portfolioTotals.totalUnits) * 100)
      : 0;
  const portfolioCollectionEfficiency =
    portfolioTotals.totalBookedRevenue > 0
      ? Math.round(
          (portfolioTotals.totalCollections / portfolioTotals.totalBookedRevenue) * 100
        )
      : 0;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Project Code',
      'Project Name',
      'Type',
      'Total Units',
      'Booked Units',
      'Available Units',
      'Booking Rate (%)',
      'Total Booked Value (₹)',
      'Total Collections (₹)',
      'Customer Due (₹)',
      'Material Cost (₹)',
      'Labour Wages (₹)',
      'Adviser Commission (₹)',
      'Direct Expenses (₹)',
      'Total Site Cost (₹)',
      'Net Margin (₹)',
      `Month Collections (${monthName}) (₹)`,
      `Month Expenses (${monthName}) (₹)`,
      `Month Net Cash Flow (${monthName}) (₹)`,
    ];

    const rows = projectsData.map((d) => [
      d.project.code || '-',
      d.project.name,
      d.project.type,
      d.totalUnits,
      d.bookedUnits,
      d.availableUnits,
      `${d.bookingPercentage}%`,
      d.totalBookedRevenue,
      d.totalCollections,
      d.pendingReceivables,
      d.totalMaterialCost,
      d.totalLabourWages,
      d.totalCommissions,
      d.totalDirectExpenses,
      d.totalSiteCost,
      d.netProjectMargin,
      d.monthlyCollections,
      d.monthlyTotalExpenses,
      d.monthlyNetCashFlow,
    ]);

    // Summary Row
    rows.push([
      'PORTFOLIO TOTALS',
      `All ${portfolioTotals.totalProjects} Active Projects`,
      '-',
      portfolioTotals.totalUnits,
      portfolioTotals.bookedUnits,
      portfolioTotals.availableUnits,
      `${portfolioBookingRate}%`,
      portfolioTotals.totalBookedRevenue,
      portfolioTotals.totalCollections,
      portfolioTotals.pendingReceivables,
      portfolioTotals.totalMaterialCost,
      portfolioTotals.totalLabourWages,
      portfolioTotals.totalCommissions,
      portfolioTotals.totalDirectExpenses,
      portfolioTotals.totalSiteCost,
      portfolioTotals.netProjectMargin,
      portfolioTotals.monthlyCollections,
      portfolioTotals.monthlyTotalExpenses,
      portfolioTotals.monthlyNetCashFlow,
    ]);

    exportToCSV(
      `VYAPAR_ONE_Active_Projects_Financial_Summary_${monthName}_${selectedYear}`,
      headers,
      rows
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full border border-slate-300 overflow-hidden my-4 flex flex-col max-h-[95vh]">
        {/* ================= MODAL TOP CONTROLS (NO-PRINT) ================= */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Export Active Projects Monthly Financial Summary
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                  PDF & Print Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Aggregated monthly financial statement across all active real estate & construction sites
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md"
              title="Prints or Saves directly to PDF via Browser Print Dialog"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md"
              title="Export complete table data to CSV/Excel"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= FILTER TOOLBAR (NO-PRINT) ================= */}
        <div className="no-print bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-bold text-slate-700">Reporting Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-indigo-900 focus:outline-hidden"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-indigo-900 border-l border-slate-200 pl-2 focus:outline-hidden"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            {/* Active Projects Count & Toggle */}
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Active Projects Included:{' '}
                <strong className="text-slate-900 font-bold">
                  {selectedProjectIds.length} of {activeProjects.length}
                </strong>
              </span>
              {selectedProjectIds.length < activeProjects.length && (
                <button
                  onClick={() => setSelectedProjectIds(activeProjects.map((p) => p.id))}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Select All
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Tip: In the print dialog, select &quot;Save as PDF&quot; with background graphics enabled for best formatting.
          </div>
        </div>

        {/* ================= PRINTABLE REPORT DOCUMENT BODY ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60">
          <div className="printable-area max-w-5xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-xs border border-slate-200 text-slate-900 space-y-6">
            {/* 1. DOCUMENT LETTERHEAD & BRANDING */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {db.company?.companyLogoUrl ? (
                  <img
                    src={db.company.companyLogoUrl}
                    alt={db.company.companyName}
                    className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-white p-1"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-xl shadow-xs tracking-wider">
                    YO
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                    {db.company?.companyName || 'VYAPAR ONE INFRASTRUCTURE'}
                  </h1>
                  <p className="text-xs text-slate-600 max-w-xl mt-0.5 leading-relaxed">
                    {db.company?.companyAddress ||
                      db.company?.address ||
                      'Civil Construction, Infrastructure Development & Real Estate Promoters'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                    <span>
                      GSTIN: <strong className="text-slate-800">{db.company?.gstNumber || '27AABCV1234F1Z8'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      RERA: <strong className="text-slate-800">{db.company?.reraNumber || 'P51600024981'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Contact: <strong className="text-slate-800">{db.company?.mobileNumber || db.company?.contactPhone || '+91 98220 54321'}</strong>
                    </span>
                    <span>•</span>
                    <span>Email: {db.company?.email || 'accounts@vyaparone.com'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right sm:self-start bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] shrink-0">
                <span className="font-extrabold text-indigo-700 uppercase tracking-wider block">
                  MONTHLY FINANCIAL AUDIT
                </span>
                <span className="font-mono text-slate-500 text-[10px] block mt-0.5">
                  REF: VYO/FIN-CONSOL/{selectedYear}-{String(selectedMonth).padStart(2, '0')}
                </span>
                <span className="text-slate-500 text-[10px] block mt-0.5">
                  Generated: {new Date().toLocaleDateString('en-IN')} | By: {currentUser.name}
                </span>
              </div>
            </div>

            {/* 2. REPORT TITLE & BANNER */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-300">
                  CONSOLIDATED MANAGEMENT INFORMATION SYSTEM (MIS)
                </span>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                  ACTIVE PROJECTS MONTHLY FINANCIAL SUMMARY — {monthName.toUpperCase()} {selectedYear}
                </h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Aggregated statement of plot inventory, booked revenue, realized collections, procurement costs, and operating margins
                </p>
              </div>

              <div className="text-right shrink-0 bg-white/10 px-3.5 py-2 rounded-lg border border-white/15">
                <span className="text-[10px] text-indigo-200 uppercase font-semibold block">Reporting Period</span>
                <strong className="text-sm font-bold text-white tracking-wide">
                  {monthName} {selectedYear}
                </strong>
              </div>
            </div>

            {/* 3. EXECUTIVE PORTFOLIO KPI METRIC CARDS */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Executive Portfolio Overview (All {portfolioTotals.totalProjects} Active Projects)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* 1. Total Sales Value */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Portfolio Booked Value
                  </span>
                  <p className="font-mono font-extrabold text-slate-900 text-sm sm:text-base mt-1">
                    {formatCurrency(portfolioTotals.totalBookedRevenue)}
                  </p>
                  <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
                    {portfolioTotals.bookedUnits} of {portfolioTotals.totalUnits} Units Booked ({portfolioBookingRate}%)
                  </span>
                </div>

                {/* 2. Realized Collections */}
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                    Cumulative Collections
                  </span>
                  <p className="font-mono font-extrabold text-emerald-800 text-sm sm:text-base mt-1">
                    {formatCurrency(portfolioTotals.totalCollections)}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                    {portfolioCollectionEfficiency}% Realization Efficiency
                  </span>
                </div>

                {/* 3. Pending Receivables */}
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-bold uppercase block">
                    Customer Outstanding
                  </span>
                  <p className="font-mono font-extrabold text-amber-900 text-sm sm:text-base mt-1">
                    {formatCurrency(portfolioTotals.pendingReceivables)}
                  </p>
                  <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                    Pending Realization
                  </span>
                </div>

                {/* 4. Total Construction & Site Costs */}
                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-800 font-bold uppercase block">
                    Total Site Cost Incurred
                  </span>
                  <p className="font-mono font-extrabold text-rose-900 text-sm sm:text-base mt-1">
                    {formatCurrency(portfolioTotals.totalSiteCost)}
                  </p>
                  <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
                    Materials, Labour & Exp.
                  </span>
                </div>
              </div>

              {/* Monthly Specific Performance Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5 text-xs">
                <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-700 font-bold uppercase block">
                      {monthName} Realized Collections
                    </span>
                    <strong className="font-mono font-bold text-indigo-900 text-sm">
                      {formatCurrency(portfolioTotals.monthlyCollections)}
                    </strong>
                  </div>
                  <TrendingUp className="w-5 h-5 text-indigo-600 opacity-60" />
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase block">
                      {monthName} Site Expenditures
                    </span>
                    <strong className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(portfolioTotals.monthlyTotalExpenses)}
                    </strong>
                  </div>
                  <TrendingDown className="w-5 h-5 text-slate-500 opacity-60" />
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  portfolioTotals.monthlyNetCashFlow >= 0
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/60 border-rose-200 text-rose-900'
                }`}>
                  <div>
                    <span className="text-[10px] font-bold uppercase block opacity-80">
                      {monthName} Net Cash Surplus / (Deficit)
                    </span>
                    <strong className="font-mono font-extrabold text-sm">
                      {formatCurrency(portfolioTotals.monthlyNetCashFlow)}
                    </strong>
                  </div>
                  <Wallet className="w-5 h-5 opacity-60" />
                </div>
              </div>
            </div>

            {/* 4. MASTER AGGREGATED COMPARATIVE TABLE (ALL ACTIVE PROJECTS) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Consolidated Active Projects Comparative Table</span>
                </h3>
                <span className="text-[10px] text-slate-500">Amounts in Indian Rupee (₹)</span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200">Project Name & Code</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-center">Units (B/T)</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Booked Value (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Collections (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Due Balance (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Site Cost (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Net Margin (₹)</th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-right bg-indigo-50/50">
                        {monthName.slice(0, 3)} Inflow (₹)
                      </th>
                      <th className="py-2.5 px-2.5 border-r border-slate-200 text-right bg-indigo-50/50">
                        {monthName.slice(0, 3)} Outflow (₹)
                      </th>
                      <th className="py-2.5 px-2.5 text-right font-extrabold bg-indigo-50/70">
                        {monthName.slice(0, 3)} Net Flow (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {projectsData.map((d) => (
                      <tr key={d.project.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">
                          <div>
                            <span>{d.project.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {d.project.code || d.project.type} • {d.project.address.split(',')[0]}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-semibold">
                          <span className="text-indigo-700">{d.bookedUnits}</span>
                          <span className="text-slate-400">/{d.totalUnits}</span>
                          <span className="text-[9px] text-slate-400 block font-normal">
                            ({d.bookingPercentage}%)
                          </span>
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(d.totalBookedRevenue)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono font-semibold text-emerald-800">
                          {formatCurrency(d.totalCollections)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono font-semibold text-amber-800">
                          {formatCurrency(d.pendingReceivables)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono font-semibold text-rose-800">
                          {formatCurrency(d.totalSiteCost)}
                        </td>
                        <td className={`py-2 px-2.5 border-r border-slate-200 text-right font-mono font-bold ${
                          d.netProjectMargin >= 0 ? 'text-indigo-900' : 'text-rose-700'
                        }`}>
                          {formatCurrency(d.netProjectMargin)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-emerald-700 bg-indigo-50/20">
                          {formatCurrency(d.monthlyCollections)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-rose-700 bg-indigo-50/20">
                          {formatCurrency(d.monthlyTotalExpenses)}
                        </td>
                        <td className={`py-2 px-2.5 text-right font-mono font-extrabold bg-indigo-50/40 ${
                          d.monthlyNetCashFlow >= 0 ? 'text-emerald-800' : 'text-rose-700'
                        }`}>
                          {formatCurrency(d.monthlyNetCashFlow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-extrabold text-[10px] text-slate-900">
                    <tr>
                      <td className="py-2.5 px-3 border-r border-slate-300 uppercase">
                        PORTFOLIO TOTALS ({portfolioTotals.totalProjects} SITES)
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-center font-mono">
                        {portfolioTotals.bookedUnits}/{portfolioTotals.totalUnits} ({portfolioBookingRate}%)
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        {formatCurrency(portfolioTotals.totalBookedRevenue)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-emerald-800">
                        {formatCurrency(portfolioTotals.totalCollections)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-amber-900">
                        {formatCurrency(portfolioTotals.pendingReceivables)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-rose-900">
                        {formatCurrency(portfolioTotals.totalSiteCost)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-indigo-900">
                        {formatCurrency(portfolioTotals.netProjectMargin)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-emerald-800 bg-indigo-100/50">
                        {formatCurrency(portfolioTotals.monthlyCollections)}
                      </td>
                      <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-rose-800 bg-indigo-100/50">
                        {formatCurrency(portfolioTotals.monthlyTotalExpenses)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-indigo-950 bg-indigo-100/70">
                        {formatCurrency(portfolioTotals.monthlyNetCashFlow)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 5. INDIVIDUAL PROJECT DEEP-DIVE PROFILES */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Active Projects Individual Financial Breakdowns</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectsData.map((d) => (
                  <div
                    key={d.project.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    {/* Project Title */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 text-sm">{d.project.name}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 font-mono">
                            {d.project.code || 'ACTIVE'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Type: {d.project.type} • Start: {formatDate(d.project.startDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          {d.bookingPercentage}% Booked
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {d.bookedUnits} Booked / {d.availableUnits} Available
                        </p>
                      </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* Revenue Column */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[9px] font-bold uppercase text-emerald-700 tracking-wider block">
                          Revenue & Inflows
                        </span>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Booked Sales:</span>
                          <strong className="font-mono text-slate-900">
                            {formatCurrency(d.totalBookedRevenue)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Realized Collections:</span>
                          <strong className="font-mono text-emerald-700">
                            {formatCurrency(d.totalCollections)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Customer Dues:</span>
                          <strong className="font-mono text-amber-700">
                            {formatCurrency(d.pendingReceivables)}
                          </strong>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-medium">{monthName} Inflow:</span>
                          <strong className="font-mono text-indigo-700">
                            {formatCurrency(d.monthlyCollections)}
                          </strong>
                        </div>
                      </div>

                      {/* Expenditure Column */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[9px] font-bold uppercase text-rose-700 tracking-wider block">
                          Site Costs & Outflows
                        </span>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Materials:</span>
                          <strong className="font-mono text-slate-800">
                            {formatCurrency(d.totalMaterialCost)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Labour Wages:</span>
                          <strong className="font-mono text-slate-800">
                            {formatCurrency(d.totalLabourWages)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Commissions & Exp:</span>
                          <strong className="font-mono text-slate-800">
                            {formatCurrency(d.totalCommissions + d.totalDirectExpenses)}
                          </strong>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-medium">{monthName} Outflow:</span>
                          <strong className="font-mono text-rose-700">
                            {formatCurrency(d.monthlyTotalExpenses)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Project Margin Bar */}
                    <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                      <span className="text-slate-600 font-semibold">
                        Cumulative Net Operating Margin:
                      </span>
                      <strong className={`font-mono font-bold ${
                        d.netProjectMargin >= 0 ? 'text-indigo-900' : 'text-rose-700'
                      }`}>
                        {formatCurrency(d.netProjectMargin)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. FINANCIAL AUDIT COMPLIANCE & NOTES */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-1 leading-relaxed">
              <span className="font-bold text-slate-800 uppercase block tracking-wider">
                Auditor & Management Notes:
              </span>
              <p>
                1. <strong>Accounting Principle:</strong> Revenue reflects customer allotments and bookings recorded under RERA guidelines. Realized collections represent cleared cash and verified bank receipts.
              </p>
              <p>
                2. <strong>Direct Site Costs:</strong> Procurement costs incorporate verified supplier invoices. Labour costs reflect certified attendance muster units and site disbursement vouchers.
              </p>
              <p>
                3. <strong>Monthly Performance:</strong> Monthly inflow and outflow metrics apply specifically to records stamped within {monthName} {selectedYear}.
              </p>
            </div>

            {/* 7. OFFICIAL AUTHORIZED SIGNATURE BLOCKS */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  Chief Financial Officer / Accounts Head
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Booked & Realized Reconciled
                </span>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  VP Projects & Construction Head
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Site Execution & Material Certification
                </span>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  Managing Director / Authorized Signatory
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  For {db.company?.companyName || 'VYAPAR ONE INFRASTRUCTURE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
