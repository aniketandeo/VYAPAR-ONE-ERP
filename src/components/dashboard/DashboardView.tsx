import React, { useState } from 'react';
import { DatabaseState } from '../../services/storage';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { ActiveTab } from '../common/Sidebar';
import {
  Building2,
  Home,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Package,
  Truck,
  Users,
  Award,
  Wallet,
  TrendingUp,
  AlertCircle,
  Calendar,
  Filter,
  DollarSign,
  Briefcase,
  ChevronRight,
} from 'lucide-react';

interface DashboardViewProps {
  db: DatabaseState;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectReportTab?: (reportSubtab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  selectedProjectId,
  setSelectedProjectId,
  setActiveTab,
  onSelectReportTab,
}) => {
  // Date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Filter records by project and dates
  const filterByProject = <T extends { projectId?: string }>(items: T[]): T[] => {
    if (selectedProjectId === 'ALL') return items;
    return items.filter((item) => item.projectId === selectedProjectId);
  };

  const filterByDate = <T extends { date?: string; bookingDate?: string; paymentDate?: string; billDate?: string; txnDate?: string }>(
    items: T[],
    dateField: keyof T
  ): T[] => {
    return items.filter((item) => {
      const d = item[dateField] as unknown as string;
      if (!d) return true;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  };

  // 1. Projects
  const filteredProjects = selectedProjectId === 'ALL'
    ? db.projects
    : db.projects.filter((p) => p.id === selectedProjectId);
  const totalProjects = filteredProjects.length;

  // 2. Plots / Flats
  const filteredProperties = filterByProject(db.properties);
  const totalProperties = filteredProperties.length;
  const availableProperties = filteredProperties.filter((p) => p.status === 'Available').length;
  const bookedProperties = filteredProperties.filter((p) => p.status === 'Booked').length;

  // 3. Customer Bookings & Payments
  const filteredBookings = filterByDate(filterByProject(db.bookings), 'bookingDate');
  const filteredReceipts = filterByDate(filterByProject(db.customerReceipts), 'paymentDate');
  const totalCustomerPaymentsReceived = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);

  // Customer outstanding = (Final Amount of all bookings) - (all payments received against them)
  const totalBookingValue = filteredBookings.reduce((sum, b) => sum + b.finalTotalAmount, 0);
  const customerOutstandingAmount = Math.max(0, totalBookingValue - totalCustomerPaymentsReceived);

  // 4. Material Purchases & Stock
  const filteredPurchases = filterByDate(filterByProject(db.materialPurchases), 'billDate');
  const totalMaterialPurchased = filteredPurchases.reduce((sum, p) => sum + p.billTotal, 0);

  const filteredReceiptRecords = filterByProject(db.materialReceipts);
  const totalMaterialReceivedQty = filteredReceiptRecords.reduce((sum, r) => sum + r.receivedQuantity, 0);

  const filteredUsageRecords = filterByProject(db.materialUsages);
  const totalMaterialUsedQty = filteredUsageRecords.reduce((sum, u) => sum + u.quantityUsed, 0);

  // Remaining stock count (aggregated item stocks)
  const remainingMaterialStock = db.materials.reduce((sum, m) => sum + m.currentStock, 0);

  // 5. Vendor Outstanding
  const filteredVendorPayments = filterByDate(db.vendorPayments, 'paymentDate');
  const vendorOutstandingAmount = filteredPurchases.reduce((sum, b) => sum + b.outstandingAmount, 0);

  // 6. Labour Payments & Outstanding
  const filteredLabourPayments = filterByDate(filterByProject(db.labourPayments), 'date');
  const labourPayments = filteredLabourPayments.reduce((sum, lp) => sum + lp.amount, 0);

  const filteredLabourAttendance = filterByDate(filterByProject(db.labourAttendance), 'date');
  const totalWagesEarned = filteredLabourAttendance.reduce((sum, att) => sum + att.wageCalculated, 0);
  const labourOutstandingAmount = Math.max(0, totalWagesEarned - labourPayments);

  // 7. Adviser Commission
  const filteredCommissions = filterByProject(db.adviserCommissions);
  const adviserCommissionPaid = filteredCommissions.reduce((sum, c) => sum + c.paidCommission, 0);
  const adviserCommissionOutstanding = filteredCommissions.reduce((sum, c) => sum + c.outstandingCommission, 0);

  // 8. Accounts & Financials
  const filteredTxns = filterByDate(
    selectedProjectId === 'ALL'
      ? db.transactions
      : db.transactions.filter((t) => !t.projectId || t.projectId === selectedProjectId),
    'txnDate'
  );

  // Total Income (Credit entries from customers and other income, excluding contra transfers)
  const totalIncome = filteredTxns
    .filter((t) => (t.type === 'CUSTOMER_RECEIPT' || t.type === 'OTHER_INCOME') && !t.isReversed)
    .reduce((sum, t) => sum + t.credit, 0);

  // Total Expenses (Debit entries for vendor, labour, adviser, expenses, excluding contra transfers)
  const totalExpenses = filteredTxns
    .filter(
      (t) =>
        (t.type === 'VENDOR_PAYMENT' ||
          t.type === 'LABOUR_PAYMENT' ||
          t.type === 'LABOUR_ADVANCE' ||
          t.type === 'ADVISER_COMMISSION' ||
          t.type === 'EXPENSE') &&
        !t.isReversed
    )
    .reduce((sum, t) => sum + t.debit, 0);

  // Cash and Bank Balances
  const cashTxns = db.transactions.filter((t) => t.account === 'Cash Account' && !t.isReversed);
  const cashBalance = cashTxns.reduce((sum, t) => sum + (t.credit - t.debit), 0);

  const bankTxns = db.transactions.filter((t) => t.account !== 'Cash Account' && !t.isReversed);
  const bankBalance = bankTxns.reduce((sum, t) => sum + (t.credit - t.debit), 0);

  // 9. Upcoming Dues
  const today = new Date().toISOString().split('T')[0];
  const upcomingVendorDue = db.materialPurchases
    .filter((b) => b.outstandingAmount > 0 && b.paymentDueDate && b.paymentDueDate >= today)
    .reduce((sum, b) => sum + b.outstandingAmount, 0);

  const upcomingCustomerDue = db.bookings
    .filter((b) => b.remainingBalance > 0 && b.emiPlan?.enabled)
    .reduce((sum, b) => sum + (b.emiPlan?.monthlyAmount || 0), 0);

  // Card click helper
  const navigateTo = (tab: ActiveTab, subreport?: string) => {
    setActiveTab(tab);
    if (subreport && onSelectReportTab) {
      onSelectReportTab(subreport);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Executive Performance Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time verified figures computed directly from active database entries
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Projects</option>
              {db.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-[10px] text-rose-600 font-semibold hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 20 Exact Summary Cards specified in Requirement 4 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Real Estate & Inventory Indicators (Click to View Ledger)
          </h3>
          <span className="text-[11px] text-slate-400">20 Real Metrics</span>
        </div>

        {/* Group 1: Projects & Property Inventory */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Total Projects */}
          <div
            onClick={() => navigateTo('projects')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Projects</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">{totalProjects}</p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>View all projects</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </p>
          </div>

          {/* 2. Total Plots / Flats */}
          <div
            onClick={() => navigateTo('plots-flats')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Plots / Flats</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">{totalProperties}</p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Plots & Apartments</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </p>
          </div>

          {/* 3. Available Properties */}
          <div
            onClick={() => navigateTo('plots-flats')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Available Properties</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-2 font-mono">{availableProperties}</p>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center justify-between">
              <span>Ready for booking</span>
              <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:text-emerald-700" />
            </p>
          </div>

          {/* 4. Booked Properties */}
          <div
            onClick={() => navigateTo('plots-flats')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">Booked Properties</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-amber-700 mt-2 font-mono">{bookedProperties}</p>
            <p className="text-[10px] text-amber-600 mt-1 flex items-center justify-between">
              <span>Confirmed bookings</span>
              <ChevronRight className="w-3 h-3 text-amber-400 group-hover:text-amber-700" />
            </p>
          </div>
        </div>

        {/* Group 2: Customer Collections & Outstanding */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 5. Total Customer Payments Received */}
          <div
            onClick={() => navigateTo('reports', 'customer')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 truncate">Customer Payments</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-700 mt-2 font-mono">
              {formatCurrency(totalCustomerPaymentsReceived)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Total money realized</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600" />
            </p>
          </div>

          {/* 6. Customer Outstanding Amount */}
          <div
            onClick={() => navigateTo('reports', 'customer')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 truncate">Customer Outstanding</span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-700 mt-2 font-mono">
              {formatCurrency(customerOutstandingAmount)}
            </p>
            <p className="text-[10px] text-rose-500 mt-1 flex items-center justify-between">
              <span>Pending buyer dues</span>
              <ChevronRight className="w-3 h-3 text-rose-400 group-hover:text-rose-700" />
            </p>
          </div>

          {/* 7. Total Material Purchased */}
          <div
            onClick={() => navigateTo('materials')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 truncate">Material Purchased</span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
              {formatCurrency(totalMaterialPurchased)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{filteredPurchases.length} Purchase bills</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </p>
          </div>

          {/* 8. Total Material Used */}
          <div
            onClick={() => navigateTo('materials')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 truncate">Material Used</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
              {formatNumber(totalMaterialUsedQty, 0)} Units
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Site consumption logs</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </p>
          </div>
        </div>

        {/* Group 3: Material Stock & Vendor Dues */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 9. Remaining Material Stock */}
          <div
            onClick={() => navigateTo('materials')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 truncate">Remaining Stock</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-800 mt-2 font-mono">
              {formatNumber(remainingMaterialStock, 0)}
            </p>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center justify-between">
              <span>Opening + Recv - Used</span>
              <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:text-emerald-700" />
            </p>
          </div>

          {/* 10. Vendor Outstanding Amount */}
          <div
            onClick={() => navigateTo('reports', 'vendor')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 truncate">Vendor Outstanding</span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-700 mt-2 font-mono">
              {formatCurrency(vendorOutstandingAmount)}
            </p>
            <p className="text-[10px] text-rose-500 mt-1 flex items-center justify-between">
              <span>Supplier balances payable</span>
              <ChevronRight className="w-3 h-3 text-rose-400 group-hover:text-rose-700" />
            </p>
          </div>

          {/* 11. Labour Payments */}
          <div
            onClick={() => navigateTo('labour')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 truncate">Labour Payments</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
              {formatCurrency(labourPayments)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Advances & Wages paid</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </p>
          </div>

          {/* 12. Labour Outstanding Amount */}
          <div
            onClick={() => navigateTo('labour')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 truncate">Labour Outstanding</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-700 mt-2 font-mono">
              {formatCurrency(labourOutstandingAmount)}
            </p>
            <p className="text-[10px] text-amber-600 mt-1 flex items-center justify-between">
              <span>Unpaid approved wages</span>
              <ChevronRight className="w-3 h-3 text-amber-400 group-hover:text-amber-700" />
            </p>
          </div>
        </div>

        {/* Group 4: Adviser Commissions & P&L */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 13. Adviser Commission Paid */}
          <div
            onClick={() => navigateTo('advisers')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 truncate">Commission Paid</span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
              {formatCurrency(adviserCommissionPaid)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Disbursed to advisers</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </p>
          </div>

          {/* 14. Adviser Commission Outstanding */}
          <div
            onClick={() => navigateTo('advisers')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-800 truncate">Commission Due</span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-purple-800 mt-2 font-mono">
              {formatCurrency(adviserCommissionOutstanding)}
            </p>
            <p className="text-[10px] text-purple-600 mt-1 flex items-center justify-between">
              <span>Eligible balance to pay</span>
              <ChevronRight className="w-3 h-3 text-purple-400 group-hover:text-purple-700" />
            </p>
          </div>

          {/* 15. Total Income */}
          <div
            onClick={() => navigateTo('accounts')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 truncate">Total Income</span>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-800 mt-2 font-mono">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center justify-between">
              <span>Customer receipts & capital</span>
              <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:text-emerald-700" />
            </p>
          </div>

          {/* 16. Total Expenses */}
          <div
            onClick={() => navigateTo('accounts')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 truncate">Total Expenses</span>
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-800 mt-2 font-mono">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-[10px] text-rose-600 mt-1 flex items-center justify-between">
              <span>All module disbursements</span>
              <ChevronRight className="w-3 h-3 text-rose-400 group-hover:text-rose-700" />
            </p>
          </div>
        </div>

        {/* Group 5: Liquidity Balances & Upcoming Dues */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 17. Cash Balance */}
          <div
            onClick={() => navigateTo('accounts')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 truncate">Cash Balance</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
              {formatCurrency(cashBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Cash in hand</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600" />
            </p>
          </div>

          {/* 18. Bank Balance */}
          <div
            onClick={() => navigateTo('accounts')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 truncate">Bank Balance</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-indigo-900 mt-2 font-mono">
              {formatCurrency(bankBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Current accounts total</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
            </p>
          </div>

          {/* 19. Upcoming Customer Payment Due */}
          <div
            onClick={() => navigateTo('reports', 'customer')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 truncate">Upcoming Buyer Due</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-blue-700 mt-2 font-mono">
              {formatCurrency(upcomingCustomerDue)}
            </p>
            <p className="text-[10px] text-blue-500 mt-1 flex items-center justify-between">
              <span>Scheduled installment plan</span>
              <ChevronRight className="w-3 h-3 text-blue-400 group-hover:text-blue-700" />
            </p>
          </div>

          {/* 20. Upcoming Vendor Payment Due */}
          <div
            onClick={() => navigateTo('reports', 'vendor')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 truncate">Upcoming Vendor Due</span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-700 mt-2 font-mono">
              {formatCurrency(upcomingVendorDue)}
            </p>
            <p className="text-[10px] text-rose-500 mt-1 flex items-center justify-between">
              <span>Due within credit period</span>
              <ChevronRight className="w-3 h-3 text-rose-400 group-hover:text-rose-700" />
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts & Project Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Performance Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Project-wise Real Estate Status</h4>
              <p className="text-xs text-slate-500">Live units, bookings and realization per site</p>
            </div>
            <button
              onClick={() => navigateTo('projects')}
              className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {db.projects.map((proj) => {
              const projectProps = db.properties.filter((p) => p.projectId === proj.id);
              const booked = projectProps.filter((p) => p.status === 'Booked').length;
              const total = projectProps.length || proj.totalUnits || 1;
              const pct = Math.min(100, Math.round((booked / total) * 100));
              const projectReceipts = db.customerReceipts
                .filter((r) => r.projectId === proj.id)
                .reduce((s, r) => s + r.amount, 0);

              return (
                <div key={proj.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-slate-800 text-xs">{proj.name}</span>
                      <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {proj.code}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-500 font-medium">({proj.type})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {booked} / {total} Units Booked ({pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Collections: <strong className="text-emerald-700 font-mono">{formatCurrency(projectReceipts)}</strong></span>
                    <span className="capitalize text-slate-600">Status: <strong className={proj.status === 'Active' ? 'text-emerald-600' : 'text-slate-600'}>{proj.status}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Audit & Action Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Recent Audit Activities</h4>
              <span className="text-[10px] font-mono text-slate-400">Live Feed</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {db.auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-indigo-400 pl-3 py-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{log.user}</span>
                    <span>{log.timestamp.substring(11, 16)}</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-[11px] mt-0.5">{log.action}</p>
                  <p className="text-[11px] text-slate-500 leading-tight line-clamp-2 mt-0.5">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
            <button
              onClick={() => navigateTo('customers')}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-center transition-colors shadow-xs"
            >
              + Create New Customer Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
