import React, { useState, useEffect } from 'react';
import { DatabaseState, dbService } from '../../services/storage';
import {
  Customer,
  Property,
  Booking,
  CustomerPaymentReceipt,
  Adviser,
  FinancialTransaction,
  AdviserCommission,
  ScheduledPaymentRow,
  ExtraChargeItem,
  CommissionCalculationType,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  generateBookingRef,
  generateReceiptNumber,
  exportToCSV,
} from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { InlineAddModal, InlineAddType } from '../common/InlineAddModal';
import { PrintReceiptModal } from '../common/PrintReceiptModal';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';
import {
  UserPlus,
  Plus,
  Printer,
  Save,
  RotateCcw,
  Search,
  Eye,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  User,
  Home,
  Receipt,
  FileCheck,
  Calendar,
  Layers,
  Award,
  Wallet,
  X,
  Check,
  Camera,
  Trash2,
  FileSpreadsheet,
  Clock,
  DollarSign,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Download,
} from 'lucide-react';

interface CustomerEntryViewProps {
  db: DatabaseState;
}

export const CustomerEntryView: React.FC<CustomerEntryViewProps> = ({ db }) => {
  const { currentUser, hasPermission } = useAuth();

  // Mode: 'form' or 'list'
  const [activeSubView, setActiveSubView] = useState<'form' | 'list'>('form');
  const [searchTerm, setSearchTerm] = useState('');

  // Customer Directory View / Edit / Delete states
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Inline Add Modal State
  const [inlineModalType, setInlineModalType] = useState<InlineAddType | null>(null);

  // Print Receipt Modal
  const [printedReceipt, setPrintedReceipt] = useState<CustomerPaymentReceipt | null>(null);

  // Customer Form State
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAadhaar, setCustomerAadhaar] = useState<string>('');
  const [customerPan, setCustomerPan] = useState<string>('');
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string>('');

  // Property & Project Details
  const masterPropertyTypes = db.masterSettings?.propertyTypes || [
    'Plot',
    'Flat',
    'Villa',
    'Farmhouse',
    'Row House',
    'Commercial Shop',
    'Office Space',
  ];

  const defaultDevRate = db.masterSettings?.defaultDevelopmentChargeRate || 100;

  const [projectId, setProjectId] = useState<string>(db.projects[0]?.id || '');
  const [propertyType, setPropertyType] = useState<string>('Plot');
  const [propertyId, setPropertyId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Plots & Units Dimensions
  const [plotNumber, setPlotNumber] = useState<string>('');
  const [areaSqFt, setAreaSqFt] = useState<number>(1200);
  const [areaSqMtr, setAreaSqMtr] = useState<number>(111.48);
  const [ratePerSqFt, setRatePerSqFt] = useState<number>(1600);
  const [basePropertyPrice, setBasePropertyPrice] = useState<number>(1920000);
  const [isNegotiated, setIsNegotiated] = useState<boolean>(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(1920000);

  // Development Charges (Default: Area Sq.Ft * ₹100)
  const [devChargeRate, setDevChargeRate] = useState<number>(defaultDevRate);
  const [developmentCharges, setDevelopmentCharges] = useState<number>(1200 * defaultDevRate);

  // Flats/Villas specific fields
  const [flatNumber, setFlatNumber] = useState<string>('');
  const [superBuiltUpArea, setSuperBuiltUpArea] = useState<number>(1000);
  const [carpetArea, setCarpetArea] = useState<number>(760);
  const [parkingArea, setParkingArea] = useState<number>(120);

  // Additional Charges (for Flats/Villas or custom items)
  const [customCharges, setCustomCharges] = useState<ExtraChargeItem[]>([
    { id: 'chg-1', name: 'Electrical Meter Connection', amount: 25000 },
    { id: 'chg-2', name: 'Water & Drainage Connection', amount: 15000 },
  ]);

  // Booking First Payment (replaces Token Amount; no separate Down Payment in workflow)
  const [firstPayment, setFirstPayment] = useState<number>(100000);
  const [paymentMode, setPaymentMode] = useState<
    'Cash' | 'Cheque' | 'UPI' | 'RTGS' | 'NEFT' | 'Bank Transfer'
  >('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');
  const [receivingAccount, setReceivingAccount] = useState<string>('HDFC Bank Ltd');

  // EMI / Scheduled Payment Multi-row builder
  const [paymentSchedule, setPaymentSchedule] = useState<ScheduledPaymentRow[]>([
    {
      id: 'sch-1',
      description: 'First Installment / Plinth Level',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      amount: 250000,
      status: 'Scheduled',
    },
    {
      id: 'sch-2',
      description: 'Second Installment / Demarcation',
      dueDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      amount: 250000,
      status: 'Scheduled',
    },
  ]);

  // Adviser Commission Rules
  const [adviserId, setAdviserId] = useState<string>('');
  const [commissionType, setCommissionType] = useState<CommissionCalculationType>('Per Sq. Feet');
  const [commissionRate, setCommissionRate] = useState<number>(50); // e.g. ₹50 / sq. ft or lump sum amount

  // Messages & UI
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomerPhotoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-calculation of Property Price and Area Conversion ($1 m² = 10.7639 ft²$)
  const handleAreaSqMtrChange = (val: number) => {
    setAreaSqMtr(val);
    const calculatedFt = Math.round(val * 10.7639 * 100) / 100;
    setAreaSqFt(calculatedFt);
    const base = Math.round(calculatedFt * ratePerSqFt);
    setBasePropertyPrice(base);
    if (!isNegotiated) setNegotiatedPrice(base);
    setDevelopmentCharges(Math.round(calculatedFt * devChargeRate));
  };

  const handleAreaSqFtChange = (val: number) => {
    setAreaSqFt(val);
    const calculatedMtr = Math.round((val / 10.7639) * 100) / 100;
    setAreaSqMtr(calculatedMtr);
    const base = Math.round(val * ratePerSqFt);
    setBasePropertyPrice(base);
    if (!isNegotiated) setNegotiatedPrice(base);
    setDevelopmentCharges(Math.round(val * devChargeRate));
  };

  const handleRatePerSqFtChange = (val: number) => {
    setRatePerSqFt(val);
    const base = Math.round(areaSqFt * val);
    setBasePropertyPrice(base);
    if (!isNegotiated) setNegotiatedPrice(base);
  };

  const handleDevChargeRateChange = (val: number) => {
    setDevChargeRate(val);
    setDevelopmentCharges(Math.round(areaSqFt * val));
  };

  // Extra charge helpers for Flat / Villa
  const handleAddCustomCharge = () => {
    const newCharge: ExtraChargeItem = {
      id: `chg-${Date.now()}`,
      name: 'Additional Site Amenity Charge',
      amount: 10000,
    };
    setCustomCharges([...customCharges, newCharge]);
  };

  const handleUpdateCustomCharge = (id: string, field: 'name' | 'amount', value: any) => {
    setCustomCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: field === 'amount' ? Number(value) || 0 : value } : c))
    );
  };

  const handleRemoveCustomCharge = (id: string) => {
    setCustomCharges((prev) => prev.filter((c) => c.id !== id));
  };

  // Payment Schedule helpers
  const handleAddScheduleRow = () => {
    const nextIdx = paymentSchedule.length + 1;
    const newRow: ScheduledPaymentRow = {
      id: `sch-${Date.now()}-${nextIdx}`,
      description: `Installment ${nextIdx}`,
      dueDate: new Date(Date.now() + nextIdx * 30 * 86400000).toISOString().split('T')[0],
      amount: 100000,
      status: 'Scheduled',
    };
    setPaymentSchedule([...paymentSchedule, newRow]);
  };

  const handleUpdateScheduleRow = (id: string, field: keyof ScheduledPaymentRow, value: any) => {
    setPaymentSchedule((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: field === 'amount' ? Number(value) || 0 : value } : row))
    );
  };

  const handleRemoveScheduleRow = (id: string) => {
    setPaymentSchedule((prev) => prev.filter((r) => r.id !== id));
  };

  // Handle Project / Property Type change
  useEffect(() => {
    const availableProps = db.properties.filter(
      (p) => p.projectId === projectId && p.propertyType === propertyType && p.status === 'Available'
    );
    if (availableProps.length > 0) {
      applySelectedProperty(availableProps[0]);
    } else {
      setPropertyId('');
      if (propertyType === 'Plot') {
        setPlotNumber('');
      } else {
        setFlatNumber('');
      }
    }
  }, [projectId, propertyType]);

  // Sync selected property from inventory
  const applySelectedProperty = (prop: Property) => {
    setPropertyId(prop.id);
    setAreaSqFt(prop.areaSqFt);
    setAreaSqMtr(prop.areaSqMtr || Math.round((prop.areaSqFt / 10.7639) * 100) / 100);
    setRatePerSqFt(prop.ratePerSqFt || 1600);
    const base = prop.basePrice || prop.totalPrice || Math.round(prop.areaSqFt * (prop.ratePerSqFt || 1600));
    setBasePropertyPrice(base);
    setNegotiatedPrice(prop.negotiatedPrice || base);
    setIsNegotiated(Boolean(prop.negotiatedPrice && prop.negotiatedPrice !== base));

    const dev = prop.developmentCharges || Math.round(prop.areaSqFt * defaultDevRate);
    setDevelopmentCharges(dev);
    setDevChargeRate(prop.developmentChargeRate || defaultDevRate);

    if (prop.propertyType === 'Plot') {
      setPlotNumber(prop.number);
    } else {
      setFlatNumber(prop.number);
      setSuperBuiltUpArea(prop.superBuiltUpArea || prop.areaSqFt);
      setCarpetArea(prop.carpetArea || Number((prop.areaSqFt * 0.76).toFixed(0)));
      setParkingArea(prop.parkingArea || 120);
    }
  };

  // Customer dropdown select
  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const existing = db.customers.find((c) => c.id === id);
    if (existing) {
      setCustomerName(existing.name);
      setCustomerMobile(existing.mobileNumber);
      setCustomerWhatsapp(existing.whatsappNumber || existing.mobileNumber);
      setCustomerAddress(existing.address);
      setCustomerAadhaar(existing.aadhaarNumber);
      setCustomerPan(existing.panNumber);
      setCustomerEmail(existing.email);
      if (existing.customerPhotoUrl) setCustomerPhotoUrl(existing.customerPhotoUrl);
    }
  };

  // Effective Property Price (Negotiated or Base)
  const effectivePropertyPrice = isNegotiated ? Number(negotiatedPrice || 0) : basePropertyPrice;

  // Additional Charges Calculation
  const isPlot = propertyType === 'Plot';
  const totalAdditionalCharges = isPlot
    ? 0
    : customCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Final Total Selling Amount
  // For Plot: (Base or Negotiated Selling Price) + Development Charges
  // For Flats/Villas: (Base or Negotiated Price) + Custom Extra Charges
  const finalTotalAmount = isPlot
    ? effectivePropertyPrice + Number(developmentCharges || 0)
    : effectivePropertyPrice + totalAdditionalCharges;

  // Amount Received Now = First Payment
  const amountReceivedNow = Number(firstPayment || 0);
  const remainingBalance = Math.max(0, finalTotalAmount - amountReceivedNow);

  // Scheduled Total
  const scheduledTotal = paymentSchedule.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Adviser Commission calculation
  let totalCommission = 0;
  if (commissionType === 'Lump Sum' || commissionType === 'Fixed Amount') {
    totalCommission = Number(commissionRate || 0);
  } else if (commissionType === 'Per Sq. Feet') {
    totalCommission = Math.round(areaSqFt * Number(commissionRate || 0));
  } else if (commissionType === 'Percentage') {
    totalCommission = Math.round((effectivePropertyPrice * Number(commissionRate || 0)) / 100);
  }

  // Selected Property Status Check
  const selectedPropObject = db.properties.find((p) => p.id === propertyId);
  const isAlreadyBooked = selectedPropObject && selectedPropObject.status !== 'Available';

  // Clear Form
  const handleClearForm = () => {
    setCustomerId('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerMobile('');
    setCustomerWhatsapp('');
    setCustomerEmail('');
    setCustomerAadhaar('');
    setCustomerPan('');
    setCustomerPhotoUrl('');
    setFirstPayment(100000);
    setPaymentRefNumber('');
    setIsNegotiated(false);
    setFormNotes('');
    setStatusMessage(null);
  };

  // Save Booking Function (with optional print receipt)
  const handleSaveBooking = (andPrintReceipt = false) => {
    if (!hasPermission('canCreate')) {
      setStatusMessage({ text: 'Permission denied. You cannot create customer bookings.', isError: true });
      return;
    }

    if (!customerName.trim() || !customerMobile.trim()) {
      setStatusMessage({ text: 'Customer Name and Mobile Number are required.', isError: true });
      return;
    }

    if (!propertyId) {
      setStatusMessage({ text: 'Please select a Plot or Flat unit to book.', isError: true });
      return;
    }

    if (isAlreadyBooked) {
      setStatusMessage({
        text: `Unit "${selectedPropObject?.number}" is already marked as ${selectedPropObject?.status}! Booking denied.`,
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const currentDb = dbService.getDatabase();

      // 1. Get or Create Customer
      let effectiveCustId = customerId;
      if (!effectiveCustId) {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: customerName.trim(),
          address: customerAddress.trim(),
          aadhaarNumber: customerAadhaar.trim(),
          panNumber: customerPan.trim().toUpperCase(),
          mobileNumber: customerMobile.trim(),
          whatsappNumber: customerWhatsapp.trim() || customerMobile.trim(),
          email: customerEmail.trim(),
          customerPhotoUrl: customerPhotoUrl || undefined,
          createdAt: bookingDate,
        };
        currentDb.customers.push(newCust);
        effectiveCustId = newCust.id;
      } else if (customerPhotoUrl) {
        // Update photo on existing customer if changed
        const existingCust = currentDb.customers.find((c) => c.id === effectiveCustId);
        if (existingCust) existingCust.customerPhotoUrl = customerPhotoUrl;
      }

      // 2. Mark Property as Booked & Update Pricing
      const propIndex = currentDb.properties.findIndex((p) => p.id === propertyId);
      const propNumber = isPlot ? plotNumber : flatNumber;
      if (propIndex >= 0) {
        currentDb.properties[propIndex].status = 'Booked';
        currentDb.properties[propIndex].customerId = effectiveCustId;
        currentDb.properties[propIndex].customerName = customerName.trim();
        currentDb.properties[propIndex].bookingDate = bookingDate;
        currentDb.properties[propIndex].basePrice = basePropertyPrice;
        if (isNegotiated) currentDb.properties[propIndex].negotiatedPrice = negotiatedPrice;
        if (isPlot) {
          currentDb.properties[propIndex].developmentCharges = developmentCharges;
          currentDb.properties[propIndex].developmentChargeRate = devChargeRate;
        }
        currentDb.properties[propIndex].totalPrice = finalTotalAmount;
      }

      const project = currentDb.projects.find((p) => p.id === projectId);
      const bookingRef = generateBookingRef(currentDb.bookings.length);

      // 3. Create Booking Record
      const newBooking: Booking = {
        id: `bkg-${Date.now()}`,
        bookingRef,
        customerId: effectiveCustId,
        customerName: customerName.trim(),
        projectId,
        projectName: project ? project.name : 'VYAPAR ONE Project',
        propertyType,
        propertyId,
        propertyNumber: propNumber,
        bookingDate,

        propertyPrice: effectivePropertyPrice,
        basePropertyPrice: basePropertyPrice,
        negotiatedPrice: isNegotiated ? negotiatedPrice : undefined,
        developmentCharges: isPlot ? developmentCharges : undefined,
        additionalCharges: {
          electricalMeter: 0,
          waterConnection: 0,
          midcTransferOrder: 0,
          otherCharges: 0,
          customCharges: isPlot ? [] : customCharges,
          totalAdditional: totalAdditionalCharges,
        },
        finalTotalAmount,

        firstPayment: amountReceivedNow,
        tokenAmount: amountReceivedNow, // Backward-compat
        downPayment: 0, // Backward-compat
        amountReceived: amountReceivedNow,
        remainingBalance,

        paymentMode,
        paymentDate,
        paymentSchedule: paymentSchedule,

        adviserId: adviserId || undefined,
        adviserName: adviserId
          ? currentDb.advisers.find((a) => a.id === adviserId)?.name
          : undefined,
        commissionRule: {
          type: commissionType,
          rate: Number(commissionRate || 0),
          totalCommission,
        },
        status: 'Booked',
        notes: formNotes,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentUser.name,
      };

      currentDb.bookings.unshift(newBooking);

      // 4. Create Payment Receipt if First Payment > 0
      let createdReceipt: CustomerPaymentReceipt | null = null;
      if (amountReceivedNow > 0) {
        const receiptNo = generateReceiptNumber(currentDb.customerReceipts.length);
        createdReceipt = {
          id: `rcp-${Date.now()}`,
          receiptNumber: receiptNo,
          customerId: effectiveCustId,
          customerName: customerName.trim(),
          projectId,
          projectName: project ? project.name : 'VYAPAR ONE Project',
          propertyId,
          propertyNumber: propNumber,
          bookingId: newBooking.id,
          bookingRef,
          paymentDate,
          amount: amountReceivedNow,
          paymentMode,
          referenceNumber: paymentRefNumber || `REF-${Date.now().toString().slice(-6)}`,
          receivingAccount,
          previousBalance: finalTotalAmount,
          remainingBalance,
          remarks: `First Payment receipt for ${propNumber} (${project?.name || ''})`,
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: currentUser.name,
        };
        currentDb.customerReceipts.unshift(createdReceipt);

        // 5. Central Accounts Journal Entry
        const journalTxn: FinancialTransaction = {
          id: `txn-${Date.now()}`,
          voucherNumber: receiptNo,
          txnDate: paymentDate,
          type: 'CUSTOMER_RECEIPT',
          category: 'Property Booking Receipt',
          description: `First payment received for ${propNumber} (${customerName.trim()})`,
          entityType: 'CUSTOMER',
          entityId: effectiveCustId,
          entityName: customerName.trim(),
          projectId,
          projectName: project?.name,
          debit: 0,
          credit: amountReceivedNow,
          account: receivingAccount,
          paymentMode,
          refNumber: paymentRefNumber || receiptNo,
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: currentUser.name,
        };
        currentDb.transactions.unshift(journalTxn);
      }

      // 6. Record Adviser Commission record if attached
      if (adviserId && totalCommission > 0) {
        const adviserObj = currentDb.advisers.find((a) => a.id === adviserId);
        const newComm: AdviserCommission = {
          id: `advc-${Date.now()}`,
          adviserId,
          adviserName: adviserObj?.name || 'Adviser',
          bookingId: newBooking.id,
          bookingRef,
          customerId: effectiveCustId,
          customerName: customerName.trim(),
          projectId,
          projectName: project?.name || '',
          propertyNumber: propNumber,
          propertyValue: effectivePropertyPrice,
          commissionType: `${commissionType} (Rate: ${commissionRate})`,
          commissionRate: Number(commissionRate || 0),
          eligibleCommission: totalCommission,
          paidCommission: 0,
          outstandingCommission: totalCommission,
          createdAt: bookingDate,
        };
        currentDb.adviserCommissions.unshift(newComm);
      }

      // Save database atomically
      dbService.saveDatabase(currentDb);
      dbService.logAudit(
        currentUser.name,
        'CUSTOMER_BOOKING_RECORDED',
        'Customer Entry',
        `Booked ${propNumber} for ${customerName} (Ref: ${bookingRef}). First payment received: ₹${amountReceivedNow}`
      );

      setStatusMessage({
        text: `Success! Booking ${bookingRef} created successfully. Unit ${propNumber} marked as Booked.`,
        isError: false,
      });

      if (andPrintReceipt && createdReceipt) {
        setPrintedReceipt(createdReceipt);
      }

      // Reset form
      handleClearForm();
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error saving customer booking.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availablePropertiesForProject = db.properties.filter(
    (p) => p.projectId === projectId && p.propertyType === propertyType && p.status === 'Available'
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner and Subview Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <span>Customer Entry & Unit Booking</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Book plots or flats, upload customer photos, configure development charges, first payments, and payment schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView('form')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeSubView === 'form'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            New Booking Form
          </button>
          <button
            onClick={() => setActiveSubView('list')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeSubView === 'list'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Customer Directory ({db.customers.length})
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUBVIEW 1: NEW BOOKING ENTRY FORM */}
      {activeSubView === 'form' && (
        <div className="space-y-6">
          {/* SECTION 1: CUSTOMER PROFILE & PHOTO UPLOAD */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>1. Customer Personal Profile & Photo</span>
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Auto-fill existing:</span>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden"
                >
                  <option value="">-- Or Create New Buyer --</option>
                  {db.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Customer Photo Upload & Preview Box */}
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-2">
                {customerPhotoUrl ? (
                  <div className="relative group">
                    <img
                      src={customerPhotoUrl}
                      alt="Customer"
                      className="w-24 h-24 object-cover rounded-full border-2 border-indigo-600 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomerPhotoUrl('')}
                      className="absolute -top-1 -right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-xs"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 shadow-2xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{customerPhotoUrl ? 'Replace Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400">JPG, PNG or WebP</p>
                </div>
              </div>

              {/* Customer Details Inputs */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Vasantrao More"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digit mobile"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="WhatsApp contact"
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    placeholder="12 digit Aadhaar"
                    value={customerAadhaar}
                    onChange={(e) => setCustomerAadhaar(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    placeholder="10 digit PAN"
                    value={customerPan}
                    onChange={(e) => setCustomerPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="House/Plot, Society, City, PIN"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="buyer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PROPERTY SELECTION & DYNAMIC PRICING (PLOT VS FLAT) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-600" />
                <span>2. Property Specification & Dynamic Pricing</span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Booking Date:</span>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Project & Property Type Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Layout / Building *</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Property Type *</label>
                  <button
                    type="button"
                    onClick={() => setInlineModalType('propertyType')}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New</span>
                  </button>
                </div>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {masterPropertyTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Available Unit *</label>
                <select
                  value={propertyId}
                  onChange={(e) => {
                    const sel = db.properties.find((p) => p.id === e.target.value);
                    if (sel) applySelectedProperty(sel);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg font-semibold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden ${
                    availablePropertiesForProject.length === 0
                      ? 'border-rose-300 bg-rose-50/50 text-rose-700'
                      : 'border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="">
                    {availablePropertiesForProject.length === 0
                      ? 'No available units in this project'
                      : '-- Select Available Unit --'}
                  </option>
                  {availablePropertiesForProject.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number} - {p.areaSqFt} Sq.Ft (₹{p.ratePerSqFt}/sq.ft) {p.position ? `[${p.position}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DYNAMIC FORM FIELDS: WHEN PLOT */}
            {isPlot ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Plot Dimension & Development Charges Calculation</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Formula: 1 Sq.Mtr = 10.7639 Sq.Ft
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Plot Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Plot No. 12"
                      value={plotNumber}
                      onChange={(e) => setPlotNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Area (Sq. Mtr)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={areaSqMtr || ''}
                      onChange={(e) => handleAreaSqMtrChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Area (Sq. Ft) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={areaSqFt || ''}
                      onChange={(e) => handleAreaSqFtChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-indigo-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rate / Sq. Ft (₹)</label>
                    <input
                      type="number"
                      value={ratePerSqFt || ''}
                      onChange={(e) => handleRatePerSqFtChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Base Price & Negotiated Price */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Calculated Base Price (Area × Rate)
                    </span>
                    <p className="text-base font-mono font-bold text-slate-900 mt-1">
                      {formatCurrency(basePropertyPrice)}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-700">
                        Negotiated Price?
                      </span>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isNegotiated}
                          onChange={(e) => {
                            setIsNegotiated(e.target.checked);
                            if (!e.target.checked) setNegotiatedPrice(basePropertyPrice);
                          }}
                          className="rounded text-indigo-600 w-3.5 h-3.5"
                        />
                        <span className="ml-1 text-[11px] text-slate-600">Enable</span>
                      </label>
                    </div>
                    {isNegotiated ? (
                      <input
                        type="number"
                        value={negotiatedPrice}
                        onChange={(e) => setNegotiatedPrice(Number(e.target.value) || 0)}
                        placeholder="Negotiated Price"
                        className="w-full px-2 py-1 border border-indigo-300 rounded text-xs font-mono font-bold text-indigo-800"
                      />
                    ) : (
                      <p className="text-xs text-slate-500 italic mt-1">Original base price active</p>
                    )}
                  </div>

                  {/* Development Charges: Area in Sq.Ft * Rate (Default ₹100) */}
                  <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-900">
                        Development Charges
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-amber-700">₹/Sq.Ft:</span>
                        <input
                          type="number"
                          value={devChargeRate}
                          onChange={(e) => handleDevChargeRateChange(Number(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 bg-white border border-amber-300 rounded text-center text-xs font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-base font-mono font-bold text-amber-900 mt-1">
                      {formatCurrency(developmentCharges)}
                    </p>
                    <p className="text-[10px] text-amber-700">
                      = {areaSqFt} Sq.Ft × ₹{devChargeRate} / Sq.Ft
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                  <span className="font-bold text-indigo-950 text-xs">
                    Final Plot Selling Price (Base/Negotiated + Development Charges):
                  </span>
                  <span className="text-lg font-mono font-extrabold text-indigo-900">
                    {formatCurrency(finalTotalAmount)}
                  </span>
                </div>
              </div>
            ) : (
              /* DYNAMIC FORM FIELDS: WHEN FLAT / VILLA / FARMHOUSE */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-indigo-600" />
                  <span>Building / Villa Dimensions & Custom Connection Charges</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit / Flat Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flat 302"
                      value={flatNumber}
                      onChange={(e) => setFlatNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Super Built-up (Sq.Ft)</label>
                    <input
                      type="number"
                      value={superBuiltUpArea || ''}
                      onChange={(e) => setSuperBuiltUpArea(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Carpet Area (Sq.Ft)</label>
                    <input
                      type="number"
                      value={carpetArea || ''}
                      onChange={(e) => setCarpetArea(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Parking Area (Sq.Ft)</label>
                    <input
                      type="number"
                      value={parkingArea || ''}
                      onChange={(e) => setParkingArea(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* Custom Extra Charges for Flats/Villas */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-xs">
                      Connection & Amenity Charges (Electrical, Water, Legal):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomCharge}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Extra Charge Row</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {customCharges.map((chg) => (
                      <div key={chg.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={chg.name}
                          onChange={(e) => handleUpdateCustomCharge(chg.id, 'name', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          placeholder="Charge description"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-mono text-xs">₹</span>
                          <input
                            type="number"
                            value={chg.amount}
                            onChange={(e) => handleUpdateCustomCharge(chg.id, 'amount', e.target.value)}
                            className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomCharge(chg.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: FIRST PAYMENT (REPLACES TOKEN AMOUNT; NO SEPARATE DOWN PAYMENT) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>3. First Payment & Bank Account Deposit</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="block font-bold text-emerald-900 mb-1">
                  First Payment Received (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={firstPayment}
                  onChange={(e) => setFirstPayment(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono font-extrabold text-emerald-800 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-emerald-700 mt-1">
                  Replaces initial token / advance down payment
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="RTGS">RTGS</option>
                  <option value="Cash">Cash Account</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cheque / UTR / Txn Ref No.</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-991028 or UTR..."
                  value={paymentRefNumber}
                  onChange={(e) => setPaymentRefNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receiving Bank Account</label>
                <select
                  value={receivingAccount}
                  onChange={(e) => setReceivingAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="HDFC Bank Ltd">HDFC Bank Ltd (Main Current A/c)</option>
                  <option value="State Bank of India">State Bank of India (Project A/c)</option>
                  <option value="Cash Account">Office Cash Drawer</option>
                </select>
              </div>
            </div>

            {/* Financial Balance Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-900 text-white rounded-xl text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Final Total Amount</span>
                <p className="text-lg font-mono font-extrabold text-white mt-0.5">
                  {formatCurrency(finalTotalAmount)}
                </p>
              </div>
              <div>
                <span className="text-emerald-400 text-[10px] uppercase font-bold">First Payment Received</span>
                <p className="text-lg font-mono font-extrabold text-emerald-400 mt-0.5">
                  {formatCurrency(amountReceivedNow)}
                </p>
              </div>
              <div>
                <span className="text-amber-400 text-[10px] uppercase font-bold">Remaining Balance Due</span>
                <p className="text-lg font-mono font-extrabold text-amber-400 mt-0.5">
                  {formatCurrency(remainingBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: EMI / PAYMENT SCHEDULE BUILDER */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>4. Payment Schedule / EMI Milestones</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Create customized installment milestones against the remaining balance of {formatCurrency(remainingBalance)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddScheduleRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add New Pay</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Description / Milestone</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentSchedule.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'description', e.target.value)}
                          placeholder="Milestone description"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'dueDate', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'amount', e.target.value)}
                          className="w-32 px-2 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-right"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={row.status}
                          onChange={(e) => handleUpdateScheduleRow(row.id, 'status', e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold"
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="Paid">Paid</option>
                          <option value="Partially Paid">Partially Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveScheduleRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paymentSchedule.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                        No scheduled payment milestones added. Click &quot;+ Add New Pay&quot; to build schedule.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between text-xs font-medium">
                <span>
                  Total Scheduled Milestones:{' '}
                  <strong className="text-slate-900 font-mono">{formatCurrency(scheduledTotal)}</strong>
                </span>
                <span
                  className={
                    scheduledTotal > remainingBalance ? 'text-amber-700 font-bold' : 'text-slate-500'
                  }
                >
                  Unscheduled Balance: {formatCurrency(Math.max(0, remainingBalance - scheduledTotal))}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: ADVISER / BROKER COMMISSION */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>5. Real Estate Adviser Commission (Kept Separate from Property Price)</span>
              </h3>
              <button
                type="button"
                onClick={() => setInlineModalType('adviser')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Adviser</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attach Adviser / Channel Partner</label>
                <select
                  value={adviserId}
                  onChange={(e) => setAdviserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- No Adviser (Direct Booking) --</option>
                  {db.advisers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Calculation Rule *</label>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Per Sq. Feet">Per Sq. Feet (₹ / Sq.Ft)</option>
                  <option value="Lump Sum">Lump Sum (Fixed ₹ Amount)</option>
                  <option value="Percentage">Percentage of Property Price (%)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {commissionType === 'Per Sq. Feet' && 'Rate Per Sq. Ft (₹)'}
                  {commissionType === 'Lump Sum' && 'Lump Sum Commission (₹)'}
                  {commissionType === 'Percentage' && 'Commission Percentage (%)'}
                </label>
                <input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {adviserId && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-medium">
                  Eligible Adviser Commission Payable:
                </span>
                <span className="font-mono font-extrabold text-indigo-900 text-sm">
                  {formatCurrency(totalCommission)}
                </span>
              </div>
            )}
          </div>

          {/* SECTION 6: NOTES & FINAL ACTION BUTTONS */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-xs">Booking Remarks / Special Terms</label>
              <textarea
                rows={2}
                placeholder="Registration target date, stamp duty arrangements, customer requests"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClearForm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>

              <div className="w-full sm:w-auto flex items-center gap-3">
                {/* 1. Standard Save Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveBooking(false)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Booking</span>
                </button>

                {/* 2. Save and Print Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveBooking(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Save & Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: CUSTOMER DIRECTORY LIST */}
      {activeSubView === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers by name, mobile, pan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent w-full text-slate-800 placeholder-slate-400 focus:outline-hidden"
              />
            </div>

            <span className="text-slate-500 font-medium">
              Total Customers: <strong className="text-slate-900 font-mono">{db.customers.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Photo</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Mobile & WhatsApp</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Aadhaar / PAN</th>
                  <th className="py-2.5 px-3">Active Bookings</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.customers
                  .filter(
                    (c) =>
                      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      c.mobileNumber.includes(searchTerm) ||
                      c.panNumber.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((cust) => {
                    const custBookings = db.bookings.filter((b) => b.customerId === cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4">
                          {cust.customerPhotoUrl ? (
                            <img
                              src={cust.customerPhotoUrl}
                              alt={cust.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                              {cust.name.charAt(0)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{cust.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          <div>{cust.mobileNumber}</div>
                          {cust.whatsappNumber && cust.whatsappNumber !== cust.mobileNumber && (
                            <div className="text-[10px] text-slate-400">WA: {cust.whatsappNumber}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{cust.address}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px]">
                          <div>Aadhaar: {cust.aadhaarNumber || '-'}</div>
                          <div>PAN: {cust.panNumber || '-'}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {custBookings.length} Booked
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingCustomer(cust)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                              title="View Customer Profile & Bookings"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {hasPermission('canEdit') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCustomer(cust);
                                  setEditFormData({ ...cust });
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                title="Edit Customer Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                handleCustomerSelect(cust.id);
                                setActiveSubView('form');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                              title="New Booking for this Customer"
                            >
                              + Book
                            </button>
                            {hasPermission('canDeleteOrReverse') && (
                              <button
                                type="button"
                                onClick={() => setDeletingCustomer(cust)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                title="Delete Customer"
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

      {/* VIEW CUSTOMER MODAL */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {viewingCustomer.customerPhotoUrl ? (
                  <img
                    src={viewingCustomer.customerPhotoUrl}
                    alt={viewingCustomer.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {viewingCustomer.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base">{viewingCustomer.name}</h3>
                  <p className="text-xs text-slate-400">Customer Profile & Financial Ledger</p>
                </div>
              </div>
              <button
                onClick={() => setViewingCustomer(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Contact & KYC Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Mobile: <strong className="font-mono text-slate-900">{viewingCustomer.mobileNumber}</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Email: <strong className="text-slate-900">{viewingCustomer.email || 'N/A'}</strong></span>
                </div>
                <div className="flex items-start space-x-2 text-slate-700 sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Address: <strong className="text-slate-900">{viewingCustomer.address || 'N/A'}</strong></span>
                </div>
                <div className="text-slate-700">
                  <span>Aadhaar: <strong className="font-mono text-slate-900">{viewingCustomer.aadhaarNumber || 'N/A'}</strong></span>
                </div>
                <div className="text-slate-700">
                  <span>PAN: <strong className="font-mono text-slate-900">{viewingCustomer.panNumber || 'N/A'}</strong></span>
                </div>
              </div>

              {/* Booked Properties & Financial Breakdown */}
              {(() => {
                const cBookings = db.bookings.filter((b) => b.customerId === viewingCustomer.id);
                const cReceipts = db.customerReceipts.filter((r) => r.customerId === viewingCustomer.id);
                const totalCost = cBookings.reduce((s, b) => s + b.finalTotalAmount, 0);
                const totalPaid = cReceipts.reduce((s, r) => s + r.amount, 0);
                const totalBal = Math.max(0, totalCost - totalPaid);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Total Cost</span>
                        <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{formatCurrency(totalCost)}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Paid</span>
                        <p className="font-mono font-bold text-emerald-800 text-sm mt-0.5">{formatCurrency(totalPaid)}</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-amber-700 uppercase font-bold">Remaining Due</span>
                        <p className="font-mono font-bold text-amber-800 text-sm mt-0.5">{formatCurrency(totalBal)}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
                        <span>Booked Properties ({cBookings.length})</span>
                      </h4>
                      {cBookings.length === 0 ? (
                        <p className="text-slate-400 italic">No bookings recorded yet for this customer.</p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase">
                              <tr>
                                <th className="p-2">Booking Ref</th>
                                <th className="p-2">Project</th>
                                <th className="p-2">Property</th>
                                <th className="p-2 text-right">Total Price</th>
                                <th className="p-2 text-right">Received</th>
                                <th className="p-2 text-right">Balance</th>
                                <th className="p-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {cBookings.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50">
                                  <td className="p-2 font-bold text-indigo-700">{b.bookingRef}</td>
                                  <td className="p-2 font-sans">{b.projectName}</td>
                                  <td className="p-2 font-sans font-bold">{b.propertyNumber}</td>
                                  <td className="p-2 text-right font-bold">{formatCurrency(b.finalTotalAmount)}</td>
                                  <td className="p-2 text-right text-emerald-700">{formatCurrency(b.amountReceived)}</td>
                                  <td className="p-2 text-right text-amber-700">{formatCurrency(b.remainingBalance)}</td>
                                  <td className="p-2 text-center font-sans">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      b.remainingBalance <= 0
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {b.remainingBalance <= 0 ? 'Satisfied / Paid' : 'Active'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                        Payment Receipts History ({cReceipts.length})
                      </h4>
                      {cReceipts.length === 0 ? (
                        <p className="text-slate-400 italic">No payment receipts generated.</p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase">
                              <tr>
                                <th className="p-2">Receipt No</th>
                                <th className="p-2">Date</th>
                                <th className="p-2">Mode</th>
                                <th className="p-2 text-right">Amount</th>
                                <th className="p-2 text-center">Print</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {cReceipts.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                  <td className="p-2 font-bold text-slate-900">{r.receiptNumber}</td>
                                  <td className="p-2 font-sans text-slate-600">{formatDate(r.paymentDate)}</td>
                                  <td className="p-2 font-sans">{r.paymentMode}</td>
                                  <td className="p-2 text-right font-bold text-emerald-700">{formatCurrency(r.amount)}</td>
                                  <td className="p-2 text-center font-sans">
                                    <button
                                      type="button"
                                      onClick={() => setPrintedReceipt(r)}
                                      className="p-1 text-indigo-600 hover:text-indigo-800"
                                      title="Print Official Money Receipt"
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
                );
              })()}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Edit Customer Details</h3>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editFormData.name?.trim() || !editFormData.mobileNumber?.trim()) {
                  alert('Customer Name and Mobile Number are required.');
                  return;
                }
                const currentDb = dbService.getDatabase();
                currentDb.customers = currentDb.customers.map((c) =>
                  c.id === editingCustomer.id ? { ...c, ...editFormData } as Customer : c
                );
                // Also update customer name on bookings
                currentDb.bookings = currentDb.bookings.map((b) =>
                  b.customerId === editingCustomer.id ? { ...b, customerName: editFormData.name!.trim() } : b
                );
                // Also update customer receipts
                currentDb.customerReceipts = currentDb.customerReceipts.map((r) =>
                  r.customerId === editingCustomer.id ? { ...r, customerName: editFormData.name!.trim() } : r
                );
                // Also update properties
                currentDb.properties = currentDb.properties.map((p) =>
                  p.customerId === editingCustomer.id ? { ...p, customerName: editFormData.name!.trim() } : p
                );
                dbService.saveDatabase(currentDb);
                dbService.logAudit(
                  currentUser.name,
                  'CUSTOMER_UPDATED',
                  'Customer Directory',
                  `Updated customer details for ${editFormData.name}`
                );
                setEditingCustomer(null);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.mobileNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={editFormData.whatsappNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    value={editFormData.aadhaarNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, aadhaarNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={editFormData.panNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Photo</label>
                <div className="flex items-center space-x-3">
                  {editFormData.customerPhotoUrl && (
                    <img
                      src={editFormData.customerPhotoUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-full object-cover border border-slate-300"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setEditFormData({ ...editFormData, customerPhotoUrl: ev.target.result as string });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE CUSTOMER MODAL */}
      {deletingCustomer && (() => {
        const linkedBookings = db.bookings.filter((b) => b.customerId === deletingCustomer.id);
        const linkedReceipts = db.customerReceipts.filter((r) => r.customerId === deletingCustomer.id);
        const linkedSummary: string[] = [];
        if (linkedBookings.length > 0) {
          linkedSummary.push(`${linkedBookings.length} Active Booking(s): ${linkedBookings.map((b) => b.propertyNumber).join(', ')}`);
        }
        if (linkedReceipts.length > 0) {
          const totalPaid = linkedReceipts.reduce((s, r) => s + r.amount, 0);
          linkedSummary.push(`${linkedReceipts.length} Official Receipt(s) with total collections of ${formatCurrency(totalPaid)}`);
        }

        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => setDeletingCustomer(null)}
            title={`Delete Customer: ${deletingCustomer.name}`}
            recordType="Customer"
            recordIdentifier={`${deletingCustomer.name} (${deletingCustomer.mobileNumber})`}
            linkedRecords={linkedSummary}
            safeAlternativeText="Keep customer record for complete financial audit and payment continuity."
            onSafeAlternative={() => setDeletingCustomer(null)}
            onDownloadBackup={() => {
              const headers = ['Type', 'Customer Name', 'Mobile', 'Address', 'PAN', 'Aadhaar', 'Details'];
              const rows = [
                ['CUSTOMER_PROFILE', deletingCustomer.name, deletingCustomer.mobileNumber, deletingCustomer.address, deletingCustomer.panNumber, deletingCustomer.aadhaarNumber, ''],
                ...linkedBookings.map((b) => ['LINKED_BOOKING', b.customerName, b.propertyNumber, b.projectName, '', '', `Cost: ${b.finalTotalAmount}, Rec: ${b.amountReceived}`]),
                ...linkedReceipts.map((r) => ['LINKED_RECEIPT', r.customerName, r.receiptNumber, r.paymentMode, '', '', `Amount: ${r.amount}, Date: ${r.paymentDate}`]),
              ];
              exportToCSV(`Customer_Archive_${deletingCustomer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`, headers, rows);
            }}
            onConfirm={() => {
              const currentDb = dbService.getDatabase();
              currentDb.customers = currentDb.customers.filter((c) => c.id !== deletingCustomer.id);
              dbService.saveDatabase(currentDb);
              dbService.logAudit(
                currentUser.name,
                'CUSTOMER_DELETED',
                'Customer Directory',
                `Permanently deleted customer ${deletingCustomer.name} (${deletingCustomer.mobileNumber}) with verification code 7666257368`
              );
              setDeletingCustomer(null);
            }}
          />
        );
      })()}

      {/* Official Receipt Printable Modal */}
      {printedReceipt && (
        <PrintReceiptModal
          receipt={printedReceipt}
          company={db.company}
          onClose={() => setPrintedReceipt(null)}
        />
      )}

      {/* Inline Add Modal for Master Settings */}
      {inlineModalType && (
        <InlineAddModal
          type={inlineModalType}
          isOpen={true}
          onClose={() => setInlineModalType(null)}
          onSuccess={(id, label) => {
            if (inlineModalType === 'propertyType') {
              setPropertyType(label);
            } else if (inlineModalType === 'adviser') {
              setAdviserId(id);
            }
            setInlineModalType(null);
          }}
        />
      )}
    </div>
  );
};
