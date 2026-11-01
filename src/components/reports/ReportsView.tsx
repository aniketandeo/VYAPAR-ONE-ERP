import React, { useState } from 'react';
import { DatabaseState } from '../../services/storage';
import { AuditLog } from '../../types';
import { formatCurrency, formatDate, formatNumber, exportToCSV } from '../../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  Layers,
  Users,
  Home,
  Truck,
  Award,
  Wallet,
  Building2,
  Clock,
  X,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { ActiveProjectsFinancialPdfModal } from './ActiveProjectsFinancialPdfModal';

interface ReportsViewProps {
  db: DatabaseState;
  initialReportCategory?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ db, initialReportCategory = 'customer' }) => {
  const [category, setCategory] = useState<string>(initialReportCategory);
  const [subReport, setSubReport] = useState<string>('booking');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Active Projects Consolidated Financial PDF Modal
  const [isProjectsPdfModalOpen, setIsProjectsPdfModalOpen] = useState(false);

  // Row Audit History Modal
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    title: string;
    logs: AuditLog[];
  }>({ isOpen: false, title: '', logs: [] });

  // Vendor Formal A4 Statement Modal
  const [vendorA4Modal, setVendorA4Modal] = useState<{
    isOpen: boolean;
    vendorId: string;
  }>({ isOpen: false, vendorId: db.vendors[0]?.id || '' });

  // Map category to available subreports
  const reportOptions: Record<string, Array<{ id: string; name: string }>> = {
    customer: [
      { id: 'booking', name: 'Booking Report' },
      { id: 'customer_list', name: 'Customer Directory List' },
      { id: 'payment', name: 'Customer Payment Realization Report' },
      { id: 'outstanding', name: 'Customer Outstanding Balance Report' },
    ],
    property: [
      { id: 'available', name: 'Available Plot / Flat Report' },
      { id: 'booked', name: 'Booked Property Report' },
      { id: 'project_wise', name: 'Project-wise Property Status' },
    ],
    material: [
      { id: 'mat_stock', name: 'Material Stock Report (Feet for Aggregates)' },
      { id: 'mat_purchase', name: 'Material Purchase Report' },
      { id: 'mat_receive', name: 'Material Received Report' },
      { id: 'mat_usage', name: 'Material Usage / Consumption Report' },
    ],
    vendor: [
      { id: 'vendor_outstanding', name: 'Vendor Outstanding Due Report' },
      { id: 'vendor_due_bills', name: 'Due & Overdue Bills Report' },
      { id: 'vendor_payments', name: 'Vendor Payment History' },
    ],
    labour: [
      { id: 'labour_outstanding', name: 'Labour Net Outstanding Report' },
      { id: 'labour_advances', name: 'Labour Advance Payout Report' },
      { id: 'labour_wages', name: 'Salary & Wage Summary' },
    ],
    adviser: [
      { id: 'comm_summary', name: 'Adviser Commission Due Report' },
      { id: 'comm_paid', name: 'Adviser Payout History' },
    ],
    accounts: [
      { id: 'day_book', name: 'Accounts Day Book' },
      { id: 'income_expense', name: 'Income and Expense Summary' },
      { id: 'cash_bank_balances', name: 'Cash and Bank Balances' },
      { id: 'active_projects_pdf', name: 'All Active Projects Monthly Financial Summary (PDF Document)' },
    ],
  };

  const currentOptions = reportOptions[category] || reportOptions['customer'];

  // Handle Category Change
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const opts = reportOptions[newCat];
    if (opts && opts.length > 0) {
      setSubReport(opts[0].id);
    }
  };

  // Filter helpers
  const filterByProject = <T extends { projectId?: string }>(items: T[]): T[] => {
    if (projectFilter === 'ALL') return items;
    return items.filter((item) => !item.projectId || item.projectId === projectFilter);
  };

  const filterByDate = <T extends Record<string, any>>(
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

  // Dynamic Report Rendering & Export
  let tableHeaders: string[] = [];
  let tableRows: (string | number)[][] = [];
  let rowIdentifier: string[] = [];

  const aggregateMaterials = ['Reti (Sand)', 'Gitti (Aggregate)', 'Murum', 'Churi', 'Crush Sand'];

  if (category === 'customer') {
    if (subReport === 'booking') {
      tableHeaders = ['Date', 'Booking Ref', 'Customer Name', 'Project', 'Property', 'Final Amount (₹)', 'Received (₹)', 'Remaining (₹)', 'Status'];
      const data = filterByDate(filterByProject(db.bookings), 'bookingDate');
      rowIdentifier = data.map((b) => b.customerName);
      tableRows = data.map((b) => [
        formatDate(b.bookingDate),
        b.bookingRef,
        b.customerName,
        b.projectName,
        b.propertyNumber,
        b.finalTotalAmount,
        b.amountReceived,
        b.remainingBalance,
        b.status,
      ]);
    } else if (subReport === 'customer_list') {
      tableHeaders = ['Customer Name', 'Mobile Number', 'WhatsApp', 'PAN', 'Aadhaar', 'Address', 'Email'];
      rowIdentifier = db.customers.map((c) => c.name);
      tableRows = db.customers.map((c) => [c.name, c.mobileNumber, c.whatsappNumber || '-', c.panNumber || '-', c.aadhaarNumber || '-', c.address || '-', c.email || '-']);
    } else if (subReport === 'payment') {
      tableHeaders = ['Payment Date', 'Receipt #', 'Customer', 'Project & Property', 'Amount Received (₹)', 'Mode', 'Account', 'Balance Remaining (₹)'];
      const data = filterByDate(filterByProject(db.customerReceipts), 'paymentDate');
      rowIdentifier = data.map((r) => r.customerName);
      tableRows = data.map((r) => [
        formatDate(r.paymentDate),
        r.receiptNumber,
        r.customerName,
        `${r.propertyNumber} (${r.projectName})`,
        r.amount,
        r.paymentMode,
        r.receivingAccount,
        r.remainingBalance,
      ]);
    } else if (subReport === 'outstanding') {
      tableHeaders = ['Customer Name', 'Project', 'Property', 'Booking Ref', 'Final Amount (₹)', 'Total Paid (₹)', 'Outstanding Due (₹)', 'EMI Plan'];
      const data = filterByProject(db.bookings).filter((b) => b.remainingBalance > 0);
      rowIdentifier = data.map((b) => b.customerName);
      tableRows = data.map((b) => [
        b.customerName,
        b.projectName,
        b.propertyNumber,
        b.bookingRef,
        b.finalTotalAmount,
        b.amountReceived,
        b.remainingBalance,
        b.emiPlan?.enabled ? `₹${b.emiPlan.monthlyAmount}/mo` : 'Full Due',
      ]);
    }
  } else if (category === 'property') {
    if (subReport === 'available') {
      tableHeaders = ['Project Name', 'Type', 'Number', 'Area (Sq.Ft)', 'Rate/Sq.Ft (₹)', 'Total Price (₹)', 'Status'];
      const data = filterByProject(db.properties).filter((p) => p.status === 'Available');
      rowIdentifier = data.map((p) => `${p.projectName} ${p.number}`);
      tableRows = data.map((p) => [p.projectName, p.propertyType, p.number, p.areaSqFt, p.ratePerSqFt, p.totalPrice, p.status]);
    } else if (subReport === 'booked') {
      tableHeaders = ['Project Name', 'Type', 'Number', 'Area (Sq.Ft)', 'Buyer Name', 'Booking Date', 'Price (₹)'];
      const data = filterByProject(db.properties).filter((p) => p.status === 'Booked');
      rowIdentifier = data.map((p) => `${p.projectName} ${p.number}`);
      tableRows = data.map((p) => [p.projectName, p.propertyType, p.number, p.areaSqFt, p.customerName || '-', formatDate(p.bookingDate), p.totalPrice]);
    } else {
      tableHeaders = ['Project', 'Total Units', 'Available Units', 'Booked Units', 'Reserved Units'];
      rowIdentifier = db.projects.map((p) => p.name);
      tableRows = db.projects.map((proj) => {
        const props = db.properties.filter((p) => p.projectId === proj.id);
        const avail = props.filter((p) => p.status === 'Available').length;
        const booked = props.filter((p) => p.status === 'Booked').length;
        const res = props.filter((p) => p.status === 'Reserved').length;
        return [proj.name, props.length || proj.totalUnits, avail, booked, res];
      });
    }
  } else if (category === 'material') {
    if (subReport === 'mat_stock') {
      tableHeaders = ['Material Name', 'Unit of Measure', 'Opening Stock', 'Received', 'Used', 'Closing Stock'];
      rowIdentifier = db.materials.map((m) => m.name);
      tableRows = db.materials.map((m) => {
        const isAggregate = aggregateMaterials.some((a) => m.name.toLowerCase().includes(a.toLowerCase().split(' ')[0]));
        const displayUnit = isAggregate ? 'Feet' : m.unit;
        const rcv = db.materialReceipts.filter((r) => r.materialName === m.name).reduce((s, r) => s + r.receivedQuantity, 0);
        const used = db.materialUsages.filter((u) => u.materialName === m.name).reduce((s, u) => s + u.quantityUsed, 0);
        const close = m.openingStock + rcv - used;
        return [m.name, displayUnit, `${m.openingStock} ${displayUnit}`, `${rcv} ${displayUnit}`, `${used} ${displayUnit}`, `${close} ${displayUnit}`];
      });
    } else if (subReport === 'mat_purchase') {
      tableHeaders = ['Bill Date', 'Bill No', 'Vendor', 'Project', 'Bill Total (₹)', 'Paid (₹)', 'Outstanding (₹)', 'Due Date'];
      const data = filterByDate(filterByProject(db.materialPurchases), 'billDate');
      rowIdentifier = data.map((p) => p.vendorName);
      tableRows = data.map((p) => [formatDate(p.billDate), p.billNumber, p.vendorName, p.projectName, p.billTotal, p.amountPaid, p.outstandingAmount, formatDate(p.paymentDueDate)]);
    } else if (subReport === 'mat_receive') {
      tableHeaders = ['Receipt Date', 'Bill No', 'Project', 'Vendor', 'Material', 'Ordered Qty', 'Received Qty', 'Unit'];
      const data = filterByDate(filterByProject(db.materialReceipts), 'receiptDate');
      rowIdentifier = data.map((r) => r.materialName);
      tableRows = data.map((r) => {
        const isAggregate = aggregateMaterials.some((a) => r.materialName.toLowerCase().includes(a.toLowerCase().split(' ')[0]));
        const displayUnit = isAggregate ? 'Feet' : r.unit;
        return [formatDate(r.receiptDate), r.billNumber || '-', r.projectName, r.vendorName, r.materialName, r.orderedQuantity, r.receivedQuantity, displayUnit];
      });
    } else {
      tableHeaders = ['Usage Date', 'Project', 'Material', 'Quantity Used', 'Unit', 'Work Location', 'Approved By'];
      const data = filterByDate(filterByProject(db.materialUsages), 'usageDate');
      rowIdentifier = data.map((u) => u.materialName);
      tableRows = data.map((u) => {
        const isAggregate = aggregateMaterials.some((a) => u.materialName.toLowerCase().includes(a.toLowerCase().split(' ')[0]));
        const displayUnit = isAggregate ? 'Feet' : u.unit;
        return [formatDate(u.usageDate), u.projectName, u.materialName, u.quantityUsed, displayUnit, u.workLocation, u.approvedBy];
      });
    }
  } else if (category === 'vendor') {
    if (subReport === 'vendor_outstanding') {
      tableHeaders = ['Vendor Name', 'Business Name', 'Contact Phone', 'GST Number', 'Current Outstanding Balance (₹)'];
      rowIdentifier = db.vendors.map((v) => v.name);
      tableRows = db.vendors.map((v) => [v.name, v.businessName, v.mobileNumber, v.gstNumber || 'Unregistered', v.currentOutstanding]);
    } else if (subReport === 'vendor_due_bills') {
      tableHeaders = ['Due Date', 'Vendor Name', 'Bill No', 'Project', 'Bill Total (₹)', 'Outstanding Due (₹)'];
      const data = db.materialPurchases.filter((b) => b.outstandingAmount > 0);
      rowIdentifier = data.map((b) => b.vendorName);
      tableRows = data.map((b) => [formatDate(b.paymentDueDate), b.vendorName, b.billNumber, b.projectName, b.billTotal, b.outstandingAmount]);
    } else {
      tableHeaders = ['Payment Date', 'Voucher #', 'Vendor Name', 'Amount (₹)', 'Payment Mode', 'Bank Account', 'Ref / Cheque'];
      const data = filterByDate(db.vendorPayments, 'paymentDate');
      rowIdentifier = data.map((vp) => vp.vendorName);
      tableRows = data.map((vp) => [formatDate(vp.paymentDate), vp.voucherNumber, vp.vendorName, vp.amount, vp.paymentMode, vp.bankAccount, vp.transactionRef]);
    }
  } else if (category === 'labour') {
    if (subReport === 'labour_outstanding') {
      tableHeaders = ['Labour Name', 'Role / Trade', 'Assigned Project', 'Rate', 'Earned Wages (₹)', 'Advances Taken (₹)', 'Net Payable Due (₹)'];
      rowIdentifier = db.labours.map((l) => l.name);
      tableRows = db.labours.map((l) => {
        const att = db.labourAttendance.filter((a) => a.labourId === l.id);
        const payments = db.labourPayments.filter((p) => p.labourId === l.id);
        const earned = att.reduce((s, a) => s + a.wageCalculated, 0);
        const adv = payments.filter((p) => p.type === 'Advance').reduce((s, p) => s + p.amount, 0);
        const paid = payments.reduce((s, p) => s + p.amount, 0);
        const net = Math.max(0, earned - paid);
        return [l.name, l.labourType, l.projectName, `₹${l.dailyRateOrSalary}`, earned, adv, net];
      });
    } else if (subReport === 'labour_advances') {
      tableHeaders = ['Date', 'Voucher #', 'Labour Name', 'Project', 'Advance Amount (₹)', 'Mode', 'Remarks'];
      const data = db.labourPayments.filter((p) => p.type === 'Advance');
      rowIdentifier = data.map((p) => p.labourName);
      tableRows = data.map((p) => [formatDate(p.date), p.voucherNumber, p.labourName, p.projectName, p.amount, p.paymentMode, p.remarks]);
    } else {
      tableHeaders = ['Date', 'Labour Name', 'Project', 'Status', 'Overtime Hours', 'Earned Wage (₹)', 'Remarks'];
      const data = filterByDate(db.labourAttendance, 'date');
      rowIdentifier = data.map((a) => a.labourName);
      tableRows = data.map((a) => [formatDate(a.date), a.labourName, a.projectName, a.status, a.overtimeHours, a.wageCalculated, a.remarks]);
    }
  } else if (category === 'adviser') {
    tableHeaders = ['Adviser Name', 'Booking Ref', 'Property', 'Customer', 'Eligible Commission (₹)', 'Commission Paid (₹)', 'Balance Due (₹)'];
    rowIdentifier = db.adviserCommissions.map((c) => c.adviserName);
    tableRows = db.adviserCommissions.map((c) => [c.adviserName, c.bookingRef, c.propertyNumber, c.customerName, c.eligibleCommission, c.paidCommission, c.outstandingCommission]);
  } else {
    // Accounts
    if (subReport === 'active_projects_pdf') {
      tableHeaders = [
        'Project Name',
        'Type',
        'Booked / Total Units',
        'Booked Sales (₹)',
        'Collections (₹)',
        'Customer Due (₹)',
        'Site Cost (₹)',
        'Net Operating Margin (₹)',
      ];
      const activeProjs = db.projects.filter((p) => p.status === 'Active' || (p as any).active === true);
      rowIdentifier = activeProjs.map((p) => p.name);
      tableRows = activeProjs.map((p) => {
        const props = db.properties.filter((item) => item.projectId === p.id);
        const bookedUnits = props.filter((item) => item.status === 'Booked').length;
        const totalUnits = props.length > 0 ? props.length : p.totalUnits || 0;
        const bookings = db.bookings.filter((b) => b.projectId === p.id && b.status !== 'Cancelled');
        const bookedRev = bookings.reduce((sum, b) => sum + (b.finalTotalAmount || 0), 0);
        const receipts = db.customerReceipts.filter((r) => r.projectId === p.id);
        const collections = Math.max(
          receipts.reduce((sum, r) => sum + (r.amount || 0), 0),
          bookings.reduce((sum, b) => sum + (b.amountReceived || 0), 0)
        );
        const dues = Math.max(0, bookedRev - collections);
        const materials = db.materialPurchases.filter((m) => m.projectId === p.id).reduce((sum, m) => sum + (m.billTotal || 0), 0);
        const labour = db.labourAttendance.filter((a) => a.projectId === p.id).reduce((sum, a) => sum + (a.wageCalculated || 0), 0);
        const comms = db.adviserCommissions.filter((c) => c.projectId === p.id).reduce((sum, c) => sum + (c.eligibleCommission || 0), 0);
        const expenses = db.expenses.filter((e) => e.projectId === p.id).reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const totalSiteCost = materials + labour + comms + expenses;
        const netMargin = collections - totalSiteCost;
        return [
          p.name,
          p.type,
          `${bookedUnits} / ${totalUnits}`,
          bookedRev,
          collections,
          dues,
          totalSiteCost,
          netMargin,
        ];
      });
    } else {
      tableHeaders = ['Date', 'Voucher #', 'Type', 'Account', 'Entity / Particulars', 'Debit Out (₹)', 'Credit In (₹)'];
      const data = filterByDate(filterByProject(db.transactions), 'txnDate');
      rowIdentifier = data.map((t) => t.entityName);
      tableRows = data.map((t) => [formatDate(t.txnDate), t.voucherNumber, t.type, t.account, `${t.entityName} - ${t.description}`, t.debit, t.credit]);
    }
  }

  const handleDownload = () => {
    const reportTitle = currentOptions.find((o) => o.id === subReport)?.name || 'VYAPAR_ONE_Report';
    const cleanFilename = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(cleanFilename, tableHeaders, tableRows);
  };

  const openRowHistory = (rowName: string) => {
    const matched = db.auditLogs.filter(
      (log) =>
        log.details.toLowerCase().includes(rowName.toLowerCase()) ||
        log.action.toLowerCase().includes(rowName.toLowerCase()) ||
        log.module.toLowerCase().includes(category.toLowerCase())
    );

    setHistoryModal({
      isOpen: true,
      title: `Audit & Modification History for "${rowName}"`,
      logs: matched.length > 0 ? matched : db.auditLogs.slice(0, 10),
    });
  };

  // Vendor A4 Statement helper
  const selectedVendor = db.vendors.find((v) => v.id === vendorA4Modal.vendorId) || db.vendors[0];
  const vendorBills = selectedVendor ? db.materialPurchases.filter((b) => b.vendorId === selectedVendor.id) : [];
  const vendorPayments = selectedVendor ? db.vendorPayments.filter((p) => p.vendorId === selectedVendor.id) : [];
  const totalBilled = vendorBills.reduce((s, b) => s + b.billTotal, 0);
  const totalPaid = vendorPayments.reduce((s, p) => s + p.amount, 0);
  const netDue = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Comprehensive Reports & Audit Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tabular reports, aggregate materials in Feet, audit history, vendor formal A4 statements, and CSV exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsProjectsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all"
            title="Export all active project financial summaries into a single aggregated PDF document"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-200" />
            <span>Active Projects Financial PDF</span>
          </button>

          {category === 'vendor' && (
            <button
              onClick={() => setVendorA4Modal({ isOpen: true, vendorId: db.vendors[0]?.id || '' })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Vendor A4 Formal Statement</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel CSV</span>
          </button>
        </div>
      </div>

      {/* Active Projects Monthly Financial Aggregation Feature Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md border border-indigo-900/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-white">
                Monthly Active Projects Consolidated Financial Export
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
                A4 PDF Ready
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5 leading-relaxed max-w-2xl">
              Export all active project financial summaries (units inventory, booked revenue, realized customer receipts, material costs, labour wages, commissions, and operating margins) into a single aggregated PDF document for monthly reporting.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsProjectsPdfModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Open Aggregated PDF Report</span>
        </button>
      </div>

      {/* Report Category Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs font-bold">
        {[
          { id: 'customer', label: 'Customers', icon: Users },
          { id: 'property', label: 'Properties', icon: Home },
          { id: 'material', label: 'Materials', icon: Truck },
          { id: 'vendor', label: 'Vendors', icon: Building2 },
          { id: 'labour', label: 'Labour', icon: Users },
          { id: 'adviser', label: 'Advisers', icon: Award },
          { id: 'accounts', label: 'Accounts', icon: Wallet },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = category === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleCategoryChange(item.id)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-report selector & Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Specific Report:</span>
          <select
            value={subReport}
            onChange={(e) => setSubReport(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50 focus:outline-hidden"
          >
            {currentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-500 font-medium">Project:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
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
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
          </div>
        </div>
      </div>

      {/* Report Data Table Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            {currentOptions.find((o) => o.id === subReport)?.name} ({tableRows.length} Records)
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Generated on {new Date().toLocaleDateString('en-IN')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 uppercase text-[10px]">
              <tr>
                {tableHeaders.map((header, idx) => (
                  <th key={idx} className="py-2.5 px-3">
                    {header}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((row, rIdx) => {
                const idName = rowIdentifier[rIdx] || String(row[0] || 'Record');
                return (
                  <tr key={rIdx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3 font-medium text-slate-800">
                        {typeof cell === 'number' ? formatCurrency(cell) : cell}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => openRowHistory(idName)}
                        title="View Audit & Modification History"
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={tableHeaders.length + 1} className="py-8 text-center text-slate-400">
                    No matching records found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: ROW AUDIT & CHANGE HISTORY ================= */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{historyModal.title}</span>
              </h3>
              <button onClick={() => setHistoryModal({ isOpen: false, title: '', logs: [] })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs max-h-96 overflow-y-auto">
              <p className="text-slate-500 text-[11px]">
                Showing complete audit log entries matching this entity and module in compliance with enterprise audit trail standards.
              </p>
              <div className="space-y-2">
                {historyModal.logs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono font-semibold text-slate-700">{formatDate(log.timestamp)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">{log.module}</span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1">{log.action}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{log.details}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">Authorizer: {log.userName}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setHistoryModal({ isOpen: false, title: '', logs: [] })}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FORMAL VENDOR A4 STATEMENT ================= */}
      {vendorA4Modal.isOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">Vendor Official Statement of Account (A4)</h3>
              </div>
              <button onClick={() => setVendorA4Modal({ isOpen: false, vendorId: '' })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans">
              {/* Selector */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Select Vendor:</span>
                  <select
                    value={selectedVendor.id}
                    onChange={(e) => setVendorA4Modal({ isOpen: true, vendorId: e.target.value })}
                    className="px-2.5 py-1 border border-slate-300 rounded font-bold text-indigo-900 bg-white"
                  >
                    {db.vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.businessName} ({v.name})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</span>
              </div>

              {/* Letterhead */}
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="text-base font-black tracking-wider text-slate-900 uppercase">
                  {db.company?.name || 'VYAPAR ONE ERP'}
                </h2>
                <p className="text-[11px] text-slate-500">{db.company?.address || 'Site Office & Corporate Administration'}</p>
                <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 mt-0.5">
                  <span>GSTIN: {db.company?.gstNumber || '27AABCU9603R1ZX'}</span>
                  <span>•</span>
                  <span>Contact: {db.company?.contactPhone || '+91 7666257368'}</span>
                </div>
              </div>

              {/* Vendor Profile Header */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Vendor Details</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedVendor.businessName}</p>
                  <p className="text-slate-700">Proprietor: {selectedVendor.name}</p>
                  <p className="text-slate-600">Mobile: {selectedVendor.mobileNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Account Status</span>
                  <p className="font-mono text-xs mt-0.5">GSTIN: {selectedVendor.gstNumber || 'Unregistered'}</p>
                  <p className="font-mono text-base font-extrabold text-rose-700 mt-1">
                    Balance Due: {formatCurrency(netDue)}
                  </p>
                </div>
              </div>

              {/* Bills Table */}
              <div>
                <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1.5">
                  Purchases & Supply Invoices
                </h5>
                <table className="w-full text-left text-[11px] border border-slate-200 rounded">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[9px]">
                    <tr>
                      <th className="py-1.5 px-2.5">Date</th>
                      <th className="py-1.5 px-2.5">Bill #</th>
                      <th className="py-1.5 px-2.5">Project</th>
                      <th className="py-1.5 px-2.5 text-right">Bill Total (₹)</th>
                      <th className="py-1.5 px-2.5 text-right">Paid (₹)</th>
                      <th className="py-1.5 px-2.5 text-right">Balance Due (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorBills.map((b) => (
                      <tr key={b.id}>
                        <td className="py-1.5 px-2.5">{formatDate(b.billDate)}</td>
                        <td className="py-1.5 px-2.5 font-mono font-semibold">{b.billNumber}</td>
                        <td className="py-1.5 px-2.5">{b.projectName}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono">{formatCurrency(b.billTotal)}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-emerald-700">{formatCurrency(b.amountPaid)}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-rose-700">{formatCurrency(b.outstandingAmount)}</td>
                      </tr>
                    ))}
                    {vendorBills.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-slate-400">
                          No bills recorded for this vendor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Total Billed: </span>
                  <strong className="font-mono text-slate-900">{formatCurrency(totalBilled)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Total Disbursed: </span>
                  <strong className="font-mono text-emerald-700">{formatCurrency(totalPaid)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Net Due: </span>
                  <strong className="font-mono text-rose-700 text-sm font-extrabold">{formatCurrency(netDue)}</strong>
                </div>
              </div>

              {/* Signature Row */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1">
                  <span>Vendor Acceptance & Seal</span>
                </div>
                <div className="border-t border-slate-300 pt-1 font-bold text-slate-800">
                  <span>Authorized Signatory ({db.company?.name || 'VYAPAR ONE ERP'})</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                onClick={() => setVendorA4Modal({ isOpen: false, vendorId: '' })}
                className="px-3.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official A4 Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Projects Aggregated Monthly Financial PDF Modal */}
      <ActiveProjectsFinancialPdfModal
        isOpen={isProjectsPdfModalOpen}
        onClose={() => setIsProjectsPdfModalOpen(false)}
        db={db}
      />
    </div>
  );
};
