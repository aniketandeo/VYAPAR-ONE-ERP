export type UserRole = 'Administrator' | 'Accounts' | 'Site Manager' | 'Data Entry Operator' | 'Read-Only User';

export interface ModulePermission {
  dashboard: boolean;
  projects: boolean;
  customers: boolean;
  properties: boolean;
  materials: boolean;
  vendors: boolean;
  labour: boolean;
  advisers: boolean;
  accounts: boolean;
  reports: boolean;
  settings: boolean;
}

export interface UserPermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canDeleteOrReverse: boolean;
  canViewFinancials: boolean;
  canExportReports: boolean;
  canExport?: boolean;
  canViewReports?: boolean;
  canManageSettings: boolean;
  moduleAccess?: ModulePermission;
}

export interface EmployeeUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  mobile: string;
  email: string;
  active: boolean;
  permissions?: UserPermission;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  name?: string;
  companyAddress: string;
  address?: string;
  mobileNumber: string;
  contactPhone?: string;
  email: string;
  website?: string;
  tagline?: string;
  businessNature: string;
  legalType?: string;
  gstNumber: string;
  gstin?: string;
  panNumber?: string;
  reraNumber?: string;
  companyLogoUrl: string;
  logoUrl?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  bankBranch: string;
  upiId: string;
  receiptHeader: string;
  invoiceHeader: string;
  receiptFooterNote: string;
}

export interface CompanyProfile extends Partial<CompanySettings> {
  id: string;
  name?: string;
  companyName?: string;
  shortCode?: string;
  tagline?: string;
  legalType?: string;
  gstin?: string;
  reraNumber?: string;
  address?: string;
  companyAddress?: string;
  contactPhone?: string;
  mobileNumber?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  companyLogoUrl?: string;
  active?: boolean;
  isDefault?: boolean;
  bankAccounts?: Array<{
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
  }>;
}

export interface MasterSettingsData {
  projectTypes: string[];
  propertyTypes: string[];
  plotPositions: string[];
  defaultDevelopmentChargeRate: number; // default ₹100 per sq ft
  defaultDevChargeRate?: number;
  expenseCategories: string[];
  paymentModes: string[];
  labourCategories: string[];
  labourRoles?: string[];
}

export interface PlannedUnitRow {
  id: string;
  plotNumber: string;
  areaSqMtr: number;
  areaSqFt: number;
  position: string; // e.g. "Front", "Back", "Corner", "Road-Facing", "East-Facing"
  remarks: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  address: string;
  type: string;
  startDate: string;
  status: 'Active' | 'Upcoming' | 'Completed' | 'Inactive';
  totalUnits: number;
  notes: string;
  plannedUnits?: PlannedUnitRow[];
  createdAt: string;
  createdBy: string;
}

export type PropertyType = string; // Plot, Flat, Villa, Farmhouse, Row House, etc.
export type PropertyStatus = 'Available' | 'Booked' | 'Reserved' | 'Cancelled';

export interface Property {
  id: string;
  projectId: string;
  projectName: string;
  propertyType: PropertyType;
  number: string; // e.g. "Plot 101" or "Flat 302"
  areaSqMtr: number;
  areaSqFt: number;
  ratePerSqFt: number;
  totalPrice: number;
  basePrice?: number;
  negotiatedPrice?: number;
  position?: string; // Front, Back, Corner, etc.
  developmentCharges?: number;
  developmentChargeRate?: number;
  // Specific to Flats/Villas
  superBuiltUpArea?: number;
  carpetArea?: number;
  parkingArea?: number;
  status: PropertyStatus;
  customerId?: string;
  customerName?: string;
  bookingDate?: string;
  remarks?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancellationApproved?: boolean;
}

export interface ExtraChargeItem {
  id: string;
  name: string;
  amount: number;
}

export interface AdditionalCharges {
  electricalMeter: number;
  waterConnection: number;
  midcTransferOrder: number;
  otherCharges: number;
  developmentCharges?: number;
  customCharges?: ExtraChargeItem[];
  totalAdditional: number;
}

export interface ScheduledPaymentRow {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  paidDate?: string;
  status: 'Scheduled' | 'Paid' | 'Partially Paid' | 'Overdue';
  paymentMode?: string;
  referenceNumber?: string;
  receiptNumber?: string;
}

export interface EMIPlan {
  enabled: boolean;
  monthlyAmount: number;
  durationMonths: number;
  numberOfMonths?: number;
  dueDayOfMonth: number;
}

export type CommissionCalculationType = 'Lump Sum' | 'Per Sq. Feet' | 'Percentage' | 'Fixed Amount';

export interface CommissionRule {
  type: CommissionCalculationType;
  rate: number; // lump sum amount, per sq. ft rate, or %
  totalCommission: number;
}

export interface Booking {
  id: string;
  bookingRef: string; // e.g. "VYO-BKG-2026-001"
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  propertyType: PropertyType;
  propertyId: string;
  propertyNumber: string;
  bookingDate: string;
  
  propertyPrice: number; // Base or negotiated price
  basePropertyPrice?: number;
  negotiatedPrice?: number;
  developmentCharges?: number;
  additionalCharges: AdditionalCharges;
  finalTotalAmount: number;
  
  firstPayment?: number; // Replaces Token Amount
  tokenAmount: number; // Retained for backward-compatibility
  downPayment: number; // Retained for backward-compatibility
  amountReceived: number;
  remainingBalance: number;
  
  paymentMode: 'Cash' | 'Cheque' | 'UPI' | 'RTGS' | 'NEFT' | 'Bank Transfer';
  paymentDate: string;
  
  paymentSchedule?: ScheduledPaymentRow[];
  emiPlan?: EMIPlan;
  
  adviserId?: string;
  adviserName?: string;
  commissionRule: CommissionRule;
  
  status: 'Booked' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
  mobileNumber: string;
  whatsappNumber: string;
  email: string;
  customerPhotoUrl?: string;
  createdAt: string;
}

export interface CustomerPaymentReceipt {
  id: string;
  receiptNumber: string; // e.g. "VYO-RCP-2026-001"
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  propertyId: string;
  propertyNumber: string;
  bookingId: string;
  bookingRef: string;
  paymentDate: string;
  amount: number;
  paymentMode: 'Cash' | 'Cheque' | 'UPI' | 'RTGS' | 'NEFT' | 'Bank Transfer' | string;
  referenceNumber?: string;
  transactionRef?: string;
  receivingAccount: string;
  previousBalance?: number;
  remainingBalance: number;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export type CustomerReceipt = CustomerPaymentReceipt;

export interface MaterialItem {
  id: string;
  name: string;
  unit: string; // "Feet" strictly for aggregates, or "Bags", "Tonnes", "Pieces", etc.
  isAggregateFeet: boolean; // Reti, Gitti, Murum, Churi, Crush Sand
  currentStock: number;
  openingStock: number;
}

export interface MaterialPurchaseItem {
  materialName: string;
  quantity: number;
  unit: string; // e.g. "Feet" or "Bags"
  ratePerUnit: number;
  basicAmount: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
}

export interface MaterialPurchaseBill {
  id: string;
  billNumber: string;
  billDate: string;
  projectId: string;
  projectName: string;
  vendorId: string;
  vendorName: string;
  isGstBill?: boolean; // Classification for GST vs Non-GST bill
  items: MaterialPurchaseItem[];
  basicAmount: number;
  gstAmount: number;
  billTotal: number;
  amountPaid: number;
  outstandingAmount: number;
  paymentDueDate: string;
  paymentMode: string;
  billAttachmentUrl?: string;
  billAttachmentName?: string;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export interface MaterialReceiptRecord {
  id: string;
  purchaseBillId?: string;
  billNumber?: string;
  projectId: string;
  projectName: string;
  vendorId: string;
  vendorName: string;
  materialName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
  receiptDate: string;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export interface MaterialUsageRecord {
  id: string;
  projectId: string;
  projectName: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
  usageDate: string;
  workLocation: string; // Site location / building floor / road
  workDescription: string;
  approvedBy: string;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export interface Vendor {
  id: string;
  name: string;
  businessName: string;
  contactPerson: string;
  mobileNumber: string;
  address: string;
  gstNumber: string;
  email: string;
  vendorType?: string; // Material Supplier, Contractor, Transporter, etc.
  openingBalance: number;
  currentOutstanding: number;
  status?: 'Active' | 'Inactive';
  remarks: string;
  createdAt: string;
}

export interface VendorPayment {
  id: string;
  voucherNumber: string;
  vendorId: string;
  vendorName: string;
  billId?: string;
  billNumber?: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  bankAccount: string;
  transactionRef: string;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export type LabourType = string;
export type WageBasis = 'Daily Rate' | 'Monthly Salary';
export type PaymentFrequency = 'Weekly' | 'Every 15 Days' | 'Monthly';

export interface Labour {
  id: string;
  name: string;
  mobileNumber: string;
  address: string;
  labourType: LabourType;
  projectId: string;
  projectName: string;
  joiningDate: string;
  wageBasis: WageBasis;
  paymentFrequency?: PaymentFrequency;
  dailyRateOrSalary: number;
  overtimeRate: number; // per hour
  active: boolean;
  remarks: string;
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'Leave' | 'Weekly Off' | 'Holiday' | 'Full Day';

export interface LabourAttendanceRecord {
  id: string;
  labourId: string;
  labourName: string;
  projectId: string;
  projectName: string;
  date: string;
  status: AttendanceStatus;
  payableUnits?: number; // 1.0 for Present/Holiday, 0.5 for Half Day, 0 for Absent/Leave/Weekly Off
  overtimeHours: number;
  wageCalculated: number;
  remarks: string;
  recordedBy?: string;
  lastUpdated?: string;
}

export interface AttendanceCorrection {
  id: string;
  attendanceId: string;
  labourId: string;
  labourName: string;
  projectId: string;
  projectName: string;
  date: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  previousWage: number;
  newWage: number;
  correctedBy: string;
  reason: string;
  timestamp: string;
}

export interface LabourPaymentRecord {
  id: string;
  voucherNumber: string;
  labourId: string;
  labourName: string;
  projectId: string;
  projectName: string;
  date: string;
  type: 'Advance' | 'Wage Payment' | 'Overtime Payment';
  amount: number;
  paymentMode: string;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export interface Adviser {
  id: string;
  name: string;
  mobileNumber: string;
  address: string;
  email: string;
  photoUrl?: string;
  commissionType: CommissionCalculationType;
  commissionRate: number; // lump sum amount or per sq. ft or %
  commissionBasis: string;
  projectId?: string;
  remarks: string;
  createdAt: string;
}

export interface AdviserCommission {
  id: string;
  adviserId: string;
  adviserName: string;
  bookingId: string;
  bookingRef: string;
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  propertyNumber: string;
  propertyValue: number;
  commissionType: string;
  commissionRate: number;
  eligibleCommission: number;
  paidCommission: number;
  outstandingCommission: number;
  createdAt: string;
}

export interface AdviserPayment {
  id: string;
  voucherNumber: string;
  adviserId: string;
  adviserName: string;
  bookingId?: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  transactionRef: string;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export interface ExpenseRecord {
  id: string;
  voucherNumber: string;
  expenseDate: string;
  projectId: string;
  projectName: string;
  category: string;
  description: string;
  vendorOrPaidTo: string;
  billNumber: string;
  amountBeforeGst: number;
  gstAmount: number;
  totalAmount: number;
  paymentMode: string;
  account: string;
  amountPaid: number;
  outstandingAmount: number;
  dueDate?: string;
  billAttachmentUrl?: string;
  billAttachmentName?: string;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export type FinancialTxnType =
  | 'CUSTOMER_RECEIPT'
  | 'VENDOR_PAYMENT'
  | 'LABOUR_PAYMENT'
  | 'LABOUR_ADVANCE'
  | 'ADVISER_COMMISSION'
  | 'EXPENSE'
  | 'OTHER_INCOME'
  | 'CONTRA_TRANSFER'
  | 'REFUND_PAYMENT';

export interface FinancialTransaction {
  id: string;
  voucherNumber: string;
  txnDate: string;
  type: FinancialTxnType;
  category: string;
  description: string;
  entityType: 'CUSTOMER' | 'VENDOR' | 'LABOUR' | 'ADVISER' | 'EXPENSE' | 'BANK' | 'GENERAL';
  entityId?: string;
  entityName: string;
  projectId?: string;
  projectName?: string;
  debit: number;
  credit: number;
  account: string;
  paymentMode: string;
  refNumber: string;
  attachmentUrl?: string;
  isReversed?: boolean;
  reverseReason?: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userName?: string;
  action: string;
  module: string;
  details: string;
}
