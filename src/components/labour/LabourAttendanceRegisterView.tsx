import React, { useState, useEffect } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import {
  Labour,
  LabourAttendanceRecord,
  AttendanceStatus,
  AttendanceCorrection,
} from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Calendar,
  Building2,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Eye,
  Check,
  X,
  History,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface LabourAttendanceRegisterViewProps {
  db: DatabaseState;
}

export type AttendanceRegisterSection =
  | 'daily_sheet'
  | 'project_register'
  | 'monthly_register'
  | 'labour_history'
  | 'summary'
  | 'corrections';

export const LabourAttendanceRegisterView: React.FC<LabourAttendanceRegisterViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();

  // Active section inside the Register
  const [section, setSection] = useState<AttendanceRegisterSection>('daily_sheet');

  // Status Notification
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // SECTION 1: Daily Attendance Sheet State
  const [sheetProjectId, setSheetProjectId] = useState<string>(db.projects[0]?.id || 'ALL');
  const [sheetDate, setSheetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sheetRows, setSheetRows] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        payableUnits: number;
        overtimeHours: number;
        remarks: string;
      }
    >
  >({});

  // SECTION 2: Project-Wise Attendance Register State
  const [projRegProjectId, setProjRegProjectId] = useState<string>(db.projects[0]?.id || (db.projects.length > 0 ? db.projects[0].id : ''));
  const [projRegDateFrom, setProjRegDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [projRegDateTo, setProjRegDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [projRegStatusFilter, setProjRegStatusFilter] = useState<string>('ALL');

  // SECTION 3: Monthly Attendance Register State
  const [monthlyProjectId, setMonthlyProjectId] = useState<string>(db.projects[0]?.id || (db.projects.length > 0 ? db.projects[0].id : ''));
  const [monthlyYear, setMonthlyYear] = useState<number>(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState<number>(new Date().getMonth() + 1); // 1-12

  // SECTION 4: Labour-Wise Attendance History State
  const [histProjectId, setHistProjectId] = useState<string>(db.projects[0]?.id || 'ALL');
  const [histLabourId, setHistLabourId] = useState<string>(db.labours[0]?.id || '');
  const [histDateFrom, setHistDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().split('T')[0];
  });
  const [histDateTo, setHistDateTo] = useState<string>(new Date().toISOString().split('T')[0]);

  // SECTION 5: Attendance Summary Date Filter
  const [summaryDate, setSummaryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summaryProjectId, setSummaryProjectId] = useState<string>('ALL');

  // Correction & Editing Modal State
  const [editingAttendance, setEditingAttendance] = useState<LabourAttendanceRecord | null>(null);
  const [correctionNewStatus, setCorrectionNewStatus] = useState<AttendanceStatus>('Present');
  const [correctionOvertime, setCorrectionOvertime] = useState<number>(0);
  const [correctionRemarks, setCorrectionRemarks] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Print Register Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Synchronize Daily Sheet when sheetProjectId or sheetDate changes
  useEffect(() => {
    const eligibleLabours = db.labours.filter(
      (l) => l.active && (sheetProjectId === 'ALL' || l.projectId === sheetProjectId)
    );
    const map: Record<
      string,
      {
        status: AttendanceStatus;
        payableUnits: number;
        overtimeHours: number;
        remarks: string;
      }
    > = {};

    eligibleLabours.forEach((l) => {
      const existing = db.labourAttendance.find((a) => a.labourId === l.id && a.date === sheetDate);
      if (existing) {
        map[l.id] = {
          status: existing.status || 'Present',
          payableUnits:
            typeof existing.payableUnits === 'number'
              ? existing.payableUnits
              : existing.status === 'Present' || (existing.status as string) === 'Full Day'
              ? 1.0
              : existing.status === 'Half Day'
              ? 0.5
              : existing.status === 'Holiday'
              ? 1.0
              : 0.0,
          overtimeHours: existing.overtimeHours || 0,
          remarks: existing.remarks || '',
        };
      } else {
        map[l.id] = {
          status: 'Present',
          payableUnits: 1.0,
          overtimeHours: 0,
          remarks: '',
        };
      }
    });
    setSheetRows(map);
  }, [sheetDate, sheetProjectId, db.labours, db.labourAttendance]);

  // Auto-dismiss status messages after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Calculate units from status helper
  const getUnitsFromStatus = (status: AttendanceStatus): number => {
    switch (status) {
      case 'Present':
      case 'Full Day':
        return 1.0;
      case 'Half Day':
        return 0.5;
      case 'Holiday':
        return 1.0;
      case 'Absent':
      case 'Leave':
      case 'Weekly Off':
      default:
        return 0.0;
    }
  };

  // Bulk update status on Daily Sheet
  const handleBulkStatusChange = (newStatus: AttendanceStatus) => {
    const units = getUnitsFromStatus(newStatus);
    setSheetRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = {
          ...updated[id],
          status: newStatus,
          payableUnits: units,
        };
      });
      return updated;
    });
    setStatusMessage({
      text: `All displayed workers set to "${newStatus}" (${units} unit). Click "Save Daily Attendance" to confirm.`,
      isError: false,
    });
  };

  // Save Daily Sheet to Database
  const handleSaveDailySheet = () => {
    const currentDb = dbService.getDatabase();
    const eligibleLabours = currentDb.labours.filter(
      (l) => l.active && (sheetProjectId === 'ALL' || l.projectId === sheetProjectId)
    );

    let savedCount = 0;
    eligibleLabours.forEach((lab) => {
      const row = sheetRows[lab.id] || {
        status: 'Present' as AttendanceStatus,
        payableUnits: 1.0,
        overtimeHours: 0,
        remarks: '',
      };

      // Calculate Day Wage
      let baseRate = lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : Math.round(lab.dailyRateOrSalary / 30);
      let calculatedWage = Math.round(baseRate * row.payableUnits);
      const overtimeWage = (Number(row.overtimeHours) || 0) * (lab.overtimeRate || 0);
      const totalWage = calculatedWage + overtimeWage;

      const newRecord: LabourAttendanceRecord = {
        id: `att-${lab.id}-${sheetDate}`,
        labourId: lab.id,
        labourName: lab.name,
        projectId: lab.projectId,
        projectName: lab.projectName,
        date: sheetDate,
        status: row.status,
        payableUnits: row.payableUnits,
        overtimeHours: Number(row.overtimeHours) || 0,
        wageCalculated: totalWage,
        remarks: row.remarks || '',
        recordedBy: currentUser.name,
        lastUpdated: new Date().toISOString(),
      };

      const idx = currentDb.labourAttendance.findIndex(
        (a) => a.labourId === lab.id && a.date === sheetDate
      );
      if (idx >= 0) {
        currentDb.labourAttendance[idx] = newRecord;
      } else {
        currentDb.labourAttendance.unshift(newRecord);
      }
      savedCount++;
    });

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'LABOUR_ATTENDANCE_SAVED',
      'Labour Attendance Register',
      `Saved daily attendance sheet for ${savedCount} workers on date ${sheetDate} for project "${
        sheetProjectId === 'ALL' ? 'All Projects' : currentDb.projects.find((p) => p.id === sheetProjectId)?.name || sheetProjectId
      }"`
    );

    setStatusMessage({
      text: `Successfully saved attendance records for ${savedCount} active workers on ${formatDate(sheetDate)}!`,
      isError: false,
    });
  };

  // Open Edit / Correction Modal
  const handleOpenCorrection = (att: LabourAttendanceRecord) => {
    setEditingAttendance(att);
    setCorrectionNewStatus(att.status);
    setCorrectionOvertime(att.overtimeHours || 0);
    setCorrectionRemarks(att.remarks || '');
    setCorrectionReason('');
  };

  // Save Attendance Correction
  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    if (!correctionReason.trim()) {
      alert('Please provide a mandatory reason for this attendance correction.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const lab = currentDb.labours.find((l) => l.id === editingAttendance.labourId);
    if (!lab) return;

    const newUnits = getUnitsFromStatus(correctionNewStatus);
    const baseRate = lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : Math.round(lab.dailyRateOrSalary / 30);
    const newBaseWage = Math.round(baseRate * newUnits);
    const newOtWage = (Number(correctionOvertime) || 0) * (lab.overtimeRate || 0);
    const newTotalWage = newBaseWage + newOtWage;

    // Record Correction Log
    const correctionLog: AttendanceCorrection = {
      id: `att-cor-${Date.now()}`,
      attendanceId: editingAttendance.id,
      labourId: editingAttendance.labourId,
      labourName: editingAttendance.labourName,
      projectId: editingAttendance.projectId,
      projectName: editingAttendance.projectName,
      date: editingAttendance.date,
      previousStatus: editingAttendance.status,
      newStatus: correctionNewStatus,
      previousWage: editingAttendance.wageCalculated,
      newWage: newTotalWage,
      correctedBy: currentUser.name,
      reason: correctionReason.trim(),
      timestamp: new Date().toISOString(),
    };

    if (!currentDb.attendanceCorrections) {
      currentDb.attendanceCorrections = [];
    }
    currentDb.attendanceCorrections.unshift(correctionLog);

    // Update Attendance Record
    const attIdx = currentDb.labourAttendance.findIndex((a) => a.id === editingAttendance.id);
    if (attIdx >= 0) {
      currentDb.labourAttendance[attIdx] = {
        ...currentDb.labourAttendance[attIdx],
        status: correctionNewStatus,
        payableUnits: newUnits,
        overtimeHours: Number(correctionOvertime) || 0,
        wageCalculated: newTotalWage,
        remarks: correctionRemarks,
        lastUpdated: new Date().toISOString(),
        recordedBy: `${currentUser.name} (Corrected)`,
      };
    }

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'ATTENDANCE_CORRECTED',
      'Labour Attendance Register',
      `Corrected attendance for ${editingAttendance.labourName} on ${editingAttendance.date}: ${editingAttendance.status} -> ${correctionNewStatus}. Reason: ${correctionReason}`
    );

    setEditingAttendance(null);
    setStatusMessage({
      text: `Attendance correction saved successfully for ${editingAttendance.labourName}!`,
      isError: false,
    });
  };

  // Helper: Days in Month
  const daysInMonth = new Date(monthlyYear, monthlyMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // SECTION 2 DATA: Project Register Records
  const projectRegisterRecords = db.labourAttendance
    .filter((a) => {
      const matchProj = !projRegProjectId || projRegProjectId === 'ALL' || a.projectId === projRegProjectId;
      const matchFrom = !projRegDateFrom || a.date >= projRegDateFrom;
      const matchTo = !projRegDateTo || a.date <= projRegDateTo;
      const matchStatus = projRegStatusFilter === 'ALL' || a.status === projRegStatusFilter;
      return matchProj && matchFrom && matchTo && matchStatus;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const projRegStats = {
    total: projectRegisterRecords.length,
    present: projectRegisterRecords.filter((a) => a.status === 'Present' || (a.status as string) === 'Full Day').length,
    halfDay: projectRegisterRecords.filter((a) => a.status === 'Half Day').length,
    absent: projectRegisterRecords.filter((a) => a.status === 'Absent').length,
    leave: projectRegisterRecords.filter((a) => a.status === 'Leave').length,
    totalWages: projectRegisterRecords.reduce((sum, a) => sum + (a.wageCalculated || 0), 0),
  };

  // SECTION 3 DATA: Monthly Register Workers
  const monthlyLabours = db.labours.filter((l) => {
    return !monthlyProjectId || monthlyProjectId === 'ALL' || l.projectId === monthlyProjectId;
  });

  // SECTION 4 DATA: Selected Labourer History
  const selectedHistLabour = db.labours.find((l) => l.id === histLabourId);
  const labourHistoryRecords = db.labourAttendance
    .filter((a) => {
      const matchLab = a.labourId === histLabourId;
      const matchFrom = !histDateFrom || a.date >= histDateFrom;
      const matchTo = !histDateTo || a.date <= histDateTo;
      return matchLab && matchFrom && matchTo;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const labourHistStats = {
    totalLogs: labourHistoryRecords.length,
    presentDays: labourHistoryRecords.filter((a) => a.status === 'Present' || (a.status as string) === 'Full Day').length,
    halfDays: labourHistoryRecords.filter((a) => a.status === 'Half Day').length,
    absentDays: labourHistoryRecords.filter((a) => a.status === 'Absent').length,
    totalWages: labourHistoryRecords.reduce((sum, a) => sum + (a.wageCalculated || 0), 0),
    totalOvertimeHours: labourHistoryRecords.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
  };

  // SECTION 5 DATA: Attendance Summary Calculations
  const summaryActiveLabourers = db.labours.filter(
    (l) => l.active && (summaryProjectId === 'ALL' || l.projectId === summaryProjectId)
  );
  const summaryTodayRecords = db.labourAttendance.filter(
    (a) => a.date === summaryDate && (summaryProjectId === 'ALL' || a.projectId === summaryProjectId)
  );

  const summaryPresent = summaryTodayRecords.filter((a) => a.status === 'Present' || (a.status as string) === 'Full Day').length;
  const summaryHalfDay = summaryTodayRecords.filter((a) => a.status === 'Half Day').length;
  const summaryAbsent = summaryTodayRecords.filter((a) => a.status === 'Absent').length;
  const summaryLeave = summaryTodayRecords.filter((a) => a.status === 'Leave' || a.status === 'Weekly Off').length;
  const summaryTotalWages = summaryTodayRecords.reduce((sum, a) => sum + (a.wageCalculated || 0), 0);
  const summaryMarkedCount = summaryTodayRecords.length;
  const summaryCompletionRate =
    summaryActiveLabourers.length > 0
      ? Math.round((summaryMarkedCount / summaryActiveLabourers.length) * 100)
      : 0;

  // Download Handlers
  const handleDownloadProjectRegisterCSV = () => {
    const headers = [
      'Sr. No.',
      'Project',
      'Date',
      'Labour ID',
      'Labour Name',
      'Trade / Designation',
      'Status',
      'Payable Units',
      'Overtime Hours',
      'Day Wage (INR)',
      'Remarks',
      'Recorded By',
    ];
    const rows = projectRegisterRecords.map((r, i) => {
      const lab = db.labours.find((l) => l.id === r.labourId);
      return [
        i + 1,
        r.projectName,
        r.date,
        r.labourId,
        r.labourName,
        lab?.labourType || 'Worker',
        r.status,
        r.payableUnits ?? 1.0,
        r.overtimeHours,
        r.wageCalculated,
        r.remarks || '',
        r.recordedBy || 'System',
      ];
    });
    exportToCSV(`Labour_Project_Attendance_Register_${projRegDateFrom}_to_${projRegDateTo}`, headers, rows);
  };

  const handleDownloadMonthlyCSV = () => {
    const monthName = new Date(monthlyYear, monthlyMonth - 1).toLocaleString('default', { month: 'long' });
    const headers = [
      'Sr. No.',
      'Labour ID',
      'Labour Name',
      'Trade',
      'Project',
      'Present Days',
      'Half Days',
      'Absent Days',
      'Leave / Off',
      'Total Payable Units',
      'Total Earned Wages (INR)',
    ];
    const rows = monthlyLabours.map((lab, i) => {
      const monthRecords = db.labourAttendance.filter((a) => {
        if (a.labourId !== lab.id) return false;
        const [y, m] = a.date.split('-').map(Number);
        return y === monthlyYear && m === monthlyMonth;
      });
      const pCount = monthRecords.filter((a) => a.status === 'Present' || (a.status as string) === 'Full Day').length;
      const hCount = monthRecords.filter((a) => a.status === 'Half Day').length;
      const aCount = monthRecords.filter((a) => a.status === 'Absent').length;
      const lCount = monthRecords.filter((a) => a.status === 'Leave' || a.status === 'Weekly Off').length;
      const units = pCount * 1.0 + hCount * 0.5;
      const wages = monthRecords.reduce((sum, a) => sum + (a.wageCalculated || 0), 0);
      return [i + 1, lab.id, lab.name, lab.labourType, lab.projectName, pCount, hCount, aCount, lCount, units, wages];
    });
    exportToCSV(`Labour_Monthly_Attendance_Register_${monthName}_${monthlyYear}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="text-xs font-semibold">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Register Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">LABOUR ATTENDANCE REGISTER</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
                  Live Database Connected
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time project attendance sheets, monthly rosters, labour-wise histories, wage calculations, and verified audit trails
              </p>
            </div>
          </div>

          {/* Quick Global Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 inline-flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>Print Register (A4)</span>
            </button>
            <button
              onClick={handleDownloadProjectRegisterCSV}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report (CSV)</span>
            </button>
          </div>
        </div>

        {/* 8 Sections Navigation Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            onClick={() => setSection('daily_sheet')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              section === 'daily_sheet'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Daily Attendance Sheet</span>
          </button>

          <button
            onClick={() => setSection('project_register')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              section === 'project_register'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. Project-wise Register</span>
          </button>

          <button
            onClick={() => setSection('monthly_register')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              section === 'monthly_register'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. Monthly Register</span>
          </button>

          <button
            onClick={() => setSection('labour_history')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              section === 'labour_history'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Labour-wise History</span>
          </button>

          <button
            onClick={() => setSection('summary')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              section === 'summary'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>5. Attendance Summary</span>
          </button>

          <button
            onClick={() => setSection('corrections')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              section === 'corrections'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>6. Correction History ({db.attendanceCorrections?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DAILY ATTENDANCE SHEET */}
      {/* ========================================================================= */}
      {section === 'daily_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Controls */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">1. Select Project *</label>
                <select
                  value={sheetProjectId}
                  onChange={(e) => setSheetProjectId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Active Construction Projects</option>
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">2. Attendance Date *</label>
                <input
                  type="date"
                  value={sheetDate}
                  onChange={(e) => setSheetDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="self-end pb-0.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  Workers Loaded:{' '}
                  <strong className="text-indigo-700">
                    {db.labours.filter((l) => l.active && (sheetProjectId === 'ALL' || l.projectId === sheetProjectId)).length}
                  </strong>{' '}
                  active
                </span>
              </div>
            </div>

            {/* Bulk & Save Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatusChange('Present')}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusChange('Weekly Off')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
              >
                Mark All Off
              </button>
              <button
                type="button"
                onClick={handleSaveDailySheet}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold transition shadow-sm inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Daily Attendance</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Sr. No.</th>
                  <th className="py-2.5 px-3">Labour ID</th>
                  <th className="py-2.5 px-4">Labour Name</th>
                  <th className="py-2.5 px-3">Work Type</th>
                  <th className="py-2.5 px-3">Project Site</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-2 text-center">Payable Units</th>
                  <th className="py-2.5 px-3 text-right">Overtime (Hrs)</th>
                  <th className="py-2.5 px-3 text-right">Calculated Wage</th>
                  <th className="py-2.5 px-4">Remarks / Task</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.labours
                  .filter((l) => l.active && (sheetProjectId === 'ALL' || l.projectId === sheetProjectId))
                  .map((lab, index) => {
                    const row = sheetRows[lab.id] || {
                      status: 'Present',
                      payableUnits: 1.0,
                      overtimeHours: 0,
                      remarks: '',
                    };

                    const baseRate = lab.wageBasis === 'Daily Rate' ? lab.dailyRateOrSalary : Math.round(lab.dailyRateOrSalary / 30);
                    const calcWage = Math.round(baseRate * row.payableUnits) + (Number(row.overtimeHours) || 0) * (lab.overtimeRate || 0);

                    return (
                      <tr key={lab.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 font-semibold">{lab.id}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          <p>{lab.name}</p>
                          <span className="text-[10px] text-slate-400 font-normal">{lab.mobileNumber}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                            {lab.labourType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-semibold">{lab.projectName}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={row.status}
                            onChange={(e) => {
                              const st = e.target.value as AttendanceStatus;
                              const units = getUnitsFromStatus(st);
                              setSheetRows((prev) => ({
                                ...prev,
                                [lab.id]: {
                                  ...prev[lab.id],
                                  status: st,
                                  payableUnits: units,
                                },
                              }));
                            }}
                            className={`px-2 py-1 rounded-md text-xs font-bold border ${
                              row.status === 'Present' || (row.status as string) === 'Full Day'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : row.status === 'Half Day'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : row.status === 'Leave'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : row.status === 'Weekly Off'
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : row.status === 'Holiday'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="Present">Present (1.0 Unit)</option>
                            <option value="Half Day">Half Day (0.5 Unit)</option>
                            <option value="Absent">Absent (0.0 Unit)</option>
                            <option value="Leave">Leave (0.0 Unit)</option>
                            <option value="Weekly Off">Weekly Off (0.0 Unit)</option>
                            <option value="Holiday">Holiday (1.0 Unit)</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                          {row.payableUnits.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max="12"
                            value={row.overtimeHours}
                            onChange={(e) =>
                              setSheetRows((prev) => ({
                                ...prev,
                                [lab.id]: {
                                  ...prev[lab.id],
                                  overtimeHours: Math.max(0, Number(e.target.value)),
                                },
                              }))
                            }
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 text-xs">
                          {formatCurrency(calcWage)}
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder="e.g. Block B Plastering work"
                            value={row.remarks}
                            onChange={(e) =>
                              setSheetRows((prev) => ({
                                ...prev,
                                [lab.id]: { ...prev[lab.id], remarks: e.target.value },
                              }))
                            }
                            className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROJECT-WISE ATTENDANCE REGISTER */}
      {/* ========================================================================= */}
      {section === 'project_register' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Project</label>
                <select
                  value={projRegProjectId}
                  onChange={(e) => setProjRegProjectId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50"
                >
                  <option value="ALL">All Projects</option>
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={projRegDateFrom}
                  onChange={(e) => setProjRegDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={projRegDateTo}
                  onChange={(e) => setProjRegDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Filter</label>
                <select
                  value={projRegStatusFilter}
                  onChange={(e) => setProjRegStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Weekly Off">Weekly Off</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleDownloadProjectRegisterCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Logs</span>
              <p className="font-mono font-bold text-slate-900 text-base mt-1">{projRegStats.total}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Present</span>
              <p className="font-mono font-bold text-emerald-800 text-base mt-1">{projRegStats.present}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-amber-200">
              <span className="text-[10px] text-amber-700 uppercase font-bold">Half Day</span>
              <p className="font-mono font-bold text-amber-800 text-base mt-1">{projRegStats.halfDay}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-rose-200">
              <span className="text-[10px] text-rose-700 uppercase font-bold">Absent</span>
              <p className="font-mono font-bold text-rose-800 text-base mt-1">{projRegStats.absent}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-blue-200">
              <span className="text-[10px] text-blue-700 uppercase font-bold">Leave / Off</span>
              <p className="font-mono font-bold text-blue-800 text-base mt-1">{projRegStats.leave}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-200">
              <span className="text-[10px] text-indigo-700 uppercase font-bold">Total Project Wage</span>
              <p className="font-mono font-bold text-indigo-900 text-base mt-1">{formatCurrency(projRegStats.totalWages)}</p>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Sr.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 font-mono">Labour ID</th>
                    <th className="py-2.5 px-4">Labour Name</th>
                    <th className="py-2.5 px-3">Project Site</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-2 text-center">Units</th>
                    <th className="py-2.5 px-3 text-right">Overtime</th>
                    <th className="py-2.5 px-3 text-right">Calculated Wage</th>
                    <th className="py-2.5 px-4">Remarks</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectRegisterRecords.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400">
                        No attendance records found matching the selected project and date filters.
                      </td>
                    </tr>
                  ) : (
                    projectRegisterRecords.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(r.date)}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 font-semibold">{r.labourId}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{r.labourName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{r.projectName}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'Present' || (r.status as string) === 'Full Day'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : r.status === 'Half Day'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : r.status === 'Leave'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : r.status === 'Weekly Off'
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                          {(r.payableUnits ?? 1.0).toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{r.overtimeHours} hrs</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatCurrency(r.wageCalculated)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{r.remarks || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{r.recordedBy || 'System'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenCorrection(r)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="Edit / Correct Attendance"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MONTHLY ATTENDANCE REGISTER */}
      {/* ========================================================================= */}
      {section === 'monthly_register' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Project Site</label>
                <select
                  value={monthlyProjectId}
                  onChange={(e) => setMonthlyProjectId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50"
                >
                  <option value="ALL">All Projects Combined</option>
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Month</label>
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-semibold"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Year</label>
                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-semibold"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleDownloadMonthlyCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Monthly CSV</span>
            </button>
          </div>

          {/* Month Matrix Grid Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Monthly Master Register for{' '}
                {new Date(monthlyYear, monthlyMonth - 1).toLocaleString('default', { month: 'long' })} {monthlyYear}
              </h4>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Present (P)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span> Half Day (H)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Absent (A)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-400"></span> Leave (L)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span> Off (W)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[9px]">
                  <tr>
                    <th className="py-2 px-3 sticky left-0 bg-slate-100 z-10">Labour Name</th>
                    <th className="py-2 px-2">Role</th>
                    {daysArray.map((day) => (
                      <th key={day} className="py-2 px-1 text-center min-w-[24px]">
                        {day}
                      </th>
                    ))}
                    <th className="py-2 px-2 text-center text-emerald-800 bg-emerald-50">P</th>
                    <th className="py-2 px-2 text-center text-amber-800 bg-amber-50">H</th>
                    <th className="py-2 px-2 text-center text-rose-800 bg-rose-50">A</th>
                    <th className="py-2 px-2 text-center text-blue-800 bg-blue-50">L</th>
                    <th className="py-2 px-2 text-center bg-indigo-50 font-bold">Units</th>
                    <th className="py-2 px-3 text-right bg-emerald-50 font-bold">Earned (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyLabours.map((lab) => {
                    const monthLogs = db.labourAttendance.filter((a) => {
                      if (a.labourId !== lab.id) return false;
                      const [y, m] = a.date.split('-').map(Number);
                      return y === monthlyYear && m === monthlyMonth;
                    });

                    let pCount = 0;
                    let hCount = 0;
                    let aCount = 0;
                    let lCount = 0;
                    let wCount = 0;
                    let totalUnits = 0;
                    let totalEarned = 0;

                    monthLogs.forEach((log) => {
                      if (log.status === 'Present' || (log.status as string) === 'Full Day') pCount++;
                      else if (log.status === 'Half Day') hCount++;
                      else if (log.status === 'Absent') aCount++;
                      else if (log.status === 'Leave') lCount++;
                      else if (log.status === 'Weekly Off') wCount++;
                      totalUnits += log.payableUnits ?? (log.status === 'Present' ? 1.0 : log.status === 'Half Day' ? 0.5 : 0.0);
                      totalEarned += log.wageCalculated || 0;
                    });

                    return (
                      <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100 whitespace-nowrap">
                          {lab.name}
                        </td>
                        <td className="py-2 px-2 text-[10px] text-slate-500 whitespace-nowrap">{lab.labourType}</td>
                        {daysArray.map((day) => {
                          const dateStr = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const record = monthLogs.find((a) => a.date === dateStr);
                          let badge = '-';
                          let bg = 'text-slate-300';
                          if (record) {
                            if (record.status === 'Present' || (record.status as string) === 'Full Day') {
                              badge = 'P';
                              bg = 'bg-emerald-100 text-emerald-800 font-bold';
                            } else if (record.status === 'Half Day') {
                              badge = 'H';
                              bg = 'bg-amber-100 text-amber-800 font-bold';
                            } else if (record.status === 'Absent') {
                              badge = 'A';
                              bg = 'bg-rose-100 text-rose-800 font-bold';
                            } else if (record.status === 'Leave') {
                              badge = 'L';
                              bg = 'bg-blue-100 text-blue-800 font-bold';
                            } else if (record.status === 'Weekly Off') {
                              badge = 'W';
                              bg = 'bg-slate-200 text-slate-700';
                            } else if (record.status === 'Holiday') {
                              badge = 'HOL';
                              bg = 'bg-purple-100 text-purple-800 font-bold';
                            }
                          }

                          return (
                            <td
                              key={day}
                              onClick={() => record && handleOpenCorrection(record)}
                              className={`py-1.5 px-0.5 text-center text-[10px] ${bg} cursor-pointer rounded-xs`}
                              title={record ? `${record.date}: ${record.status} (Wage: ₹${record.wageCalculated}) - Click to correct` : 'Unmarked'}
                            >
                              {badge}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-center font-bold font-mono text-emerald-700 bg-emerald-50/50">{pCount}</td>
                        <td className="py-2 px-2 text-center font-bold font-mono text-amber-700 bg-amber-50/50">{hCount}</td>
                        <td className="py-2 px-2 text-center font-bold font-mono text-rose-700 bg-rose-50/50">{aCount}</td>
                        <td className="py-2 px-2 text-center font-mono text-blue-700 bg-blue-50/50">{lCount}</td>
                        <td className="py-2 px-2 text-center font-bold font-mono text-indigo-900 bg-indigo-50/50">{totalUnits.toFixed(1)}</td>
                        <td className="py-2 px-3 text-right font-bold font-mono text-emerald-800 bg-emerald-50/50 whitespace-nowrap">
                          {formatCurrency(totalEarned)}
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

      {/* ========================================================================= */}
      {/* 4. LABOUR-WISE ATTENDANCE HISTORY */}
      {/* ========================================================================= */}
      {section === 'labour_history' && (
        <div className="space-y-4">
          {/* Selector Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">1. Select Project</label>
                <select
                  value={histProjectId}
                  onChange={(e) => {
                    setHistProjectId(e.target.value);
                    const firstLab = db.labours.find((l) => e.target.value === 'ALL' || l.projectId === e.target.value);
                    if (firstLab) setHistLabourId(firstLab.id);
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="ALL">All Projects</option>
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">2. Select Labourer</label>
                <select
                  value={histLabourId}
                  onChange={(e) => setHistLabourId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50"
                >
                  {db.labours
                    .filter((l) => histProjectId === 'ALL' || l.projectId === histProjectId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.labourType}) {!l.active ? '[Deactivated]' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={histDateFrom}
                  onChange={(e) => setHistDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={histDateTo}
                  onChange={(e) => setHistDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Profile & Aggregate Stats */}
          {selectedHistLabour && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900">{selectedHistLabour.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                      {selectedHistLabour.labourType}
                    </span>
                    {!selectedHistLabour.active && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                        Inactive / Left Worker
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Assigned Project: <strong className="text-slate-800">{selectedHistLabour.projectName}</strong> | Joining Date: {formatDate(selectedHistLabour.joiningDate)} | Wage Basis: {selectedHistLabour.wageBasis} (₹{selectedHistLabour.dailyRateOrSalary})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-center">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Total Work Entries</span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{labourHistStats.totalLogs}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Present Days</span>
                  <p className="font-mono font-bold text-emerald-800 text-sm mt-0.5">{labourHistStats.presentDays}</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-700 font-bold uppercase">Half Days</span>
                  <p className="font-mono font-bold text-amber-800 text-sm mt-0.5">{labourHistStats.halfDays}</p>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-blue-700 font-bold uppercase">Overtime (Hrs)</span>
                  <p className="font-mono font-bold text-blue-800 text-sm mt-0.5">{labourHistStats.totalOvertimeHours} hrs</p>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 font-bold uppercase">Total Wages In Period</span>
                  <p className="font-mono font-bold text-indigo-900 text-sm mt-0.5">{formatCurrency(labourHistStats.totalWages)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Historical Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Project Site</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Payable Units</th>
                    <th className="py-2.5 px-3 text-right">Overtime</th>
                    <th className="py-2.5 px-3 text-right">Day Wage</th>
                    <th className="py-2.5 px-4">Task Description / Remarks</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labourHistoryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No work or attendance history found for this worker within selected date range.
                      </td>
                    </tr>
                  ) : (
                    labourHistoryRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{formatDate(r.date)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{r.projectName}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'Present' || (r.status as string) === 'Full Day'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : r.status === 'Half Day'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {(r.payableUnits ?? 1.0).toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{r.overtimeHours} hrs</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatCurrency(r.wageCalculated)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{r.remarks || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{r.recordedBy || 'System'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenCorrection(r)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="Edit / Correct Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ATTENDANCE SUMMARY */}
      {/* ========================================================================= */}
      {section === 'summary' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Summary Date</label>
                <input
                  type="date"
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Project</label>
                <select
                  value={summaryProjectId}
                  onChange={(e) => setSummaryProjectId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50"
                >
                  <option value="ALL">All Construction Sites</option>
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-slate-500">Attendance Completion: </span>
              <strong className="text-indigo-700 text-sm">{summaryCompletionRate}%</strong>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Active Labourers</span>
              <p className="font-mono font-bold text-slate-900 text-base mt-1">{summaryActiveLabourers.length}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Present Today</span>
              <p className="font-mono font-bold text-emerald-800 text-base mt-1">{summaryPresent}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] text-amber-700 uppercase font-bold">Half Day Today</span>
              <p className="font-mono font-bold text-amber-800 text-base mt-1">{summaryHalfDay}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-700 uppercase font-bold">Absent Today</span>
              <p className="font-mono font-bold text-rose-800 text-base mt-1">{summaryAbsent}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] text-blue-700 uppercase font-bold">Leave / Off</span>
              <p className="font-mono font-bold text-blue-800 text-base mt-1">{summaryLeave}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] text-indigo-700 uppercase font-bold">Total Daily Wage</span>
              <p className="font-mono font-bold text-indigo-900 text-base mt-1">{formatCurrency(summaryTotalWages)}</p>
            </div>
          </div>

          {/* Site-by-Site Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Site-by-Site Labour Deployment for {formatDate(summaryDate)}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Project Name</th>
                    <th className="py-2.5 px-3 text-center">Active Workers</th>
                    <th className="py-2.5 px-3 text-center">Present</th>
                    <th className="py-2.5 px-3 text-center">Half Day</th>
                    <th className="py-2.5 px-3 text-center">Absent</th>
                    <th className="py-2.5 px-3 text-center">Turnout (%)</th>
                    <th className="py-2.5 px-3 text-right">Daily Site Wage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.projects.map((proj) => {
                    const siteLabourers = db.labours.filter((l) => l.active && l.projectId === proj.id);
                    const siteLogs = db.labourAttendance.filter((a) => a.projectId === proj.id && a.date === summaryDate);
                    const p = siteLogs.filter((a) => a.status === 'Present' || (a.status as string) === 'Full Day').length;
                    const h = siteLogs.filter((a) => a.status === 'Half Day').length;
                    const a = siteLogs.filter((a) => a.status === 'Absent').length;
                    const rate = siteLabourers.length > 0 ? Math.round(((p + h * 0.5) / siteLabourers.length) * 100) : 0;
                    const wages = siteLogs.reduce((sum, item) => sum + (item.wageCalculated || 0), 0);

                    return (
                      <tr key={proj.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{proj.name}</td>
                        <td className="py-3 px-3 text-center font-mono">{siteLabourers.length}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">{p}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">{h}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">{a}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">{rate}%</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(wages)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ATTENDANCE CORRECTION HISTORY */}
      {/* ========================================================================= */}
      {section === 'corrections' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Attendance Correction & Audit Log</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Complete verifiable history of modifications made to attendance records and calculated wages
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-3">Attendance Date</th>
                  <th className="py-2.5 px-3">Labour Name</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3 text-center">Previous Status</th>
                  <th className="py-2.5 px-3 text-center">Corrected Status</th>
                  <th className="py-2.5 px-3 text-right">Wage Adjustment</th>
                  <th className="py-2.5 px-3">Corrected By</th>
                  <th className="py-2.5 px-4">Mandatory Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!db.attendanceCorrections || db.attendanceCorrections.length === 0) ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No attendance corrections have been recorded. All attendance records are pristine.
                    </td>
                  </tr>
                ) : (
                  db.attendanceCorrections.map((cor) => (
                    <tr key={cor.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(cor.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">{formatDate(cor.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{cor.labourName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{cor.projectName}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 line-through">
                          {cor.previousStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {cor.newStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(cor.previousWage)} → {formatCurrency(cor.newWage)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">{cor.correctedBy}</td>
                      <td className="py-2.5 px-4 text-slate-600">{cor.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ATTENDANCE CORRECTION MODAL */}
      {/* ========================================================================= */}
      {editingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Correct Labour Attendance Record</h3>
              </div>
              <button
                onClick={() => setEditingAttendance(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Labour Worker:</span>
                    <strong>{editingAttendance.labourName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Project Site:</span>
                    <strong>{editingAttendance.projectName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Attendance Date:</span>
                    <strong>{formatDate(editingAttendance.date)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Current Status & Wage:</span>
                    <strong className="text-indigo-700">
                      {editingAttendance.status} ({formatCurrency(editingAttendance.wageCalculated)})
                    </strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Attendance Status *</label>
                  <select
                    value={correctionNewStatus}
                    onChange={(e) => setCorrectionNewStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    <option value="Present">Present (1.0 Unit)</option>
                    <option value="Half Day">Half Day (0.5 Unit)</option>
                    <option value="Absent">Absent (0.0 Unit)</option>
                    <option value="Leave">Leave (0.0 Unit)</option>
                    <option value="Weekly Off">Weekly Off (0.0 Unit)</option>
                    <option value="Holiday">Holiday (1.0 Unit)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={correctionOvertime}
                    onChange={(e) => setCorrectionOvertime(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task / Remarks</label>
                <input
                  type="text"
                  placeholder="Task description"
                  value={correctionRemarks}
                  onChange={(e) => setCorrectionRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-rose-700 mb-1">
                  Mandatory Reason for Correction *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this attendance status was corrected (e.g. site supervisor typo, late check-in approved)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-rose-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAttendance(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-xs"
                >
                  Save & Log Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PRINT REGISTER (A4 OFFICIAL REPORT MODAL) */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Official Labour Attendance Register — A4 Print Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* A4 Printable Document Container */}
            <div className="p-8 space-y-6 text-xs text-slate-800 bg-white">
              {/* Company Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {db.company.companyName || 'VYAPAR ONE INFRASTRUCTURE'}
                  </h1>
                  <p className="text-[11px] text-slate-600 max-w-lg mt-0.5">
                    {db.company.companyAddress || db.company.address || 'Civil Construction & Land Development'}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-500">
                    <span>GSTIN: {db.company.gstNumber || 'N/A'}</span>
                    <span>Contact: {db.company.mobileNumber || db.company.contactPhone || 'N/A'}</span>
                    <span>Email: {db.company.email || 'N/A'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider rounded">
                    FORM D / MUSTER ROLL
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Rule 26(1) of Minimum Wages Act</p>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm text-slate-900 uppercase">
                    LABOUR ATTENDANCE & WAGE REGISTER
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Project Site:{' '}
                    <strong>
                      {projRegProjectId === 'ALL'
                        ? 'All Active Construction Sites'
                        : db.projects.find((p) => p.id === projRegProjectId)?.name || projRegProjectId}
                    </strong>
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <p>
                    Period:{' '}
                    <strong>
                      {formatDate(projRegDateFrom)} to {formatDate(projRegDateTo)}
                    </strong>
                  </p>
                  <p>
                    Printed On: {new Date().toLocaleDateString('en-IN')} | Generated By: {currentUser.name}
                  </p>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 border-b border-slate-300 uppercase font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-2 border-r border-slate-300">Sr.</th>
                      <th className="py-2 px-3 border-r border-slate-300">Labour Name & ID</th>
                      <th className="py-2 px-2 border-r border-slate-300">Role</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-center">Status</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-center">Units</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-right">Overtime</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right">Wage (₹)</th>
                      <th className="py-2 px-3">Remarks / Task</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projectRegisterRecords.slice(0, 30).map((r, i) => (
                      <tr key={r.id}>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{i + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900">
                          {r.labourName} <span className="font-normal text-slate-400">({r.labourId})</span>
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200">{db.labours.find((l) => l.id === r.labourId)?.labourType || 'Labour'}</td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold">{r.status}</td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold">{(r.payableUnits ?? 1.0).toFixed(1)}</td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono">{r.overtimeHours} hrs</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-bold">{formatCurrency(r.wageCalculated)}</td>
                        <td className="py-1.5 px-3 text-slate-600">{r.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold">
                    <tr>
                      <td colSpan={6} className="py-2 px-3 text-right">
                        TOTAL WAGE OBLIGATION:
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900">
                        {formatCurrency(projRegStats.totalWages)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    Time Keeper / Supervisor
                  </div>
                  <span className="text-[10px] text-slate-400">Site Daily Muster</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    Civil Engineer / Project Manager
                  </div>
                  <span className="text-[10px] text-slate-400">Site Work Verification</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                    Authorized Signatory
                  </div>
                  <span className="text-[10px] text-slate-400">For {db.company.companyName || 'VYAPAR ONE INFRASTRUCTURE'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
