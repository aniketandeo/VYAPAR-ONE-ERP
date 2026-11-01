import React, { useState, useEffect } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import {
  Labour,
  LabourAttendanceRecord,
  LabourPaymentRecord,
  LabourType,
  WageBasis,
  PaymentFrequency,
  AttendanceStatus,
  FinancialTransaction,
} from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Building2,
  FileText,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  History,
} from 'lucide-react';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';
import { LabourAttendanceRegisterView } from './LabourAttendanceRegisterView';

interface LabourManagementViewProps {
  db: DatabaseState;
}

export const LabourManagementView: React.FC<LabourManagementViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();
  const [subTab, setSubTab] = useState<'roster' | 'attendance' | 'payments' | 'ledger'>('roster');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabourId, setSelectedLabourId] = useState<string>(db.labours[0]?.id || '');

  // Modals
  const [isAddLabourModalOpen, setIsAddLabourModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Labour Actions State
  const [viewingLabour, setViewingLabour] = useState<Labour | null>(null);
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null);
  const [deletingLabour, setDeletingLabour] = useState<Labour | null>(null);

  // Add / Edit Labour form state
  const [labourName, setLabourName] = useState('');
  const [labourMobile, setLabourMobile] = useState('');
  const [labourAddress, setLabourAddress] = useState('');
  const [labourType, setLabourType] = useState<LabourType>('Mason');
  const [labourProjectId, setLabourProjectId] = useState(db.projects[0]?.id || '');
  const [labourJoiningDate, setLabourJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [wageBasis, setWageBasis] = useState<WageBasis>('Daily Rate');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('Weekly');
  const [dailyRateOrSalary, setDailyRateOrSalary] = useState<number>(900);
  const [overtimeRate, setOvertimeRate] = useState<number>(120);
  const [labourRemarks, setLabourRemarks] = useState('');

  // Daily Attendance Sheet state for multiple labourers
  const [sheetDate, setSheetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sheetProjectId, setSheetProjectId] = useState<string>('ALL');
  const [sheetRows, setSheetRows] = useState<
    Record<string, { status: AttendanceStatus; overtimeHours: number; remarks: string }>
  >({});

  // Synchronize Attendance Sheet records for current date & project
  useEffect(() => {
    const labs = db.labours.filter(
      (l) => l.active && (sheetProjectId === 'ALL' || l.projectId === sheetProjectId)
    );
    const map: Record<string, { status: AttendanceStatus; overtimeHours: number; remarks: string }> = {};
    labs.forEach((l) => {
      const existing = db.labourAttendance.find((a) => a.labourId === l.id && a.date === sheetDate);
      if (existing) {
        map[l.id] = {
          status: (existing.status as AttendanceStatus) || 'Present',
          overtimeHours: existing.overtimeHours || 0,
          remarks: existing.remarks || '',
        };
      } else {
        map[l.id] = {
          status: 'Present',
          overtimeHours: 0,
          remarks: '',
        };
      }
    });
    setSheetRows(map);
  }, [sheetDate, sheetProjectId, db.labours, db.labourAttendance]);

  // Attendance form state (single record modal)
  const [attLabourId, setAttLabourId] = useState(db.labours[0]?.id || '');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('Present');
  const [attOvertimeHours, setAttOvertimeHours] = useState<number>(0);
  const [attRemarks, setAttRemarks] = useState('');

  // Payment / Advance form state
  const [payLabourId, setPayLabourId] = useState(db.labours[0]?.id || '');
  const [payType, setPayType] = useState<'Advance' | 'Wage Payment' | 'Overtime Payment'>('Advance');
  const [payAmount, setPayAmount] = useState<number>(2000);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Cash');
  const [payRemarks, setPayRemarks] = useState('');

  // Save new Labour
  const handleSaveLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labourName.trim() || !labourMobile.trim()) {
      alert('Labour Name and Mobile are required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const proj = currentDb.projects.find((p) => p.id === labourProjectId);

    const newLab: Labour = {
      id: `lab-${Date.now()}`,
      name: labourName.trim(),
      mobileNumber: labourMobile.trim(),
      address: labourAddress.trim(),
      labourType,
      projectId: labourProjectId,
      projectName: proj ? proj.name : 'Project',
      joiningDate: labourJoiningDate,
      wageBasis,
      paymentFrequency: paymentFrequency || 'Weekly',
      dailyRateOrSalary: Number(dailyRateOrSalary),
      overtimeRate: Number(overtimeRate),
      active: true,
      remarks: labourRemarks,
      createdAt: new Date().toISOString().split('T')[0],
    };

    currentDb.labours.push(newLab);
    dbService.saveDatabase(currentDb);
    dbService.logAudit(currentUser.name, 'LABOUR_ENROLLED', 'Labour Management', `Enrolled labour ${newLab.name} (${newLab.labourType})`);

    setIsAddLabourModalOpen(false);
    setLabourName('');
    setLabourMobile('');
  };

  // Record Attendance
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const currentDb = dbService.getDatabase();
    const lab = currentDb.labours.find((l) => l.id === attLabourId);
    if (!lab) return;

    let baseWage = 0;
    if (attStatus === 'Present' || (attStatus as string) === 'Full Day') {
      baseWage = lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : Math.round(lab.dailyRateOrSalary / 30);
    } else if (attStatus === 'Half Day') {
      baseWage = Math.round((lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : lab.dailyRateOrSalary / 30) / 2);
    }

    const overtimeWage = (Number(attOvertimeHours) || 0) * (lab.overtimeRate || 0);
    const totalWage = baseWage + overtimeWage;

    const newAtt: LabourAttendanceRecord = {
      id: `att-${Date.now()}`,
      labourId: attLabourId,
      labourName: lab.name,
      projectId: lab.projectId,
      projectName: lab.projectName,
      date: attDate,
      status: attStatus,
      overtimeHours: Number(attOvertimeHours) || 0,
      wageCalculated: totalWage,
      remarks: attRemarks,
    };

    const existingIdx = currentDb.labourAttendance.findIndex(
      (a) => a.labourId === attLabourId && a.date === attDate
    );
    if (existingIdx >= 0) {
      currentDb.labourAttendance[existingIdx] = newAtt;
    } else {
      currentDb.labourAttendance.unshift(newAtt);
    }
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'LABOUR_ATTENDANCE_LOGGED',
      'Labour Management',
      `Logged attendance for ${lab.name} on ${attDate}. Earned wage: ₹${totalWage}`
    );

    setIsAttendanceModalOpen(false);
  };

  // Record Payment / Advance
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount) return;

    const currentDb = dbService.getDatabase();
    const lab = currentDb.labours.find((l) => l.id === payLabourId);
    if (!lab) return;

    const voucherNumber = `VD-LP-${Date.now().toString().slice(-6)}`;

    const newPayment: LabourPaymentRecord = {
      id: `lp-${Date.now()}`,
      voucherNumber,
      labourId: payLabourId,
      labourName: lab.name,
      projectId: lab.projectId,
      projectName: lab.projectName,
      date: payDate,
      type: payType,
      amount: Number(payAmount),
      paymentMode: payMode,
      remarks: payRemarks,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };

    currentDb.labourPayments.unshift(newPayment);

    // Financial Transaction
    const journalTxn: FinancialTransaction = {
      id: `txn-${Date.now()}`,
      voucherNumber,
      txnDate: payDate,
      type: payType === 'Advance' ? 'LABOUR_ADVANCE' : 'LABOUR_PAYMENT',
      category: payType === 'Advance' ? 'Labour Advance' : 'Labour Salary / Wages',
      description: `${payType} to ${lab.name} (${lab.labourType})`,
      entityType: 'LABOUR',
      entityId: lab.id,
      entityName: lab.name,
      projectId: lab.projectId,
      projectName: lab.projectName,
      debit: Number(payAmount),
      credit: 0,
      account: payMode === 'Cash' ? 'Cash Account' : 'HDFC Bank Ltd',
      paymentMode: payMode,
      refNumber: voucherNumber,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
    };
    currentDb.transactions.unshift(journalTxn);

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'LABOUR_PAYMENT_SAVED',
      'Labour Management',
      `Recorded ${payType} of ₹${payAmount} to ${lab.name}`
    );

    setIsPaymentModalOpen(false);
  };

  // Helper calculation for individual labour
  const getLabourLedgerMetrics = (labourId: string) => {
    const attendance = db.labourAttendance.filter((a) => a.labourId === labourId);
    const payments = db.labourPayments.filter((p) => p.labourId === labourId);

    const totalWages = attendance.reduce((s, a) => s + a.wageCalculated, 0);
    const totalAdvances = payments.filter((p) => p.type === 'Advance').reduce((s, p) => s + p.amount, 0);
    const totalWagePayments = payments.filter((p) => p.type !== 'Advance').reduce((s, p) => s + p.amount, 0);
    const totalPaid = totalAdvances + totalWagePayments;
    const outstanding = Math.max(0, totalWages - totalPaid);

    return { totalWages, totalAdvances, totalWagePayments, totalPaid, outstanding, attendance, payments };
  };

  const selectedLabour = db.labours.find((l) => l.id === selectedLabourId) || db.labours[0];
  const selectedLabourMetrics = selectedLabour ? getLabourLedgerMetrics(selectedLabour.id) : null;

  const handleToggleLabourActive = (lab: Labour) => {
    if (!hasPermission('canEdit')) {
      alert('Permission denied. You do not have rights to change labour status.');
      return;
    }
    const currentDb = dbService.getDatabase();
    const nextStatus = !lab.active;
    currentDb.labours = currentDb.labours.map((l) => (l.id === lab.id ? { ...l, active: nextStatus } : l));
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'LABOUR_STATUS_TOGGLED',
      'Labour Management',
      `Worker ${lab.name} marked as ${nextStatus ? 'Active' : 'Inactive'}`
    );
  };

  const handleMarkAllSheet = (status: AttendanceStatus) => {
    setSheetRows((prev) => {
      const next: typeof prev = {};
      Object.keys(prev).forEach((id) => {
        next[id] = { ...prev[id], status };
      });
      return next;
    });
  };

  const handleSaveAttendanceSheet = () => {
    const currentDb = dbService.getDatabase();
    const activeLabs = currentDb.labours.filter(
      (l) => l.active && (sheetProjectId === 'ALL' || l.projectId === sheetProjectId)
    );

    let savedCount = 0;
    activeLabs.forEach((lab) => {
      const row = sheetRows[lab.id];
      if (!row) return;

      let baseWage = 0;
      if (row.status === 'Present') {
        baseWage = lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : Math.round(lab.dailyRateOrSalary / 30);
      } else if (row.status === 'Half Day') {
        baseWage = Math.round((lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : lab.dailyRateOrSalary / 30) / 2);
      } else {
        baseWage = 0;
      }

      const overtimeWage = (Number(row.overtimeHours) || 0) * (lab.overtimeRate || 0);
      const totalWage = baseWage + overtimeWage;

      const existingIdx = currentDb.labourAttendance.findIndex(
        (a) => a.labourId === lab.id && a.date === sheetDate
      );

      if (existingIdx >= 0) {
        currentDb.labourAttendance[existingIdx] = {
          ...currentDb.labourAttendance[existingIdx],
          status: row.status,
          overtimeHours: row.overtimeHours,
          wageCalculated: totalWage,
          remarks: row.remarks,
        };
      } else {
        const newRecord: LabourAttendanceRecord = {
          id: `att-${Date.now()}-${lab.id}`,
          labourId: lab.id,
          labourName: lab.name,
          projectId: lab.projectId,
          projectName: lab.projectName,
          date: sheetDate,
          status: row.status,
          overtimeHours: row.overtimeHours,
          wageCalculated: totalWage,
          remarks: row.remarks,
        };
        currentDb.labourAttendance.unshift(newRecord);
      }
      savedCount++;
    });

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'ATTENDANCE_SHEET_SAVED',
      'Labour Management',
      `Saved daily attendance sheet for ${savedCount} labourers on ${sheetDate}`
    );
    alert(`Attendance sheet for ${sheetDate} saved successfully!`);
  };

  const handleDownloadAttendanceSheetCSV = () => {
    const headers = [
      'Date',
      'Labour Name',
      'Trade / Role',
      'Assigned Project',
      'Wage Basis',
      'Daily Rate',
      'Payment Frequency',
      'Attendance Status',
      'Overtime Hours',
      'Calculated Wage (₹)',
      'Remarks',
    ];

    const activeLabs = db.labours.filter(
      (l) => sheetProjectId === 'ALL' || l.projectId === sheetProjectId
    );

    const rows = activeLabs.map((lab) => {
      const row = sheetRows[lab.id] || { status: 'Present', overtimeHours: 0, remarks: '' };
      let baseWage = 0;
      if (row.status === 'Present') {
        baseWage = lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : Math.round(lab.dailyRateOrSalary / 30);
      } else if (row.status === 'Half Day') {
        baseWage = Math.round((lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : lab.dailyRateOrSalary / 30) / 2);
      }
      const overtimeWage = (Number(row.overtimeHours) || 0) * (lab.overtimeRate || 0);
      const totalWage = baseWage + overtimeWage;

      return [
        sheetDate,
        lab.name,
        lab.labourType,
        lab.projectName,
        lab.wageBasis,
        lab.dailyRateOrSalary,
        lab.paymentFrequency || 'Weekly',
        row.status,
        row.overtimeHours,
        totalWage,
        row.remarks,
      ];
    });

    exportToCSV(`Labour_Attendance_Sheet_${sheetDate}`, headers, rows);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Labour Management & Wage Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Masons, barbenders, supervisors, attendance, overtime, advance deductions, and payout vouchers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsAttendanceModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs inline-flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Record Work / Attendance</span>
            </button>
          )}

          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs inline-flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Record Advance / Payment</span>
            </button>
          )}

          {hasPermission('canCreate') && (
            <button
              onClick={() => setIsAddLabourModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Labour</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setSubTab('roster')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
            subTab === 'roster' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Labour Roster & Profiles ({db.labours.length})</span>
        </button>
        <button
          onClick={() => setSubTab('attendance')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
            subTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
              : 'text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 font-bold border border-indigo-200/60'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
          <span>LABOUR ATTENDANCE REGISTER ({db.labourAttendance.length})</span>
        </button>
        <button
          onClick={() => setSubTab('ledger')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
            subTab === 'ledger' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Labour Ledger & Dues</span>
        </button>
        <button
          onClick={() => setSubTab('payments')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
            subTab === 'payments' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Disbursements & Advances ({db.labourPayments.length})</span>
        </button>
      </div>

      {/* 1. ROSTER SUBTAB */}
      {subTab === 'roster' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Labour Name</th>
                  <th className="py-2.5 px-3">Role / Trade</th>
                  <th className="py-2.5 px-3">Assigned Project</th>
                  <th className="py-2.5 px-3">Wage Basis</th>
                  <th className="py-2.5 px-3">Payout Frequency</th>
                  <th className="py-2.5 px-3 text-right">Daily / Monthly Rate</th>
                  <th className="py-2.5 px-3 text-right">Overtime / Hr</th>
                  <th className="py-2.5 px-3 text-right">Earned Wages</th>
                  <th className="py-2.5 px-3 text-right">Advances</th>
                  <th className="py-2.5 px-3 text-right">Net Outstanding</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.labours.map((lab) => {
                  const m = getLabourLedgerMetrics(lab.id);
                  return (
                    <tr key={lab.id} className={`hover:bg-slate-50 transition-colors ${!lab.active ? 'bg-slate-50/60 opacity-75' : ''}`}>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <p>{lab.name}</p>
                          {!lab.active && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded font-semibold">
                              Deactivated
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal">{lab.mobileNumber}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                          {lab.labourType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{lab.projectName}</td>
                      <td className="py-3 px-3 text-slate-600">{lab.wageBasis}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                          {lab.paymentFrequency || 'Weekly'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(lab.dailyRateOrSalary)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ₹{lab.overtimeRate}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800 font-semibold">
                        {formatCurrency(m.totalWages)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 font-semibold">
                        {formatCurrency(m.totalAdvances)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-700 font-bold text-sm">
                        {formatCurrency(m.outstanding)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lab.active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${lab.active ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          {lab.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingLabour(lab)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                            title="Inspect Labourer Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {hasPermission('canEdit') && (
                            <button
                              onClick={() => setEditingLabour(lab)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                              title="Edit Labourer Profile & Rates"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedLabourId(lab.id);
                              setSubTab('ledger');
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                            title="View Complete Labour History & Ledger"
                          >
                            History
                          </button>
                          <button
                            onClick={() => handleToggleLabourActive(lab)}
                            className={`p-1 rounded text-xs transition-colors ${
                              lab.active
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={lab.active ? 'Deactivate Worker (Preserves Ledger)' : 'Reactivate Worker'}
                          >
                            {lab.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          {hasPermission('canDeleteOrReverse') && (
                            <button
                              onClick={() => setDeletingLabour(lab)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                              title="Authorized Safe Delete Labourer"
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

      {/* 2. INDIVIDUAL LEDGER SUBTAB (Requirement 12) */}
      {subTab === 'ledger' && selectedLabour && selectedLabourMetrics && (
        <div className="space-y-5">
          {/* Labour Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Select Labour Worker:</span>
              <select
                value={selectedLabourId}
                onChange={(e) => setSelectedLabourId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50 focus:outline-hidden"
              >
                {db.labours.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.labourType})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-slate-500 text-[11px]">Assigned Site: </span>
              <strong className="text-slate-800">{selectedLabour.projectName}</strong>
            </div>
          </div>

          {/* Ledger Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Wages Earned</span>
              <p className="font-mono font-bold text-slate-900 text-base mt-1">
                {formatCurrency(selectedLabourMetrics.totalWages)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] text-amber-700 uppercase font-bold">Total Advances Taken</span>
              <p className="font-mono font-bold text-amber-800 text-base mt-1">
                {formatCurrency(selectedLabourMetrics.totalAdvances)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Wage Paid</span>
              <p className="font-mono font-bold text-emerald-800 text-base mt-1">
                {formatCurrency(selectedLabourMetrics.totalWagePayments)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] text-indigo-700 uppercase font-bold">Total Disbursed</span>
              <p className="font-mono font-bold text-indigo-900 text-base mt-1">
                {formatCurrency(selectedLabourMetrics.totalPaid)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-700 uppercase font-bold">Net Balance Due</span>
              <p className="font-mono font-extrabold text-rose-700 text-base mt-1">
                {formatCurrency(selectedLabourMetrics.outstanding)}
              </p>
            </div>
          </div>

          {/* Statement Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Work & Wage Statement for {selectedLabour.name}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Entry Type</th>
                    <th className="py-2.5 px-3">Details / Overtime</th>
                    <th className="py-2.5 px-3 text-right">Wage Earned (+)</th>
                    <th className="py-2.5 px-3 text-right">Paid / Advance (-)</th>
                    <th className="py-2.5 px-3">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedLabourMetrics.attendance.map((att) => (
                    <tr key={att.id}>
                      <td className="py-2.5 px-4 text-slate-600">{formatDate(att.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">Attendance ({att.status})</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {att.overtimeHours > 0 ? `${att.overtimeHours} hrs overtime` : 'Standard shift'} - {att.remarks}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                        +{formatCurrency(att.wageCalculated)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-slate-400">-</td>
                    </tr>
                  ))}
                  {selectedLabourMetrics.payments.map((p) => (
                    <tr key={p.id} className="bg-rose-50/30">
                      <td className="py-2.5 px-4 text-slate-600">{formatDate(p.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-800">{p.type}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.remarks || `Voucher ${p.voucherNumber}`}</td>
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

      {/* 3. LABOUR ATTENDANCE REGISTER (All 8 Mandatory Sections) */}
      {subTab === 'attendance' && (
        <LabourAttendanceRegisterView db={db} />
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
                  <th className="py-2.5 px-3">Labour Name</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Payment Type</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.labourPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-600">{formatDate(p.date)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{p.voucherNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.labourName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{p.projectName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.type === 'Advance'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{p.paymentMode}</td>
                    <td className="py-2.5 px-4 text-slate-500">{p.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ADD LABOUR MODAL ================= */}
      {isAddLabourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Add New Labour / Worker</h3>
              <button onClick={() => setIsAddLabourModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveLabour} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Labour Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baburao Ramchandra Shinde"
                  value={labourName}
                  onChange={(e) => setLabourName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={labourMobile}
                    onChange={(e) => setLabourMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade / Role</label>
                  <select
                    value={labourType}
                    onChange={(e) => setLabourType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Mason">Mason (Mistri)</option>
                    <option value="Barbender">Barbender (Fitter)</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Painter">Painter</option>
                    <option value="Helper">Helper (Labourer)</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Supervisor">Civil Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Project</label>
                  <select
                    value={labourProjectId}
                    onChange={(e) => setLabourProjectId(e.target.value)}
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
                  <label className="block font-semibold text-slate-700 mb-1">Wage Basis</label>
                  <select
                    value={wageBasis}
                    onChange={(e) => setWageBasis(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Daily Rate">Daily Rate (Per Day)</option>
                    <option value="Monthly Salary">Monthly Salary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Frequency</label>
                  <select
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Every 15 Days">Every 15 Days</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={labourJoiningDate}
                    onChange={(e) => setLabourJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {wageBasis === 'Daily Rate' ? 'Daily Rate (₹)' : 'Monthly Salary (₹)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={dailyRateOrSalary || ''}
                    onChange={(e) => setDailyRateOrSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Overtime Rate (₹/Hr)</label>
                  <input
                    type="number"
                    value={overtimeRate || ''}
                    onChange={(e) => setOvertimeRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Local camp or resident address"
                  value={labourAddress}
                  onChange={(e) => setLabourAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLabourModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                  Enroll Labour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECORD ATTENDANCE MODAL ================= */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Record Daily Work / Attendance</h3>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAttendance} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Labour *</label>
                <select
                  value={attLabourId}
                  onChange={(e) => setAttLabourId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {db.labours.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.labourType} - ₹{l.dailyRateOrSalary}/{l.wageBasis === 'Daily Rate' ? 'day' : 'month'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Date</label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attendance Status</label>
                  <select
                    value={attStatus}
                    onChange={(e) => setAttStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Full Day">Full Day</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Overtime Hours</label>
                <input
                  type="number"
                  min="0"
                  value={attOvertimeHours || ''}
                  onChange={(e) => setAttOvertimeHours(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Description / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Slab casting, column steel work"
                  value={attRemarks}
                  onChange={(e) => setAttRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                  Save Attendance Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECORD PAYMENT / ADVANCE MODAL ================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Disburse Labour Advance / Wages</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Labour *</label>
                <select
                  value={payLabourId}
                  onChange={(e) => setPayLabourId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {db.labours.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.labourType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disbursement Type</label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Advance">Advance Payout</option>
                    <option value="Wage Payment">Regular Wage Payout</option>
                    <option value="Overtime Payment">Overtime Settlement</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-emerald-400 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
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
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer / UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Festival advance / Weekly wages"
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
                  Save Payment & Update Accounts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW LABOUR MODAL */}
      {viewingLabour && (() => {
        const m = getLabourLedgerMetrics(viewingLabour.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">{viewingLabour.name}</h3>
                  <p className="text-xs text-slate-400">{viewingLabour.labourType} • {viewingLabour.projectName}</p>
                </div>
                <button onClick={() => setViewingLabour(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div><span className="text-slate-500">Trade:</span> <p className="font-semibold">{viewingLabour.labourType}</p></div>
                  <div><span className="text-slate-500">Mobile:</span> <p className="font-mono font-bold">{viewingLabour.mobileNumber}</p></div>
                  <div><span className="text-slate-500">Wage Basis:</span> <p>{viewingLabour.wageBasis}</p></div>
                  <div><span className="text-slate-500">Rate / Salary:</span> <p className="font-mono font-bold">₹{viewingLabour.dailyRateOrSalary}</p></div>
                  <div><span className="text-slate-500">Overtime Rate:</span> <p className="font-mono">₹{viewingLabour.overtimeRate} / hr</p></div>
                  <div><span className="text-slate-500">Status:</span> <p className="font-bold text-emerald-700">{viewingLabour.active ? 'Active' : 'Inactive'}</p></div>
                  <div className="col-span-2"><span className="text-slate-500">Address:</span> <p>{viewingLabour.address || 'N/A'}</p></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500">Total Wages</span>
                    <p className="font-mono font-bold text-xs mt-0.5">{formatCurrency(m.totalWages)}</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg">
                    <span className="text-[10px] text-emerald-700">Advances/Paid</span>
                    <p className="font-mono font-bold text-xs text-emerald-800 mt-0.5">{formatCurrency(m.totalPaid)}</p>
                  </div>
                  <div className="p-2.5 bg-rose-50 rounded-lg">
                    <span className="text-[10px] text-rose-700">Net Due</span>
                    <p className="font-mono font-bold text-xs text-rose-800 mt-0.5">{formatCurrency(m.outstanding)}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLabourId(viewingLabour.id);
                      setViewingLabour(null);
                      setSubTab('ledger');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                  >
                    Open Labour History & Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingLabour(null)}
                    className="px-4 py-2 bg-slate-100 rounded-lg font-semibold text-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT LABOUR MODAL */}
      {editingLabour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Labourer: {editingLabour.name}</h3>
              <button onClick={() => setEditingLabour(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const currentDb = dbService.getDatabase();
                const proj = currentDb.projects.find((p) => p.id === editingLabour.projectId);
                currentDb.labours = currentDb.labours.map((l) =>
                  l.id === editingLabour.id
                    ? {
                        ...editingLabour,
                        projectName: proj ? proj.name : editingLabour.projectName,
                      }
                    : l
                );
                dbService.saveDatabase(currentDb);
                dbService.logAudit(
                  currentUser.name,
                  'LABOUR_UPDATED',
                  'Labour Management',
                  `Updated profile for labourer ${editingLabour.name}`
                );
                setEditingLabour(null);
              }}
              className="p-6 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingLabour.name}
                  onChange={(e) => setEditingLabour({ ...editingLabour, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={editingLabour.mobileNumber}
                    onChange={(e) => setEditingLabour({ ...editingLabour, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade / Role *</label>
                  <select
                    value={editingLabour.labourType}
                    onChange={(e) => setEditingLabour({ ...editingLabour, labourType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Mason">Mason (Gavandi)</option>
                    <option value="Barbender">Barbender / Fitter</option>
                    <option value="Carpenter">Carpenter / Centering</option>
                    <option value="Helper">Helper / Labour</option>
                    <option value="Supervisor">Site Supervisor / Mukadam</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Project *</label>
                <select
                  value={editingLabour.projectId}
                  onChange={(e) => setEditingLabour({ ...editingLabour, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wage Basis</label>
                  <select
                    value={editingLabour.wageBasis}
                    onChange={(e) => setEditingLabour({ ...editingLabour, wageBasis: e.target.value as WageBasis })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Daily Rate">Daily Rate</option>
                    <option value="Monthly Salary">Monthly Salary</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Daily Rate / Salary (₹) *</label>
                  <input
                    type="number"
                    value={editingLabour.dailyRateOrSalary}
                    onChange={(e) => setEditingLabour({ ...editingLabour, dailyRateOrSalary: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Overtime Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={editingLabour.overtimeRate}
                    onChange={(e) => setEditingLabour({ ...editingLabour, overtimeRate: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Active Status</label>
                  <select
                    value={editingLabour.active ? 'true' : 'false'}
                    onChange={(e) => setEditingLabour({ ...editingLabour, active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLabour(null)}
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

      {/* SAFE DELETE LABOUR MODAL */}
      {deletingLabour && (() => {
        const att = db.labourAttendance.filter((a) => a.labourId === deletingLabour.id);
        const payments = db.labourPayments.filter((p) => p.labourId === deletingLabour.id);
        const linkedSummary: string[] = [
          `Project: ${deletingLabour.projectName} (${deletingLabour.labourType})`,
        ];
        if (att.length > 0) linkedSummary.push(`${att.length} Attendance Day(s) recorded`);
        if (payments.length > 0) linkedSummary.push(`${payments.length} Payment / Advance Voucher(s) issued`);

        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => setDeletingLabour(null)}
            title={`Delete Labourer: ${deletingLabour.name}`}
            recordType="Labour Worker"
            recordIdentifier={`${deletingLabour.name} (${deletingLabour.labourType} - ${deletingLabour.projectName})`}
            linkedRecords={linkedSummary}
            safeAlternativeText="Mark labourer as Inactive to preserve wage and attendance records."
            onSafeAlternative={() => {
              const currentDb = dbService.getDatabase();
              currentDb.labours = currentDb.labours.map((l) =>
                l.id === deletingLabour.id ? { ...l, active: false } : l
              );
              dbService.saveDatabase(currentDb);
              setDeletingLabour(null);
            }}
            onDownloadBackup={() => {
              const headers = ['Record Type', 'Worker Name', 'Trade', 'Project', 'Wage Basis', 'Daily Rate', 'Active'];
              const rows = [
                ['LABOUR_WORKER', deletingLabour.name, deletingLabour.labourType, deletingLabour.projectName, deletingLabour.wageBasis, deletingLabour.dailyRateOrSalary, deletingLabour.active ? 'Yes' : 'No'],
                ...att.map((a) => ['ATTENDANCE', a.date, a.status, a.overtimeHours, a.wageCalculated, '', '']),
                ...payments.map((p) => ['PAYMENT_VOUCHER', p.voucherNumber, p.date, p.type, p.amount, p.paymentMode, p.remarks]),
              ];
              exportToCSV(`Labour_Archive_${deletingLabour.name.replace(/\s+/g, '_')}`, headers, rows);
            }}
            onConfirm={() => {
              const currentDb = dbService.getDatabase();
              currentDb.labours = currentDb.labours.filter((l) => l.id !== deletingLabour.id);
              dbService.saveDatabase(currentDb);
              dbService.logAudit(
                currentUser.name,
                'LABOUR_DELETED',
                'Labour Management',
                `Deleted labourer ${deletingLabour.name} with verification code 7666257368`
              );
              setDeletingLabour(null);
            }}
          />
        );
      })()}
    </div>
  );
};
