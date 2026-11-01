import React, { useState } from 'react';
import { DatabaseState, dbService, generateProjectCode } from '../../services/storage';
import { Project, PlannedUnitRow, Property } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { InlineAddModal, InlineAddType } from '../common/InlineAddModal';
import {
  FolderKanban,
  Plus,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  Layers,
  Users,
  Wallet,
  Truck,
  FileText,
  X,
  Check,
  Trash2,
  AlertTriangle,
  Download,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface ProjectsViewProps {
  db: DatabaseState;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewDetailProject, setViewDetailProject] = useState<Project | null>(null);

  // Safe Deletion Modal State
  const [deleteModalProject, setDeleteModalProject] = useState<Project | null>(null);
  const [authPhoneInput, setAuthPhoneInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Inline Add Modal for master types
  const [inlineModalType, setInlineModalType] = useState<InlineAddType | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    code: '',
    address: '',
    type: 'Plotted Layout',
    startDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    totalUnits: 10,
    notes: '',
  });

  // Planned Units Builder State
  const [plannedUnits, setPlannedUnits] = useState<PlannedUnitRow[]>([]);
  const [quickGenCount, setQuickGenCount] = useState<number>(10);
  const [quickGenPrefix, setQuickGenPrefix] = useState<string>('Plot No. ');
  const [quickGenAreaSqFt, setQuickGenAreaSqFt] = useState<number>(1200);
  const [quickGenPosition, setQuickGenPosition] = useState<string>('Front');

  const masterProjectTypes = db.masterSettings?.projectTypes || [
    'Plotted Layout',
    'Residential Building',
    'Commercial Complex',
    'Row House Scheme',
    'Farmhouse Villa Community',
  ];

  const masterPositions = db.masterSettings?.plotPositions || [
    'Front',
    'Back',
    'Corner',
    'Road-Facing',
    'Garden-Facing',
    'East-Facing',
    'North-Facing',
  ];

  const handleOpenAdd = () => {
    setSelectedProject(null);
    const autoCode = generateProjectCode(db.projects);
    setFormData({
      name: '',
      code: autoCode,
      address: '',
      type: masterProjectTypes[0] || 'Plotted Layout',
      startDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      totalUnits: 10,
      notes: '',
    });

    // Default 5 initial planned units for smooth prototyping
    const initialUnits: PlannedUnitRow[] = Array.from({ length: 5 }, (_, i) => {
      const sqFt = 1200;
      const sqMtr = Math.round((sqFt / 10.7639) * 100) / 100;
      return {
        id: `pu-${Date.now()}-${i + 1}`,
        plotNumber: `Plot No. ${i + 1}`,
        areaSqMtr: sqMtr,
        areaSqFt: sqFt,
        position: i === 0 ? 'Corner' : i === 1 ? 'Road-Facing' : 'Front',
        remarks: 'Residential NA demarcation',
      };
    });
    setPlannedUnits(initialUnits);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setSelectedProject(project);
    setFormData({ ...project });

    // Load existing planned units or extract from db.properties if empty
    if (project.plannedUnits && project.plannedUnits.length > 0) {
      setPlannedUnits([...project.plannedUnits]);
    } else {
      const existingProps = db.properties.filter((p) => p.projectId === project.id);
      if (existingProps.length > 0) {
        setPlannedUnits(
          existingProps.map((p) => ({
            id: `pu-${p.id}`,
            plotNumber: p.number,
            areaSqMtr: p.areaSqMtr,
            areaSqFt: p.areaSqFt,
            position: p.position || 'Front',
            remarks: p.remarks || '',
          }))
        );
      } else {
        setPlannedUnits([]);
      }
    }
    setIsModalOpen(true);
  };

  // Planned Unit row modification
  const handleAddUnitRow = () => {
    const nextIdx = plannedUnits.length + 1;
    const sqFt = 1200;
    const sqMtr = Math.round((sqFt / 10.7639) * 100) / 100;
    const newRow: PlannedUnitRow = {
      id: `pu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      plotNumber: `Plot No. ${nextIdx}`,
      areaSqMtr: sqMtr,
      areaSqFt: sqFt,
      position: 'Front',
      remarks: '',
    };
    setPlannedUnits([...plannedUnits, newRow]);
  };

  const handleUpdateUnitRow = (id: string, field: keyof PlannedUnitRow, value: any) => {
    setPlannedUnits((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === 'areaSqMtr') {
          const mtr = parseFloat(value) || 0;
          updated.areaSqFt = Math.round(mtr * 10.7639 * 100) / 100;
        } else if (field === 'areaSqFt') {
          const ft = parseFloat(value) || 0;
          updated.areaSqMtr = Math.round((ft / 10.7639) * 100) / 100;
        }
        return updated;
      })
    );
  };

  const handleRemoveUnitRow = (id: string) => {
    setPlannedUnits((prev) => prev.filter((r) => r.id !== id));
  };

  // Quick generate multiple unit rows
  const handleQuickGenerateSeries = () => {
    if (quickGenCount <= 0) return;
    const newRows: PlannedUnitRow[] = Array.from({ length: quickGenCount }, (_, i) => {
      const plotNum = `${quickGenPrefix}${plannedUnits.length + i + 1}`;
      const sqFt = quickGenAreaSqFt;
      const sqMtr = Math.round((sqFt / 10.7639) * 100) / 100;
      return {
        id: `pu-${Date.now()}-${i}`,
        plotNumber: plotNum,
        areaSqMtr: sqMtr,
        areaSqFt: sqFt,
        position: quickGenPosition,
        remarks: 'Demarcated layout unit',
      };
    });
    setPlannedUnits([...plannedUnits, ...newRows]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.code?.trim()) {
      alert('Please enter Project Name and Code.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const finalTotalUnits = plannedUnits.length > 0 ? plannedUnits.length : Number(formData.totalUnits) || 1;

    let targetProjectId = '';

    if (selectedProject) {
      targetProjectId = selectedProject.id;
      currentDb.projects = currentDb.projects.map((p) =>
        p.id === selectedProject.id
          ? ({
              ...p,
              name: formData.name!.trim(),
              code: formData.code!.trim().toUpperCase(),
              address: formData.address || '',
              type: formData.type || 'Plotted Layout',
              startDate: formData.startDate || p.startDate,
              status: formData.status || p.status,
              totalUnits: finalTotalUnits,
              plannedUnits: plannedUnits,
              notes: formData.notes || '',
            } as Project)
          : p
      );
      dbService.logAudit(currentUser.name, 'PROJECT_EDITED', 'Projects', `Updated project ${formData.name}`);
    } else {
      targetProjectId = `proj-${Date.now()}`;
      const newProj: Project = {
        id: targetProjectId,
        name: formData.name!.trim(),
        code: formData.code!.trim().toUpperCase(),
        address: formData.address || '',
        type: formData.type || 'Plotted Layout',
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        status: formData.status || 'Active',
        totalUnits: finalTotalUnits,
        plannedUnits: plannedUnits,
        notes: formData.notes || '',
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentUser.name,
      };
      currentDb.projects.push(newProj);
      dbService.logAudit(
        currentUser.name,
        'PROJECT_CREATED',
        'Projects',
        `Created project ${newProj.name} (${newProj.code}) with ${plannedUnits.length} planned units`
      );
    }

    // Sync Planned Units into db.properties so they appear directly in Plot / Flat Management
    const projectName = formData.name!.trim();
    const defaultRate = 1600;
    const defaultDevChargeRate = currentDb.masterSettings?.defaultDevelopmentChargeRate || 100;

    plannedUnits.forEach((unit) => {
      const existingProp = currentDb.properties.find(
        (p) => p.projectId === targetProjectId && p.number.toLowerCase() === unit.plotNumber.toLowerCase()
      );

      if (!existingProp) {
        // Create new property
        const basePrice = Math.round(unit.areaSqFt * defaultRate);
        const devCharges = Math.round(unit.areaSqFt * defaultDevChargeRate);
        const newProperty: Property = {
          id: `prop-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          projectId: targetProjectId,
          projectName: projectName,
          propertyType: 'Plot',
          number: unit.plotNumber,
          areaSqMtr: unit.areaSqMtr,
          areaSqFt: unit.areaSqFt,
          ratePerSqFt: defaultRate,
          basePrice: basePrice,
          developmentCharges: devCharges,
          developmentChargeRate: defaultDevChargeRate,
          totalPrice: basePrice + devCharges,
          position: unit.position,
          status: 'Available',
          remarks: unit.remarks,
        };
        currentDb.properties.push(newProperty);
      } else if (existingProp.status === 'Available') {
        // Update unbooked property dimensions and position
        existingProp.areaSqMtr = unit.areaSqMtr;
        existingProp.areaSqFt = unit.areaSqFt;
        existingProp.position = unit.position;
        existingProp.remarks = unit.remarks;
        existingProp.basePrice = Math.round(unit.areaSqFt * existingProp.ratePerSqFt);
        existingProp.developmentCharges = Math.round(unit.areaSqFt * (existingProp.developmentChargeRate || defaultDevChargeRate));
        existingProp.totalPrice = existingProp.basePrice + (existingProp.developmentCharges || 0);
      }
    });

    dbService.saveDatabase(currentDb);
    setIsModalOpen(false);
  };

  const handleToggleStatus = (project: Project) => {
    if (!hasPermission('canEdit')) {
      alert('Permission denied. You do not have rights to update project status.');
      return;
    }
    const currentDb = dbService.getDatabase();
    const newStatus = project.status === 'Active' ? 'Inactive' : 'Active';
    currentDb.projects = currentDb.projects.map((p) =>
      p.id === project.id ? { ...p, status: newStatus as any } : p
    );
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'PROJECT_STATUS_TOGGLED',
      'Projects',
      `Changed status of ${project.name} to ${newStatus}`
    );
  };

  // Safe Project Deletion Procedure with Authorization Phone Check
  const handleOpenDelete = (project: Project) => {
    if (!hasPermission('canDeleteOrReverse')) {
      alert('Permission denied. Only authorized administrators can delete projects.');
      return;
    }
    setDeleteModalProject(project);
    setAuthPhoneInput('');
    setDeleteError('');
  };

  const handleExecuteSafeDelete = () => {
    if (!deleteModalProject) return;

    if (authPhoneInput.trim() !== '7666257368') {
      setDeleteError('Unauthorized mobile number. You must enter 7666257368 to authorize project deletion.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const pId = deleteModalProject.id;

    // 1. Generate full CSV backup archive
    const projectProps = currentDb.properties.filter((p) => p.projectId === pId);
    const projectBookings = currentDb.bookings.filter((b) => b.projectId === pId);
    const projectReceipts = currentDb.customerReceipts.filter((r) => r.projectId === pId);
    const projectBills = currentDb.materialPurchases.filter((b) => b.projectId === pId);
    const projectUsage = currentDb.materialUsages.filter((u) => u.projectId === pId);
    const projectLabour = currentDb.labours.filter((l) => l.projectId === pId);
    const projectCommissions = currentDb.adviserCommissions.filter((c) => c.projectId === pId);

    const headers = [
      'Record Type',
      'Identifier',
      'Name / Details',
      'Status / Position',
      'Amount / Rate',
      'Date / Ref',
      'Remarks',
    ];

    const rows: (string | number)[][] = [];

    // Project Info
    rows.push([
      'PROJECT_HEADER',
      deleteModalProject.code,
      deleteModalProject.name,
      deleteModalProject.status,
      deleteModalProject.totalUnits,
      deleteModalProject.startDate,
      deleteModalProject.address,
    ]);

    // Properties
    projectProps.forEach((prop) => {
      rows.push([
        'PROPERTY_PLOT',
        prop.number,
        `${prop.areaSqFt} Sq.Ft (${prop.areaSqMtr} Sq.Mtr)`,
        prop.status,
        prop.totalPrice,
        prop.position || '',
        prop.customerName || prop.remarks || '',
      ]);
    });

    // Bookings
    projectBookings.forEach((bkg) => {
      rows.push([
        'CUSTOMER_BOOKING',
        bkg.bookingRef,
        `${bkg.customerName} - ${bkg.propertyNumber}`,
        bkg.status,
        bkg.finalTotalAmount,
        bkg.bookingDate,
        `Received: ${bkg.amountReceived}, Bal: ${bkg.remainingBalance}`,
      ]);
    });

    // Receipts
    projectReceipts.forEach((rcp) => {
      rows.push([
        'PAYMENT_RECEIPT',
        rcp.receiptNumber,
        rcp.customerName,
        rcp.paymentMode,
        rcp.amount,
        rcp.paymentDate,
        rcp.referenceNumber || rcp.transactionRef || '',
      ]);
    });

    // Material Bills
    projectBills.forEach((bill) => {
      rows.push([
        'MATERIAL_BILL',
        bill.billNumber,
        bill.vendorName,
        bill.isGstBill ? 'GST Bill' : 'Non-GST Bill',
        bill.billTotal,
        bill.billDate,
        `Paid: ${bill.amountPaid}, Outstanding: ${bill.outstandingAmount}`,
      ]);
    });

    // Material Usage
    projectUsage.forEach((u) => {
      rows.push([
        'MATERIAL_USAGE',
        u.materialName,
        u.workLocation,
        `${u.quantityUsed} ${u.unit}`,
        '-',
        u.usageDate,
        u.workDescription,
      ]);
    });

    // Advisers
    projectCommissions.forEach((comm) => {
      rows.push([
        'ADVISER_COMMISSION',
        comm.adviserName,
        comm.bookingRef,
        comm.commissionType,
        comm.eligibleCommission,
        comm.createdAt,
        `Paid: ${comm.paidCommission}, Outstanding: ${comm.outstandingCommission}`,
      ]);
    });

    // Export the CSV backup immediately
    exportToCSV(
      `BACKUP_DELETED_PROJECT_${deleteModalProject.code}_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    );

    // 2. Remove project from database
    currentDb.projects = currentDb.projects.filter((p) => p.id !== pId);
    // Remove only unbooked properties belonging to this project (preserve booked property history if any)
    currentDb.properties = currentDb.properties.filter((p) => p.projectId !== pId || p.status === 'Booked');

    // 3. Log safe deletion audit record
    dbService.logAudit(
      currentUser.name,
      'PROJECT_SAFE_DELETION',
      'Projects',
      `Safely deleted project "${deleteModalProject.name}" (${deleteModalProject.code}) following verification of mobile 7666257368. Comprehensive archive CSV backup generated.`
    );

    dbService.saveDatabase(currentDb);
    setDeleteModalProject(null);
  };

  const filteredProjects = db.projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-600" />
            <span>Project Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure site layouts, planned units table, inventory generation, and safe project archives
          </p>
        </div>

        {hasPermission('canCreate') && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Project</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by project name, code, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent w-full text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project) => {
          const projectProperties = db.properties.filter((p) => p.projectId === project.id);
          const bookedCount = projectProperties.filter((p) => p.status === 'Booked').length;
          const availableCount = projectProperties.filter((p) => p.status === 'Available').length;
          const totalUnits = projectProperties.length || project.totalUnits;

          const projectReceipts = db.customerReceipts
            .filter((r) => r.projectId === project.id)
            .reduce((s, r) => s + r.amount, 0);

          const projectExpenses = db.transactions
            .filter((t) => t.projectId === project.id && t.debit > 0 && !t.isReversed)
            .reduce((s, t) => s + t.debit, 0);

          return (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {project.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          project.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : project.status === 'Upcoming'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-2">{project.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{project.address}</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Project Type:</span>
                    <span className="font-semibold text-slate-800">{project.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Start Date:</span>
                    <span className="font-semibold text-slate-800">{formatDate(project.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inventory Units:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {bookedCount} Booked / {availableCount} Available ({totalUnits} Total)
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase">Total Income</span>
                    <p className="font-mono font-bold text-emerald-800 text-sm mt-0.5">
                      {formatCurrency(projectReceipts)}
                    </p>
                  </div>
                  <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-rose-700 font-semibold uppercase">Total Expenses</span>
                    <p className="font-mono font-bold text-rose-800 text-sm mt-0.5">
                      {formatCurrency(projectExpenses)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setViewDetailProject(project)}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Details</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {hasPermission('canEdit') && (
                    <button
                      onClick={() => handleOpenEdit(project)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50 rounded-md"
                      title="Edit Project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {hasPermission('canEdit') && (
                    <button
                      onClick={() => handleToggleStatus(project)}
                      className={`p-1.5 rounded-md ${
                        project.status === 'Active'
                          ? 'text-slate-400 hover:text-rose-600'
                          : 'text-slate-400 hover:text-emerald-600'
                      }`}
                      title={project.status === 'Active' ? 'Deactivate Project' : 'Activate Project'}
                    >
                      {project.status === 'Active' ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {hasPermission('canDeleteOrReverse') && (
                    <button
                      onClick={() => handleOpenDelete(project)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Safe Delete Project (Requires 7666257368)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Project Modal with Planned Units Table */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {selectedProject ? `Edit Project: ${selectedProject.name}` : 'Create New Project'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Basic Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vishwas Green Meadows"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Project Code *</label>
                    <span className="text-[10px] text-slate-400 font-mono">Auto-generated</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VYO-01"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-slate-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Project Type *</label>
                    <button
                      type="button"
                      onClick={() => setInlineModalType('projectType')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add New</span>
                    </button>
                  </div>
                  <select
                    value={formData.type || masterProjectTypes[0]}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                  >
                    {masterProjectTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Address / Location</label>
                  <textarea
                    rows={2}
                    placeholder="Survey number, road, landmark, city"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Notes / Sanctions</label>
                  <textarea
                    rows={2}
                    placeholder="RERA number, town planning sanction, NA order details"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* ================= PLANNED UNITS TABLE BUILDER ================= */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Planned Units / Plots Inventory Builder</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enter plot sizes (Sq.Mtr auto-converts to Sq.Ft using ratio 1 m² = 10.7639 ft²).
                      Saved rows are automatically added as Available properties in the ERP inventory.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddUnitRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Row</span>
                    </button>
                  </div>
                </div>

                {/* Quick Generate Series Bar */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Generate Series:</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">Count:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quickGenCount}
                      onChange={(e) => setQuickGenCount(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-center font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">Area (Sq.Ft):</span>
                    <input
                      type="number"
                      value={quickGenAreaSqFt}
                      onChange={(e) => setQuickGenAreaSqFt(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-center font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">Position:</span>
                    <select
                      value={quickGenPosition}
                      onChange={(e) => setQuickGenPosition(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                    >
                      {masterPositions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickGenerateSeries}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 shadow-2xs"
                  >
                    Generate Rows
                  </button>
                </div>

                {/* Units Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-700 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3 w-12 text-center">#</th>
                          <th className="py-2 px-3 min-w-[120px]">Plot / Unit No. *</th>
                          <th className="py-2 px-3 min-w-[110px]">Area (Sq. Mtr)</th>
                          <th className="py-2 px-3 min-w-[110px]">Area (Sq. Ft)</th>
                          <th className="py-2 px-3 min-w-[130px]">Position</th>
                          <th className="py-2 px-3 min-w-[150px]">Remarks</th>
                          <th className="py-2 px-3 w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {plannedUnits.map((unit, index) => (
                          <tr key={unit.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                required
                                value={unit.plotNumber}
                                onChange={(e) => handleUpdateUnitRow(unit.id, 'plotNumber', e.target.value)}
                                placeholder="Plot 1"
                                className="w-full px-2 py-1 border border-slate-200 rounded font-bold text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={unit.areaSqMtr || ''}
                                onChange={(e) => handleUpdateUnitRow(unit.id, 'areaSqMtr', e.target.value)}
                                placeholder="m²"
                                className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={unit.areaSqFt || ''}
                                onChange={(e) => handleUpdateUnitRow(unit.id, 'areaSqFt', e.target.value)}
                                placeholder="ft²"
                                className="w-full px-2 py-1 border border-slate-200 rounded font-mono font-semibold text-indigo-700 text-xs focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <select
                                value={unit.position || masterPositions[0]}
                                onChange={(e) => handleUpdateUnitRow(unit.id, 'position', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50 font-medium"
                              >
                                {masterPositions.map((pos) => (
                                  <option key={pos} value={pos}>
                                    {pos}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={unit.remarks || ''}
                                onChange={(e) => handleUpdateUnitRow(unit.id, 'remarks', e.target.value)}
                                placeholder="Optional notes"
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                              />
                            </td>
                            <td className="py-1 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveUnitRow(unit.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {plannedUnits.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                              No planned units added yet. Click &quot;Add Row&quot; or use &quot;Quick Generate Series&quot; above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Units Table Footer Summary */}
                  <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-4">
                      <span>
                        Total Units: <strong className="text-slate-900 font-mono">{plannedUnits.length}</strong>
                      </span>
                      <span>
                        Total Area (Sq.Ft):{' '}
                        <strong className="text-indigo-700 font-mono">
                          {Math.round(plannedUnits.reduce((s, u) => s + (u.areaSqFt || 0), 0)).toLocaleString('en-IN')}
                        </strong>
                      </span>
                      <span>
                        Total Area (Sq.Mtr):{' '}
                        <strong className="text-slate-800 font-mono">
                          {Math.round(plannedUnits.reduce((s, u) => s + (u.areaSqMtr || 0), 0)).toLocaleString('en-IN')}
                        </strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Auto-converts: 1 m² = 10.7639 ft²
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{selectedProject ? 'Save & Sync Units' : 'Create Project & Generate Inventory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Project Deletion Modal (Strict Authorized Phone Verification: 7666257368) */}
      {deleteModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-200" />
                <h3 className="font-extrabold text-sm">Safe Project Deletion Procedure</h3>
              </div>
              <button
                onClick={() => setDeleteModalProject(null)}
                className="text-rose-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>You are deleting: {deleteModalProject.name} ({deleteModalProject.code})</span>
                </p>
                <p className="text-[11px] text-rose-800">
                  This project contains plots, bookings, material receipts, and labour entries.
                  Before deletion completes, a <strong>full downloadable CSV backup</strong> of all associated records will be automatically exported.
                </p>
              </div>

              {/* Data Summary to be backed up */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2 text-slate-700">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Archive Backup Scope:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Plots/Properties: <strong>{db.properties.filter((p) => p.projectId === deleteModalProject.id).length}</strong></div>
                  <div>Customer Bookings: <strong>{db.bookings.filter((b) => b.projectId === deleteModalProject.id).length}</strong></div>
                  <div>Material Bills: <strong>{db.materialPurchases.filter((b) => b.projectId === deleteModalProject.id).length}</strong></div>
                  <div>Customer Receipts: <strong>{db.customerReceipts.filter((r) => r.projectId === deleteModalProject.id).length}</strong></div>
                </div>
              </div>

              {/* Mobile Verification Requirement */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  Enter Authorized Mobile Number (Required to proceed):
                </label>
                <input
                  type="text"
                  placeholder="Enter authorized mobile: 7666257368"
                  value={authPhoneInput}
                  onChange={(e) => {
                    setAuthPhoneInput(e.target.value);
                    setDeleteError('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500">
                  Security policy requires entering registered administrator mobile number <strong>7666257368</strong>.
                </p>
              </div>

              {deleteError && (
                <div className="p-2.5 rounded bg-rose-100 border border-rose-300 text-rose-800 font-medium text-xs">
                  {deleteError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalProject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSafeDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup & Delete Project</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Project Comprehensive Drilldown Modal */}
      {viewDetailProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">{viewDetailProject.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Code: {viewDetailProject.code} | {viewDetailProject.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDetailProject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Project Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Total Properties</span>
                  <p className="font-mono font-bold text-slate-900 text-base mt-1">
                    {db.properties.filter((p) => p.projectId === viewDetailProject.id).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 text-[10px] uppercase font-bold">Available</span>
                  <p className="font-mono font-bold text-emerald-800 text-base mt-1">
                    {db.properties.filter((p) => p.projectId === viewDetailProject.id && p.status === 'Available').length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-amber-700 text-[10px] uppercase font-bold">Booked</span>
                  <p className="font-mono font-bold text-amber-800 text-base mt-1">
                    {db.properties.filter((p) => p.projectId === viewDetailProject.id && p.status === 'Booked').length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                  <span className="text-indigo-700 text-[10px] uppercase font-bold">Collections</span>
                  <p className="font-mono font-bold text-indigo-900 text-base mt-1">
                    {formatCurrency(
                      db.customerReceipts
                        .filter((r) => r.projectId === viewDetailProject.id)
                        .reduce((s, r) => s + r.amount, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Project Booked Customers */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Project Customers & Bookings</span>
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Booking Ref</th>
                        <th className="py-2 px-3 text-right">Property Price</th>
                        <th className="py-2 px-3 text-right">Received</th>
                        <th className="py-2 px-3 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.bookings
                        .filter((b) => b.projectId === viewDetailProject.id)
                        .map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">{b.propertyNumber}</td>
                            <td className="py-2 px-3 text-slate-700">{b.customerName}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{b.bookingRef}</td>
                            <td className="py-2 px-3 text-right font-mono font-medium">{formatCurrency(b.finalTotalAmount)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">{formatCurrency(b.amountReceived)}</td>
                            <td className="py-2 px-3 text-right font-mono text-rose-600">{formatCurrency(b.remainingBalance)}</td>
                          </tr>
                        ))}
                      {db.bookings.filter((b) => b.projectId === viewDetailProject.id).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No customer bookings recorded yet for this project.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Project Material Purchases & Usage */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span>Material Purchases for Project</span>
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Bill Date</th>
                        <th className="py-2 px-3">Bill No</th>
                        <th className="py-2 px-3">Vendor</th>
                        <th className="py-2 px-3 text-right">Bill Total</th>
                        <th className="py-2 px-3 text-right">Paid</th>
                        <th className="py-2 px-3 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.materialPurchases
                        .filter((p) => p.projectId === viewDetailProject.id)
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-600">{formatDate(p.billDate)}</td>
                            <td className="py-2 px-3 font-mono font-semibold text-slate-800">{p.billNumber}</td>
                            <td className="py-2 px-3 text-slate-700">{p.vendorName}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(p.billTotal)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatCurrency(p.amountPaid)}</td>
                            <td className="py-2 px-3 text-right font-mono text-rose-600">{formatCurrency(p.outstandingAmount)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setViewDetailProject(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Add Modal for Master Settings */}
      {inlineModalType && (
        <InlineAddModal
          type={inlineModalType}
          isOpen={true}
          onClose={() => setInlineModalType(null)}
          onSuccess={(id, label) => {
            if (inlineModalType === 'projectType') {
              setFormData((prev) => ({ ...prev, type: label }));
            }
            setInlineModalType(null);
          }}
        />
      )}
    </div>
  );
};
