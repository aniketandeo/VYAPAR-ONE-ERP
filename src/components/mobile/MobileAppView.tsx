import React, { useState } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  generateReceiptNumber,
} from '../../utils/formatters';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import { MobileInstallModal } from '../common/MobileInstallModal';
import { CustomerPaymentReceipt, FinancialTransaction, MaterialPurchaseBill, ExpenseRecord } from '../../types';
import {
  Smartphone,
  Home,
  PlusCircle,
  Package,
  Wallet,
  Building2,
  Users,
  Search,
  Camera,
  Share2,
  Printer,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  X,
  Check,
  User,
  Calendar,
  Layers,
  LogOut,
  Bell,
  Download,
} from 'lucide-react';

interface MobileAppViewProps {
  db: DatabaseState;
  onSwitchToWeb: () => void;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({ db, onSwitchToWeb }) => {
  const { currentUser, switchUser, allUsers } = useAuth();

  // Mobile Bottom Navigation: 'home' | 'plots' | 'quick_add' | 'stock' | 'ledgers'
  const [navTab, setNavTab] = useState<'home' | 'plots' | 'stock' | 'ledgers'>('home');

  // Quick Action Modal Sheet
  const [activeActionSheet, setActiveActionSheet] = useState<
    'customer_payment' | 'material_purchase' | 'quick_expense' | null
  >(null);

  // Selected project in mobile
  const [mobileProjectId, setMobileProjectId] = useState<string>(db.projects[0]?.id || '');
  const [plotSearch, setPlotSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Print Receipt Modal
  const [printedReceipt, setPrintedReceipt] = useState<CustomerPaymentReceipt | null>(null);
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  // Mobile Customer Payment Form State
  const [cpBookingId, setCpBookingId] = useState<string>(db.bookings[0]?.id || '');
  const [cpAmount, setCpAmount] = useState<number>(50000);
  const [cpMode, setCpMode] = useState<string>('UPI');
  const [cpRef, setCpRef] = useState<string>('');
  const [cpRemarks, setCpRemarks] = useState<string>('Mobile collection via UPI');

  // Mobile Material Purchase Entry State
  const [mpVendorId, setMpVendorId] = useState<string>(db.vendors[0]?.id || '');
  const [mpBillNumber, setMpBillNumber] = useState<string>('');
  const [mpMaterialName, setMpMaterialName] = useState<string>('Gitti (Aggregate 20mm/10mm)');
  const [mpQuantityFeet, setMpQuantityFeet] = useState<number>(300); // Feet format strictly
  const [mpRate, setMpRate] = useState<number>(42);
  const [mpAmountPaid, setMpAmountPaid] = useState<number>(10000);
  const [mpAttachmentUrl, setMpAttachmentUrl] = useState<string>('');

  // Mobile Expense Entry State
  const [expCategory, setExpCategory] = useState<string>('Transport');
  const [expPaidTo, setExpPaidTo] = useState<string>('');
  const [expAmount, setExpAmount] = useState<number>(2500);
  const [expDescription, setExpDescription] = useState<string>('Tractor diesel & site transport');
  const [expAttachmentUrl, setExpAttachmentUrl] = useState<string>('');

  // Save Mobile Customer Payment
  const handleSaveMobileCustomerPayment = (andShare = false) => {
    if (!cpAmount || !cpBookingId) return;

    const currentDb = dbService.getDatabase();
    const booking = currentDb.bookings.find((b) => b.id === cpBookingId);
    if (!booking) return;

    const receiptNo = generateReceiptNumber(currentDb.customerReceipts.length);
    const prevBalance = booking.remainingBalance;
    const newRemaining = Math.max(0, prevBalance - Number(cpAmount));

    // Update booking balance
    booking.amountReceived += Number(cpAmount);
    booking.remainingBalance = newRemaining;

    // Create Receipt
    const newReceipt: CustomerPaymentReceipt = {
      id: `rcp-${Date.now()}`,
      receiptNumber: receiptNo,
      customerId: booking.customerId,
      customerName: booking.customerName,
      projectId: booking.projectId,
      projectName: booking.projectName,
      propertyId: booking.propertyId,
      propertyNumber: booking.propertyNumber,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: Number(cpAmount),
      paymentMode: cpMode as any,
      referenceNumber: cpRef || `MOB-${Date.now().toString().slice(-6)}`,
      receivingAccount: cpMode === 'Cash' ? 'Cash Account' : 'HDFC Bank Ltd',
      previousBalance: prevBalance,
      remainingBalance: newRemaining,
      remarks: cpRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.customerReceipts.unshift(newReceipt);

    // Accounts Journal
    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber: receiptNo,
      txnDate: new Date().toISOString().split('T')[0],
      type: 'CUSTOMER_RECEIPT',
      category: 'Customer Realization (Mobile)',
      description: `Receipt from ${booking.customerName} for ${booking.propertyNumber}`,
      entityType: 'CUSTOMER',
      entityId: booking.customerId,
      entityName: booking.customerName,
      projectId: booking.projectId,
      projectName: booking.projectName,
      debit: 0,
      credit: Number(cpAmount),
      account: cpMode === 'Cash' ? 'Cash Account' : 'HDFC Bank Ltd',
      paymentMode: cpMode,
      refNumber: cpRef || receiptNo,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.transactions.unshift(journalTxn);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'MOBILE_PAYMENT_COLLECTED',
      'Mobile Application',
      `Collected ₹${cpAmount} from ${booking.customerName} (${booking.propertyNumber}) via Mobile App.`
    );

    setActiveActionSheet(null);
    setStatusMessage(`Receipt ${receiptNo} recorded successfully! Live synced to Web ERP.`);

    if (andShare) {
      const shareText = `*${db.company.companyName}*\nMoney Receipt: ${receiptNo}\nCustomer: ${booking.customerName}\nProperty: ${booking.propertyNumber} (${booking.projectName})\nAmount Received: ${formatCurrency(cpAmount)}\nRemaining Balance: ${formatCurrency(newRemaining)}\nThank you!`;
      if (navigator.share) {
        navigator.share({ title: `Receipt ${receiptNo}`, text: shareText }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareText);
        alert('Receipt text copied to clipboard! You can paste and send via WhatsApp.');
      }
    } else {
      setPrintedReceipt(newReceipt);
    }
  };

  // Save Mobile Material Purchase
  const handleSaveMobileMaterialPurchase = () => {
    if (!mpBillNumber.trim() || !mpQuantityFeet) return;

    const currentDb = dbService.getDatabase();
    const vendor = currentDb.vendors.find((v) => v.id === mpVendorId);
    const project = currentDb.projects.find((p) => p.id === mobileProjectId);
    const mat = currentDb.materials.find((m) => m.name === mpMaterialName);

    const basic = Number(mpQuantityFeet) * Number(mpRate);
    const gst = Number(((basic * 5) / 100).toFixed(2));
    const total = basic + gst;
    const outstanding = Math.max(0, total - Number(mpAmountPaid));

    const newBill: MaterialPurchaseBill = {
      id: `bill-${Date.now()}`,
      billNumber: mpBillNumber.trim(),
      billDate: new Date().toISOString().split('T')[0],
      projectId: mobileProjectId,
      projectName: project ? project.name : 'Project',
      vendorId: mpVendorId,
      vendorName: vendor ? vendor.name : 'Vendor',
      isGstBill: gst > 0,
      items: [
        {
          materialName: mpMaterialName,
          quantity: Number(mpQuantityFeet),
          unit: mat?.unit || 'Feet', // STRICTLY Feet
          ratePerUnit: Number(mpRate),
          basicAmount: basic,
          gstPercentage: 5,
          gstAmount: gst,
          totalAmount: total,
        },
      ],
      basicAmount: basic,
      gstAmount: gst,
      billTotal: total,
      amountPaid: Number(mpAmountPaid),
      outstandingAmount: outstanding,
      paymentDueDate: new Date().toISOString().split('T')[0],
      paymentMode: 'UPI',
      billAttachmentUrl: mpAttachmentUrl,
      billAttachmentName: mpAttachmentUrl ? 'mobile_captured_bill.jpg' : undefined,
      remarks: 'Entered via Android Mobile Application',
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.materialPurchases.unshift(newBill);
    if (vendor) {
      vendor.currentOutstanding = (vendor.currentOutstanding || 0) + outstanding;
    }

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'MOBILE_MATERIAL_PURCHASE',
      'Mobile Application',
      `Recorded purchase of ${mpQuantityFeet} Feet ${mpMaterialName} from ${vendor?.name}`
    );

    setActiveActionSheet(null);
    setStatusMessage(`Material bill ${mpBillNumber} recorded from mobile!`);
  };

  // Save Mobile Expense
  const handleSaveMobileExpense = () => {
    if (!expPaidTo.trim() || !expAmount) return;

    const currentDb = dbService.getDatabase();
    const proj = currentDb.projects.find((p) => p.id === mobileProjectId);
    const voucherNumber = `VD-MOB-EXP-${Date.now().toString().slice(-5)}`;

    const newExp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      voucherNumber,
      expenseDate: new Date().toISOString().split('T')[0],
      projectId: mobileProjectId,
      projectName: proj ? proj.name : 'General',
      category: expCategory,
      description: expDescription,
      vendorOrPaidTo: expPaidTo,
      billNumber: voucherNumber,
      amountBeforeGst: Number(expAmount),
      gstAmount: 0,
      totalAmount: Number(expAmount),
      paymentMode: 'Cash Account',
      account: 'Cash Account',
      amountPaid: Number(expAmount),
      outstandingAmount: 0,
      billAttachmentUrl: expAttachmentUrl,
      billAttachmentName: expAttachmentUrl ? 'mobile_receipt_photo.jpg' : undefined,
      remarks: 'Logged via Site Mobile App',
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.expenses.unshift(newExp);

    // Accounts Journal
    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber,
      txnDate: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
      category: expCategory,
      description: `${expCategory}: ${expDescription} (${expPaidTo})`,
      entityType: 'EXPENSE',
      entityName: expPaidTo,
      projectId: mobileProjectId,
      projectName: proj?.name,
      debit: Number(expAmount),
      credit: 0,
      account: 'Cash Account',
      paymentMode: 'Cash',
      refNumber: voucherNumber,
      attachmentUrl: expAttachmentUrl,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.transactions.unshift(journalTxn);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'MOBILE_EXPENSE_SAVED',
      'Mobile Application',
      `Recorded site expense of ₹${expAmount} for ${expPaidTo}`
    );

    setActiveActionSheet(null);
    setStatusMessage(`Expense ₹${expAmount} saved from mobile!`);
  };

  // Metrics for mobile dashboard
  const availablePlotsCount = db.properties.filter(
    (p) => (mobileProjectId === 'ALL' || p.projectId === mobileProjectId) && p.status === 'Available'
  ).length;

  const bookedPlotsCount = db.properties.filter(
    (p) => (mobileProjectId === 'ALL' || p.projectId === mobileProjectId) && p.status === 'Booked'
  ).length;

  const totalCollections = db.customerReceipts
    .filter((r) => mobileProjectId === 'ALL' || r.projectId === mobileProjectId)
    .reduce((s, r) => s + r.amount, 0);

  const pendingCustomerDues = db.bookings
    .filter((b) => mobileProjectId === 'ALL' || b.projectId === mobileProjectId)
    .reduce((s, b) => s + b.remainingBalance, 0);

  return (
    <div className="min-h-screen bg-slate-900 py-4 px-2 sm:px-4 flex items-center justify-center font-sans">
      {/* Android Device Mockup Shell */}
      <div className="w-full max-w-md bg-slate-100 rounded-3xl shadow-2xl border-4 border-slate-700 overflow-hidden flex flex-col h-[844px] relative">
        {/* Android Top Status Bar */}
        <div className="bg-slate-950 text-white px-5 py-2 flex items-center justify-between text-[11px] font-mono tracking-wider select-none shrink-0">
          <span>10:42 AM</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-400 font-bold">5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Mobile App Bar */}
        <div className="bg-indigo-700 text-white px-4 py-3 shadow-md shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-indigo-700 font-extrabold flex items-center justify-center text-sm shadow-xs">
              YO
            </div>
            <div>
              <h2 className="font-extrabold text-sm leading-tight">VYAPAR ONE Mobile</h2>
              <div className="flex items-center gap-1 text-[10px] text-indigo-200">
                <span>{currentUser.name.split(' ')[0]}</span>
                <span>•</span>
                <span className="font-semibold">{currentUser.role}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInstallOpen(true)}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors"
              title="Download APK / Install App"
            >
              <Download className="w-3 h-3" />
              <span>Install App</span>
            </button>
            <button
              onClick={onSwitchToWeb}
              className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10px] font-semibold border border-white/20 transition-colors"
              title="Open full Web ERP"
            >
              Desktop ERP ↗
            </button>
          </div>
        </div>

        {/* Project Selector Bar */}
        <div className="bg-indigo-800 text-white px-4 py-1.5 text-xs flex items-center justify-between border-t border-indigo-600/50 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-indigo-200">Project:</span>
            <select
              value={mobileProjectId}
              onChange={(e) => setMobileProjectId(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="text-slate-900">All Projects</option>
              {db.projects.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
            Live Synced
          </span>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)}>✕</button>
          </div>
        )}

        {/* Mobile Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: HOME DASHBOARD & QUICK ACTION GRID */}
          {navTab === 'home' && (
            <div className="space-y-4">
              {/* Key KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Available Units
                  </span>
                  <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                    {availablePlotsCount}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Ready for buyer</p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Booked Units
                  </span>
                  <p className="text-2xl font-black text-amber-600 font-mono mt-1">
                    {bookedPlotsCount}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active deals</p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Collections
                  </span>
                  <p className="text-base font-black text-indigo-900 font-mono mt-1 truncate">
                    {formatCurrency(totalCollections)}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Total Realized</p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Buyer Dues
                  </span>
                  <p className="text-base font-black text-rose-700 font-mono mt-1 truncate">
                    {formatCurrency(pendingCustomerDues)}
                  </p>
                  <p className="text-[10px] text-rose-500 mt-0.5">Pending Payments</p>
                </div>
              </div>

              {/* Large Touch Quick Action Buttons (Requirement 2B) */}
              <div>
                <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider mb-2.5">
                  Mobile Quick Entry (Large Buttons)
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setActiveActionSheet('customer_payment')}
                    className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-sm text-left flex flex-col justify-between h-24 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">💵</span>
                      <PlusCircle className="w-4 h-4 text-emerald-200" />
                    </div>
                    <div>
                      <p className="font-bold text-xs leading-tight">Customer Payment</p>
                      <p className="text-[10px] text-emerald-100">Collect & WhatsApp receipt</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveActionSheet('material_purchase')}
                    className="p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-sm text-left flex flex-col justify-between h-24 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🚛</span>
                      <PlusCircle className="w-4 h-4 text-indigo-200" />
                    </div>
                    <div>
                      <p className="font-bold text-xs leading-tight">Material Entry</p>
                      <p className="text-[10px] text-indigo-100">Reti / Gitti in Feet</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveActionSheet('quick_expense')}
                    className="p-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-sm text-left flex flex-col justify-between h-24 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">📸</span>
                      <Camera className="w-4 h-4 text-amber-200" />
                    </div>
                    <div>
                      <p className="font-bold text-xs leading-tight">Site Expense</p>
                      <p className="text-[10px] text-amber-100">Photo bill & voucher</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setNavTab('stock')}
                    className="p-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl shadow-sm text-left flex flex-col justify-between h-24 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">📦</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs leading-tight">Check Stock</p>
                      <p className="text-[10px] text-slate-300">Remaining Feet units</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Real-time Activity List */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-extrabold text-xs text-slate-800">Recent Customer Receipts</h4>
                  <span className="text-[10px] font-mono text-slate-400">Live</span>
                </div>
                <div className="space-y-2">
                  {db.customerReceipts.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-[11px]">{r.customerName}</p>
                        <p className="text-[10px] text-slate-500">
                          {r.propertyNumber} • {formatDate(r.paymentDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-emerald-700 text-xs">
                          {formatCurrency(r.amount)}
                        </p>
                        <button
                          onClick={() => setPrintedReceipt(r)}
                          className="text-[9px] text-indigo-600 font-semibold underline"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLOTS & FLATS MATRIX */}
          {navTab === 'plots' && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center gap-2 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plot or flat number..."
                  value={plotSearch}
                  onChange={(e) => setPlotSearch(e.target.value)}
                  className="bg-transparent w-full text-slate-800 focus:outline-hidden"
                />
              </div>

              <div className="space-y-2">
                {db.properties
                  .filter((p) => {
                    const matchProj = mobileProjectId === 'ALL' || p.projectId === mobileProjectId;
                    const matchText =
                      p.number.toLowerCase().includes(plotSearch.toLowerCase()) ||
                      (p.customerName && p.customerName.toLowerCase().includes(plotSearch.toLowerCase()));
                    return matchProj && matchText;
                  })
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{p.number}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'Available'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : p.status === 'Booked'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {p.areaSqFt} Sq.Ft @ ₹{p.ratePerSqFt}/Sq.Ft
                        </p>
                        {p.customerName && (
                          <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                            Buyer: {p.customerName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(p.totalPrice)}
                        </p>
                        {p.status === 'Available' && (
                          <button
                            onClick={() => {
                              onSwitchToWeb();
                            }}
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-1 inline-block"
                          >
                            Book Unit ↗
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 3: STOCK IN FEET FORMAT */}
          {navTab === 'stock' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] font-medium leading-relaxed">
                <strong>Feet Unit Display:</strong> All sand and aggregate materials (Reti, Gitti, Murum, Churi, Crush Sand) strictly measured in <strong>Feet</strong> format.
              </div>

              <div className="space-y-2.5">
                {db.materials.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{m.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Opening: {m.openingStock} {m.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-slate-900 text-sm block">
                        {formatNumber(m.currentStock, 0)} {m.unit}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        Available Stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LEDGERS & OUTSTANDING */}
          {navTab === 'ledgers' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Customer Outstanding Balances
                </h4>
                <div className="space-y-2">
                  {db.bookings
                    .filter((b) => b.remainingBalance > 0)
                    .map((b) => (
                      <div
                        key={b.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{b.customerName}</p>
                          <p className="text-[10px] text-slate-500">
                            {b.propertyNumber} • Ref: {b.bookingRef}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-extrabold text-rose-700">
                            {formatCurrency(b.remainingBalance)}
                          </p>
                          <button
                            onClick={() => {
                              setCpBookingId(b.id);
                              setCpAmount(b.remainingBalance);
                              setActiveActionSheet('customer_payment');
                            }}
                            className="text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded font-bold mt-0.5 inline-block"
                          >
                            Collect
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Material Vendor Outstanding
                </h4>
                <div className="space-y-2">
                  {db.vendors.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{v.name}</p>
                        <p className="text-[10px] text-slate-500">{v.mobileNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-rose-700">
                          {formatCurrency(v.currentOutstanding)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Sheet Modal: Customer Payment */}
        {activeActionSheet === 'customer_payment' && (
          <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[85%] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-slate-900 text-sm">Collect Customer Payment</h3>
                <button
                  onClick={() => setActiveActionSheet(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Booking / Customer *</label>
                  <select
                    value={cpBookingId}
                    onChange={(e) => {
                      setCpBookingId(e.target.value);
                      const b = db.bookings.find((bk) => bk.id === e.target.value);
                      if (b) setCpAmount(b.remainingBalance > 0 ? b.remainingBalance : 50000);
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-semibold text-xs"
                  >
                    {db.bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.customerName} - {b.propertyNumber} (Due: {formatCurrency(b.remainingBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-emerald-800 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={cpAmount || ''}
                    onChange={(e) => setCpAmount(Number(e.target.value))}
                    className="w-full px-3 py-3 border-2 border-emerald-500 rounded-xl font-mono text-base font-extrabold text-emerald-950 bg-emerald-50/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={cpMode}
                      onChange={(e) => setCpMode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Cash">Cash in Hand</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Transaction Ref #</label>
                    <input
                      type="text"
                      placeholder="UPI Ref or UTR"
                      value={cpRef}
                      onChange={(e) => setCpRef(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={cpRemarks}
                    onChange={(e) => setCpRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                {/* Big Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => handleSaveMobileCustomerPayment(true)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Save & Share WhatsApp Receipt</span>
                  </button>

                  <button
                    onClick={() => handleSaveMobileCustomerPayment(false)}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs"
                  >
                    Save & View Official Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Sheet Modal: Material Purchase (In Feet) */}
        {activeActionSheet === 'material_purchase' && (
          <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[85%] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-slate-900 text-sm">Material Purchase Entry</h3>
                <button
                  onClick={() => setActiveActionSheet(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Name *</label>
                  <select
                    value={mpMaterialName}
                    onChange={(e) => setMpMaterialName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {db.materials.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-indigo-700 mb-1">Quantity (Feet) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={mpQuantityFeet || ''}
                      onChange={(e) => setMpQuantityFeet(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border-2 border-indigo-400 rounded-xl font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rate / Feet (₹)</label>
                    <input
                      type="number"
                      value={mpRate || ''}
                      onChange={(e) => setMpRate(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vendor *</label>
                    <select
                      value={mpVendorId}
                      onChange={(e) => setMpVendorId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    >
                      {db.vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bill Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BL-901"
                      value={mpBillNumber}
                      onChange={(e) => setMpBillNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={mpAmountPaid || ''}
                    onChange={(e) => setMpAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Take Bill Photo / Camera</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setMpAttachmentUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 font-semibold"
                  />
                </div>

                <button
                  onClick={handleSaveMobileMaterialPurchase}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md mt-2"
                >
                  Save Material Bill to ERP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Sheet Modal: Quick Expense */}
        {activeActionSheet === 'quick_expense' && (
          <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[85%] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-slate-900 text-sm">Site Expense & Bill Photo</h3>
                <button
                  onClick={() => setActiveActionSheet(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Transport">Transport / Diesel / Machinery</option>
                    <option value="Office Expense">Office & Tea / Refreshment</option>
                    <option value="Electricity">Electricity / Water</option>
                    <option value="Maintenance">Maintenance & Repairs</option>
                    <option value="Other Expense">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Paid To *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bharat Petrol Pump"
                      value={expPaidTo}
                      onChange={(e) => setExpPaidTo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={expAmount || ''}
                      onChange={(e) => setExpAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Description</label>
                  <input
                    type="text"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capture Bill / Voucher Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setExpAttachmentUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-amber-50 file:text-amber-700 font-semibold"
                  />
                </div>

                <button
                  onClick={handleSaveMobileExpense}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md mt-2"
                >
                  Save Site Expense Voucher
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Android Bottom Navigation Bar */}
        <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around shrink-0 z-30">
          <button
            onClick={() => setNavTab('home')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              navTab === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setNavTab('plots')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              navTab === 'plots' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[10px]">Plots</span>
          </button>

          {/* Center Floating Action Button */}
          <button
            onClick={() => setActiveActionSheet('customer_payment')}
            className="w-11 h-11 -mt-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            title="Quick Action"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          <button
            onClick={() => setNavTab('stock')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              navTab === 'stock' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px]">Stock</span>
          </button>

          <button
            onClick={() => setNavTab('ledgers')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              navTab === 'ledgers' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[10px]">Ledgers</span>
          </button>
        </div>
      </div>

      {/* Print Receipt Modal */}
      {printedReceipt && (
        <PrintReceiptModal
          receipt={printedReceipt}
          company={db.company}
          onClose={() => setPrintedReceipt(null)}
        />
      )}

      {/* Mobile Download APK / PWA Modal */}
      <MobileInstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />
    </div>
  );
};
