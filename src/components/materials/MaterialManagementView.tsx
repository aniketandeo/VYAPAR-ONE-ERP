import React, { useState } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import {
  MaterialItem,
  MaterialPurchaseBill,
  MaterialPurchaseItem,
  MaterialReceiptRecord,
  MaterialUsageRecord,
  Vendor,
  VendorPayment,
  FinancialTransaction,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  exportToCSV,
} from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { AttachmentViewerModal } from '../common/AttachmentViewerModal';
import { InlineAddModal } from '../common/InlineAddModal';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Package,
  Layers,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Paperclip,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  X,
  Check,
  Building2,
  DollarSign,
  UserCheck,
} from 'lucide-react';

interface MaterialManagementViewProps {
  db: DatabaseState;
}

export const MaterialManagementView: React.FC<MaterialManagementViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();

  // Active sub-tab
  const [subTab, setSubTab] = useState<
    'stock' | 'purchase' | 'receive' | 'usage' | 'drilldown' | 'vendors' | 'reminders'
  >('stock');

  // Filters
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [selectedDrillMaterial, setSelectedDrillMaterial] = useState<string>('Gitti (Aggregate 20mm/10mm)');
  const [vendorSearch, setVendorSearch] = useState('');

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isVendorPaymentModalOpen, setIsVendorPaymentModalOpen] = useState(false);
  const [isMaterialMasterModalOpen, setIsMaterialMasterModalOpen] = useState(false);

  // Bill Actions: View / Edit / Delete
  const [viewingBill, setViewingBill] = useState<MaterialPurchaseBill | null>(null);
  const [editingBill, setEditingBill] = useState<MaterialPurchaseBill | null>(null);
  const [deletingBill, setDeletingBill] = useState<MaterialPurchaseBill | null>(null);

  // Attachment Viewer Modal State
  const [attachmentModal, setAttachmentModal] = useState<{
    isOpen: boolean;
    title: string;
    url?: string;
    name?: string;
    date?: string;
  }>({ isOpen: false, title: '' });

  // Selected Vendor for ledger inspection
  const [activeVendorLedger, setActiveVendorLedger] = useState<Vendor | null>(null);

  // ================= PURCHASE ENTRY STATE =================
  const [pBillNumber, setPBillNumber] = useState('');
  const [pBillDate, setPBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [pProjectId, setPProjectId] = useState(db.projects[0]?.id || '');
  const [pVendorId, setPVendorId] = useState(db.vendors[0]?.id || '');
  const [pPaymentDueDate, setPPaymentDueDate] = useState('');
  const [pPaymentMode, setPPaymentMode] = useState('Cheque');
  const [pAmountPaid, setPAmountPaid] = useState<number>(0);
  const [pRemarks, setPRemarks] = useState('');
  const [pAttachmentUrl, setPAttachmentUrl] = useState<string>('');
  const [pAttachmentName, setPAttachmentName] = useState<string>('');

  // Line items on bill
  const [purchaseItems, setPurchaseItems] = useState<MaterialPurchaseItem[]>([
    {
      materialName: 'Gitti (Aggregate 20mm/10mm)',
      quantity: 500,
      unit: 'Feet', // STRICTLY Feet format
      ratePerUnit: 42,
      basicAmount: 21000,
      gstPercentage: 5,
      gstAmount: 1050,
      totalAmount: 22050,
    },
  ]);

  // Update line item
  const updatePurchaseItem = (index: number, field: keyof MaterialPurchaseItem, val: any) => {
    const updated = [...purchaseItems];
    const item = { ...updated[index], [field]: val };

    // Find unit from master
    if (field === 'materialName') {
      const mat = db.materials.find((m) => m.name === val);
      if (mat) {
        item.unit = mat.unit;
      }
    }

    // Recalculate
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.ratePerUnit) || 0;
    const basic = qty * rate;
    const gstPct = Number(item.gstPercentage) || 0;
    const gstAmt = Number(((basic * gstPct) / 100).toFixed(2));
    const total = Number((basic + gstAmt).toFixed(2));

    item.basicAmount = basic;
    item.gstAmount = gstAmt;
    item.totalAmount = total;

    updated[index] = item;
    setPurchaseItems(updated);
  };

  const addPurchaseItemRow = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        materialName: db.materials[0]?.name || 'Reti (River Sand)',
        quantity: 100,
        unit: db.materials[0]?.unit || 'Feet',
        ratePerUnit: 50,
        basicAmount: 5000,
        gstPercentage: 5,
        gstAmount: 250,
        totalAmount: 5250,
      },
    ]);
  };

  const removePurchaseItemRow = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };

  const totalBasicAmount = purchaseItems.reduce((s, i) => s + i.basicAmount, 0);
  const totalGstAmount = purchaseItems.reduce((s, i) => s + i.gstAmount, 0);
  const billTotalAmount = purchaseItems.reduce((s, i) => s + i.totalAmount, 0);
  const pOutstandingAmount = Math.max(0, billTotalAmount - (Number(pAmountPaid) || 0));

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pBillNumber.trim()) {
      alert('Bill Number is required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const project = currentDb.projects.find((p) => p.id === pProjectId);
    const vendor = currentDb.vendors.find((v) => v.id === pVendorId);

    const newBill: MaterialPurchaseBill = {
      id: `bill-${Date.now()}`,
      billNumber: pBillNumber.trim(),
      billDate: pBillDate,
      projectId: pProjectId,
      projectName: project ? project.name : 'Project',
      vendorId: pVendorId,
      vendorName: vendor ? vendor.name : 'Vendor',
      isGstBill: totalGstAmount > 0,
      items: purchaseItems,
      basicAmount: totalBasicAmount,
      gstAmount: totalGstAmount,
      billTotal: billTotalAmount,
      amountPaid: Number(pAmountPaid) || 0,
      outstandingAmount: pOutstandingAmount,
      paymentDueDate: pPaymentDueDate || pBillDate,
      paymentMode: pPaymentMode,
      billAttachmentUrl: pAttachmentUrl,
      billAttachmentName: pAttachmentName,
      remarks: pRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.materialPurchases.unshift(newBill);

    // Update Vendor Outstanding
    if (vendor) {
      vendor.currentOutstanding = (vendor.currentOutstanding || 0) + pOutstandingAmount;
    }

    // If paid now > 0, record financial debit transaction
    if (pAmountPaid > 0) {
      const paymentTxn: FinancialTransaction = {
        id: `txn-${Date.now()}`,
        voucherNumber: `VD-VP-${pBillNumber}`,
        txnDate: pBillDate,
        type: 'VENDOR_PAYMENT',
        category: 'Material Vendor Payment',
        description: `Part payment for Bill ${pBillNumber} (${vendor?.name || ''})`,
        entityType: 'VENDOR',
        entityId: pVendorId,
        entityName: vendor?.name || 'Vendor',
        projectId: pProjectId,
        projectName: project?.name,
        debit: Number(pAmountPaid),
        credit: 0,
        account: 'HDFC Bank Ltd',
        paymentMode: pPaymentMode,
        refNumber: pBillNumber,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentUser.name,
      };
      currentDb.transactions.unshift(paymentTxn);
    }

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'MATERIAL_PURCHASE_ENTERED',
      'Material Management',
      `Entered purchase bill ${pBillNumber} from ${vendor?.name} for ₹${billTotalAmount}. Note: Physical stock updates only upon Material Receipt.`
    );

    setIsPurchaseModalOpen(false);
    setPBillNumber('');
    setPAmountPaid(0);
    setPRemarks('');
    setPAttachmentUrl('');
  };

  // ================= MATERIAL RECEIPT STATE =================
  const [rcvProjectId, setRcvProjectId] = useState(db.projects[0]?.id || '');
  const [rcvBillId, setRcvBillId] = useState('');
  const [rcvMaterialName, setRcvMaterialName] = useState(db.materials[0]?.name || '');
  const [rcvOrderedQty, setRcvOrderedQty] = useState<number>(500);
  const [rcvReceivedQty, setRcvReceivedQty] = useState<number>(500);
  const [rcvUnit, setRcvUnit] = useState<string>('Feet');
  const [rcvDate, setRcvDate] = useState(new Date().toISOString().split('T')[0]);
  const [rcvRemarks, setRcvRemarks] = useState('');

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const currentDb = dbService.getDatabase();
    const proj = currentDb.projects.find((p) => p.id === rcvProjectId);
    const bill = currentDb.materialPurchases.find((b) => b.id === rcvBillId);

    const newRecord: MaterialReceiptRecord = {
      id: `mr-${Date.now()}`,
      purchaseBillId: rcvBillId || undefined,
      billNumber: bill ? bill.billNumber : 'Direct-Challan',
      projectId: rcvProjectId,
      projectName: proj ? proj.name : 'Project',
      vendorId: bill ? bill.vendorId : 'ven-1',
      vendorName: bill ? bill.vendorName : 'Vendor',
      materialName: rcvMaterialName,
      orderedQuantity: Number(rcvOrderedQty),
      receivedQuantity: Number(rcvReceivedQty),
      unit: rcvUnit,
      receiptDate: rcvDate,
      remarks: rcvRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.materialReceipts.unshift(newRecord);

    // Increase physical stock ONLY upon verified receipt!
    const matIndex = currentDb.materials.findIndex((m) => m.name === rcvMaterialName);
    if (matIndex >= 0) {
      currentDb.materials[matIndex].currentStock += Number(rcvReceivedQty);
    }

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'MATERIAL_ACTUAL_RECEIPT',
      'Material Management',
      `Recorded actual site receipt of ${rcvReceivedQty} ${rcvUnit} of ${rcvMaterialName}. Stock updated.`
    );

    setIsReceiveModalOpen(false);
  };

  // ================= MATERIAL USAGE STATE =================
  const [useProjectId, setUseProjectId] = useState(db.projects[0]?.id || '');
  const [useMaterialName, setUseMaterialName] = useState(db.materials[0]?.name || '');
  const [useQuantity, setUseQuantity] = useState<number>(100);
  const [useUnit, setUseUnit] = useState<string>('Feet');
  const [useDate, setUseDate] = useState(new Date().toISOString().split('T')[0]);
  const [useLocation, setUseLocation] = useState('Road Base / Compound Wall');
  const [useDescription, setUseDescription] = useState('Compaction layer and bed leveling');
  const [useApprovedBy, setUseApprovedBy] = useState(currentUser.name);
  const [useRemarks, setUseRemarks] = useState('');

  const handleSaveUsage = (e: React.FormEvent) => {
    e.preventDefault();
    const currentDb = dbService.getDatabase();
    const proj = currentDb.projects.find((p) => p.id === useProjectId);

    const newUsage: MaterialUsageRecord = {
      id: `mu-${Date.now()}`,
      projectId: useProjectId,
      projectName: proj ? proj.name : 'Project',
      materialName: useMaterialName,
      quantityUsed: Number(useQuantity),
      unit: useUnit,
      usageDate: useDate,
      workLocation: useLocation,
      workDescription: useDescription,
      approvedBy: useApprovedBy,
      remarks: useRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.materialUsages.unshift(newUsage);

    // Stock calculation: Opening + Received - Used = Closing
    const matIndex = currentDb.materials.findIndex((m) => m.name === useMaterialName);
    if (matIndex >= 0) {
      currentDb.materials[matIndex].currentStock = Math.max(
        0,
        currentDb.materials[matIndex].currentStock - Number(useQuantity)
      );
    }

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'MATERIAL_USAGE_RECORDED',
      'Material Management',
      `Recorded site consumption of ${useQuantity} ${useUnit} of ${useMaterialName} for ${proj?.name}`
    );

    setIsUsageModalOpen(false);
  };

  // ================= VENDOR PAYMENT STATE =================
  const [vpVendorId, setVpVendorId] = useState('');
  const [vpAmount, setVpAmount] = useState<number>(0);
  const [vpPaymentMode, setVpPaymentMode] = useState('Bank Transfer');
  const [vpRef, setVpRef] = useState('');
  const [vpDate, setVpDate] = useState(new Date().toISOString().split('T')[0]);
  const [vpRemarks, setVpRemarks] = useState('');

  const handleSaveVendorPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vpVendorId || !vpAmount) {
      alert('Please select vendor and enter payment amount.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const vendor = currentDb.vendors.find((v) => v.id === vpVendorId);
    const voucherNo = `VD-VP-${Date.now().toString().slice(-6)}`;

    const newPayment: VendorPayment = {
      id: `vp-${Date.now()}`,
      voucherNumber: voucherNo,
      vendorId: vpVendorId,
      vendorName: vendor ? vendor.name : 'Vendor',
      paymentDate: vpDate,
      amount: Number(vpAmount),
      paymentMode: vpPaymentMode,
      bankAccount: 'HDFC Bank Ltd',
      transactionRef: vpRef || voucherNo,
      remarks: vpRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.vendorPayments.unshift(newPayment);

    // Decrease vendor outstanding
    if (vendor) {
      vendor.currentOutstanding = Math.max(0, (vendor.currentOutstanding || 0) - Number(vpAmount));
    }

    // Accounts Journal Entry
    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber: voucherNo,
      txnDate: vpDate,
      type: 'VENDOR_PAYMENT',
      category: 'Material Vendor Payment',
      description: `Disbursement to ${vendor?.name || 'Vendor'}`,
      entityType: 'VENDOR',
      entityId: vpVendorId,
      entityName: vendor?.name || 'Vendor',
      debit: Number(vpAmount),
      credit: 0,
      account: 'HDFC Bank Ltd',
      paymentMode: vpPaymentMode,
      refNumber: vpRef || voucherNo,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.transactions.unshift(journalTxn);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'VENDOR_PAYMENT_SAVED',
      'Material Management',
      `Paid ₹${vpAmount} to vendor ${vendor?.name}. Voucher: ${voucherNo}`
    );

    setIsVendorPaymentModalOpen(false);
    setVpAmount(0);
    setVpRemarks('');
  };

  // Material-wise drilldown computed numbers
  const drillPurchases = db.materialPurchases.filter((b) =>
    b.items.some((i) => i.materialName === selectedDrillMaterial)
  );

  const drillTotalPurchasedQty = drillPurchases.reduce((s, b) => {
    const item = b.items.find((i) => i.materialName === selectedDrillMaterial);
    return s + (item ? item.quantity : 0);
  }, 0);

  const drillTotalPurchaseAmt = drillPurchases.reduce((s, b) => {
    const item = b.items.find((i) => i.materialName === selectedDrillMaterial);
    return s + (item ? item.totalAmount : 0);
  }, 0);

  const drillReceivedQty = db.materialReceipts
    .filter((r) => r.materialName === selectedDrillMaterial)
    .reduce((s, r) => s + r.receivedQuantity, 0);

  const drillUsedQty = db.materialUsages
    .filter((u) => u.materialName === selectedDrillMaterial)
    .reduce((s, u) => s + u.quantityUsed, 0);

  const currentDrillMat = db.materials.find((m) => m.name === selectedDrillMaterial);
  const drillRemainingStock = currentDrillMat ? currentDrillMat.currentStock : 0;
  const drillUnit = currentDrillMat ? currentDrillMat.unit : 'Feet';

  // Vendor Due Reminders
  const today = new Date().toISOString().split('T')[0];
  const upcomingBills = db.materialPurchases.filter(
    (b) => b.outstandingAmount > 0 && b.paymentDueDate && b.paymentDueDate > today
  );
  const dueTodayBills = db.materialPurchases.filter(
    (b) => b.outstandingAmount > 0 && b.paymentDueDate && b.paymentDueDate === today
  );
  const overdueBills = db.materialPurchases.filter(
    (b) => b.outstandingAmount > 0 && b.paymentDueDate && b.paymentDueDate < today
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner & Sub-Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            <span>Material Management & Vendor Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Construction aggregates (Reti, Gitti, Murum, Churi, Crush Sand) entered & displayed in user's specified <strong>Feet</strong> unit
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Purchase Bill</span>
            </button>
          )}

          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsReceiveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Record Receipt</span>
            </button>
          )}

          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsUsageModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Record Usage</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setSubTab('stock')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'stock' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Stock Report (Closing Stock)
        </button>
        <button
          onClick={() => setSubTab('drilldown')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'drilldown' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Material History & Drill-Down
        </button>
        <button
          onClick={() => setSubTab('purchase')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'purchase' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Purchase Bills ({db.materialPurchases.length})
        </button>
        <button
          onClick={() => setSubTab('receive')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'receive' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Material Received Records ({db.materialReceipts.length})
        </button>
        <button
          onClick={() => setSubTab('usage')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'usage' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Usage & Consumption ({db.materialUsages.length})
        </button>
        <button
          onClick={() => setSubTab('vendors')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'vendors' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Vendors & Ledgers ({db.vendors.length})
        </button>
        <button
          onClick={() => setSubTab('reminders')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
            subTab === 'reminders' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Payment Reminders</span>
          {overdueBills.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
              {overdueBills.length}
            </span>
          )}
        </button>
      </div>

      {/* 1. STOCK REPORT SUBTAB */}
      {subTab === 'stock' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>
                <strong>Stock Formula:</strong> Opening Stock + Actual Received Quantity − Approved Used Quantity = Closing Stock
              </span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700">
              Aggregates Strictly in Feet unit
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Material Name</th>
                    <th className="py-3 px-3">Unit Format</th>
                    <th className="py-3 px-3 text-right">Opening Stock</th>
                    <th className="py-3 px-3 text-right">Quantity Received</th>
                    <th className="py-3 px-3 text-right">Quantity Used</th>
                    <th className="py-3 px-3 text-right">Remaining Stock</th>
                    <th className="py-3 px-4 text-center">Drill-Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.materials.map((mat) => {
                    const received = db.materialReceipts
                      .filter((r) => r.materialName === mat.name)
                      .reduce((s, r) => s + r.receivedQuantity, 0);

                    const used = db.materialUsages
                      .filter((u) => u.materialName === mat.name)
                      .reduce((s, u) => s + u.quantityUsed, 0);

                    const closing = mat.openingStock + received - used;

                    return (
                      <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>{mat.name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              mat.unit === 'Feet'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {mat.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatNumber(mat.openingStock, 0)} {mat.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                          +{formatNumber(received, 0)} {mat.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold">
                          -{formatNumber(used, 0)} {mat.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                          {formatNumber(closing, 0)} {mat.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedDrillMaterial(mat.name);
                              setSubTab('drilldown');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
                          >
                            <Eye className="w-3 h-3" />
                            <span>History</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MATERIAL-WISE REPORT AND DRILL-DOWN (Requirement 9) */}
      {subTab === 'drilldown' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Select Material to Drill-Down:</span>
              <select
                value={selectedDrillMaterial}
                onChange={(e) => setSelectedDrillMaterial(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50 focus:outline-hidden"
              >
                {db.materials.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              Unit of Measure: <strong>{drillUnit}</strong> (No Brass/CFT conversions)
            </span>
          </div>

          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Purchased</span>
              <p className="font-mono font-bold text-slate-900 text-base mt-1">
                {formatNumber(drillTotalPurchasedQty, 0)} {drillUnit}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Received</span>
              <p className="font-mono font-bold text-emerald-800 text-base mt-1">
                {formatNumber(drillReceivedQty, 0)} {drillUnit}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] text-amber-700 uppercase font-bold">Total Used</span>
              <p className="font-mono font-bold text-amber-800 text-base mt-1">
                {formatNumber(drillUsedQty, 0)} {drillUnit}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] text-indigo-700 uppercase font-bold">Remaining Stock</span>
              <p className="font-mono font-bold text-indigo-900 text-base mt-1">
                {formatNumber(drillRemainingStock, 0)} {drillUnit}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Purchase Amount</span>
              <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                {formatCurrency(drillTotalPurchaseAmt)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Amount Paid</span>
              <p className="font-mono font-bold text-emerald-800 text-sm mt-1">
                {formatCurrency(drillPurchases.reduce((s, b) => s + b.amountPaid, 0))}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-700 uppercase font-bold">Outstanding</span>
              <p className="font-mono font-bold text-rose-800 text-sm mt-1">
                {formatCurrency(drillPurchases.reduce((s, b) => s + b.outstandingAmount, 0))}
              </p>
            </div>
          </div>

          {/* Drilldown Transaction Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Transaction History for {selectedDrillMaterial}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3 font-mono">Bill No</th>
                    <th className="py-2.5 px-3 text-right">Quantity ({drillUnit})</th>
                    <th className="py-2.5 px-3 text-right">Rate / {drillUnit}</th>
                    <th className="py-2.5 px-3 text-right">Bill Total</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                    <th className="py-2.5 px-3 text-center">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drillPurchases.map((bill) => {
                    const line = bill.items.find((i) => i.materialName === selectedDrillMaterial);
                    return (
                      <tr key={bill.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-600">{formatDate(bill.billDate)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{bill.projectName}</td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              const v = db.vendors.find((ven) => ven.id === bill.vendorId);
                              if (v) {
                                setActiveVendorLedger(v);
                                setSubTab('vendors');
                              }
                            }}
                            className="text-indigo-600 font-semibold hover:underline"
                          >
                            {bill.vendorName}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">{bill.billNumber}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {line ? formatNumber(line.quantity, 0) : 0} {drillUnit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          ₹{line ? line.ratePerUnit : 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(bill.billTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                          {formatCurrency(bill.amountPaid)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                          {formatCurrency(bill.outstandingAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {bill.billAttachmentUrl ? (
                            <button
                              onClick={() =>
                                setAttachmentModal({
                                  isOpen: true,
                                  title: `Bill ${bill.billNumber} Attachment`,
                                  url: bill.billAttachmentUrl,
                                  name: bill.billAttachmentName,
                                  date: bill.billDate,
                                })
                              }
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                            >
                              <Paperclip className="w-4 h-4 inline" />
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PURCHASE BILLS SUBTAB */}
      {subTab === 'purchase' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Bill Date</th>
                  <th className="py-2.5 px-3 font-mono">Bill No</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Materials Included</th>
                  <th className="py-2.5 px-3 text-right">Basic</th>
                  <th className="py-2.5 px-3 text-right">GST</th>
                  <th className="py-2.5 px-3 text-right">Bill Total</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-center">Bill Attachment</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.materialPurchases.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(b.billDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{b.billNumber}</td>
                    <td className="py-2.5 px-3 text-slate-700">{b.projectName}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{b.vendorName}</td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        {b.items.map((it, idx) => (
                          <div key={idx} className="text-[11px] text-slate-600">
                            • {it.materialName}: <strong className="font-mono">{it.quantity} {it.unit}</strong> @ ₹{it.ratePerUnit}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(b.basicAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(b.gstAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(b.billTotal)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{formatCurrency(b.amountPaid)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">{formatCurrency(b.outstandingAmount)}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDate(b.paymentDueDate)}</td>
                    <td className="py-2.5 px-3 text-center">
                      {b.billAttachmentUrl ? (
                        <button
                          onClick={() =>
                            setAttachmentModal({
                              isOpen: true,
                              title: `Bill ${b.billNumber} Photo / PDF`,
                              url: b.billAttachmentUrl,
                              name: b.billAttachmentName,
                              date: b.billDate,
                            })
                          }
                          className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingBill(b)}
                          className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                          title="View Bill Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {hasPermission('canEdit') && (
                          <button
                            onClick={() => setEditingBill(b)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded"
                            title="Edit Bill Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasPermission('canDeleteOrReverse') && (
                          <button
                            onClick={() => setDeletingBill(b)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Safe Delete Purchase Bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MATERIAL RECEIVED SUBTAB */}
      {subTab === 'receive' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Receipt Date</th>
                  <th className="py-2.5 px-3 font-mono">Bill / PO Ref</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3 text-right">Ordered Qty</th>
                  <th className="py-2.5 px-3 text-right">Received Qty</th>
                  <th className="py-2.5 px-3 text-center">Difference</th>
                  <th className="py-2.5 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.materialReceipts.map((r) => {
                  const diff = r.orderedQuantity - r.receivedQuantity;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600">{formatDate(r.receiptDate)}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{r.billNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{r.projectName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{r.vendorName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.materialName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {r.orderedQuantity} {r.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                        {r.receivedQuantity} {r.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {diff !== 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                            Diff: {diff} {r.unit}
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[10px] font-semibold">Exact Match</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">{r.remarks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MATERIAL USAGE SUBTAB */}
      {subTab === 'usage' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Usage Date</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3 text-right">Quantity Consumed</th>
                  <th className="py-2.5 px-3">Work Location / Site</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.materialUsages.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(u.usageDate)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{u.projectName}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{u.materialName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {u.quantityUsed} {u.unit}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{u.workLocation}</td>
                    <td className="py-2.5 px-3 text-slate-500">{u.workDescription}</td>
                    <td className="py-2.5 px-3 text-indigo-700 font-semibold">{u.approvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VENDORS & LEDGERS SUBTAB */}
      {subTab === 'vendors' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendor name or business..."
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="bg-transparent w-full text-slate-800 placeholder-slate-400 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVendorPaymentModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                + Record Vendor Payment
              </button>
              <button
                onClick={() => setIsVendorModalOpen(true)}
                className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
              >
                + Add Vendor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {db.vendors
              .filter(
                (v) =>
                  v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                  v.businessName.toLowerCase().includes(vendorSearch.toLowerCase())
              )
              .map((v) => (
                <div
                  key={v.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 cursor-pointer transition-all ${
                    activeVendorLedger?.id === v.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setActiveVendorLedger(v)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{v.name}</h4>
                      <p className="text-[11px] text-slate-500">{v.businessName}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {v.gstNumber || 'Unregistered'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p>Phone: <strong>{v.mobileNumber}</strong></p>
                    <p className="truncate">Address: {v.address}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Current Outstanding:</span>
                    <span className="font-mono font-bold text-rose-700 text-sm">
                      {formatCurrency(v.currentOutstanding)}
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {/* Active Vendor Detailed Ledger */}
          {activeVendorLedger && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Vendor Ledger: {activeVendorLedger.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeVendorLedger.businessName} | GST: {activeVendorLedger.gstNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Total Outstanding Balance:</span>
                  <p className="text-base font-extrabold text-rose-700 font-mono">
                    {formatCurrency(activeVendorLedger.currentOutstanding)}
                  </p>
                </div>
              </div>

              {/* Bills and Payments for this vendor */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 font-mono">Ref / Bill No</th>
                      <th className="py-2.5 px-3">Particulars</th>
                      <th className="py-2.5 px-3 text-right">Debit (Payment)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Bill)</th>
                      <th className="py-2.5 px-3">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {db.materialPurchases
                      .filter((p) => p.vendorId === activeVendorLedger.id)
                      .map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 text-slate-600">{formatDate(p.billDate)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">Purchase Bill</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{p.billNumber}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {p.items.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join(', ')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(p.billTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">On Credit</td>
                        </tr>
                      ))}

                    {db.vendorPayments
                      .filter((vp) => vp.vendorId === activeVendorLedger.id)
                      .map((vp) => (
                        <tr key={vp.id} className="bg-emerald-50/50">
                          <td className="py-2.5 px-3 text-slate-600">{formatDate(vp.paymentDate)}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800">Payment Voucher</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-emerald-900">{vp.voucherNumber}</td>
                          <td className="py-2.5 px-3 text-slate-600">{vp.remarks || 'Payment to vendor'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(vp.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                          <td className="py-2.5 px-3 text-slate-700">{vp.paymentMode}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. DUE PAYMENT REMINDERS SUBTAB */}
      {subTab === 'reminders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="font-bold text-rose-800 uppercase text-[10px]">Overdue Bills</span>
              <p className="text-2xl font-extrabold text-rose-700 mt-1 font-mono">
                {formatCurrency(overdueBills.reduce((s, b) => s + b.outstandingAmount, 0))}
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5">{overdueBills.length} Bills past due date</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="font-bold text-amber-800 uppercase text-[10px]">Due Today</span>
              <p className="text-2xl font-extrabold text-amber-700 mt-1 font-mono">
                {formatCurrency(dueTodayBills.reduce((s, b) => s + b.outstandingAmount, 0))}
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">{dueTodayBills.length} Bills due today</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <span className="font-bold text-blue-800 uppercase text-[10px]">Upcoming Dues</span>
              <p className="text-2xl font-extrabold text-blue-700 mt-1 font-mono">
                {formatCurrency(upcomingBills.reduce((s, b) => s + b.outstandingAmount, 0))}
              </p>
              <p className="text-[11px] text-blue-600 mt-0.5">{upcomingBills.length} Bills upcoming</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Overdue & Pending Vendor Bills
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3 font-mono">Bill No</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3 text-right">Bill Total</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...overdueBills, ...dueTodayBills, ...upcomingBills].map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-semibold text-rose-700">{formatDate(b.paymentDueDate)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{b.vendorName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">{b.billNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{b.projectName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">{formatCurrency(b.billTotal)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-rose-700">
                        {formatCurrency(b.outstandingAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setVpVendorId(b.vendorId);
                            setVpAmount(b.outstandingAmount);
                            setIsVendorPaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs"
                        >
                          Pay Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= PURCHASE BILL MODAL ================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Record Material Purchase Bill</h3>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                  <select
                    value={pProjectId}
                    onChange={(e) => setPProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {db.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor Name *</label>
                  <select
                    value={pVendorId}
                    onChange={(e) => setPVendorId(e.target.value)}
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
                  <label className="block font-semibold text-slate-700 mb-1">Bill Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAL-8821"
                    value={pBillNumber}
                    onChange={(e) => setPBillNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={pBillDate}
                    onChange={(e) => setPBillDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">Material Line Items</span>
                  <button
                    type="button"
                    onClick={addPurchaseItemRow}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Another Material to Bill
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Material Name</th>
                        <th className="p-2">Quantity (Feet / Unit)</th>
                        <th className="p-2">Rate / Unit</th>
                        <th className="p-2 text-right">Basic Amount</th>
                        <th className="p-2">GST %</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={item.materialName}
                              onChange={(e) => updatePurchaseItem(idx, 'materialName', e.target.value)}
                              className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                            >
                              {db.materials.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({m.unit})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={(e) => updatePurchaseItem(idx, 'quantity', e.target.value)}
                                className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                              />
                              <span className="font-bold text-slate-700 text-[11px]">{item.unit}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.ratePerUnit || ''}
                              onChange={(e) => updatePurchaseItem(idx, 'ratePerUnit', e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            {formatCurrency(item.basicAmount)}
                          </td>
                          <td className="p-2">
                            <select
                              value={item.gstPercentage}
                              onChange={(e) => updatePurchaseItem(idx, 'gstPercentage', Number(e.target.value))}
                              className="px-1.5 py-1 border border-slate-300 rounded text-xs"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.totalAmount)}
                          </td>
                          <td className="p-2 text-center">
                            {purchaseItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePurchaseItemRow(idx)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals & Payments */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px]">Bill Total:</span>
                  <p className="font-mono font-bold text-slate-900 text-base">{formatCurrency(billTotalAmount)}</p>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    value={pAmountPaid || ''}
                    onChange={(e) => setPAmountPaid(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Remaining Outstanding:</span>
                  <p className="font-mono font-bold text-rose-700 text-base">{formatCurrency(pOutstandingAmount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={pPaymentDueDate}
                    onChange={(e) => setPPaymentDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attach Bill Photo / Scanned PDF</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPAttachmentUrl(reader.result as string);
                          setPAttachmentName(file.name);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Save Bill Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECORD RECEIPT MODAL ================= */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Record Physical Material Receipt</h3>
              <button onClick={() => setIsReceiveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveReceipt} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Project</label>
                <select
                  value={rcvProjectId}
                  onChange={(e) => setRcvProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Received</label>
                <select
                  value={rcvMaterialName}
                  onChange={(e) => {
                    setRcvMaterialName(e.target.value);
                    const mat = db.materials.find((m) => m.name === e.target.value);
                    if (mat) setRcvUnit(mat.unit);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {db.materials.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ordered Qty ({rcvUnit})</label>
                  <input
                    type="number"
                    value={rcvOrderedQty || ''}
                    onChange={(e) => setRcvOrderedQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">Actually Received ({rcvUnit}) *</label>
                  <input
                    type="number"
                    required
                    value={rcvReceivedQty || ''}
                    onChange={(e) => setRcvReceivedQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900 bg-emerald-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Date</label>
                <input
                  type="date"
                  value={rcvDate}
                  onChange={(e) => setRcvDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verification Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Measured dumper size 500 Feet"
                  value={rcvRemarks}
                  onChange={(e) => setRcvRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">
                  Update Physical Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECORD USAGE MODAL ================= */}
      {isUsageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Record Material Consumption / Usage</h3>
              <button onClick={() => setIsUsageModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveUsage} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Site *</label>
                <select
                  value={useProjectId}
                  onChange={(e) => setUseProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Consumed *</label>
                <select
                  value={useMaterialName}
                  onChange={(e) => {
                    setUseMaterialName(e.target.value);
                    const mat = db.materials.find((m) => m.name === e.target.value);
                    if (mat) setUseUnit(mat.unit);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {db.materials.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} (Stock: {m.currentStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">Quantity Used ({useUnit}) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={useQuantity || ''}
                    onChange={(e) => setUseQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg font-mono font-bold text-rose-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Usage Date</label>
                  <input
                    type="date"
                    value={useDate}
                    onChange={(e) => setUseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Location / Site Detail</label>
                <input
                  type="text"
                  placeholder="e.g. 40ft Main Road Compaction / Stilt Columns"
                  value={useLocation}
                  onChange={(e) => setUseLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Approved By</label>
                <input
                  type="text"
                  value={useApprovedBy}
                  onChange={(e) => setUseApprovedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUsageModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold">
                  Deduct from Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECORD VENDOR PAYMENT MODAL ================= */}
      {isVendorPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Record Vendor Disbursement</h3>
              <button onClick={() => setIsVendorPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVendorPayment} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Vendor *</label>
                <select
                  value={vpVendorId}
                  onChange={(e) => setVpVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="">-- Choose Vendor --</option>
                  {db.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Due: {formatCurrency(v.currentOutstanding)})
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
                  value={vpAmount || ''}
                  onChange={(e) => setVpAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={vpPaymentMode}
                    onChange={(e) => setVpPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={vpDate}
                    onChange={(e) => setVpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference No / Remarks</label>
                <input
                  type="text"
                  placeholder="Cheque # or IMPS UTR"
                  value={vpRef}
                  onChange={(e) => setVpRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVendorPaymentModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">
                  Save Payment & Update Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BILL MODAL */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Purchase Bill: {viewingBill.billNumber}</h3>
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
                <div><span className="text-slate-500">Payment Due:</span> <strong className="font-mono text-rose-600">{formatDate(viewingBill.paymentDueDate)}</strong></div>
                <div><span className="text-slate-500">Classification:</span> <strong>{viewingBill.isGstBill ? 'GST Bill' : 'Non-GST'}</strong></div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Line Items (Feet / Units)</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px]">
                      <tr>
                        <th className="p-2">Material</th>
                        <th className="p-2 text-right">Quantity</th>
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
                  'MATERIAL_BILL_UPDATED',
                  'Material Management',
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

      {/* SAFE DELETE PURCHASE BILL MODAL */}
      {deletingBill && (() => {
        const vendor = db.vendors.find((v) => v.id === deletingBill.vendorId);
        const linkedPayments = db.vendorPayments.filter((vp) => vp.billId === deletingBill.id);
        const linkedSummary: string[] = [
          `Vendor: ${deletingBill.vendorName} (Current Outstanding: ${formatCurrency(vendor?.currentOutstanding || 0)})`,
          `Bill Total: ${formatCurrency(deletingBill.billTotal)}, Outstanding: ${formatCurrency(deletingBill.outstandingAmount)}`,
          `Stock quantities will be reversed for: ${deletingBill.items.map((it) => `${it.quantity} ${it.unit} of ${it.materialName}`).join(', ')}`,
        ];
        if (linkedPayments.length > 0) {
          linkedSummary.push(`${linkedPayments.length} Vendor Payment Voucher(s) recorded against this bill`);
        }

        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => setDeletingBill(null)}
            title={`Delete Material Purchase Bill: ${deletingBill.billNumber}`}
            recordType="Material Purchase Bill"
            recordIdentifier={`${deletingBill.billNumber} (${deletingBill.vendorName} - ${deletingBill.projectName})`}
            linkedRecords={linkedSummary}
            safeAlternativeText="Mark bill as settled or adjust ledger note instead of permanent deletion."
            onDownloadBackup={() => {
              const headers = ['Record', 'Bill No', 'Vendor', 'Project', 'Date', 'Total', 'Outstanding'];
              const rows = [
                ['MATERIAL_BILL', deletingBill.billNumber, deletingBill.vendorName, deletingBill.projectName, deletingBill.billDate, deletingBill.billTotal, deletingBill.outstandingAmount],
                ...deletingBill.items.map((it) => ['LINE_ITEM', it.materialName, `${it.quantity} ${it.unit}`, `Rate: ${it.ratePerUnit}`, '', it.totalAmount, '']),
              ];
              exportToCSV(`Bill_Archive_${deletingBill.billNumber}`, headers, rows);
            }}
            onConfirm={() => {
              const currentDb = dbService.getDatabase();
              // 1. Revert stock
              deletingBill.items.forEach((it) => {
                const mat = currentDb.materials.find((m) => m.name === it.materialName);
                if (mat) {
                  mat.currentStock = Math.max(0, mat.currentStock - it.quantity);
                }
              });
              // 2. Adjust vendor outstanding
              if (vendor) {
                const targetVen = currentDb.vendors.find((v) => v.id === vendor.id);
                if (targetVen) {
                  targetVen.currentOutstanding = Math.max(0, (targetVen.currentOutstanding || 0) - deletingBill.outstandingAmount);
                }
              }
              // 3. Remove bill
              currentDb.materialPurchases = currentDb.materialPurchases.filter((b) => b.id !== deletingBill.id);
              dbService.saveDatabase(currentDb);
              dbService.logAudit(
                currentUser.name,
                'MATERIAL_BILL_DELETED',
                'Material Management',
                `Deleted purchase bill ${deletingBill.billNumber} (${deletingBill.vendorName}), adjusted stock & vendor balance with verification code 7666257368`
              );
              setDeletingBill(null);
            }}
          />
        );
      })()}

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
