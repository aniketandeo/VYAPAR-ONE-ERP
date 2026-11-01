import React, { useState } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import { Adviser, AdviserCommission, AdviserPayment, FinancialTransaction, CommissionCalculationType } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';
import {
  Award,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Building2,
  FileText,
  User,
  Eye,
  Edit2,
  Trash2,
  Camera,
  Percent,
} from 'lucide-react';

interface AdviserManagementViewProps {
  db: DatabaseState;
}

export const AdviserManagementView: React.FC<AdviserManagementViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();
  const [subTab, setSubTab] = useState<'roster' | 'deals' | 'payments' | 'statement'>('roster');
  const [selectedAdviserId, setSelectedAdviserId] = useState<string>(db.advisers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddAdviserModalOpen, setIsAddAdviserModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewAdviser, setViewAdviser] = useState<Adviser | null>(null);
  const [editAdviser, setEditAdviser] = useState<Adviser | null>(null);
  const [deleteAdviser, setDeleteAdviser] = useState<Adviser | null>(null);

  // Add Adviser form state
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [commissionType, setCommissionType] = useState<CommissionCalculationType>('Percentage');
  const [commissionRate, setCommissionRate] = useState<number>(2);
  const [commissionBasis, setCommissionBasis] = useState('On Property Total Price');
  const [remarks, setRemarks] = useState('');

  // Edit Adviser form state
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editCommissionType, setEditCommissionType] = useState<CommissionCalculationType>('Percentage');
  const [editCommissionRate, setEditCommissionRate] = useState<number>(2);
  const [editCommissionBasis, setEditCommissionBasis] = useState('On Property Total Price');
  const [editRemarks, setEditRemarks] = useState('');

  const openEditModal = (adv: Adviser) => {
    setEditAdviser(adv);
    setEditName(adv.name);
    setEditMobile(adv.mobileNumber);
    setEditAddress(adv.address || '');
    setEditEmail(adv.email || '');
    setEditPhotoUrl(adv.photoUrl || '');
    setEditCommissionType(adv.commissionType);
    setEditCommissionRate(adv.commissionRate);
    setEditCommissionBasis(adv.commissionBasis);
    setEditRemarks(adv.remarks || '');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo file size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditPhotoUrl(reader.result as string);
      } else {
        setPhotoUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Payment form state
  const [payAdviserId, setPayAdviserId] = useState(db.advisers[0]?.id || '');
  const [payBookingId, setPayBookingId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(10000);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // Save Adviser
  const handleSaveAdviser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobileNumber.trim()) {
      alert('Adviser Name and Mobile are required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const newAdv: Adviser = {
      id: `adv-${Date.now()}`,
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      address: address.trim(),
      email: email.trim(),
      photoUrl: photoUrl || undefined,
      commissionType,
      commissionRate: Number(commissionRate),
      commissionBasis,
      remarks,
      createdAt: new Date().toISOString().split('T')[0],
    };

    currentDb.advisers.push(newAdv);
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'ADVISER_CREATED',
      'Adviser Management',
      `Registered adviser ${newAdv.name} with rule ${newAdv.commissionType} (${newAdv.commissionRate})`
    );

    setIsAddAdviserModalOpen(false);
    setName('');
    setMobileNumber('');
    setAddress('');
    setEmail('');
    setPhotoUrl('');
    setRemarks('');
  };

  // Update Adviser
  const handleUpdateAdviser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdviser) return;
    if (!editName.trim() || !editMobile.trim()) {
      alert('Adviser Name and Mobile are required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    currentDb.advisers = currentDb.advisers.map((a) =>
      a.id === editAdviser.id
        ? {
            ...a,
            name: editName.trim(),
            mobileNumber: editMobile.trim(),
            address: editAddress.trim(),
            email: editEmail.trim(),
            photoUrl: editPhotoUrl || undefined,
            commissionType: editCommissionType,
            commissionRate: Number(editCommissionRate),
            commissionBasis: editCommissionBasis,
            remarks: editRemarks,
          }
        : a
    );

    // Also update cached adviser name across deals and payments
    currentDb.adviserCommissions = currentDb.adviserCommissions.map((c) =>
      c.adviserId === editAdviser.id ? { ...c, adviserName: editName.trim() } : c
    );
    currentDb.adviserPayments = currentDb.adviserPayments.map((p) =>
      p.adviserId === editAdviser.id ? { ...p, adviserName: editName.trim() } : p
    );

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'ADVISER_UPDATED',
      'Adviser Management',
      `Updated profile & rules for adviser ${editName.trim()}`
    );

    setEditAdviser(null);
  };

  // Delete Adviser Safeguard
  const handleConfirmDeleteAdviser = (reason: string) => {
    if (!deleteAdviser) return;

    const currentDb = dbService.getDatabase();
    currentDb.advisers = currentDb.advisers.filter((a) => a.id !== deleteAdviser.id);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'ADVISER_DELETED',
      'Adviser Management',
      `Deleted adviser ${deleteAdviser.name} (${deleteAdviser.id}). Reason: ${reason}`
    );

    setDeleteAdviser(null);
  };

  // Save Commission Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount) return;

    const currentDb = dbService.getDatabase();
    const adv = currentDb.advisers.find((a) => a.id === payAdviserId);
    if (!adv) return;

    const voucherNumber = `VD-AP-${Date.now().toString().slice(-6)}`;

    const newPayment: AdviserPayment = {
      id: `ap-${Date.now()}`,
      voucherNumber,
      adviserId: payAdviserId,
      adviserName: adv.name,
      bookingId: payBookingId || undefined,
      paymentDate: payDate,
      amount: Number(payAmount),
      paymentMode: payMode,
      transactionRef: payRef || voucherNumber,
      remarks: payRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.adviserPayments.unshift(newPayment);

    // Update commissions paid
    const commIndex = currentDb.adviserCommissions.findIndex(
      (c) => c.adviserId === payAdviserId && (!payBookingId || c.bookingId === payBookingId)
    );
    if (commIndex >= 0) {
      currentDb.adviserCommissions[commIndex].paidCommission += Number(payAmount);
      currentDb.adviserCommissions[commIndex].outstandingCommission = Math.max(
        0,
        currentDb.adviserCommissions[commIndex].eligibleCommission -
          currentDb.adviserCommissions[commIndex].paidCommission
      );
    }

    // Accounts Journal
    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber,
      txnDate: payDate,
      type: 'ADVISER_COMMISSION',
      category: 'Adviser Commission Payment',
      description: `Commission paid to ${adv.name}`,
      entityType: 'ADVISER',
      entityId: adv.id,
      entityName: adv.name,
      debit: Number(payAmount),
      credit: 0,
      account: payMode === 'Cash' ? 'Cash Account' : 'HDFC Bank Ltd',
      paymentMode: payMode,
      refNumber: payRef || voucherNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.transactions.unshift(journalTxn);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'ADVISER_COMMISSION_PAID',
      'Adviser Management',
      `Paid ₹${payAmount} commission to ${adv.name}`
    );

    setIsPaymentModalOpen(false);
  };

  // Helper metrics for selected adviser
  const getAdviserMetrics = (adviserId: string) => {
    const deals = db.adviserCommissions.filter((c) => c.adviserId === adviserId);
    const payments = db.adviserPayments.filter((p) => p.adviserId === adviserId);

    const totalEligible = deals.reduce((s, d) => s + d.eligibleCommission, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalOutstanding = Math.max(0, totalEligible - totalPaid);

    return { totalEligible, totalPaid, totalOutstanding, deals, payments };
  };

  const selectedAdv = db.advisers.find((a) => a.id === selectedAdviserId) || db.advisers[0];
  const selectedAdvMetrics = selectedAdv ? getAdviserMetrics(selectedAdv.id) : null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>Adviser & Channel Partner Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable commission rules (% or Fixed), customer deals, eligible commission tracking, and payouts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs inline-flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Record Commission Payout</span>
            </button>
          )}

          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsAddAdviserModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Adviser</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setSubTab('roster')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'roster' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Adviser Directory ({db.advisers.length})
        </button>
        <button
          onClick={() => setSubTab('statement')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'statement' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Adviser Statement & Ledger
        </button>
        <button
          onClick={() => setSubTab('deals')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'deals' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Customer Booking Commissions ({db.adviserCommissions.length})
        </button>
        <button
          onClick={() => setSubTab('payments')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            subTab === 'payments' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Commission Payment History ({db.adviserPayments.length})
        </button>
      </div>

      {/* 1. ROSTER SUBTAB */}
      {subTab === 'roster' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Adviser Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Commission Rule</th>
                  <th className="py-2.5 px-3">Calculation Basis</th>
                  <th className="py-2.5 px-3 text-right">Total Eligible</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3 text-center">Ledger</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.advisers.map((adv) => {
                  const m = getAdviserMetrics(adv.id);
                  return (
                    <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {adv.photoUrl ? (
                            <img
                              src={adv.photoUrl}
                              alt={adv.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {adv.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block">{adv.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {adv.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{adv.mobileNumber}</p>
                        <p className="text-[10px] text-slate-400">{adv.email || '-'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {adv.commissionType === 'Percentage' ? `${adv.commissionRate}%` : adv.commissionType === 'Per Sq. Feet' ? `₹${adv.commissionRate}/sq.ft` : `Fixed ₹${adv.commissionRate}`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{adv.commissionBasis}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(m.totalEligible)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                        {formatCurrency(m.totalPaid)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-700 font-bold text-sm">
                        {formatCurrency(m.totalOutstanding)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedAdviserId(adv.id);
                            setSubTab('statement');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded"
                        >
                          Statement
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewAdviser(adv)}
                            title="View Full Details"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {hasPermission('canEdit') && (
                            <button
                              onClick={() => openEditModal(adv)}
                              title="Edit Adviser"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission('canDeleteOrReverse') && (
                            <button
                              onClick={() => setDeleteAdviser(adv)}
                              title="Delete Adviser (Safeguard Protected)"
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded"
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

      {/* 2. ADVISER STATEMENT & LEDGER SUBTAB (Requirement 13) */}
      {subTab === 'statement' && selectedAdv && selectedAdvMetrics && (
        <div className="space-y-5">
          {/* Adviser Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Select Adviser:</span>
              <select
                value={selectedAdviserId}
                onChange={(e) => setSelectedAdviserId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50 focus:outline-hidden"
              >
                {db.advisers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-slate-500 text-[11px]">Configured Rule: </span>
              <strong className="text-slate-800">
                {selectedAdv.commissionType} ({selectedAdv.commissionRate}%)
              </strong>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-center">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Eligible Commission</span>
              <p className="font-mono font-bold text-slate-900 text-lg mt-1">
                {formatCurrency(selectedAdvMetrics.totalEligible)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Commission Paid</span>
              <p className="font-mono font-bold text-emerald-800 text-lg mt-1">
                {formatCurrency(selectedAdvMetrics.totalPaid)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-700 uppercase font-bold">Commission Outstanding Due</span>
              <p className="font-mono font-extrabold text-rose-700 text-lg mt-1">
                {formatCurrency(selectedAdvMetrics.totalOutstanding)}
              </p>
            </div>
          </div>

          {/* Statement Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Commission & Payment Statement for {selectedAdv.name}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const headers = ['Date', 'Type', 'Property / Ref', 'Customer / Remarks', 'Eligible Commission (₹)', 'Disbursed (₹)', 'Mode'];
                    const rows = [
                      ...selectedAdvMetrics.deals.map((d) => [
                        formatDate(d.createdAt),
                        'Commission Accrual',
                        `${d.propertyNumber} (${d.projectName})`,
                        d.customerName,
                        d.eligibleCommission,
                        0,
                        '-',
                      ]),
                      ...selectedAdvMetrics.payments.map((p) => [
                        formatDate(p.paymentDate),
                        'Disbursement Voucher',
                        p.voucherNumber,
                        p.remarks,
                        0,
                        p.amount,
                        p.paymentMode,
                      ]),
                    ];
                    exportToCSV(`Adviser_Statement_${selectedAdv.name.replace(/\s+/g, '_')}`, headers, rows);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-300"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Property / Booking</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Eligible (+)</th>
                    <th className="py-2.5 px-3 text-right">Disbursed (-)</th>
                    <th className="py-2.5 px-3">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedAdvMetrics.deals.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 px-4 text-slate-600">{formatDate(d.createdAt)}</td>
                      <td className="py-2.5 px-3 font-semibold text-indigo-900">Commission Accrual</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {d.propertyNumber} ({d.projectName})
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{d.customerName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                        +{formatCurrency(d.eligibleCommission)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-slate-400">-</td>
                    </tr>
                  ))}
                  {selectedAdvMetrics.payments.map((p) => (
                    <tr key={p.id} className="bg-rose-50/30">
                      <td className="py-2.5 px-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-800">Disbursement Voucher</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{p.voucherNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.remarks}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        -{formatCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{p.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DEALS SUBTAB */}
      {subTab === 'deals' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Booking Ref</th>
                  <th className="py-2.5 px-3">Adviser</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Project & Property</th>
                  <th className="py-2.5 px-3 text-right">Property Value</th>
                  <th className="py-2.5 px-3 text-right">Eligible Commission</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.adviserCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{c.bookingRef}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{c.adviserName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{c.customerName}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold">{c.propertyNumber}</p>
                      <p className="text-[10px] text-slate-400">{c.projectName}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{formatCurrency(c.propertyValue)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(c.eligibleCommission)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                      {formatCurrency(c.paidCommission)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                      {formatCurrency(c.outstandingCommission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PAYMENTS SUBTAB */}
      {subTab === 'payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3 font-mono">Voucher #</th>
                  <th className="py-2.5 px-3">Adviser Name</th>
                  <th className="py-2.5 px-3 text-right">Amount Disbursed</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 font-mono">Ref #</th>
                  <th className="py-2.5 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.adviserPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{p.voucherNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.adviserName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{p.paymentMode}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{p.transactionRef}</td>
                    <td className="py-2.5 px-4 text-slate-500">{p.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ADD ADVISER MODAL ================= */}
      {isAddAdviserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Add New Channel Partner / Adviser</h3>
              <button onClick={() => setIsAddAdviserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAdviser} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adviser Name / Firm *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vijay Varma (Sai Properties)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commission Type</label>
                  <select
                    value={commissionType}
                    onChange={(e) => setCommissionType(e.target.value as CommissionCalculationType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Percentage">Percentage of Property (%)</option>
                    <option value="Per Sq. Feet">Per Sq. Feet Rate (₹/Sq.Ft)</option>
                    <option value="Lump Sum">Lump Sum per Booking (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commission Rate</label>
                  <input
                    type="number"
                    value={commissionRate || ''}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commission Basis</label>
                <input
                  type="text"
                  value={commissionBasis}
                  onChange={(e) => setCommissionBasis(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
                <input
                  type="text"
                  placeholder="Office address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Photo Upload with validation & preview */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adviser Photo (JPG/PNG &lt; 2MB)</label>
                <div className="flex items-center gap-3">
                  {photoUrl ? (
                    <div className="relative">
                      <img
                        src={photoUrl}
                        alt="Adviser Preview"
                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handlePhotoUpload(e, false)}
                    className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdviserModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                  Save Adviser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT ADVISER MODAL ================= */}
      {editAdviser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-blue-900 text-white">
              <h3 className="font-semibold text-sm">Edit Channel Partner / Adviser</h3>
              <button onClick={() => setEditAdviser(null)} className="text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateAdviser} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adviser Name / Firm *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commission Type</label>
                  <select
                    value={editCommissionType}
                    onChange={(e) => setEditCommissionType(e.target.value as CommissionCalculationType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Percentage">Percentage of Property (%)</option>
                    <option value="Per Sq. Feet">Per Sq. Feet Rate (₹/Sq.Ft)</option>
                    <option value="Lump Sum">Lump Sum per Booking (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commission Rate</label>
                  <input
                    type="number"
                    value={editCommissionRate || ''}
                    onChange={(e) => setEditCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commission Basis</label>
                <input
                  type="text"
                  value={editCommissionBasis}
                  onChange={(e) => setEditCommissionBasis(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Photo Upload with validation & preview */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adviser Photo (JPG/PNG &lt; 2MB)</label>
                <div className="flex items-center gap-3">
                  {editPhotoUrl ? (
                    <div className="relative">
                      <img
                        src={editPhotoUrl}
                        alt="Adviser Preview"
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditPhotoUrl('')}
                        className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handlePhotoUpload(e, true)}
                    className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditAdviser(null)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                  Update Adviser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW ADVISER MODAL ================= */}
      {viewAdviser && (() => {
        const m = getAdviserMetrics(viewAdviser.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  {viewAdviser.photoUrl ? (
                    <img
                      src={viewAdviser.photoUrl}
                      alt={viewAdviser.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                      {viewAdviser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base leading-tight">{viewAdviser.name}</h3>
                    <p className="text-xs text-slate-400">Channel Partner / Adviser Profile • ID: {viewAdviser.id}</p>
                  </div>
                </div>
                <button onClick={() => setViewAdviser(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5 text-xs">
                {/* Contact and Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact Details</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{viewAdviser.mobileNumber}</p>
                    <p className="text-slate-600">{viewAdviser.email || 'No email provided'}</p>
                    <p className="text-slate-500 mt-1">{viewAdviser.address || 'No office address'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Commission Structure</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                        {viewAdviser.commissionType === 'Percentage'
                          ? `${viewAdviser.commissionRate}%`
                          : viewAdviser.commissionType === 'Per Sq. Feet'
                          ? `₹${viewAdviser.commissionRate} / sq.ft`
                          : `Fixed ₹${viewAdviser.commissionRate}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">Basis: {viewAdviser.commissionBasis}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Joined: {formatDate(viewAdviser.createdAt)}</p>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Total Eligible</span>
                    <p className="text-base font-extrabold text-slate-900 mt-1 font-mono">
                      {formatCurrency(m.totalEligible)}
                    </p>
                    <span className="text-[10px] text-slate-400">{m.deals.length} Deals Closed</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold">Commission Paid</span>
                    <p className="text-base font-extrabold text-emerald-800 mt-1 font-mono">
                      {formatCurrency(m.totalPaid)}
                    </p>
                    <span className="text-[10px] text-emerald-600">{m.payments.length} Payments</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 shadow-2xs">
                    <span className="text-[10px] text-rose-700 uppercase font-bold">Outstanding Due</span>
                    <p className="text-base font-extrabold text-rose-700 mt-1 font-mono">
                      {formatCurrency(m.totalOutstanding)}
                    </p>
                    <span className="text-[10px] text-rose-500">Unsettled</span>
                  </div>
                </div>

                {/* Recent Deals Table */}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
                    <span>Associated Customer Bookings ({m.deals.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Property</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3 text-right">Commission</th>
                          <th className="py-2 px-3 text-right">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {m.deals.map((d) => (
                          <tr key={d.id}>
                            <td className="py-2 px-3 text-slate-600">{formatDate(d.createdAt)}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {d.propertyNumber} ({d.projectName})
                            </td>
                            <td className="py-2 px-3 text-slate-700">{d.customerName}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(d.eligibleCommission)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(d.outstandingCommission)}
                            </td>
                          </tr>
                        ))}
                        {m.deals.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-400">
                              No deals recorded for this adviser yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setSelectedAdviserId(viewAdviser.id);
                      setSubTab('statement');
                      setViewAdviser(null);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg"
                  >
                    Open Full Statement
                  </button>
                  <button
                    onClick={() => setViewAdviser(null)}
                    className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= DELETE ADVISER SAFEGUARD MODAL ================= */}
      {deleteAdviser && (() => {
        const m = getAdviserMetrics(deleteAdviser.id);
        const linkedItems: Array<{ label: string; count: number; impact: string }> = [];
        if (m.deals.length > 0) {
          linkedItems.push({
            label: 'Customer Booking Commissions',
            count: m.deals.length,
            impact: 'Commission deal records linked to customer bookings',
          });
        }
        if (m.payments.length > 0) {
          linkedItems.push({
            label: 'Commission Payment Vouchers',
            count: m.payments.length,
            impact: 'Disbursement vouchers and accounting ledger transactions',
          });
        }

        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => setDeleteAdviser(null)}
            onConfirm={handleConfirmDeleteAdviser}
            itemType="Adviser / Channel Partner"
            itemName={`${deleteAdviser.name} (${deleteAdviser.mobileNumber})`}
            linkedData={linkedItems}
            safeAlternative="Keep the adviser registered and do not assign future deals, or mark remarks as Inactive."
            snapshotData={{
              adviser: deleteAdviser,
              deals: m.deals,
              payments: m.payments,
            }}
          />
        );
      })()}

      {/* ================= RECORD PAYMENT MODAL ================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Disburse Adviser Commission</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Adviser *</label>
                <select
                  value={payAdviserId}
                  onChange={(e) => setPayAdviserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {db.advisers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-emerald-700 mb-1">Payout Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900"
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
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / UTR</label>
                <input
                  type="text"
                  placeholder="IMPS or Cheque number"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
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
                  Save Commission Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
