import React, { useState } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import { Property, PropertyStatus, PropertyType, Booking, CustomerPaymentReceipt } from '../../types';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import {
  Home,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Edit2,
  Eye,
  CheckCircle,
  AlertCircle,
  Ban,
  X,
  Check,
  User,
  Clock,
  Layers,
  Trash2,
  Users,
  Award,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface PlotFlatManagementViewProps {
  db: DatabaseState;
}

export const PlotFlatManagementView: React.FC<PlotFlatManagementViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();

  // Sub-tabs: 'all-bookings' | 'satisfied' | 'inventory'
  const [subTab, setSubTab] = useState<'all-bookings' | 'satisfied' | 'inventory'>('all-bookings');

  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Customer Detail View Modal state (for booking or property)
  const [viewCustomerDetail, setViewCustomerDetail] = useState<{
    booking?: Booking;
    property?: Property;
  } | null>(null);

  // Cancellation Modal state
  const [cancelModalProperty, setCancelModalProperty] = useState<Property | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Delete Safeguard Modal state
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);

  // Printable receipt state
  const [printedReceipt, setPrintedReceipt] = useState<CustomerPaymentReceipt | null>(null);

  // Form State for Add / Edit Property
  const [formData, setFormData] = useState<Partial<Property>>({
    projectId: db.projects[0]?.id || '',
    propertyType: 'Plot',
    number: '',
    areaSqFt: 1200,
    areaSqMtr: 111.48,
    ratePerSqFt: 1600,
    totalPrice: 1920000,
    superBuiltUpArea: 1000,
    carpetArea: 760,
    parkingArea: 120,
    status: 'Available',
    remarks: '',
  });

  const handleOpenAdd = () => {
    setEditingProperty(null);
    setFormData({
      projectId: db.projects[0]?.id || '',
      propertyType: 'Plot',
      number: '',
      areaSqFt: 1200,
      areaSqMtr: 111.48,
      ratePerSqFt: 1600,
      totalPrice: 1920000,
      status: 'Available',
      remarks: '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (prop: Property) => {
    setEditingProperty(prop);
    setFormData({ ...prop });
    setIsEditModalOpen(true);
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number?.trim()) {
      alert('Property Number is required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const proj = currentDb.projects.find((p) => p.id === formData.projectId);

    const areaSqFt = Number(formData.areaSqFt) || 1000;
    const rate = Number(formData.ratePerSqFt) || 1500;
    const total = areaSqFt * rate;
    const areaSqMtr = Number((areaSqFt * 0.092903).toFixed(2));

    if (editingProperty) {
      currentDb.properties = currentDb.properties.map((p) =>
        p.id === editingProperty.id
          ? ({
              ...p,
              ...formData,
              projectName: proj ? proj.name : p.projectName,
              areaSqFt,
              areaSqMtr,
              ratePerSqFt: rate,
              totalPrice: total,
            } as Property)
          : p
      );
      dbService.logAudit(
        currentUser.name,
        'PROPERTY_UPDATED',
        'Customer Management',
        `Updated details for ${formData.number}`
      );
    } else {
      const newProp: Property = {
        id: `prop-${Date.now()}`,
        projectId: formData.projectId || currentDb.projects[0]?.id || '',
        projectName: proj ? proj.name : 'General Project',
        propertyType: (formData.propertyType as PropertyType) || 'Plot',
        number: formData.number.trim(),
        areaSqFt,
        areaSqMtr,
        ratePerSqFt: rate,
        totalPrice: total,
        status: 'Available',
        remarks: formData.remarks || '',
      };
      currentDb.properties.push(newProp);
      dbService.logAudit(
        currentUser.name,
        'PROPERTY_CREATED',
        'Customer Management',
        `Created inventory unit ${newProp.number}`
      );
    }

    dbService.saveDatabase(currentDb);
    setIsEditModalOpen(false);
  };

  // Cancellation Workflow
  const handleInitiateCancellation = (prop: Property) => {
    setCancelModalProperty(prop);
    setCancelReason('');
  };

  const handleConfirmCancellation = () => {
    if (!cancelModalProperty) return;
    const currentDb = dbService.getDatabase();
    currentDb.properties = currentDb.properties.map((p) =>
      p.id === cancelModalProperty.id
        ? {
            ...p,
            status: 'Cancelled' as PropertyStatus,
            cancellationReason: cancelReason || 'Buyer requested cancellation',
            cancelledBy: currentUser.name,
            cancellationApproved: false,
          }
        : p
    );
    // Mark linked booking as Cancelled
    currentDb.bookings = currentDb.bookings.map((b) =>
      b.propertyId === cancelModalProperty.id ? { ...b, status: 'Cancelled' } : b
    );

    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'BOOKING_CANCELLED_INITIATED',
      'Customer Management',
      `Booking cancellation recorded for ${cancelModalProperty.number}. Awaiting approval.`
    );
    setCancelModalProperty(null);
  };

  const handleApproveCancellation = (prop: Property) => {
    if (!hasPermission('canApprove')) {
      alert('Only authorized Administrators or Managers can approve property cancellation release.');
      return;
    }
    const currentDb = dbService.getDatabase();
    currentDb.properties = currentDb.properties.map((p) =>
      p.id === prop.id
        ? {
            ...p,
            status: 'Available' as PropertyStatus,
            customerId: undefined,
            customerName: undefined,
            bookingDate: undefined,
            cancellationApproved: true,
          }
        : p
    );
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'CANCELLATION_APPROVED_RELEASED',
      'Customer Management',
      `Approved cancellation for ${prop.number}. Property is now released as Available.`
    );
  };

  // Filter Bookings
  const filteredBookings = db.bookings.filter((b) => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.propertyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'ALL' || b.projectId === projectFilter;
    const isSatisfied = subTab === 'satisfied' ? b.remainingBalance <= 0 : true;
    return matchesSearch && matchesProject && isSatisfied;
  });

  // Filter Properties (for Inventory tab)
  const filteredProperties = db.properties.filter((p) => {
    const matchesSearch =
      p.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customerName && p.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesProject = projectFilter === 'ALL' || p.projectId === projectFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || p.propertyType === typeFilter;
    return matchesSearch && matchesProject && matchesStatus && matchesType;
  });

  const satisfiedCount = db.bookings.filter((b) => b.remainingBalance <= 0).length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Customer Management</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Plot & Flat Customer Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Customer bookings, satisfied customer accounts, plot & flat inventory allocations, and cancellations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (subTab === 'inventory') {
                const headers = ['Project', 'Type', 'Number', 'Area SqFt', 'Rate', 'Total', 'Status', 'Buyer'];
                const rows = filteredProperties.map((p) => [
                  p.projectName,
                  p.propertyType,
                  p.number,
                  p.areaSqFt,
                  p.ratePerSqFt,
                  p.totalPrice,
                  p.status,
                  p.customerName || '-',
                ]);
                exportToCSV(`VYAPAR_ONE_Inventory_${new Date().toISOString().split('T')[0]}`, headers, rows);
              } else {
                const headers = ['Booking Ref', 'Customer', 'Project', 'Property', 'Total Price', 'Received', 'Balance', 'Status'];
                const rows = filteredBookings.map((b) => [
                  b.bookingRef,
                  b.customerName,
                  b.projectName,
                  b.propertyNumber,
                  b.finalTotalAmount,
                  b.amountReceived,
                  b.remainingBalance,
                  b.remainingBalance <= 0 ? 'Satisfied / Paid' : 'Active Balance',
                ]);
                exportToCSV(`VYAPAR_ONE_Customer_Bookings_${new Date().toISOString().split('T')[0]}`, headers, rows);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
          {hasPermission('canCreate') && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Plot / Flat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Sub-Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setSubTab('all-bookings')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'all-bookings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Customer Bookings ({db.bookings.length})</span>
        </button>

        <button
          onClick={() => setSubTab('satisfied')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'satisfied'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Satisfied Customers ({satisfiedCount})</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
            100% Paid
          </span>
        </button>

        <button
          onClick={() => setSubTab('inventory')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Plot & Flat Inventory ({db.properties.length})</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 font-medium">Total Properties</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{db.properties.length}</p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-emerald-700 font-medium">Available Units</span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">
            {db.properties.filter((p) => p.status === 'Available').length}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-2xs">
          <span className="text-indigo-700 font-medium">Total Bookings</span>
          <p className="text-xl font-extrabold text-indigo-900 mt-1 font-mono">
            {db.bookings.length}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-emerald-700 font-medium">Satisfied (100% Paid)</span>
          <p className="text-xl font-extrabold text-emerald-800 mt-1 font-mono">
            {satisfiedCount}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={subTab === 'inventory' ? 'Search unit number, project...' : 'Search customer name, plot, booking ref...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent w-full text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
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

          {subTab === 'inventory' && (
            <>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <span className="text-slate-500 font-medium">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
                >
                  <option value="ALL">All Types</option>
                  <option value="Plot">Plots Only</option>
                  <option value="Flat">Flats Only</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SUBTAB 1 & 2: ALL CUSTOMERS & SATISFIED CUSTOMERS TABLE */}
      {(subTab === 'all-bookings' || subTab === 'satisfied') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              {subTab === 'satisfied' ? 'Satisfied Customers (100% Fully Paid)' : 'All Registered Customer Bookings'}
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              Showing {filteredBookings.length} records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Booking Ref</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Property Unit</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Final Total (₹)</th>
                  <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                  <th className="py-2.5 px-3 text-right">Remaining Balance (₹)</th>
                  <th className="py-2.5 px-3 text-center">Satisfaction Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((bkg) => {
                  const cust = db.customers.find((c) => c.id === bkg.customerId);
                  const prop = db.properties.find((p) => p.id === bkg.propertyId);
                  const isSatisfied = bkg.remainingBalance <= 0;

                  return (
                    <tr key={bkg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{bkg.bookingRef}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          {cust?.customerPhotoUrl ? (
                            <img
                              src={cust.customerPhotoUrl}
                              alt={bkg.customerName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {bkg.customerName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{bkg.customerName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{cust?.mobileNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800">{bkg.propertyNumber}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {prop ? `${prop.areaSqFt} Sq.Ft` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{bkg.projectName}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{formatDate(bkg.bookingDate)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(bkg.finalTotalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(bkg.amountReceived)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                        {formatCurrency(bkg.remainingBalance)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isSatisfied ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>100% Satisfied</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <span>Balance Due</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewCustomerDetail({ booking: bkg, property: prop })}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                            title="Inspect Customer Detail Form & Payment History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {prop && (
                            <button
                              onClick={() => handleOpenEdit(prop)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                              title="Edit Property Parameters"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {prop && prop.status === 'Booked' && (
                            <button
                              onClick={() => handleInitiateCancellation(prop)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                              title="Cancel Booking"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission('canDeleteOrReverse') && (
                            <button
                              onClick={() => setDeletingBooking(bkg)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                              title="Authorized Safe Delete Booking"
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

      {/* SUBTAB 3: PLOT & FLAT INVENTORY TABLE */}
      {subTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Unit / Number</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Area (Sq.Ft / Mtr)</th>
                  <th className="py-2.5 px-3 text-right">Rate / Sq.Ft</th>
                  <th className="py-2.5 px-3 text-right">Total Price</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Allocated Buyer</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map((prop) => {
                  const isBooked = prop.status === 'Booked';
                  const isAvailable = prop.status === 'Available';
                  const isReserved = prop.status === 'Reserved';
                  const isCancelled = prop.status === 'Cancelled';

                  return (
                    <tr key={prop.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{prop.number}</td>
                      <td className="py-3 px-3 text-slate-700">{prop.projectName}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {prop.propertyType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        <span>{prop.areaSqFt} Sq.Ft</span>
                        <span className="text-[10px] text-slate-400 block font-sans">({prop.areaSqMtr} Sq.Mtr)</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                        ₹{prop.ratePerSqFt}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(prop.totalPrice)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isBooked
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isReserved
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {prop.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-800">
                        {prop.customerName ? (
                          <div>
                            <p className="font-semibold">{prop.customerName}</p>
                            <p className="text-[10px] text-slate-400">Booked: {formatDate(prop.bookingDate)}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {prop.customerName && (
                            <button
                              onClick={() => {
                                const b = db.bookings.find((bk) => bk.propertyId === prop.id);
                                setViewCustomerDetail({ booking: b, property: prop });
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                              title="View Customer Form & Receipts"
                            >
                              <User className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPermission('canEdit') && (
                            <button
                              onClick={() => handleOpenEdit(prop)}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                              title="Edit Property"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isBooked && hasPermission('canDeleteOrReverse') && (
                            <button
                              onClick={() => handleInitiateCancellation(prop)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Initiate Cancellation"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isCancelled && !prop.cancellationApproved && hasPermission('canApprove') && (
                            <button
                              onClick={() => handleApproveCancellation(prop)}
                              className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                              title="Approve Cancellation & Make Available"
                            >
                              Approve Release
                            </button>
                          )}
                          {hasPermission('canDeleteOrReverse') && !isBooked && (
                            <button
                              onClick={() => setDeletingProperty(prop)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Property"
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

      {/* ATTRACTIVE CUSTOMER DETAIL FORM MODAL */}
      {viewCustomerDetail && (() => {
        const { booking, property } = viewCustomerDetail;
        const custId = booking?.customerId || property?.customerId;
        const customer = db.customers.find((c) => c.id === custId);
        const propId = property?.id || booking?.propertyId;
        const receipts = db.customerReceipts.filter((r) => r.propertyId === propId || (booking && r.bookingId === booking.id));
        const totalCost = booking?.finalTotalAmount || property?.totalPrice || 0;
        const totalPaid = receipts.reduce((s, r) => s + r.amount, 0);
        const totalBal = Math.max(0, totalCost - totalPaid);
        const isSatisfied = totalBal <= 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {customer?.customerPhotoUrl ? (
                    <img
                      src={customer.customerPhotoUrl}
                      alt={customer.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-indigo-400 shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {(customer?.name || booking?.customerName || property?.customerName || 'C').charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base">
                        {customer?.name || booking?.customerName || property?.customerName}
                      </h3>
                      {isSatisfied ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Satisfied Customer
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          Active Paying
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      Plot/Flat Allocation: {booking?.propertyNumber || property?.number} ({booking?.projectName || property?.projectName})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setViewCustomerDetail(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
                {/* Personal & Contact Grid */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Mobile: <strong className="font-mono text-slate-900">{customer?.mobileNumber || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Email: <strong className="text-slate-900">{customer?.email || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-start space-x-2 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Address: <strong className="text-slate-900">{customer?.address || 'N/A'}</strong></span>
                  </div>
                  <div>
                    <span>PAN: <strong className="font-mono text-slate-900">{customer?.panNumber || 'N/A'}</strong></span>
                  </div>
                  <div>
                    <span>Aadhaar: <strong className="font-mono text-slate-900">{customer?.aadhaarNumber || 'N/A'}</strong></span>
                  </div>
                </div>

                {/* Property & Pricing Specifications */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
                  <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center justify-between">
                    <span>Allocated Property Details</span>
                    <span className="font-mono text-indigo-700 font-bold">{booking?.propertyNumber || property?.number}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500">Project:</span>
                      <p className="font-semibold text-slate-900">{booking?.projectName || property?.projectName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Property Type:</span>
                      <p className="font-semibold text-slate-900">{booking?.propertyType || property?.propertyType}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Area (Sq.Ft):</span>
                      <p className="font-mono font-bold text-slate-900">{property?.areaSqFt || '-'} Sq.Ft</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Area (Sq.Mtr):</span>
                      <p className="font-mono font-bold text-slate-900">{property?.areaSqMtr || '-'} Sq.Mtr</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Total Deal Price</span>
                    <p className="font-mono font-extrabold text-slate-900 text-sm mt-0.5">{formatCurrency(totalCost)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Received</span>
                    <p className="font-mono font-extrabold text-emerald-800 text-sm mt-0.5">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-700 uppercase font-bold">Remaining Due</span>
                    <p className="font-mono font-extrabold text-amber-800 text-sm mt-0.5">{formatCurrency(totalBal)}</p>
                  </div>
                </div>

                {/* Payment History Receipts */}
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
                    <span>Payment History Receipts ({receipts.length})</span>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Statement</span>
                    </button>
                  </h4>
                  {receipts.length === 0 ? (
                    <p className="text-slate-400 italic">No payment receipts generated for this property yet.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase">
                          <tr>
                            <th className="p-2">Receipt #</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Mode</th>
                            <th className="p-2 text-right">Amount (₹)</th>
                            <th className="p-2 text-right">Bal (₹)</th>
                            <th className="p-2 text-center">Print</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {receipts.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-slate-900">{r.receiptNumber}</td>
                              <td className="p-2 font-sans text-slate-600">{formatDate(r.paymentDate)}</td>
                              <td className="p-2 font-sans">{r.paymentMode}</td>
                              <td className="p-2 text-right font-bold text-emerald-700">{formatCurrency(r.amount)}</td>
                              <td className="p-2 text-right text-rose-600">{formatCurrency(r.remainingBalance)}</td>
                              <td className="p-2 text-center font-sans">
                                <button
                                  onClick={() => setPrintedReceipt(r)}
                                  className="p-1 text-indigo-600 hover:text-indigo-800"
                                  title="Print Money Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setViewCustomerDetail(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs"
                >
                  Close Detail Form
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Property Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">
                {editingProperty ? 'Edit Property Details' : 'Add New Property'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project *</label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
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
                  <label className="block font-semibold text-slate-700 mb-1">Property Type</label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as PropertyType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Plot">Plot</option>
                    <option value="Flat">Flat</option>
                    <option value="Villa">Villa</option>
                    <option value="Farmhouse">Farmhouse</option>
                    <option value="Row House">Row House</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit / Plot Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Plot No. 101"
                    value={formData.number || ''}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area (Sq.Ft) *</label>
                  <input
                    type="number"
                    value={formData.areaSqFt || ''}
                    onChange={(e) => {
                      const sqFt = Number(e.target.value) || 0;
                      const sqMtr = Number((sqFt * 0.092903).toFixed(2));
                      const rate = formData.ratePerSqFt || 1600;
                      setFormData({
                        ...formData,
                        areaSqFt: sqFt,
                        areaSqMtr: sqMtr,
                        totalPrice: sqFt * rate,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate / Sq.Ft (₹) *</label>
                  <input
                    type="number"
                    value={formData.ratePerSqFt || ''}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const sqFt = formData.areaSqFt || 0;
                      setFormData({
                        ...formData,
                        ratePerSqFt: rate,
                        totalPrice: sqFt * rate,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Calculated Price (₹)</label>
                <input
                  type="text"
                  disabled
                  value={formatCurrency(formData.totalPrice || 0)}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Location Note</label>
                <input
                  type="text"
                  placeholder="e.g. Corner plot facing garden"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Request Modal */}
      {cancelModalProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-rose-900 text-white">
              <h3 className="font-semibold text-sm">Cancel Booking for {cancelModalProperty.number}</h3>
              <button onClick={() => setCancelModalProperty(null)} className="text-rose-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Are you sure you want to cancel the booking for customer <strong>{cancelModalProperty.customerName}</strong>?
              </p>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                Note: In accordance with audit rules, the property will remain in <strong>Cancelled</strong> state until an administrator approves and officially records the release.
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Loan rejection / Personal family settlement"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setCancelModalProperty(null)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={handleConfirmCancellation}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                >
                  Record Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAFE DELETE BOOKING MODAL */}
      {deletingBooking && (() => {
        const linkedReceipts = db.customerReceipts.filter((r) => r.bookingId === deletingBooking.id);
        const linkedSummary: string[] = [];
        if (linkedReceipts.length > 0) {
          const totalPaid = linkedReceipts.reduce((s, r) => s + r.amount, 0);
          linkedSummary.push(`${linkedReceipts.length} Official Receipt(s) amounting to ${formatCurrency(totalPaid)}`);
        }
        linkedSummary.push(`Property ${deletingBooking.propertyNumber} will be released back to 'Available' status`);

        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => setDeletingBooking(null)}
            title={`Delete Booking: ${deletingBooking.bookingRef}`}
            recordType="Customer Booking"
            recordIdentifier={`${deletingBooking.bookingRef} - ${deletingBooking.customerName} (${deletingBooking.propertyNumber})`}
            linkedRecords={linkedSummary}
            safeAlternativeText="Use the formal Cancellation workflow to keep full audit history."
            onSafeAlternative={() => {
              const prop = db.properties.find((p) => p.id === deletingBooking.propertyId);
              if (prop) handleInitiateCancellation(prop);
            }}
            onDownloadBackup={() => {
              const headers = ['Record Type', 'Ref', 'Customer', 'Project', 'Property', 'Total Amount', 'Received', 'Balance'];
              const rows = [
                ['BOOKING_RECORD', deletingBooking.bookingRef, deletingBooking.customerName, deletingBooking.projectName, deletingBooking.propertyNumber, deletingBooking.finalTotalAmount, deletingBooking.amountReceived, deletingBooking.remainingBalance],
                ...linkedReceipts.map((r) => ['LINKED_RECEIPT', r.receiptNumber, r.customerName, r.projectName, r.propertyNumber, r.amount, r.paymentMode, r.paymentDate]),
              ];
              exportToCSV(`Booking_Archive_${deletingBooking.bookingRef}`, headers, rows);
            }}
            onConfirm={() => {
              const currentDb = dbService.getDatabase();
              // Remove booking
              currentDb.bookings = currentDb.bookings.filter((b) => b.id !== deletingBooking.id);
              // Release property
              currentDb.properties = currentDb.properties.map((p) =>
                p.id === deletingBooking.propertyId
                  ? { ...p, status: 'Available' as PropertyStatus, customerId: undefined, customerName: undefined, bookingDate: undefined }
                  : p
              );
              dbService.saveDatabase(currentDb);
              dbService.logAudit(
                currentUser.name,
                'BOOKING_DELETED',
                'Customer Management',
                `Deleted booking ${deletingBooking.bookingRef} and released unit ${deletingBooking.propertyNumber} with verification code 7666257368`
              );
              setDeletingBooking(null);
            }}
          />
        );
      })()}

      {/* SAFE DELETE PROPERTY INVENTORY MODAL */}
      {deletingProperty && (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => setDeletingProperty(null)}
          title={`Delete Property: ${deletingProperty.number}`}
          recordType="Property Inventory"
          recordIdentifier={`${deletingProperty.number} (${deletingProperty.projectName})`}
          linkedRecords={[`Status: ${deletingProperty.status}`, `Area: ${deletingProperty.areaSqFt} Sq.Ft`]}
          onConfirm={() => {
            const currentDb = dbService.getDatabase();
            currentDb.properties = currentDb.properties.filter((p) => p.id !== deletingProperty.id);
            dbService.saveDatabase(currentDb);
            dbService.logAudit(
              currentUser.name,
              'PROPERTY_DELETED',
              'Customer Management',
              `Deleted property inventory ${deletingProperty.number} with verification code 7666257368`
            );
            setDeletingProperty(null);
          }}
        />
      )}

      {/* Official Receipt Printable Modal */}
      {printedReceipt && (
        <PrintReceiptModal
          receipt={printedReceipt}
          company={db.company}
          onClose={() => setPrintedReceipt(null)}
        />
      )}
    </div>
  );
};
