import React, { useState } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import { Vendor, MaterialPurchaseBill, VendorPayment, FinancialTransaction } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  Store,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  History,
  X,
  Check,
  Receipt,
  Layers,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';

interface VendorManagementViewProps {
  db: DatabaseState;
}

export const VendorManagementView: React.FC<VendorManagementViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();

  // Active sub-tab: 'directory' | 'bills' | 'payments' | 'ledger'
  const [subTab, setSubTab] = useState<'directory' | 'bills' | 'payments' | 'ledger'>('directory');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [billTypeFilter, setBillTypeFilter] = useState<'ALL' | 'GST' | 'NON_GST'>('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState<Vendor | null>(
    db.vendors[0] || null
  );

  // Vendor Action States
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);

  // Bill Action States
  const [viewingBill, setViewingBill] = useState<MaterialPurchaseBill | null>(null);
  const [editingBill, setEditingBill] = useState<MaterialPurchaseBill | null>(null);
  const [historyBill, setHistoryBill] = useState<MaterialPurchaseBill | null>(null);
  const [deletingBill, setDeletingBill] = useState<MaterialPurchaseBill | null>(null);

  // Modals
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Vendor Form State
  const [vName, setVName] = useState('');
  const [vBusinessName, setVBusinessName] = useState('');
  const [vContactPerson, setVContactPerson] = useState('');
  const [vMobile, setVMobile] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vAddress, setVAddress] = useState('');
  const [vGstNumber, setVGstNumber] = useState('');
  const [vType, setVType] = useState('Material Supplier');
  const [vOpeningBalance, setVOpeningBalance] = useState<number>(0);
  const [vRemarks, setVRemarks] = useState('');

  // Bill Form State
  const [bVendorId, setBVendorId] = useState(db.vendors[0]?.id || '');
  const [bProjectId, setBProjectId] = useState(db.projects[0]?.id || '');
  const [bBillNumber, setBBillNumber] = useState('');
  const [bBillDate, setBBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [bIsGstBill, setBIsGstBill] = useState(true);
  const [bItemDescription, setBItemDescription] = useState('Building Materials / Aggregates Delivery');
  const [bBasicAmount, setBBasicAmount] = useState<number>(50000);
  const [bGstPercentage, setBGstPercentage] = useState<number>(18);
  const [bAmountPaid, setBAmountPaid] = useState<number>(0);
  const [bPaymentDueDate, setBPaymentDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [bRemarks, setBRemarks] = useState('');

  // Payment Form State
  const [pVendorId, setPVendorId] = useState(db.vendors[0]?.id || '');
  const [pBillId, setPBillId] = useState('');
  const [pAmount, setPAmount] = useState<number>(25000);
  const [pDate, setPDate] = useState(new Date().toISOString().split('T')[0]);
  const [pMode, setPMode] = useState('Bank Transfer');
  const [pBankAccount, setPBankAccount] = useState('HDFC Bank Ltd');
  const [pRef, setPRef] = useState('');
  const [pRemarks, setPRemarks] = useState('');

  // Calculations for current Bill modal
  const bGstAmount = bIsGstBill ? Math.round((bBasicAmount * bGstPercentage) / 100) : 0;
  const bTotalAmount = bBasicAmount + bGstAmount;
  const bOutstanding = Math.max(0, bTotalAmount - bAmountPaid);

  // Open Add Vendor
  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setVName('');
    setVBusinessName('');
    setVContactPerson('');
    setVMobile('');
    setVEmail('');
    setVAddress('');
    setVGstNumber('');
    setVType('Material Supplier');
    setVOpeningBalance(0);
    setVRemarks('');
    setIsAddVendorModalOpen(true);
  };

  const handleOpenEditVendor = (ven: Vendor) => {
    setEditingVendor(ven);
    setVName(ven.name);
    setVBusinessName(ven.businessName);
    setVContactPerson(ven.contactPerson);
    setVMobile(ven.mobileNumber);
    setVEmail(ven.email);
    setVAddress(ven.address);
    setVGstNumber(ven.gstNumber);
    setVType(ven.vendorType || 'Material Supplier');
    setVOpeningBalance(ven.openingBalance);
    setVRemarks(ven.remarks);
    setIsAddVendorModalOpen(true);
  };

  // Save Vendor
  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim() || !vMobile.trim()) {
      alert('Vendor Name and Mobile are required.');
      return;
    }

    const currentDb = dbService.getDatabase();

    if (editingVendor) {
      currentDb.vendors = currentDb.vendors.map((v) =>
        v.id === editingVendor.id
          ? {
              ...v,
              name: vName.trim(),
              businessName: vBusinessName.trim() || vName.trim(),
              contactPerson: vContactPerson.trim() || vName.trim(),
              mobileNumber: vMobile.trim(),
              email: vEmail.trim(),
              address: vAddress.trim(),
              gstNumber: vGstNumber.trim().toUpperCase(),
              vendorType: vType,
              remarks: vRemarks,
            }
          : v
      );
      dbService.logAudit(currentUser.name, 'VENDOR_UPDATED', 'Vendor Management', `Updated vendor ${vName}`);
    } else {
      const newVen: Vendor = {
        id: `ven-${Date.now()}`,
        name: vName.trim(),
        businessName: vBusinessName.trim() || vName.trim(),
        contactPerson: vContactPerson.trim() || vName.trim(),
        mobileNumber: vMobile.trim(),
        email: vEmail.trim(),
        address: vAddress.trim(),
        gstNumber: vGstNumber.trim().toUpperCase(),
        vendorType: vType,
        openingBalance: Number(vOpeningBalance) || 0,
        currentOutstanding: Number(vOpeningBalance) || 0,
        status: 'Active',
        remarks: vRemarks,
        createdAt: new Date().toISOString().split('T')[0],
      };
      currentDb.vendors.push(newVen);
      dbService.logAudit(
        currentUser.name,
        'VENDOR_CREATED',
        'Vendor Management',
        `Registered vendor ${newVen.name} (${newVen.gstNumber ? 'GST: ' + newVen.gstNumber : 'Non-GST'})`
      );
    }

    dbService.saveDatabase(currentDb);
    setIsAddVendorModalOpen(false);
  };

  // Save Bill
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bBillNumber.trim() || !bVendorId) {
      alert('Bill Number and Vendor are required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const vendor = currentDb.vendors.find((v) => v.id === bVendorId);
    const project = currentDb.projects.find((p) => p.id === bProjectId);

    const newBill: MaterialPurchaseBill = {
      id: `bill-${Date.now()}`,
      billNumber: bBillNumber.trim().toUpperCase(),
      billDate: bBillDate,
      projectId: bProjectId,
      projectName: project ? project.name : 'Project',
      vendorId: bVendorId,
      vendorName: vendor ? vendor.name : 'Vendor',
      isGstBill: bIsGstBill,
      items: [
        {
          materialName: bItemDescription,
          quantity: 1,
          unit: 'Lot',
          ratePerUnit: bBasicAmount,
          basicAmount: bBasicAmount,
          gstPercentage: bIsGstBill ? bGstPercentage : 0,
          gstAmount: bGstAmount,
          totalAmount: bTotalAmount,
        },
      ],
      basicAmount: bBasicAmount,
      gstAmount: bGstAmount,
      billTotal: bTotalAmount,
      amountPaid: Number(bAmountPaid) || 0,
      outstandingAmount: bOutstanding,
      paymentDueDate: bPaymentDueDate,
      paymentMode: bAmountPaid > 0 ? 'Bank Transfer' : 'Credit',
      remarks: bRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.materialPurchases.unshift(newBill);

    // Update vendor outstanding
    if (vendor) {
      vendor.currentOutstanding = (vendor.currentOutstanding || 0) + bOutstanding;
    }

    // Record central transaction if any amount was paid upfront
    if (bAmountPaid > 0) {
      const txn: FinancialTransaction = {
        id: `txn-${Date.now()}`,
        voucherNumber: `VP-${bBillNumber.trim().toUpperCase()}`,
        txnDate: bBillDate,
        type: 'VENDOR_PAYMENT',
        category: 'Material Vendor Payment',
        description: `Upfront payment against bill ${newBill.billNumber} to ${newBill.vendorName}`,
        entityType: 'VENDOR',
        entityId: bVendorId,
        entityName: newBill.vendorName,
        projectId: bProjectId,
        projectName: newBill.projectName,
        debit: Number(bAmountPaid),
        credit: 0,
        account: 'HDFC Bank Ltd',
        paymentMode: 'Bank Transfer',
        refNumber: newBill.billNumber,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentUser.name,
      };
      currentDb.transactions.unshift(txn);
    }

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'VENDOR_BILL_CREATED',
      'Vendor Management',
      `Recorded ${bIsGstBill ? 'GST' : 'Non-GST'} bill ${newBill.billNumber} for ${newBill.vendorName} - Total: ₹${bTotalAmount}`
    );

    setIsAddBillModalOpen(false);
  };

  // Save Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pAmount || !pVendorId) {
      alert('Please select Vendor and enter Amount.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const vendor = currentDb.vendors.find((v) => v.id === pVendorId);
    if (!vendor) return;

    const voucherNumber = `VND-PAY-${Date.now().toString().slice(-6)}`;

    const payment: VendorPayment = {
      id: `vp-${Date.now()}`,
      voucherNumber,
      vendorId: pVendorId,
      vendorName: vendor.name,
      billId: pBillId || undefined,
      paymentDate: pDate,
      amount: Number(pAmount),
      paymentMode: pMode,
      bankAccount: pBankAccount,
      transactionRef: pRef || voucherNumber,
      remarks: pRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.vendorPayments.unshift(payment);

    // Deduct vendor outstanding
    vendor.currentOutstanding = Math.max(0, (vendor.currentOutstanding || 0) - Number(pAmount));

    // If payment was against a specific bill, adjust bill's outstanding
    if (pBillId) {
      const bill = currentDb.materialPurchases.find((b) => b.id === pBillId);
      if (bill) {
        bill.amountPaid += Number(pAmount);
        bill.outstandingAmount = Math.max(0, bill.billTotal - bill.amountPaid);
      }
    }

    // Financial Transaction
    const txn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber,
      txnDate: pDate,
      type: 'VENDOR_PAYMENT',
      category: 'Material Vendor Payment',
      description: `Payment to ${vendor.name} (${pRemarks || 'Vendor settlement'})`,
      entityType: 'VENDOR',
      entityId: vendor.id,
      entityName: vendor.name,
      debit: Number(pAmount),
      credit: 0,
      account: pBankAccount,
      paymentMode: pMode,
      refNumber: pRef || voucherNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.transactions.unshift(txn);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'VENDOR_PAYMENT_RECORDED',
      'Vendor Management',
      `Paid ₹${pAmount} to ${vendor.name} via ${pMode}`
    );

    setIsPaymentModalOpen(false);
  };

  // Filtered Bills
  const filteredBills = db.materialPurchases.filter((bill) => {
    const matchesSearch =
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'ALL' || bill.projectId === projectFilter;
    const matchesType =
      billTypeFilter === 'ALL' ||
      (billTypeFilter === 'GST' && bill.isGstBill) ||
      (billTypeFilter === 'NON_GST' && !bill.isGstBill);
    return matchesSearch && matchesProject && matchesType;
  });

  // Export Bills CSV
  const handleExportBillsCSV = () => {
    const headers = [
      'Bill Date',
      'Bill Number',
      'Vendor Name',
      'Project',
      'Bill Classification',
      'Basic Amount',
      'GST Amount',
      'Bill Total',
      'Amount Paid',
      'Outstanding Amount',
      'Due Date',
    ];
    const rows = filteredBills.map((b) => [
      formatDate(b.billDate),
      b.billNumber,
      b.vendorName,
      b.projectName,
      b.isGstBill ? 'GST Bill' : 'Non-GST Bill',
      b.basicAmount,
      b.gstAmount,
      b.billTotal,
      b.amountPaid,
      b.outstandingAmount,
      b.paymentDueDate ? formatDate(b.paymentDueDate) : '-',
    ]);
    exportToCSV(`Vendor_Bills_Report_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // Metrics
  const totalVendorBillsAmount = db.materialPurchases.reduce((s, b) => s + b.billTotal, 0);
  const gstBillsAmount = db.materialPurchases.filter((b) => b.isGstBill).reduce((s, b) => s + b.billTotal, 0);
  const nonGstBillsAmount = db.materialPurchases.filter((b) => !b.isGstBill).reduce((s, b) => s + b.billTotal, 0);
  const totalVendorOutstanding = db.vendors.reduce((s, v) => s + (v.currentOutstanding || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            <span>Vendor Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated vendor master, GST vs Non-GST bill tracking, vendor payment vouchers, and ledger statements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canCreate') && (
            <>
              <button
                onClick={handleOpenAddVendor}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Vendor</span>
              </button>
              <button
                onClick={() => setIsAddBillModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>+ Enter Bill</span>
              </button>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Pay Vendor</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 font-medium">Total Registered Vendors</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{db.vendors.length}</p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-2xs">
          <span className="text-indigo-700 font-medium">GST Invoiced Total</span>
          <p className="text-xl font-extrabold text-indigo-900 mt-1 font-mono">
            {formatCurrency(gstBillsAmount)}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-amber-700 font-medium">Non-GST / Cash Bills</span>
          <p className="text-xl font-extrabold text-amber-900 mt-1 font-mono">
            {formatCurrency(nonGstBillsAmount)}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-rose-700 font-medium">Current Total Payable</span>
          <p className="text-xl font-extrabold text-rose-700 mt-1 font-mono">
            {formatCurrency(totalVendorOutstanding)}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setSubTab('directory')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            subTab === 'directory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Vendor Directory ({db.vendors.length})</span>
        </button>
        <button
          onClick={() => setSubTab('bills')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            subTab === 'bills'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Bills (GST & Non-GST)</span>
        </button>
        <button
          onClick={() => setSubTab('payments')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            subTab === 'payments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Payment Vouchers</span>
        </button>
        <button
          onClick={() => setSubTab('ledger')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            subTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Vendor Ledger Statement</span>
        </button>
      </div>

      {/* SUBTAB 1: VENDOR DIRECTORY */}
      {subTab === 'directory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendor name, contact, GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent w-full text-slate-800 placeholder-slate-400 focus:outline-hidden"
              />
            </div>
            <span className="text-slate-500 font-medium">
              Showing {db.vendors.length} registered vendors
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Vendor / Firm Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Contact Person</th>
                  <th className="py-2.5 px-3">Mobile & Address</th>
                  <th className="py-2.5 px-3">GSTIN Classification</th>
                  <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.vendors
                  .filter(
                    (v) =>
                      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      v.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      v.mobileNumber.includes(searchTerm) ||
                      v.gstNumber.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((vendor) => {
                    const hasGst = Boolean(vendor.gstNumber && vendor.gstNumber.trim().length > 0);
                    const billsCount = db.materialPurchases.filter((b) => b.vendorId === vendor.id).length;
                    return (
                      <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{vendor.name}</p>
                          <p className="text-[10px] text-slate-500">{vendor.businessName}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {vendor.vendorType || 'Supplier'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{vendor.contactPerson}</td>
                        <td className="py-3 px-3 text-slate-600">
                          <div className="font-mono text-slate-800">{vendor.mobileNumber}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {vendor.address}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {hasGst ? (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              GST: {vendor.gstNumber}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Non-GST Vendor
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(vendor.currentOutstanding || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingVendor(vendor)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                              title="View Vendor Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedVendorForLedger(vendor);
                                setSubTab('ledger');
                              }}
                              className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                              title="View Vendor Ledger"
                            >
                              Ledger ({billsCount})
                            </button>
                            {hasPermission('canEdit') && (
                              <button
                                onClick={() => handleOpenEditVendor(vendor)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md"
                                title="Edit Vendor Profile"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPermission('canDeleteOrReverse') && (
                              <button
                                onClick={() => setDeletingVendor(vendor)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                title="Safe Delete Vendor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BILLS WITH GST VS NON-GST FILTER */}
      {subTab === 'bills' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search bill number or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent w-full text-slate-800 placeholder-slate-400 focus:outline-hidden"
              />
            </div>

            {/* GST Classification Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Bill Type:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setBillTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    billTypeFilter === 'ALL'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Bills
                </button>
                <button
                  onClick={() => setBillTypeFilter('GST')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    billTypeFilter === 'GST'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  GST Bills
                </button>
                <button
                  onClick={() => setBillTypeFilter('NON_GST')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    billTypeFilter === 'NON_GST'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Non-GST Bills
                </button>
              </div>
            </div>

            {/* Project Filter */}
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

            <button
              onClick={handleExportBillsCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Bill Date</th>
                    <th className="py-2.5 px-3">Bill Number</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3 text-center">Classification</th>
                    <th className="py-2.5 px-3 text-right">Basic (₹)</th>
                    <th className="py-2.5 px-3 text-right">GST (₹)</th>
                    <th className="py-2.5 px-3 text-right">Bill Total (₹)</th>
                    <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                    <th className="py-2.5 px-3">Due Date & Status</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.map((bill) => {
                    const isFullyPaid = bill.outstandingAmount <= 0;
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isOverdue = !isFullyPaid && bill.paymentDueDate && bill.paymentDueDate < todayStr;
                    const isDueToday = !isFullyPaid && bill.paymentDueDate === todayStr;

                    return (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-700">{formatDate(bill.billDate)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{bill.billNumber}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{bill.vendorName}</td>
                        <td className="py-3 px-3 text-slate-600">{bill.projectName}</td>
                        <td className="py-3 px-3 text-center">
                          {bill.isGstBill ? (
                            <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              GST Bill
                            </span>
                          ) : (
                            <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Non-GST
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(bill.basicAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(bill.gstAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(bill.billTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                          {formatCurrency(bill.amountPaid)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(bill.outstandingAmount)}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <div>{bill.paymentDueDate ? formatDate(bill.paymentDueDate) : '-'}</div>
                          {isOverdue && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                              OVERDUE
                            </span>
                          )}
                          {isDueToday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              DUE TODAY
                            </span>
                          )}
                          {isFullyPaid && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              SETTLED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingBill(bill)}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                              title="Inspect Bill Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {hasPermission('canEdit') && (
                              <button
                                onClick={() => setEditingBill(bill)}
                                className="p-1 text-slate-500 hover:text-blue-600 rounded"
                                title="Edit Bill Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setHistoryBill(bill)}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded"
                              title="View Payment History against this Bill"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            {hasPermission('canDeleteOrReverse') && (
                              <button
                                onClick={() => setDeletingBill(bill)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Safe Delete Bill"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBills.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                        No vendor bills found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: PAYMENT VOUCHERS */}
      {subTab === 'payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-xs">
              Vendor Payment Vouchers Log
            </span>
            <span className="text-slate-500 font-mono">
              Total Payments Made: {db.vendorPayments.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Voucher No</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Against Bill</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Bank / Cash</th>
                  <th className="py-2.5 px-3">Reference / UTR</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.vendorPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-700">{formatDate(p.paymentDate)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{p.voucherNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{p.vendorName}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{p.billNumber || '-'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{p.paymentMode}</td>
                    <td className="py-3 px-3 text-slate-600">{p.bankAccount}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{p.transactionRef}</td>
                    <td className="py-3 px-3 text-slate-600">{p.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: INDIVIDUAL VENDOR LEDGER */}
      {subTab === 'ledger' && selectedVendorForLedger && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-600">Select Vendor:</span>
              <select
                value={selectedVendorForLedger.id}
                onChange={(e) => {
                  const ven = db.vendors.find((v) => v.id === e.target.value);
                  if (ven) setSelectedVendorForLedger(ven);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
              >
                {db.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.businessName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Vendor Ledger Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-2">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{selectedVendorForLedger.name}</h3>
                <p className="text-xs text-slate-500">
                  {selectedVendorForLedger.businessName} | GSTIN:{' '}
                  <strong className="font-mono text-slate-800">
                    {selectedVendorForLedger.gstNumber || 'Unregistered'}
                  </strong>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mobile: {selectedVendorForLedger.mobileNumber} | Address: {selectedVendorForLedger.address}
                </p>
              </div>

              <div className="text-right bg-rose-50 border border-rose-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-rose-700 uppercase">
                  Net Outstanding Balance
                </span>
                <p className="text-xl font-mono font-extrabold text-rose-700">
                  {formatCurrency(selectedVendorForLedger.currentOutstanding || 0)}
                </p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Ref / Voucher</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Debit (Bill Total)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Payment)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening Balance */}
                  <tr className="bg-slate-50/50 font-semibold">
                    <td className="py-2.5 px-3 text-slate-500">2026-01-01</td>
                    <td className="py-2.5 px-3 text-slate-500">OPENING</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">-</td>
                    <td className="py-2.5 px-3 text-slate-700">Opening Balance Brought Forward</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(selectedVendorForLedger.openingBalance || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                  </tr>

                  {/* Bills for this vendor */}
                  {db.materialPurchases
                    .filter((b) => b.vendorId === selectedVendorForLedger.id)
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono">{formatDate(b.billDate)}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-700">
                          {b.isGstBill ? 'GST BILL' : 'NON-GST BILL'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{b.billNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          Materials supplied for {b.projectName} ({b.items?.[0]?.materialName || 'Goods'})
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(b.billTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                      </tr>
                    ))}

                  {/* Payments for this vendor */}
                  {db.vendorPayments
                    .filter((p) => p.vendorId === selectedVendorForLedger.id)
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono">{formatDate(p.paymentDate)}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">PAYMENT</td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{p.voucherNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          Paid via {p.paymentMode} ({p.bankAccount}) - Ref: {p.transactionRef}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT VENDOR */}
      {isAddVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingVendor ? 'Edit Vendor Profile' : 'Register New Vendor'}
              </h3>
              <button onClick={() => setIsAddVendorModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vendor / Enterprise Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balaji Stone Crushers"
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Dnyaneshwar Borse"
                    value={vContactPerson}
                    onChange={(e) => setVContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digits"
                    value={vMobile}
                    onChange={(e) => setVMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (If GST biller)</label>
                  <input
                    type="text"
                    placeholder="27AAGCB5544E1ZT"
                    value={vGstNumber}
                    onChange={(e) => setVGstNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor Type</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Material Supplier">Material Supplier</option>
                    <option value="Transporter / Dumper">Transporter / Dumper</option>
                    <option value="Earthmover / JCB">Earthmover / JCB</option>
                    <option value="Civil Contractor">Civil Contractor</option>
                    <option value="Hardware & Sanitary">Hardware & Sanitary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office / Quarry Address</label>
                <input
                  type="text"
                  placeholder="Gat / Survey, Road, City"
                  value={vAddress}
                  onChange={(e) => setVAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {!editingVendor && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Payable Balance (₹)</label>
                  <input
                    type="number"
                    value={vOpeningBalance}
                    onChange={(e) => setVOpeningBalance(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVendorModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingVendor ? 'Update Vendor' : 'Save Vendor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENTER VENDOR BILL (GST VS NON-GST) */}
      {isAddBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Enter Vendor Purchase Bill</h3>
              <button onClick={() => setIsAddBillModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="p-5 space-y-3.5 text-xs">
              {/* GST vs Non-GST Classification Pill Switch */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Invoice Classification</span>
                  <span className="text-[11px] text-slate-500">
                    {bIsGstBill ? 'Tax invoice with GST breakdown' : 'Non-GST / Cash challan bill'}
                  </span>
                </div>
                <div className="flex items-center bg-slate-200 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBIsGstBill(true)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      bIsGstBill ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    GST Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setBIsGstBill(false)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      !bIsGstBill ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Non-GST
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Vendor *</label>
                  <select
                    value={bVendorId}
                    onChange={(e) => setBVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {db.vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Site *</label>
                  <select
                    value={bProjectId}
                    onChange={(e) => setBProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
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
                  <label className="block font-semibold text-slate-700 mb-1">Bill / Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAL-2026-99"
                    value={bBillNumber}
                    onChange={(e) => setBBillNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bill Date *</label>
                  <input
                    type="date"
                    required
                    value={bBillDate}
                    onChange={(e) => setBBillDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Description</label>
                <input
                  type="text"
                  value={bItemDescription}
                  onChange={(e) => setBItemDescription(e.target.value)}
                  placeholder="Goods supplied"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Basic Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={bBasicAmount}
                    onChange={(e) => setBBasicAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                {bIsGstBill ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                    <select
                      value={bGstPercentage}
                      onChange={(e) => setBGstPercentage(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    >
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GST Amount</label>
                    <input
                      type="text"
                      disabled
                      value="₹0 (Non-GST)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-400 font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Bill (₹)</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(bTotalAmount)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid Upfront (₹)</label>
                  <input
                    type="number"
                    value={bAmountPaid}
                    onChange={(e) => setBAmountPaid(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={bPaymentDueDate}
                    onChange={(e) => setBPaymentDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBillModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-black shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD VENDOR PAYMENT */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Vendor Payment Voucher</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-emerald-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Vendor *</label>
                <select
                  value={pVendorId}
                  onChange={(e) => setPVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {db.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Outstanding: {formatCurrency(v.currentOutstanding || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={pAmount}
                    onChange={(e) => setPAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={pDate}
                    onChange={(e) => setPDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={pMode}
                    onChange={(e) => setPMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="RTGS">RTGS</option>
                    <option value="Cash">Cash Account</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Drawn From Account</label>
                  <select
                    value={pBankAccount}
                    onChange={(e) => setPBankAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="Cash Account">Cash Drawer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cheque / UTR / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-998829 or CHQ-4455"
                  value={pRef}
                  onChange={(e) => setPRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Part payment against aggregate supply"
                  value={pRemarks}
                  onChange={(e) => setPRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Issue Payment Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW VENDOR MODAL */}
      {viewingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{viewingVendor.name}</h3>
                <p className="text-xs text-slate-400">{viewingVendor.businessName || 'Vendor Profile'}</p>
              </div>
              <button onClick={() => setViewingVendor(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div><span className="text-slate-500">Contact Person:</span> <p className="font-semibold">{viewingVendor.contactPerson}</p></div>
                <div><span className="text-slate-500">Mobile:</span> <p className="font-mono font-bold">{viewingVendor.mobileNumber}</p></div>
                <div><span className="text-slate-500">Email:</span> <p>{viewingVendor.email || '-'}</p></div>
                <div><span className="text-slate-500">GSTIN:</span> <p className="font-mono font-bold">{viewingVendor.gstNumber || 'Non-GST'}</p></div>
                <div className="col-span-2"><span className="text-slate-500">Address:</span> <p>{viewingVendor.address}</p></div>
              </div>

              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 flex justify-between items-center">
                <span className="text-rose-800 font-bold uppercase text-[10px]">Current Total Outstanding</span>
                <span className="font-mono font-extrabold text-rose-700 text-base">{formatCurrency(viewingVendor.currentOutstanding || 0)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendorForLedger(viewingVendor);
                    setViewingVendor(null);
                    setSubTab('ledger');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                >
                  Open Vendor Ledger
                </button>
                <button
                  type="button"
                  onClick={() => setViewingVendor(null)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAFE DELETE VENDOR MODAL */}
      {deletingVendor && (() => {
        const linkedBills = db.materialPurchases.filter((b) => b.vendorId === deletingVendor.id);
        const linkedPayments = db.vendorPayments.filter((vp) => vp.vendorId === deletingVendor.id);
        const linkedSummary: string[] = [
          `Current Outstanding Balance: ${formatCurrency(deletingVendor.currentOutstanding || 0)}`,
        ];
        if (linkedBills.length > 0) linkedSummary.push(`${linkedBills.length} Purchase Bill(s) recorded under this vendor`);
        if (linkedPayments.length > 0) linkedSummary.push(`${linkedPayments.length} Payment Voucher(s) issued to this vendor`);

        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => setDeletingVendor(null)}
            title={`Delete Vendor: ${deletingVendor.name}`}
            recordType="Vendor Master"
            recordIdentifier={`${deletingVendor.name} (${deletingVendor.businessName || deletingVendor.mobileNumber})`}
            linkedRecords={linkedSummary}
            safeAlternativeText="Keep vendor profile to preserve purchase and ledger history."
            onDownloadBackup={() => {
              const headers = ['Record Type', 'Vendor Name', 'Business', 'Contact', 'GST', 'Outstanding'];
              const rows = [
                ['VENDOR_PROFILE', deletingVendor.name, deletingVendor.businessName, deletingVendor.mobileNumber, deletingVendor.gstNumber, deletingVendor.currentOutstanding],
                ...linkedBills.map((b) => ['LINKED_BILL', b.billNumber, b.projectName, b.billDate, b.billTotal, b.outstandingAmount]),
                ...linkedPayments.map((p) => ['LINKED_PAYMENT', p.voucherNumber, p.paymentDate, p.amount, p.paymentMode, p.remarks]),
              ];
              exportToCSV(`Vendor_Archive_${deletingVendor.name.replace(/\s+/g, '_')}`, headers, rows);
            }}
            onConfirm={() => {
              const currentDb = dbService.getDatabase();
              currentDb.vendors = currentDb.vendors.filter((v) => v.id !== deletingVendor.id);
              dbService.saveDatabase(currentDb);
              dbService.logAudit(
                currentUser.name,
                'VENDOR_DELETED',
                'Vendor Management',
                `Deleted vendor ${deletingVendor.name} (${deletingVendor.mobileNumber}) with verification code 7666257368`
              );
              setDeletingVendor(null);
            }}
          />
        );
      })()}

      {/* VIEW BILL MODAL */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Bill Details: {viewingBill.billNumber}</h3>
                <p className="text-xs text-slate-400">{viewingBill.vendorName}</p>
              </div>
              <button onClick={() => setViewingBill(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div><span className="text-slate-500">Project:</span> <strong className="text-slate-800">{viewingBill.projectName}</strong></div>
                <div><span className="text-slate-500">Bill Date:</span> <strong className="font-mono">{formatDate(viewingBill.billDate)}</strong></div>
                <div><span className="text-slate-500">Classification:</span> <strong>{viewingBill.isGstBill ? 'GST Bill' : 'Non-GST'}</strong></div>
                <div><span className="text-slate-500">Due Date:</span> <strong className="font-mono text-rose-600">{formatDate(viewingBill.paymentDueDate)}</strong></div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Line Items (Feet / Units)</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px]">
                      <tr>
                        <th className="p-2">Material</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {viewingBill.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-sans font-semibold">{it.materialName}</td>
                          <td className="p-2 text-right">{it.quantity} {it.unit}</td>
                          <td className="p-2 text-right">₹{it.ratePerUnit}</td>
                          <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(it.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-100 rounded-lg">
                  <span className="text-[10px] text-slate-500">Bill Total</span>
                  <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">{formatCurrency(viewingBill.billTotal)}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg">
                  <span className="text-[10px] text-emerald-700">Amount Paid</span>
                  <p className="font-mono font-bold text-emerald-800 text-xs mt-0.5">{formatCurrency(viewingBill.amountPaid)}</p>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-lg">
                  <span className="text-[10px] text-rose-700">Outstanding</span>
                  <p className="font-mono font-bold text-rose-800 text-xs mt-0.5">{formatCurrency(viewingBill.outstandingAmount)}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingBill(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BILL MODAL */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Bill: {editingBill.billNumber}</h3>
              <button onClick={() => setEditingBill(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const currentDb = dbService.getDatabase();
                currentDb.materialPurchases = currentDb.materialPurchases.map((b) =>
                  b.id === editingBill.id ? { ...editingBill } : b
                );
                dbService.saveDatabase(currentDb);
                dbService.logAudit(
                  currentUser.name,
                  'VENDOR_BILL_UPDATED',
                  'Vendor Management',
                  `Updated bill ${editingBill.billNumber} for vendor ${editingBill.vendorName}`
                );
                setEditingBill(null);
              }}
              className="p-6 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bill Number *</label>
                <input
                  type="text"
                  required
                  value={editingBill.billNumber}
                  onChange={(e) => setEditingBill({ ...editingBill, billNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={editingBill.billDate}
                    onChange={(e) => setEditingBill({ ...editingBill, billDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={editingBill.paymentDueDate}
                    onChange={(e) => setEditingBill({ ...editingBill, paymentDueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={editingBill.remarks || ''}
                  onChange={(e) => setEditingBill({ ...editingBill, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILL PAYMENT HISTORY MODAL */}
      {historyBill && (() => {
        const payments = db.vendorPayments.filter((vp) => vp.billId === historyBill.id || vp.billNumber === historyBill.billNumber);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Payment History: Bill {historyBill.billNumber}</h3>
                  <p className="text-xs text-slate-400">{historyBill.vendorName}</p>
                </div>
                <button onClick={() => setHistoryBill(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500">Bill Total</span>
                    <p className="font-mono font-bold text-xs mt-0.5">{formatCurrency(historyBill.billTotal)}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <span className="text-[10px] text-emerald-700">Total Paid</span>
                    <p className="font-mono font-bold text-emerald-800 text-xs mt-0.5">{formatCurrency(historyBill.amountPaid)}</p>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <span className="text-[10px] text-rose-700">Balance Due</span>
                    <p className="font-mono font-bold text-rose-800 text-xs mt-0.5">{formatCurrency(historyBill.outstandingAmount)}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Voucher #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Mode</th>
                        <th className="p-2 text-right">Amount (₹)</th>
                        <th className="p-2">Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2 font-bold text-indigo-700">{p.voucherNumber}</td>
                          <td className="p-2 font-sans text-slate-600">{formatDate(p.paymentDate)}</td>
                          <td className="p-2 font-sans">{p.paymentMode}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                          <td className="p-2 text-slate-500">{p.transactionRef || '-'}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                            No payment vouchers recorded specifically against this bill yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setHistoryBill(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SAFE DELETE BILL MODAL */}
      {deletingBill && (() => {
        const vendor = db.vendors.find((v) => v.id === deletingBill.vendorId);
        const linkedPayments = db.vendorPayments.filter((vp) => vp.billId === deletingBill.id);
        const linkedSummary: string[] = [
          `Vendor: ${deletingBill.vendorName} (Current Outstanding: ${formatCurrency(vendor?.currentOutstanding || 0)})`,
          `Bill Total: ${formatCurrency(deletingBill.billTotal)}, Outstanding: ${formatCurrency(deletingBill.outstandingAmount)}`,
        ];
        if (linkedPayments.length > 0) {
          linkedSummary.push(`${linkedPayments.length} Payment Voucher(s) linked to this bill`);
        }

        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => setDeletingBill(null)}
            title={`Delete Vendor Bill: ${deletingBill.billNumber}`}
            recordType="Vendor Bill"
            recordIdentifier={`${deletingBill.billNumber} (${deletingBill.vendorName})`}
            linkedRecords={linkedSummary}
            safeAlternativeText="Use payment or credit note adjustments instead of permanent bill deletion."
            onDownloadBackup={() => {
              const headers = ['Record Type', 'Bill Number', 'Vendor', 'Project', 'Total', 'Outstanding'];
              const rows = [
                ['VENDOR_BILL', deletingBill.billNumber, deletingBill.vendorName, deletingBill.projectName, deletingBill.billTotal, deletingBill.outstandingAmount],
              ];
              exportToCSV(`Vendor_Bill_Archive_${deletingBill.billNumber}`, headers, rows);
            }}
            onConfirm={() => {
              const currentDb = dbService.getDatabase();
              // Adjust vendor balance
              if (vendor) {
                const targetVen = currentDb.vendors.find((v) => v.id === vendor.id);
                if (targetVen) {
                  targetVen.currentOutstanding = Math.max(0, (targetVen.currentOutstanding || 0) - deletingBill.outstandingAmount);
                }
              }
              currentDb.materialPurchases = currentDb.materialPurchases.filter((b) => b.id !== deletingBill.id);
              dbService.saveDatabase(currentDb);
              dbService.logAudit(
                currentUser.name,
                'VENDOR_BILL_DELETED',
                'Vendor Management',
                `Deleted vendor bill ${deletingBill.billNumber} (${deletingBill.vendorName}) with verification code 7666257368`
              );
              setDeletingBill(null);
            }}
          />
        );
      })()}
    </div>
  );
};
