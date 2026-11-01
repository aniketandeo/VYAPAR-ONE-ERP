import React, { useState, useMemo } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import { FinancialTransaction, ExpenseRecord, CustomerReceipt } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { AttachmentViewerModal } from '../common/AttachmentViewerModal';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Paperclip,
  Check,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  Layers,
  PieChart,
  Clock,
  Eye,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface AccountsViewProps {
  db: DatabaseState;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();

  const [subTab, setSubTab] = useState<
    'dashboard' | 'daybook' | 'cashbook' | 'bankbook' | 'custledger' | 'expenses' | 'otherincome' | 'emi' | 'vouchers' | 'plsummary'
  >('dashboard');

  // Filters
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'FY'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected customer for Customer Ledger
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('ALL');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isContraModalOpen, setIsContraModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isOtherIncomeModalOpen, setIsOtherIncomeModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [reversalTxn, setReversalTxn] = useState<FinancialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Printable Voucher / Receipt Modal
  const [printableVoucher, setPrintableVoucher] = useState<{
    voucherNumber: string;
    date: string;
    title: string;
    type: string;
    entityName: string;
    particulars: string;
    account: string;
    paymentMode: string;
    refNumber?: string;
    debit?: number;
    credit?: number;
    amount: number;
    projectName?: string;
    createdBy?: string;
  } | null>(null);

  // Attachment Modal
  const [attachmentModal, setAttachmentModal] = useState<{
    isOpen: boolean;
    title: string;
    url?: string;
    name?: string;
    date?: string;
  }>({ isOpen: false, title: '' });

  // Handle Preset Date Filter Change
  const handleDatePresetChange = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'FY') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'TODAY') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'WEEK') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      setFromDate(startOfWeek.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'MONTH') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(startOfMonth.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'FY') {
      // Indian Financial Year: Apr 1 of current or previous year to Mar 31
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed: 3 = April
      const fyStart = currentMonth >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
      const fyEnd = currentMonth >= 3 ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`;
      setFromDate(fyStart);
      setToDate(fyEnd);
    }
  };

  // ================= EXPENSE FORM STATE =================
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expProjectId, setExpProjectId] = useState(db.projects[0]?.id || '');
  const [expCategory, setExpCategory] = useState('Office Expense');
  const [expDescription, setExpDescription] = useState('');
  const [expPaidTo, setExpPaidTo] = useState('');
  const [expBillNo, setExpBillNo] = useState('');
  const [expAmountBeforeGst, setExpAmountBeforeGst] = useState<number>(5000);
  const [expGstAmount, setExpGstAmount] = useState<number>(0);
  const [expPaymentMode, setExpPaymentMode] = useState('Cash Account');
  const [expAccount, setExpAccount] = useState('Cash Account');
  const [expAmountPaid, setExpAmountPaid] = useState<number>(5000);
  const [expDueDate, setExpDueDate] = useState('');
  const [expAttachmentUrl, setExpAttachmentUrl] = useState('');
  const [expAttachmentName, setExpAttachmentName] = useState('');
  const [expRemarks, setExpRemarks] = useState('');

  const expTotal = (Number(expAmountBeforeGst) || 0) + (Number(expGstAmount) || 0);
  const expOutstanding = Math.max(0, expTotal - (Number(expAmountPaid) || 0));

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expPaidTo.trim() || !expDescription.trim()) {
      alert('Paid To and Description are required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const proj = currentDb.projects.find((p) => p.id === expProjectId);
    const voucherNumber = `VD-EXP-${Date.now().toString().slice(-6)}`;

    const newExp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      voucherNumber,
      expenseDate: expDate,
      projectId: expProjectId,
      projectName: proj ? proj.name : 'General Project',
      category: expCategory,
      description: expDescription,
      vendorOrPaidTo: expPaidTo,
      billNumber: expBillNo || voucherNumber,
      amountBeforeGst: Number(expAmountBeforeGst),
      gstAmount: Number(expGstAmount),
      totalAmount: expTotal,
      paymentMode: expPaymentMode,
      account: expAccount,
      amountPaid: Number(expAmountPaid),
      outstandingAmount: expOutstanding,
      dueDate: expDueDate || undefined,
      billAttachmentUrl: expAttachmentUrl,
      billAttachmentName: expAttachmentName,
      remarks: expRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.expenses.unshift(newExp);

    // If paid > 0, post to Central Journal
    if (expAmountPaid > 0) {
      const journalTxn: FinancialTransaction = {
        id: `txn-${Date.now()}`,
        voucherNumber,
        txnDate: expDate,
        type: 'EXPENSE',
        category: expCategory,
        description: `${expCategory}: ${expDescription} (${expPaidTo})`,
        entityType: 'EXPENSE',
        entityName: expPaidTo,
        projectId: expProjectId,
        projectName: proj?.name,
        debit: Number(expAmountPaid),
        credit: 0,
        account: expAccount,
        paymentMode: expPaymentMode,
        refNumber: expBillNo || voucherNumber,
        attachmentUrl: expAttachmentUrl,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentUser.name,
      };
      currentDb.transactions.unshift(journalTxn);
    }

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'EXPENSE_RECORDED',
      'Expense Management',
      `Recorded ${expCategory} expense of ₹${expTotal} for ${expPaidTo}`
    );

    setIsExpenseModalOpen(false);
    setExpDescription('');
    setExpPaidTo('');
    setExpBillNo('');
  };

  // ================= PAYMENT COLLECTION STATE =================
  const [payBookingId, setPayBookingId] = useState(db.bookings[0]?.id || '');
  const [payAmount, setPayAmount] = useState<number>(50000);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Bank Transfer');
  const [payAccount, setPayAccount] = useState('HDFC Bank Ltd');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('Installment collection');

  const handleSavePaymentCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBookingId || !payAmount) return;

    const currentDb = dbService.getDatabase();
    const b = currentDb.bookings.find((item) => item.id === payBookingId);
    if (!b) return;

    const receiptNumber = `VD-REC-${Date.now().toString().slice(-6)}`;
    const newRemaining = Math.max(0, b.remainingBalance - Number(payAmount));

    const newReceipt: CustomerReceipt = {
      id: `rcpt-${Date.now()}`,
      receiptNumber,
      bookingId: b.id,
      bookingRef: b.bookingRef,
      customerId: b.customerId,
      customerName: b.customerName,
      projectId: b.projectId,
      projectName: b.projectName,
      propertyId: b.propertyId,
      propertyNumber: b.propertyNumber,
      paymentDate: payDate,
      amount: Number(payAmount),
      paymentMode: payMode,
      receivingAccount: payAccount,
      transactionRef: payRef || receiptNumber,
      remainingBalance: newRemaining,
      remarks: payRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.customerReceipts.unshift(newReceipt);

    // Update booking remaining balance and amountReceived
    b.amountReceived += Number(payAmount);
    b.remainingBalance = newRemaining;

    // Post to central journal
    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber: receiptNumber,
      txnDate: payDate,
      type: 'CUSTOMER_RECEIPT',
      category: 'Customer Realization',
      description: `Payment for Plot/Unit ${b.propertyNumber} (${b.projectName})`,
      entityType: 'CUSTOMER',
      entityId: b.customerId,
      entityName: b.customerName,
      projectId: b.projectId,
      projectName: b.projectName,
      debit: 0,
      credit: Number(payAmount),
      account: payAccount,
      paymentMode: payMode,
      refNumber: payRef || receiptNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.transactions.unshift(journalTxn);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'CUSTOMER_PAYMENT_COLLECTED',
      'Accounts',
      `Collected ₹${payAmount} from ${b.customerName} for ${b.propertyNumber}. Receipt: ${receiptNumber}`
    );

    setIsPaymentModalOpen(false);

    // Open printable voucher immediately
    setPrintableVoucher({
      voucherNumber: receiptNumber,
      date: payDate,
      title: 'CUSTOMER PAYMENT RECEIPT',
      type: 'CUSTOMER_RECEIPT',
      entityName: b.customerName,
      particulars: `Payment realized towards ${b.propertyNumber} (${b.projectName}). Remaining balance due: ₹${newRemaining.toLocaleString('en-IN')}`,
      account: payAccount,
      paymentMode: payMode,
      refNumber: payRef || receiptNumber,
      amount: Number(payAmount),
      credit: Number(payAmount),
      projectName: b.projectName,
      createdBy: currentUser.name,
    });
  };

  // ================= OTHER INCOME STATE =================
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incCategory, setIncCategory] = useState('Site Visit Fee');
  const [incPayer, setIncPayer] = useState('');
  const [incDescription, setIncDescription] = useState('');
  const [incAmount, setIncAmount] = useState<number>(2000);
  const [incAccount, setIncAccount] = useState('Cash Account');
  const [incMode, setIncMode] = useState('Cash');
  const [incRef, setIncRef] = useState('');

  const handleSaveOtherIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incPayer.trim() || !incAmount) {
      alert('Payer Name and Amount are required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const voucherNumber = `VD-INC-${Date.now().toString().slice(-6)}`;

    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber,
      txnDate: incDate,
      type: 'OTHER_INCOME',
      category: incCategory,
      description: `${incCategory}: ${incDescription || incPayer}`,
      entityType: 'CUSTOMER',
      entityName: incPayer,
      debit: 0,
      credit: Number(incAmount),
      account: incAccount,
      paymentMode: incMode,
      refNumber: incRef || voucherNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.transactions.unshift(journalTxn);
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'OTHER_INCOME_RECORDED',
      'Accounts',
      `Recorded ₹${incAmount} under ${incCategory} from ${incPayer}. Voucher: ${voucherNumber}`
    );

    setIsOtherIncomeModalOpen(false);
    setIncPayer('');
    setIncDescription('');
  };

  // ================= CANCELLATION REFUND STATE =================
  const [refBookingId, setRefBookingId] = useState(db.bookings[0]?.id || '');
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [refAmount, setRefAmount] = useState<number>(25000);
  const [refMode, setRefMode] = useState('Bank Transfer');
  const [refAccount, setRefAccount] = useState('HDFC Bank Ltd');
  const [refReason, setRefReason] = useState('Customer surrendered plot allocation');

  const handleSaveRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refBookingId || !refAmount) return;

    const currentDb = dbService.getDatabase();
    const b = currentDb.bookings.find((item) => item.id === refBookingId);
    if (!b) return;

    const voucherNumber = `VD-REF-${Date.now().toString().slice(-6)}`;

    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber,
      txnDate: refDate,
      type: 'REFUND_PAYMENT',
      category: 'Customer Cancellation Refund',
      description: `Refund for surrendered ${b.propertyNumber} (${b.projectName}). Reason: ${refReason}`,
      entityType: 'CUSTOMER',
      entityId: b.customerId,
      entityName: b.customerName,
      projectId: b.projectId,
      projectName: b.projectName,
      debit: Number(refAmount),
      credit: 0,
      account: refAccount,
      paymentMode: refMode,
      refNumber: voucherNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.transactions.unshift(journalTxn);
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'CANCELLATION_REFUND_RECORDED',
      'Accounts',
      `Disbursed refund of ₹${refAmount} to ${b.customerName} for ${b.propertyNumber}. Voucher: ${voucherNumber}`
    );

    setIsRefundModalOpen(false);
  };

  // ================= CONTRA TRANSFER STATE =================
  const [contraFromAccount, setContraFromAccount] = useState('HDFC Bank Ltd');
  const [contraToAccount, setContraToAccount] = useState('Cash Account');
  const [contraAmount, setContraAmount] = useState<number>(50000);
  const [contraDate, setContraDate] = useState(new Date().toISOString().split('T')[0]);
  const [contraRef, setContraRef] = useState('');
  const [contraRemarks, setContraRemarks] = useState('Cheque self-withdrawal for office petty cash');

  const handleSaveContra = (e: React.FormEvent) => {
    e.preventDefault();
    if (contraFromAccount === contraToAccount) {
      alert('Source and destination accounts cannot be the same for a transfer.');
      return;
    }
    if (!contraAmount) return;

    const currentDb = dbService.getDatabase();
    const voucherNumber = `VD-CONTRA-${Date.now().toString().slice(-6)}`;

    // Debit the source account (outflow)
    const outflowTxn: FinancialTransaction = {
      id: `txn-${Date.now()}-out`,
      voucherNumber,
      txnDate: contraDate,
      type: 'CONTRA_TRANSFER',
      category: 'Inter-Account Transfer',
      description: `Transfer to ${contraToAccount}`,
      entityType: 'BANK',
      entityName: 'Internal Transfer',
      debit: Number(contraAmount),
      credit: 0,
      account: contraFromAccount,
      paymentMode: 'Internal Contra',
      refNumber: contraRef || voucherNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    // Credit the destination account (inflow)
    const inflowTxn: FinancialTransaction = {
      id: `txn-${Date.now()}-in`,
      voucherNumber,
      txnDate: contraDate,
      type: 'CONTRA_TRANSFER',
      category: 'Inter-Account Transfer',
      description: `Transfer from ${contraFromAccount}`,
      entityType: 'BANK',
      entityName: 'Internal Transfer',
      debit: 0,
      credit: Number(contraAmount),
      account: contraToAccount,
      paymentMode: 'Internal Contra',
      refNumber: contraRef || voucherNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.transactions.unshift(outflowTxn, inflowTxn);
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'CONTRA_TRANSFER_RECORDED',
      'Accounts',
      `Transferred ₹${contraAmount} from ${contraFromAccount} to ${contraToAccount}. Voucher: ${voucherNumber}`
    );

    setIsContraModalOpen(false);
  };

  // ================= REVERSAL HANDLER =================
  const handleConfirmReversal = () => {
    if (!reversalTxn) return;
    if (!reversalReason.trim()) {
      alert('A valid reason is required to reverse an audit financial transaction.');
      return;
    }

    const currentDb = dbService.getDatabase();
    currentDb.transactions = currentDb.transactions.map((t) =>
      t.id === reversalTxn.id
        ? {
            ...t,
            isReversed: true,
            reverseReason: reversalReason.trim(),
          }
        : t
    );

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'FINANCIAL_TXN_REVERSED',
      'Accounts',
      `Reversed transaction ${reversalTxn.voucherNumber} (${reversalTxn.description}). Reason: ${reversalReason}`
    );

    setReversalTxn(null);
    setReversalReason('');
  };

  // Filter transactions
  const filteredTxns = useMemo(() => {
    return db.transactions.filter((t) => {
      const matchesProject = projectFilter === 'ALL' || !t.projectId || t.projectId === projectFilter;
      const matchesDate = (!fromDate || t.txnDate >= fromDate) && (!toDate || t.txnDate <= toDate);
      const matchesSearch =
        t.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.entityName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesProject && matchesDate && matchesSearch;
    });
  }, [db.transactions, projectFilter, fromDate, toDate, searchTerm]);

  // Cash Book transactions (account === 'Cash Account')
  const cashBookTxns = filteredTxns.filter((t) => t.account === 'Cash Account');
  const cashTotalIn = cashBookTxns.filter((t) => !t.isReversed).reduce((s, t) => s + t.credit, 0);
  const cashTotalOut = cashBookTxns.filter((t) => !t.isReversed).reduce((s, t) => s + t.debit, 0);
  const netCashBalance = cashTotalIn - cashTotalOut;

  // Bank Book transactions (account !== 'Cash Account')
  const bankBookTxns = filteredTxns.filter((t) => t.account !== 'Cash Account');
  const bankTotalIn = bankBookTxns.filter((t) => !t.isReversed).reduce((s, t) => s + t.credit, 0);
  const bankTotalOut = bankBookTxns.filter((t) => !t.isReversed).reduce((s, t) => s + t.debit, 0);
  const netBankBalance = bankTotalIn - bankTotalOut;

  // P&L Summary
  const incomeTxns = filteredTxns.filter(
    (t) => (t.type === 'CUSTOMER_RECEIPT' || t.type === 'OTHER_INCOME') && !t.isReversed
  );
  const expenseTxns = filteredTxns.filter(
    (t) =>
      (t.type === 'VENDOR_PAYMENT' ||
        t.type === 'LABOUR_PAYMENT' ||
        t.type === 'LABOUR_ADVANCE' ||
        t.type === 'ADVISER_COMMISSION' ||
        t.type === 'EXPENSE' ||
        t.type === 'REFUND_PAYMENT') &&
      !t.isReversed
  );

  const totalIncome = incomeTxns.reduce((s, t) => s + t.credit, 0);
  const totalExpense = expenseTxns.reduce((s, t) => s + t.debit, 0);
  const netProfitOrLoss = totalIncome - totalExpense;

  // ================= AGING OUTSTANDING BUCKETS =================
  const agingBuckets = useMemo(() => {
    const today = new Date().getTime();
    const buckets = {
      days1To30: { amount: 0, count: 0 },
      days31To60: { amount: 0, count: 0 },
      days61To90: { amount: 0, count: 0 },
      days90Plus: { amount: 0, count: 0 },
      totalDue: 0,
    };

    db.bookings.forEach((b) => {
      if (b.remainingBalance > 0 && b.status !== 'Cancelled') {
        const bookingTime = new Date(b.bookingDate).getTime();
        const diffDays = Math.max(1, Math.floor((today - bookingTime) / (1000 * 60 * 60 * 24)));

        buckets.totalDue += b.remainingBalance;

        if (diffDays <= 30) {
          buckets.days1To30.amount += b.remainingBalance;
          buckets.days1To30.count += 1;
        } else if (diffDays <= 60) {
          buckets.days31To60.amount += b.remainingBalance;
          buckets.days31To60.count += 1;
        } else if (diffDays <= 90) {
          buckets.days61To90.amount += b.remainingBalance;
          buckets.days61To90.count += 1;
        } else {
          buckets.days90Plus.amount += b.remainingBalance;
          buckets.days90Plus.count += 1;
        }
      }
    });

    return buckets;
  }, [db.bookings]);

  // ================= CUSTOMER LEDGER TRANSACTIONS =================
  const customerLedgerData = useMemo(() => {
    const bookings = db.bookings.filter((b) => {
      if (selectedCustomerId !== 'ALL' && b.customerId !== selectedCustomerId) return false;
      if (selectedBookingId !== 'ALL' && b.id !== selectedBookingId) return false;
      return true;
    });

    const receipts = db.customerReceipts.filter((r) => {
      if (selectedCustomerId !== 'ALL' && r.customerId !== selectedCustomerId) return false;
      if (selectedBookingId !== 'ALL' && r.bookingId !== selectedBookingId) return false;
      return true;
    });

    const totalAgreed = bookings.reduce((s, b) => s + b.finalTotalAmount, 0);
    const totalCollected = receipts.reduce((s, r) => s + r.amount, 0);
    const totalBalance = Math.max(0, totalAgreed - totalCollected);

    return { bookings, receipts, totalAgreed, totalCollected, totalBalance };
  }, [db.bookings, db.customerReceipts, selectedCustomerId, selectedBookingId]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Voucher #', 'Type', 'Account', 'Entity / Particulars', 'Debit (Out)', 'Credit (In)', 'Status'];
    const rows = filteredTxns.map((t) => [
      formatDate(t.txnDate),
      t.voucherNumber,
      t.type,
      t.account,
      `${t.entityName} - ${t.description}`,
      t.debit,
      t.credit,
      t.isReversed ? 'REVERSED' : 'ACTIVE',
    ]);
    exportToCSV(`VYAPAR_ONE_DayBook_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <span>Central Accounts & Financial Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Realized cash flows, customer receipts, expense vouchers, cash book, bank book, EMI tracking, and audit journal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ Collect Customer Payment</span>
            </button>
          )}

          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Record General Expense</span>
            </button>
          )}

          <button
            onClick={() => setIsContraModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Contra Transfer</span>
          </button>

          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsOtherIncomeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Other Income</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setSubTab('dashboard')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Accounts Dashboard
        </button>
        <button
          onClick={() => setSubTab('daybook')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'daybook' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Day Book (Journal)
        </button>
        <button
          onClick={() => setSubTab('cashbook')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'cashbook' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cash Book
        </button>
        <button
          onClick={() => setSubTab('bankbook')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'bankbook' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bank Book
        </button>
        <button
          onClick={() => setSubTab('custledger')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'custledger' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Customer Ledger
        </button>
        <button
          onClick={() => setSubTab('expenses')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'expenses' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Categorized Expenses ({db.expenses.length})
        </button>
        <button
          onClick={() => setSubTab('emi')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'emi' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          EMI Installment Tracker
        </button>
        <button
          onClick={() => setSubTab('otherincome')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'otherincome' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Other Income
        </button>
        <button
          onClick={() => setSubTab('vouchers')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'vouchers' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Voucher Register & Print
        </button>
        <button
          onClick={() => setSubTab('plsummary')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'plsummary' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Income vs Expense Summary
        </button>
      </div>

      {/* Date Presets and Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search voucher #, description, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent w-full text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
            <button
              onClick={() => handleDatePresetChange('ALL')}
              className={`px-2 py-1 rounded-md transition-all ${
                datePreset === 'ALL' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleDatePresetChange('TODAY')}
              className={`px-2 py-1 rounded-md transition-all ${
                datePreset === 'TODAY' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDatePresetChange('WEEK')}
              className={`px-2 py-1 rounded-md transition-all ${
                datePreset === 'WEEK' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handleDatePresetChange('MONTH')}
              className={`px-2 py-1 rounded-md transition-all ${
                datePreset === 'MONTH' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handleDatePresetChange('FY')}
              className={`px-2 py-1 rounded-md transition-all ${
                datePreset === 'FY' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              FY 2026-27
            </button>
          </div>

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
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('ALL');
              }}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('ALL');
              }}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* ================= 0. ACCOUNTS DASHBOARD ================= */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 uppercase text-[10px]">Realized Income (Inflow)</span>
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-800 mt-2 font-mono">
                {formatCurrency(totalIncome)}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">{incomeTxns.length} credit vouchers recorded</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-800 uppercase text-[10px]">Total Expenses (Outflow)</span>
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-extrabold text-rose-800 mt-2 font-mono">
                {formatCurrency(totalExpense)}
              </p>
              <p className="text-[11px] text-rose-600 mt-1">Materials, labour, offices & partner payouts</p>
            </div>

            <div className={`p-4 rounded-xl border shadow-2xs ${netProfitOrLoss >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-[10px] text-slate-700">Net Operating Margin</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <p className={`text-2xl font-extrabold mt-2 font-mono ${netProfitOrLoss >= 0 ? 'text-indigo-900' : 'text-amber-800'}`}>
                {formatCurrency(netProfitOrLoss)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Real operating surplus</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-800 uppercase text-[10px]">Total Available Liquidity</span>
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-blue-900 mt-2 font-mono">
                {formatCurrency(netCashBalance + netBankBalance)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-blue-700 mt-1">
                <span>Cash: {formatCurrency(netCashBalance)}</span>
                <span>Bank: {formatCurrency(netBankBalance)}</span>
              </div>
            </div>
          </div>

          {/* Aging Outstanding Buckets for Customer Receivables */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Customer Receivables Aging Analysis (Outstanding Collection Buckets)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Track overdue customer balances by days elapsed since agreement to accelerate cash inflows
                </p>
              </div>
              <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                Total Outstanding: {formatCurrency(agingBuckets.totalDue)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 uppercase text-[10px]">1 - 30 Days (Current)</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-200 text-emerald-900 font-bold">
                    {agingBuckets.days1To30.count} Accounts
                  </span>
                </div>
                <p className="text-xl font-extrabold text-emerald-900 mt-2 font-mono">
                  {formatCurrency(agingBuckets.days1To30.amount)}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">High probability immediate realization</p>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-800 uppercase text-[10px]">31 - 60 Days</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-200 text-blue-900 font-bold">
                    {agingBuckets.days31To60.count} Accounts
                  </span>
                </div>
                <p className="text-xl font-extrabold text-blue-900 mt-2 font-mono">
                  {formatCurrency(agingBuckets.days31To60.amount)}
                </p>
                <p className="text-[10px] text-blue-700 mt-0.5">Follow up reminder letter due</p>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 uppercase text-[10px]">61 - 90 Days</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-200 text-amber-900 font-bold">
                    {agingBuckets.days61To90.count} Accounts
                  </span>
                </div>
                <p className="text-xl font-extrabold text-amber-900 mt-2 font-mono">
                  {formatCurrency(agingBuckets.days61To90.amount)}
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">Formal demand notice recommended</p>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-800 uppercase text-[10px]">90+ Days (Overdue)</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-200 text-rose-900 font-bold">
                    {agingBuckets.days90Plus.count} Accounts
                  </span>
                </div>
                <p className="text-xl font-extrabold text-rose-900 mt-2 font-mono">
                  {formatCurrency(agingBuckets.days90Plus.amount)}
                </p>
                <p className="text-[10px] text-rose-700 mt-0.5">Management review & allocation hold</p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div
              onClick={() => setSubTab('custledger')}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Customer Ledgers</h4>
                  <p className="text-[11px] text-slate-500">Inspect per-plot running statements & print A4 ledgers</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setSubTab('vouchers')}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Printable Vouchers</h4>
                  <p className="text-[11px] text-slate-500">View and print any official receipt, expense or transfer voucher</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setIsRefundModalOpen(true)}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Cancellation Refund</h4>
                  <p className="text-[11px] text-slate-500">Issue official cancellation refund voucher for surrendered plot</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 1. DAY BOOK (JOURNAL) ================= */}
      {subTab === 'daybook' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3 font-mono">Voucher #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Entity & Particulars</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3 text-right">Debit (Payment Out)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Receipt In)</th>
                  <th className="py-2.5 px-3 text-center">Print</th>
                  <th className="py-2.5 px-4 text-center">Status / Reversal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTxns.map((t) => (
                  <tr key={t.id} className={t.isReversed ? 'bg-slate-100/60 line-through opacity-60' : 'hover:bg-slate-50'}>
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(t.txnDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{t.voucherNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{t.account}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800">{t.entityName}</p>
                      <p className="text-[10px] text-slate-500">{t.description}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{t.projectName || 'General'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          setPrintableVoucher({
                            voucherNumber: t.voucherNumber,
                            date: t.txnDate,
                            title: t.debit > 0 ? 'PAYMENT / EXPENSE VOUCHER' : 'RECEIPT VOUCHER',
                            type: t.type,
                            entityName: t.entityName,
                            particulars: t.description,
                            account: t.account,
                            paymentMode: t.paymentMode || 'Standard',
                            refNumber: t.refNumber,
                            debit: t.debit,
                            credit: t.credit,
                            amount: t.debit > 0 ? t.debit : t.credit,
                            projectName: t.projectName,
                            createdBy: t.createdBy,
                          })
                        }
                        title="Print Formal Voucher"
                        className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {t.isReversed ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          REVERSED
                        </span>
                      ) : hasPermission('canDeleteOrReverse') ? (
                        <button
                          onClick={() => setReversalTxn(t)}
                          className="text-[10px] text-slate-500 hover:text-rose-600 font-semibold underline"
                        >
                          Reverse
                        </button>
                      ) : (
                        <span className="text-emerald-700 text-[10px] font-semibold">Posted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 2. CASH BOOK ================= */}
      {subTab === 'cashbook' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-800 uppercase text-[10px]">Total Cash Inflow</span>
              <p className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">
                {formatCurrency(cashTotalIn)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="font-bold text-rose-800 uppercase text-[10px]">Total Cash Outflow</span>
              <p className="text-2xl font-extrabold text-rose-800 mt-1 font-mono">
                {formatCurrency(cashTotalOut)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="font-bold text-indigo-800 uppercase text-[10px]">Net Cash in Hand</span>
              <p className="text-2xl font-extrabold text-indigo-900 mt-1 font-mono">
                {formatCurrency(netCashBalance)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3 font-mono">Voucher #</th>
                  <th className="py-2.5 px-3">Particulars</th>
                  <th className="py-2.5 px-3 text-right">Cash Received (In)</th>
                  <th className="py-2.5 px-3 text-right">Cash Paid (Out)</th>
                  <th className="py-2.5 px-3 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashBookTxns.map((t) => (
                  <tr key={t.id} className={t.isReversed ? 'bg-slate-100/60 line-through opacity-60' : 'hover:bg-slate-50'}>
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(t.txnDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{t.voucherNumber}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800">{t.entityName}</p>
                      <p className="text-[10px] text-slate-500">{t.description}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          setPrintableVoucher({
                            voucherNumber: t.voucherNumber,
                            date: t.txnDate,
                            title: t.debit > 0 ? 'CASH PAYMENT VOUCHER' : 'CASH RECEIPT',
                            type: t.type,
                            entityName: t.entityName,
                            particulars: t.description,
                            account: 'Cash Account',
                            paymentMode: 'Cash',
                            refNumber: t.refNumber,
                            amount: t.debit > 0 ? t.debit : t.credit,
                            projectName: t.projectName,
                            createdBy: t.createdBy,
                          })
                        }
                        className="p-1 text-slate-600 hover:text-indigo-600"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 3. BANK BOOK ================= */}
      {subTab === 'bankbook' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-800 uppercase text-[10px]">Total Bank Deposits</span>
              <p className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">
                {formatCurrency(bankTotalIn)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="font-bold text-rose-800 uppercase text-[10px]">Total Bank Withdrawals</span>
              <p className="text-2xl font-extrabold text-rose-800 mt-1 font-mono">
                {formatCurrency(bankTotalOut)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="font-bold text-indigo-800 uppercase text-[10px]">Current Bank Balance</span>
              <p className="text-2xl font-extrabold text-indigo-900 mt-1 font-mono">
                {formatCurrency(netBankBalance)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3 font-mono">Voucher #</th>
                  <th className="py-2.5 px-3">Bank Account</th>
                  <th className="py-2.5 px-3">Particulars & Ref</th>
                  <th className="py-2.5 px-3 text-right">Deposits (Credit)</th>
                  <th className="py-2.5 px-3 text-right">Withdrawals (Debit)</th>
                  <th className="py-2.5 px-3 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankBookTxns.map((t) => (
                  <tr key={t.id} className={t.isReversed ? 'bg-slate-100/60 line-through opacity-60' : 'hover:bg-slate-50'}>
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(t.txnDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{t.voucherNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{t.account}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800">{t.entityName}</p>
                      <p className="text-[10px] text-slate-500">{t.description} (Ref: {t.refNumber})</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {t.debit > 0 ? formatCurrency(t.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          setPrintableVoucher({
                            voucherNumber: t.voucherNumber,
                            date: t.txnDate,
                            title: t.debit > 0 ? 'BANK WITHDRAWAL VOUCHER' : 'BANK DEPOSIT VOUCHER',
                            type: t.type,
                            entityName: t.entityName,
                            particulars: t.description,
                            account: t.account,
                            paymentMode: t.paymentMode || 'Bank Transfer',
                            refNumber: t.refNumber,
                            amount: t.debit > 0 ? t.debit : t.credit,
                            projectName: t.projectName,
                            createdBy: t.createdBy,
                          })
                        }
                        className="p-1 text-slate-600 hover:text-indigo-600"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 4. CUSTOMER LEDGER ================= */}
      {subTab === 'custledger' && (
        <div className="space-y-5">
          {/* Selector Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Select Customer:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setSelectedBookingId('ALL');
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50"
                >
                  <option value="ALL">All Customers</option>
                  {db.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerId !== 'ALL' && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Specific Plot / Booking:</span>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50"
                  >
                    <option value="ALL">All Plots of Customer</option>
                    {db.bookings
                      .filter((b) => b.customerId === selectedCustomerId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.propertyNumber} - {b.projectName} (Ref: {b.bookingRef})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Customer Ledger Statement</span>
            </button>
          </div>

          {/* Ledger Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-center">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Agreed Value</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
                {formatCurrency(customerLedgerData.totalAgreed)}
              </p>
              <span className="text-[10px] text-slate-400">{customerLedgerData.bookings.length} Bookings</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Payment Collected</span>
              <p className="text-xl font-extrabold text-emerald-800 mt-1 font-mono">
                {formatCurrency(customerLedgerData.totalCollected)}
              </p>
              <span className="text-[10px] text-emerald-600">{customerLedgerData.receipts.length} Receipts</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-700 uppercase font-bold">Outstanding Balance Due</span>
              <p className="text-xl font-extrabold text-rose-700 mt-1 font-mono">
                {formatCurrency(customerLedgerData.totalBalance)}
              </p>
              <span className="text-[10px] text-rose-500">Receivable</span>
            </div>
          </div>

          {/* Detailed Receipts Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Realized Payment Receipts
              </h4>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3 font-mono">Receipt #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Property & Project</th>
                  <th className="py-2.5 px-3 text-right">Amount Received</th>
                  <th className="py-2.5 px-3">Mode & Account</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerLedgerData.receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(r.paymentDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{r.receiptNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{r.customerName}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {r.propertyNumber} ({r.projectName})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.paymentMode} ({r.receivingAccount})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                      {formatCurrency(r.remainingBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          setPrintableVoucher({
                            voucherNumber: r.receiptNumber,
                            date: r.paymentDate,
                            title: 'CUSTOMER PAYMENT RECEIPT',
                            type: 'CUSTOMER_RECEIPT',
                            entityName: r.customerName,
                            particulars: `Payment for ${r.propertyNumber} (${r.projectName}). Balance remaining: ₹${r.remainingBalance.toLocaleString('en-IN')}`,
                            account: r.receivingAccount,
                            paymentMode: r.paymentMode,
                            refNumber: r.transactionRef,
                            amount: r.amount,
                            credit: r.amount,
                            projectName: r.projectName,
                            createdBy: r.createdBy,
                          })
                        }
                        className="p-1 text-slate-600 hover:text-indigo-600"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {customerLedgerData.receipts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No payments recorded for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 5. CATEGORIZED EXPENSES ================= */}
      {subTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3 font-mono">Voucher #</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Paid To / Vendor</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Basic</th>
                <th className="py-2.5 px-3 text-right">GST</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3 text-center">Bill</th>
                <th className="py-2.5 px-3 text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-600">{formatDate(e.expenseDate)}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{e.voucherNumber}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{e.vendorOrPaidTo}</td>
                  <td className="py-2.5 px-3 text-slate-500">{e.description}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(e.amountBeforeGst)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(e.gstAmount)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(e.totalAmount)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{formatCurrency(e.amountPaid)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">{formatCurrency(e.outstandingAmount)}</td>
                  <td className="py-2.5 px-3 text-center">
                    {e.billAttachmentUrl ? (
                      <button
                        onClick={() =>
                          setAttachmentModal({
                            isOpen: true,
                            title: `Expense ${e.voucherNumber} Attachment`,
                            url: e.billAttachmentUrl,
                            name: e.billAttachmentName,
                            date: e.expenseDate,
                          })
                        }
                        className="text-indigo-600 hover:text-indigo-800 p-1"
                      >
                        <Paperclip className="w-4 h-4 inline" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() =>
                        setPrintableVoucher({
                          voucherNumber: e.voucherNumber,
                          date: e.expenseDate,
                          title: 'EXPENSE PAYMENT VOUCHER',
                          type: 'EXPENSE',
                          entityName: e.vendorOrPaidTo,
                          particulars: `${e.category}: ${e.description}`,
                          account: e.account,
                          paymentMode: e.paymentMode,
                          refNumber: e.billNumber,
                          amount: e.amountPaid,
                          debit: e.amountPaid,
                          projectName: e.projectName,
                          createdBy: e.createdBy,
                        })
                      }
                      className="p-1 text-slate-600 hover:text-indigo-600"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 6. EMI MANAGEMENT ================= */}
      {subTab === 'emi' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Customer Installment & EMI Tracking Schedules
              </h4>
              <p className="text-[11px] text-slate-500">Monitor monthly EMI dues, completed installments, and pending tenures</p>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect Installment</span>
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Booking Ref</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Property</th>
                <th className="py-2.5 px-3 text-right">Agreed Price</th>
                <th className="py-2.5 px-3 text-right">Monthly EMI</th>
                <th className="py-2.5 px-3 text-center">Tenure</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.bookings.map((b) => {
                const isEmi = b.emiPlan?.enabled;
                const monthly = b.emiPlan?.monthlyAmount || Math.round(b.remainingBalance / 12);
                const months = b.emiPlan?.numberOfMonths || 12;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{b.bookingRef}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{b.customerName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{b.propertyNumber}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{formatCurrency(b.finalTotalAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                      {formatCurrency(monthly)} /mo
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium">{months} Months</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(b.amountReceived)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {formatCurrency(b.remainingBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {b.remainingBalance <= 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          COMPLETED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {b.remainingBalance > 0 && (
                        <button
                          onClick={() => {
                            setPayBookingId(b.id);
                            setPayAmount(monthly);
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded"
                        >
                          Collect EMI
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 7. OTHER INCOME ================= */}
      {subTab === 'otherincome' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Miscellaneous & Other Operating Income Register
            </h4>
            <button
              onClick={() => setIsOtherIncomeModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Other Income</span>
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3 font-mono">Voucher #</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Received From</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.transactions
                .filter((t) => t.type === 'OTHER_INCOME')
                .map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(t.txnDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{t.voucherNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{t.entityName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{t.description}</td>
                    <td className="py-2.5 px-3 text-slate-700">{t.account}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(t.credit)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          setPrintableVoucher({
                            voucherNumber: t.voucherNumber,
                            date: t.txnDate,
                            title: 'MISCELLANEOUS INCOME RECEIPT',
                            type: 'OTHER_INCOME',
                            entityName: t.entityName,
                            particulars: t.description,
                            account: t.account,
                            paymentMode: t.paymentMode || 'Cash',
                            refNumber: t.refNumber,
                            amount: t.credit,
                            credit: t.credit,
                            createdBy: t.createdBy,
                          })
                        }
                        className="p-1 text-slate-600 hover:text-indigo-600"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 8. CENTRAL VOUCHER REGISTER ================= */}
      {subTab === 'vouchers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Central Voucher Register
              </h4>
              <p className="text-[11px] text-slate-500">Official printable records for every debit and credit voucher</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Voucher List</span>
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3 font-mono">Voucher #</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Particulars & Entity</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Print Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTxns.map((t) => {
                const amt = t.debit > 0 ? t.debit : t.credit;
                const isDebit = t.debit > 0;
                return (
                  <tr key={t.id} className={t.isReversed ? 'bg-slate-100/60 line-through opacity-60' : 'hover:bg-slate-50'}>
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(t.txnDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{t.voucherNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDebit ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800">{t.entityName}</p>
                      <p className="text-[10px] text-slate-500">{t.description}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{t.account}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${isDebit ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatCurrency(amt)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          setPrintableVoucher({
                            voucherNumber: t.voucherNumber,
                            date: t.txnDate,
                            title: isDebit ? 'OFFICIAL PAYMENT VOUCHER' : 'OFFICIAL RECEIPT VOUCHER',
                            type: t.type,
                            entityName: t.entityName,
                            particulars: t.description,
                            account: t.account,
                            paymentMode: t.paymentMode || 'Standard',
                            refNumber: t.refNumber,
                            debit: t.debit,
                            credit: t.credit,
                            amount: amt,
                            projectName: t.projectName,
                            createdBy: t.createdBy,
                          })
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded inline-flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 9. INCOME VS EXPENSE P&L SUMMARY ================= */}
      {subTab === 'plsummary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-800 uppercase text-[10px]">Total Realized Income</span>
              <p className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">
                {formatCurrency(totalIncome)}
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Customer payments, bookings & miscellaneous revenue</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="font-bold text-rose-800 uppercase text-[10px]">Total Operating Expenses</span>
              <p className="text-2xl font-extrabold text-rose-800 mt-1 font-mono">
                {formatCurrency(totalExpense)}
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5">Vendors, materials, wages, office & refunds</p>
            </div>
            <div className={`p-4 rounded-xl border ${netProfitOrLoss >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className="font-bold uppercase text-[10px] text-slate-700">Net Surplus / Operating Margin</span>
              <p className={`text-2xl font-extrabold mt-1 font-mono ${netProfitOrLoss >= 0 ? 'text-indigo-900' : 'text-amber-800'}`}>
                {formatCurrency(netProfitOrLoss)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Real operating liquidity surplus</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: COLLECT CUSTOMER PAYMENT ================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-900 text-white">
              <h3 className="font-semibold text-sm">Collect Customer Payment / Installment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePaymentCollection} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer Booking *</label>
                <select
                  value={payBookingId}
                  onChange={(e) => {
                    setPayBookingId(e.target.value);
                    const b = db.bookings.find((item) => item.id === e.target.value);
                    if (b) {
                      setPayAmount(Math.min(50000, b.remainingBalance || 50000));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {db.bookings
                    .filter((b) => b.status !== 'Cancelled')
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.customerName} - {b.propertyNumber} ({b.projectName}) [Bal: ₹{b.remainingBalance.toLocaleString('en-IN')}]
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-emerald-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={payMode}
                    onChange={(e) => {
                      setPayMode(e.target.value);
                      if (e.target.value === 'Cash') setPayAccount('Cash Account');
                      else setPayAccount('HDFC Bank Ltd');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash in Hand</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiving Account</label>
                  <select
                    value={payAccount}
                    onChange={(e) => setPayAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                    <option value="Cash Account">Cash in Hand</option>
                    <option value="SBI Bank Ltd">State Bank of India</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR198471203"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Installment remarks"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">
                  Save & Generate Official Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD GENERAL EXPENSE ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Record General Expense / Voucher</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Site</label>
                  <select
                    value={expProjectId}
                    onChange={(e) => setExpProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {db.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Office Expense">Office Expense</option>
                    <option value="Electricity">Electricity / Power</option>
                    <option value="Transport">Transport / Fuel / Machinery</option>
                    <option value="Maintenance">Maintenance & Repairs</option>
                    <option value="Government & Legal">Government / Sanction / Legal</option>
                    <option value="Material Expense">Material Expense</option>
                    <option value="Labour Expense">Labour Expense</option>
                    <option value="Other Expense">Other Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor / Paid To *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MSEDCL or Mahalaxmi JCB"
                    value={expPaidTo}
                    onChange={(e) => setExpPaidTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Particulars *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Site electricity meter deposit"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Before GST</label>
                  <input
                    type="number"
                    required
                    value={expAmountBeforeGst || ''}
                    onChange={(e) => setExpAmountBeforeGst(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST (₹)</label>
                  <input
                    type="number"
                    value={expGstAmount || ''}
                    onChange={(e) => setExpGstAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Bill</label>
                  <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono font-bold text-slate-900">
                    {formatCurrency(expTotal)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">Amount Paid Now (₹) *</label>
                  <input
                    type="number"
                    value={expAmountPaid || ''}
                    onChange={(e) => setExpAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paid From Account</label>
                  <select
                    value={expAccount}
                    onChange={(e) => setExpAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Cash Account">Cash in Hand</option>
                    <option value="HDFC Bank Ltd">HDFC Bank Ltd (Current A/C)</option>
                    <option value="SBI Bank Ltd">State Bank of India</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attach Scanned Bill / Voucher Photo</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setExpAttachmentUrl(reader.result as string);
                        setExpAttachmentName(file.name);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                  Save Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONTRA TRANSFER ================= */}
      {isContraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Contra Inter-Account Transfer</h3>
              <button onClick={() => setIsContraModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveContra} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
                An internal contra transfer updates cash/bank liquidity balances without altering company income or expenses.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Account (Source)</label>
                  <select
                    value={contraFromAccount}
                    onChange={(e) => setContraFromAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                    <option value="Cash Account">Cash in Hand</option>
                    <option value="SBI Bank Ltd">State Bank of India</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Account (Destination)</label>
                  <select
                    value={contraToAccount}
                    onChange={(e) => setContraToAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Cash Account">Cash in Hand</option>
                    <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                    <option value="SBI Bank Ltd">State Bank of India</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">Transfer Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={contraAmount || ''}
                    onChange={(e) => setContraAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transfer Date</label>
                  <input
                    type="date"
                    value={contraDate}
                    onChange={(e) => setContraDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cheque / UTR Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Cheque No 881290"
                  value={contraRef}
                  onChange={(e) => setContraRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContraModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                  Execute Contra Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD OTHER INCOME ================= */}
      {isOtherIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-900 text-white">
              <h3 className="font-semibold text-sm">Record Miscellaneous / Other Income</h3>
              <button onClick={() => setIsOtherIncomeModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveOtherIncome} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Site Visit Fee">Site Visit & Survey Fee</option>
                    <option value="Transfer & Legal Fee">Transfer & Legal Fee</option>
                    <option value="Scrap & Salvage Sale">Scrap & Salvage Material Sale</option>
                    <option value="Partner Capital Injection">Partner Capital Injection</option>
                    <option value="Bank Interest">Bank Interest & Dividends</option>
                    <option value="Other Income">Other Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={incDate}
                    onChange={(e) => setIncDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Received From (Payer Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Deshmukh (Prospective Buyer)"
                  value={incPayer}
                  onChange={(e) => setIncPayer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={incAmount || ''}
                    onChange={(e) => setIncAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiving Account</label>
                  <select
                    value={incAccount}
                    onChange={(e) => setIncAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Cash Account">Cash in Hand</option>
                    <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                    <option value="SBI Bank Ltd">State Bank of India</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Particulars / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Site vehicle visit charges for family of 5"
                  value={incDescription}
                  onChange={(e) => setIncDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOtherIncomeModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">
                  Save Income Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CANCELLATION REFUND ================= */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-rose-900 text-white">
              <h3 className="font-semibold text-sm">Customer Cancellation Refund Voucher</h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRefund} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer Booking *</label>
                <select
                  value={refBookingId}
                  onChange={(e) => setRefBookingId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {db.bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.customerName} - {b.propertyNumber} ({b.projectName}) [Paid: ₹{b.amountReceived.toLocaleString('en-IN')}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">Refund Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={refAmount || ''}
                    onChange={(e) => setRefAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg font-mono font-bold text-rose-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Refund Date</label>
                  <input
                    type="date"
                    value={refDate}
                    onChange={(e) => setRefDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Refund Account</label>
                  <select
                    value={refAccount}
                    onChange={(e) => setRefAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                    <option value="Cash Account">Cash in Hand</option>
                    <option value="SBI Bank Ltd">State Bank of India</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={refMode}
                    onChange={(e) => setRefMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash in Hand</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Refund / Surrender</label>
                <textarea
                  rows={2}
                  required
                  value={refReason}
                  onChange={(e) => setRefReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold">
                  Post Refund Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE VOUCHER / RECEIPT ================= */}
      {printableVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-300 overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400" />
                <span>{printableVoucher.title}</span>
              </h3>
              <button onClick={() => setPrintableVoucher(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formal Printable Document Area */}
            <div className="p-6 space-y-4 text-xs font-sans border-b border-slate-200">
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                  {db.company?.name || 'VYAPAR ONE ERP'}
                </h2>
                <p className="text-[11px] text-slate-500">{db.company?.address || 'Corporate Real Estate & Construction ERP'}</p>
                <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 mt-0.5">
                  <span>GSTIN: {db.company?.gstNumber || '27AABCU9603R1ZX'}</span>
                  <span>•</span>
                  <span>RERA: {db.company?.reraNumber || 'MAHARERA/P52000012345'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Voucher Number</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{printableVoucher.voucherNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date of Issue</span>
                  <span className="font-semibold text-slate-800">{formatDate(printableVoucher.date)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-medium">Entity / Particulars:</span>
                  <span className="font-bold text-slate-900">{printableVoucher.entityName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-medium">Voucher Classification:</span>
                  <span className="font-semibold text-indigo-700">{printableVoucher.type}</span>
                </div>
                {printableVoucher.projectName && (
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span className="text-slate-500 font-medium">Project Site:</span>
                    <span className="font-semibold text-slate-800">{printableVoucher.projectName}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-medium">Account / Ledger:</span>
                  <span className="font-semibold text-slate-800">{printableVoucher.account}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-medium">Payment Mode & Ref:</span>
                  <span className="font-mono text-slate-800">
                    {printableVoucher.paymentMode} {printableVoucher.refNumber ? `(Ref: ${printableVoucher.refNumber})` : ''}
                  </span>
                </div>
                <div className="border-b border-slate-100 py-1.5">
                  <span className="text-slate-500 font-medium block">Description / Remarks:</span>
                  <span className="text-slate-700 italic">{printableVoucher.particulars}</span>
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-indigo-700 uppercase font-bold block">Total Transaction Value</span>
                  <span className="text-xl font-extrabold text-indigo-950 font-mono">
                    {formatCurrency(printableVoucher.amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Realized & Posted</span>
                  </span>
                </div>
              </div>

              {/* Signature Row */}
              <div className="pt-6 grid grid-cols-2 gap-6 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1">
                  <span>Prepared By: {printableVoucher.createdBy || currentUser.name}</span>
                </div>
                <div className="border-t border-slate-300 pt-1 font-bold text-slate-800">
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setPrintableVoucher(null)}
                className="px-3.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TRANSACTION REVERSAL ================= */}
      {reversalTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-rose-900 text-white">
              <h3 className="font-semibold text-sm">Reverse Financial Transaction</h3>
              <button onClick={() => setReversalTxn(null)} className="text-rose-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-700">
                Are you sure you want to reverse voucher <strong>{reversalTxn.voucherNumber}</strong> ({reversalTxn.description})?
              </p>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                ERP Audit Enforcement: Reversals are permanently recorded in the audit trail with the authorizer's name and cannot be undone.
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mandatory Reversal Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Duplicate entry by operator / Cheque bounced"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setReversalTxn(null)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReversal}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                >
                  Confirm Reversal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Viewer */}
      <AttachmentViewerModal
        isOpen={attachmentModal.isOpen}
        onClose={() => setAttachmentModal({ isOpen: false, title: '' })}
        title={attachmentModal.title}
        attachmentUrl={attachmentModal.url}
        attachmentName={attachmentModal.name}
        uploadDate={attachmentModal.date}
      />
    </div>
  );
};
