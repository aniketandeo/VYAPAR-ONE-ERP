import {
  Project,
  Property,
  Customer,
  Booking,
  CustomerPaymentReceipt,
  MaterialItem,
  MaterialPurchaseBill,
  MaterialReceiptRecord,
  MaterialUsageRecord,
  Vendor,
  VendorPayment,
  Labour,
  LabourAttendanceRecord,
  LabourPaymentRecord,
  Adviser,
  AdviserCommission,
  AdviserPayment,
  ExpenseRecord,
  FinancialTransaction,
  EmployeeUser,
  CompanySettings,
  AuditLog,
  MasterSettingsData,
  PlannedUnitRow,
  CompanyProfile,
  AttendanceCorrection,
} from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

export interface DatabaseState {
  company: CompanySettings;
  companies?: CompanyProfile[];
  activeCompanyId?: string;
  masterSettings: MasterSettingsData;
  users: EmployeeUser[];
  projects: Project[];
  properties: Property[];
  customers: Customer[];
  bookings: Booking[];
  customerReceipts: CustomerPaymentReceipt[];
  materials: MaterialItem[];
  materialPurchases: MaterialPurchaseBill[];
  materialReceipts: MaterialReceiptRecord[];
  materialUsages: MaterialUsageRecord[];
  vendors: Vendor[];
  vendorPayments: VendorPayment[];
  labours: Labour[];
  labourAttendance: LabourAttendanceRecord[];
  labourPayments: LabourPaymentRecord[];
  attendanceCorrections?: AttendanceCorrection[];
  advisers: Adviser[];
  adviserCommissions: AdviserCommission[];
  adviserPayments: AdviserPayment[];
  expenses: ExpenseRecord[];
  transactions: FinancialTransaction[];
  auditLogs: AuditLog[];
}

const STORAGE_KEY = 'vishwas_developer_erp_db_v2';

const initialCompany: CompanySettings = {
  companyName: 'Vishwas Developer',
  companyAddress: 'Office No. 402, Vishwas Landmark, Near City Center, Station Road, Nashik, Maharashtra - 422001',
  mobileNumber: '+91 98220 54321',
  email: 'contact@vishwasdeveloper.com',
  businessNature: 'Real Estate Developer, Land Promoter & Construction Contractor',
  gstNumber: '27AABCV1234F1Z8',
  companyLogoUrl: '',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200088992211',
  ifscCode: 'HDFC0001244',
  bankBranch: 'Main City Branch, Nashik',
  upiId: 'vishwasdev@okhdfcbank',
  receiptHeader: 'OFFICIAL MONEY RECEIPT',
  invoiceHeader: 'TAX INVOICE / VOUCHER',
  receiptFooterNote: 'Thank you for choosing Vishwas Developer. This is a computer generated valid receipt.',
};

export const initialMasterSettings: MasterSettingsData = {
  projectTypes: [
    'Plotted Layout',
    'Residential Building',
    'Commercial Complex',
    'Row House Scheme',
    'Farmhouse Villa Community',
    'Industrial Plots',
  ],
  propertyTypes: [
    'Plot',
    'Flat',
    'Villa',
    'Farmhouse',
    'Row House',
    'Commercial Shop',
    'Office Space',
  ],
  plotPositions: [
    'Front',
    'Back',
    'Corner',
    'Road-Facing',
    'Garden-Facing',
    'East-Facing',
    'North-Facing',
    'Main Entrance',
  ],
  defaultDevelopmentChargeRate: 100, // ₹100 per sq ft default
  expenseCategories: [
    'Material',
    'Labour',
    'Electricity',
    'Transport',
    'Legal & Approval',
    'Marketing',
    'Office Expense',
    'Site Maintenance',
    'Miscellaneous',
  ],
  paymentModes: ['Cash', 'Cheque', 'UPI', 'RTGS', 'NEFT', 'Bank Transfer'],
  labourCategories: [
    'Mason (Gavandi)',
    'Helper (Majdoor)',
    'Carpenter (Sutar)',
    'Steel Binder (Fitter)',
    'Electrician',
    'Plumber',
    'Painter',
    'Supervisor',
  ],
};

const initialUsers: EmployeeUser[] = [
  {
    id: 'u-1',
    name: 'Suresh Patil (Managing Director)',
    username: 'admin',
    password: 'password123',
    role: 'Administrator',
    mobile: '9822054321',
    email: 'admin@vishwasdeveloper.com',
    active: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'u-2',
    name: 'Ramesh Sharma (Chief Accountant)',
    username: 'accounts',
    password: 'password123',
    role: 'Accounts',
    mobile: '9822165432',
    email: 'accounts@vishwasdeveloper.com',
    active: true,
    createdAt: '2026-01-05',
  },
  {
    id: 'u-3',
    name: 'Sachin Jadhav (Head Site Engineer)',
    username: 'sitemanager',
    password: 'password123',
    role: 'Site Manager',
    mobile: '9822276543',
    email: 'site@vishwasdeveloper.com',
    active: true,
    createdAt: '2026-01-10',
  },
  {
    id: 'u-4',
    name: 'Pooja Kulkarni (Office Executive)',
    username: 'operator',
    password: 'password123',
    role: 'Data Entry Operator',
    mobile: '9822387654',
    email: 'pooja@vishwasdeveloper.com',
    active: true,
    createdAt: '2026-01-15',
  },
  {
    id: 'u-5',
    name: 'Auditor View (Guest/Auditor)',
    username: 'readonly',
    password: 'password123',
    role: 'Read-Only User',
    mobile: '9822498765',
    email: 'auditor@vishwasdeveloper.com',
    active: true,
    createdAt: '2026-02-01',
  },
];

const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Vishwas Green Meadows',
    code: 'VGM-01',
    address: 'Survey No. 84/2, Makhmalabad Road, Nashik',
    type: 'Plotted Layout',
    startDate: '2025-11-01',
    status: 'Active',
    totalUnits: 36,
    notes: 'Premium residential NA plots layout with 40ft internal roads and water drainage.',
    plannedUnits: [
      { id: 'pu-1', plotNumber: 'Plot No. 1', areaSqMtr: 139.35, areaSqFt: 1500, position: 'Corner', remarks: 'East-facing corner plot near entrance gate' },
      { id: 'pu-2', plotNumber: 'Plot No. 2', areaSqMtr: 111.48, areaSqFt: 1200, position: 'Road-Facing', remarks: 'Road-touch residential plot' },
      { id: 'pu-3', plotNumber: 'Plot No. 3', areaSqMtr: 111.48, areaSqFt: 1200, position: 'Front', remarks: 'Standard residential plot with water connection' },
      { id: 'pu-4', plotNumber: 'Plot No. 4', areaSqMtr: 185.80, areaSqFt: 2000, position: 'Garden-Facing', remarks: 'Large bungalow plot facing garden area' },
      { id: 'pu-5', plotNumber: 'Plot No. 5', areaSqMtr: 139.35, areaSqFt: 1500, position: 'East-Facing', remarks: 'Prime residential plot' },
    ],
    createdAt: '2025-11-01',
    createdBy: 'Suresh Patil',
  },
  {
    id: 'proj-2',
    name: 'Vishwas Heights Phase 1',
    code: 'VHP-02',
    address: 'Plot No. 12, Gangapur Road, Opp. IT Park, Nashik',
    type: 'Residential Building',
    startDate: '2026-01-15',
    status: 'Active',
    totalUnits: 24,
    notes: '2BHK & 3BHK luxurious residential apartments with stilt parking.',
    createdAt: '2026-01-15',
    createdBy: 'Suresh Patil',
  },
  {
    id: 'proj-3',
    name: 'Vishwas Commercial Hub',
    code: 'VCH-03',
    address: 'Mumbai-Agra Highway bypass junction, Nashik',
    type: 'Commercial Complex',
    startDate: '2026-03-01',
    status: 'Upcoming',
    totalUnits: 16,
    notes: 'Commercial showroom shops and corporate offices.',
    createdAt: '2026-03-01',
    createdBy: 'Suresh Patil',
  },
];

const initialProperties: Property[] = [
  // Vishwas Green Meadows Plots
  {
    id: 'prop-1',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyType: 'Plot',
    number: 'Plot No. 1',
    areaSqMtr: 139.35,
    areaSqFt: 1500,
    ratePerSqFt: 1600,
    totalPrice: 2400000,
    status: 'Booked',
    customerId: 'cust-1',
    customerName: 'Mahendra Rajesh Deshmukh',
    bookingDate: '2026-02-10',
    remarks: 'East-facing corner plot near entrance gate.',
  },
  {
    id: 'prop-2',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyType: 'Plot',
    number: 'Plot No. 2',
    areaSqMtr: 111.48,
    areaSqFt: 1200,
    ratePerSqFt: 1550,
    totalPrice: 1860000,
    status: 'Booked',
    customerId: 'cust-2',
    customerName: 'Sunita Anandrao Shinde',
    bookingDate: '2026-02-18',
    remarks: 'Road-touch residential plot.',
  },
  {
    id: 'prop-3',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyType: 'Plot',
    number: 'Plot No. 3',
    areaSqMtr: 111.48,
    areaSqFt: 1200,
    ratePerSqFt: 1550,
    totalPrice: 1860000,
    status: 'Available',
    remarks: 'Standard residential plot with water connection.',
  },
  {
    id: 'prop-4',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyType: 'Plot',
    number: 'Plot No. 4',
    areaSqMtr: 185.8,
    areaSqFt: 2000,
    ratePerSqFt: 1650,
    totalPrice: 3300000,
    status: 'Available',
    remarks: 'Large bungalow plot facing garden area.',
  },
  {
    id: 'prop-5',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyType: 'Plot',
    number: 'Plot No. 5',
    areaSqMtr: 139.35,
    areaSqFt: 1500,
    ratePerSqFt: 1600,
    totalPrice: 2400000,
    status: 'Reserved',
    remarks: 'Client discussion in progress with token hold.',
  },

  // Vishwas Heights Flats
  {
    id: 'prop-6',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    propertyType: 'Flat',
    number: 'Flat 101 (2BHK)',
    areaSqMtr: 92.9,
    areaSqFt: 1000,
    superBuiltUpArea: 1000,
    carpetArea: 760,
    parkingArea: 120,
    ratePerSqFt: 3800,
    totalPrice: 3800000,
    status: 'Booked',
    customerId: 'cust-3',
    customerName: 'Ganesh Vasantrao Kadam',
    bookingDate: '2026-03-05',
    remarks: 'First floor 2BHK with reserved car park.',
  },
  {
    id: 'prop-7',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    propertyType: 'Flat',
    number: 'Flat 102 (2BHK)',
    areaSqMtr: 92.9,
    areaSqFt: 1000,
    superBuiltUpArea: 1000,
    carpetArea: 760,
    parkingArea: 120,
    ratePerSqFt: 3800,
    totalPrice: 3800000,
    status: 'Available',
    remarks: 'Road-facing 2BHK flat.',
  },
  {
    id: 'prop-8',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    propertyType: 'Flat',
    number: 'Flat 201 (3BHK)',
    areaSqMtr: 130.06,
    areaSqFt: 1400,
    superBuiltUpArea: 1400,
    carpetArea: 1080,
    parkingArea: 150,
    ratePerSqFt: 4000,
    totalPrice: 5600000,
    status: 'Available',
    remarks: 'Spacious 3BHK with two balconies and covered parking.',
  },
];

const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Mahendra Rajesh Deshmukh',
    address: 'Flat 402, Shivneri Park, College Road, Nashik',
    aadhaarNumber: '4829 1928 3940',
    panNumber: 'ABCDE1234F',
    mobileNumber: '9822511223',
    whatsappNumber: '9822511223',
    email: 'mahendra.deshmukh@gmail.com',
    createdAt: '2026-02-10',
  },
  {
    id: 'cust-2',
    name: 'Sunita Anandrao Shinde',
    address: 'Row House No. 8, Samarth Nagar, Nashik',
    aadhaarNumber: '7362 9182 4621',
    panNumber: 'BRCPS9821L',
    mobileNumber: '9822622334',
    whatsappNumber: '9822622334',
    email: 'sunita.shinde@yahoo.com',
    createdAt: '2026-02-18',
  },
  {
    id: 'cust-3',
    name: 'Ganesh Vasantrao Kadam',
    address: 'B-303, Tulip Residency, Indira Nagar, Nashik',
    aadhaarNumber: '9182 7364 5519',
    panNumber: 'AFGPK4432K',
    mobileNumber: '9822733445',
    whatsappNumber: '9822733445',
    email: 'ganesh.kadam@outlook.com',
    createdAt: '2026-03-05',
  },
];

const initialBookings: Booking[] = [
  {
    id: 'bkg-1',
    bookingRef: 'VD-BKG-2026-001',
    customerId: 'cust-1',
    customerName: 'Mahendra Rajesh Deshmukh',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyType: 'Plot',
    propertyId: 'prop-1',
    propertyNumber: 'Plot No. 1',
    bookingDate: '2026-02-10',
    propertyPrice: 2400000,
    additionalCharges: {
      electricalMeter: 25000,
      waterConnection: 15000,
      midcTransferOrder: 20000,
      otherCharges: 10000,
      totalAdditional: 70000,
    },
    finalTotalAmount: 2470000,
    firstPayment: 600000,
    tokenAmount: 100000,
    downPayment: 500000,
    amountReceived: 600000,
    remainingBalance: 1870000,
    paymentMode: 'Bank Transfer',
    paymentDate: '2026-02-10',
    emiPlan: {
      enabled: true,
      monthlyAmount: 65000,
      durationMonths: 24,
      dueDayOfMonth: 10,
    },
    adviserId: 'adv-1',
    adviserName: 'Vijay Varma (Sai Properties)',
    commissionRule: {
      type: 'Percentage',
      rate: 2, // 2%
      totalCommission: 48000,
    },
    status: 'Booked',
    notes: 'Down payment paid via RTGS. Balance scheduled across 24 equal monthly installments.',
    createdAt: '2026-02-10',
    createdBy: 'Suresh Patil',
  },
  {
    id: 'bkg-2',
    bookingRef: 'VD-BKG-2026-002',
    customerId: 'cust-2',
    customerName: 'Sunita Anandrao Shinde',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyType: 'Plot',
    propertyId: 'prop-2',
    propertyNumber: 'Plot No. 2',
    bookingDate: '2026-02-18',
    propertyPrice: 1860000,
    additionalCharges: {
      electricalMeter: 25000,
      waterConnection: 15000,
      midcTransferOrder: 0,
      otherCharges: 5000,
      totalAdditional: 45000,
    },
    finalTotalAmount: 1905000,
    firstPayment: 400000,
    tokenAmount: 50000,
    downPayment: 350000,
    amountReceived: 400000,
    remainingBalance: 1505000,
    paymentMode: 'Cheque',
    paymentDate: '2026-02-18',
    emiPlan: {
      enabled: true,
      monthlyAmount: 50000,
      durationMonths: 30,
      dueDayOfMonth: 5,
    },
    adviserId: 'adv-2',
    adviserName: 'Sanjay More (Real Deal)',
    commissionRule: {
      type: 'Fixed Amount',
      rate: 35000,
      totalCommission: 35000,
    },
    status: 'Booked',
    notes: 'Token cash and down payment cheque cleared.',
    createdAt: '2026-02-18',
    createdBy: 'Ramesh Sharma',
  },
  {
    id: 'bkg-3',
    bookingRef: 'VD-BKG-2026-003',
    customerId: 'cust-3',
    customerName: 'Ganesh Vasantrao Kadam',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    propertyType: 'Flat',
    propertyId: 'prop-6',
    propertyNumber: 'Flat 101 (2BHK)',
    bookingDate: '2026-03-05',
    propertyPrice: 3800000,
    additionalCharges: {
      electricalMeter: 35000,
      waterConnection: 20000,
      midcTransferOrder: 0,
      otherCharges: 25000,
      totalAdditional: 80000,
    },
    finalTotalAmount: 3880000,
    firstPayment: 800000,
    tokenAmount: 100000,
    downPayment: 700000,
    amountReceived: 800000,
    remainingBalance: 3080000,
    paymentMode: 'RTGS',
    paymentDate: '2026-03-05',
    emiPlan: {
      enabled: false,
      monthlyAmount: 0,
      durationMonths: 0,
      dueDayOfMonth: 1,
    },
    commissionRule: {
      type: 'Percentage',
      rate: 0,
      totalCommission: 0,
    },
    status: 'Booked',
    notes: 'Bank loan sanctioned from SBI for remaining balance.',
    createdAt: '2026-03-05',
    createdBy: 'Suresh Patil',
  },
];

const initialReceipts: CustomerPaymentReceipt[] = [
  {
    id: 'rcp-1',
    receiptNumber: 'VD-RCP-2026-001',
    customerId: 'cust-1',
    customerName: 'Mahendra Rajesh Deshmukh',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyId: 'prop-1',
    propertyNumber: 'Plot No. 1',
    bookingId: 'bkg-1',
    bookingRef: 'VD-BKG-2026-001',
    paymentDate: '2026-02-10',
    amount: 600000,
    paymentMode: 'Bank Transfer',
    referenceNumber: 'HDFC-RTGS-882910',
    receivingAccount: 'HDFC Bank Ltd',
    previousBalance: 2470000,
    remainingBalance: 1870000,
    remarks: 'Booking token and down payment for Plot No. 1',
    createdAt: '2026-02-10',
    createdBy: 'Suresh Patil',
  },
  {
    id: 'rcp-2',
    receiptNumber: 'VD-RCP-2026-002',
    customerId: 'cust-2',
    customerName: 'Sunita Anandrao Shinde',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyId: 'prop-2',
    propertyNumber: 'Plot No. 2',
    bookingId: 'bkg-2',
    bookingRef: 'VD-BKG-2026-002',
    paymentDate: '2026-02-18',
    amount: 400000,
    paymentMode: 'Cheque',
    referenceNumber: 'CHQ-552819-ICICI',
    receivingAccount: 'HDFC Bank Ltd',
    previousBalance: 1905000,
    remainingBalance: 1505000,
    remarks: 'Token and initial down payment for Plot No. 2',
    createdAt: '2026-02-18',
    createdBy: 'Ramesh Sharma',
  },
  {
    id: 'rcp-3',
    receiptNumber: 'VD-RCP-2026-003',
    customerId: 'cust-3',
    customerName: 'Ganesh Vasantrao Kadam',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    propertyId: 'prop-6',
    propertyNumber: 'Flat 101 (2BHK)',
    bookingId: 'bkg-3',
    bookingRef: 'VD-BKG-2026-003',
    paymentDate: '2026-03-05',
    amount: 800000,
    paymentMode: 'RTGS',
    referenceNumber: 'SBI-RTGS-991028',
    receivingAccount: 'HDFC Bank Ltd',
    previousBalance: 3880000,
    remainingBalance: 3080000,
    remarks: 'Initial down payment for Flat 101',
    createdAt: '2026-03-05',
    createdBy: 'Suresh Patil',
  },
];

// MANDATORY UNIT SPECIFICATION:
// For Reti, Gitti, Murum, Churi, Crush Sand -> The quantity entry and display must use the user's specified Feet format.
// Show the quantity field as "Quantity (Feet)". Do not display Brass. Do not display CFT.
const initialMaterials: MaterialItem[] = [
  { id: 'mat-1', name: 'Reti (River Sand)', unit: 'Feet', isAggregateFeet: true, openingStock: 800, currentStock: 1200 },
  { id: 'mat-2', name: 'Gitti (Aggregate 20mm/10mm)', unit: 'Feet', isAggregateFeet: true, openingStock: 1000, currentStock: 1450 },
  { id: 'mat-3', name: 'Murum (Filling Material)', unit: 'Feet', isAggregateFeet: true, openingStock: 1500, currentStock: 2200 },
  { id: 'mat-4', name: 'Churi (Stone Dust)', unit: 'Feet', isAggregateFeet: true, openingStock: 600, currentStock: 780 },
  { id: 'mat-5', name: 'Crush Sand (Manufactured Sand)', unit: 'Feet', isAggregateFeet: true, openingStock: 900, currentStock: 1350 },
  { id: 'mat-6', name: 'Ultratech Cement (PPC 53)', unit: 'Bags', isAggregateFeet: false, openingStock: 400, currentStock: 280 },
  { id: 'mat-7', name: 'TMT Steel Bars (Fe 550D)', unit: 'Tonnes', isAggregateFeet: false, openingStock: 15, currentStock: 9.5 },
  { id: 'mat-8', name: 'Red Clay Bricks', unit: 'Pieces', isAggregateFeet: false, openingStock: 25000, currentStock: 18000 },
];

const initialVendors: Vendor[] = [
  {
    id: 'ven-1',
    name: 'Balaji Stone Crushers & Transporters',
    businessName: 'Balaji Stone Industries Pvt Ltd',
    contactPerson: 'Dnyaneshwar Borse',
    mobileNumber: '9850123456',
    address: 'Gat No. 120, Peth Road, Near Octroi Naka, Nashik',
    gstNumber: '27AAGCB5544E1ZT',
    email: 'balajistone@gmail.com',
    openingBalance: 45000,
    currentOutstanding: 125000,
    remarks: 'Primary supplier for Gitti, Churi, Murum & Crush Sand.',
    createdAt: '2026-01-05',
  },
  {
    id: 'ven-2',
    name: 'Godavari Natural Sand Suppliers',
    businessName: 'Godavari River Materials Traders',
    contactPerson: 'Kailas Patil',
    mobileNumber: '9850234567',
    address: 'Niphad Ghat Road, Nashik District',
    gstNumber: '27AAHPG9876K1ZS',
    email: 'godavarisand@gmail.com',
    openingBalance: 0,
    currentOutstanding: 68000,
    remarks: 'Approved supplier of clean River Sand (Reti).',
    createdAt: '2026-01-10',
  },
  {
    id: 'ven-3',
    name: 'Shree Sai Building Materials & Cement',
    businessName: 'Shree Sai Traders',
    contactPerson: 'Manoj Gupta',
    mobileNumber: '9850345678',
    address: 'Shop 4, Ambad MIDC Link Road, Nashik',
    gstNumber: '27AASPM3214C1ZV',
    email: 'shreesaicement@yahoo.com',
    openingBalance: 20000,
    currentOutstanding: 85000,
    remarks: 'Authorized dealer for Ultratech Cement and Jindal TMT.',
    createdAt: '2026-01-12',
  },
];

const initialMaterialPurchases: MaterialPurchaseBill[] = [
  {
    id: 'bill-1',
    billNumber: 'BAL-2026-88',
    billDate: '2026-02-12',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    vendorId: 'ven-1',
    vendorName: 'Balaji Stone Crushers & Transporters',
    isGstBill: true,
    items: [
      {
        materialName: 'Gitti (Aggregate 20mm/10mm)',
        quantity: 800,
        unit: 'Feet',
        ratePerUnit: 42,
        basicAmount: 33600,
        gstPercentage: 5,
        gstAmount: 1680,
        totalAmount: 35280,
      },
      {
        materialName: 'Murum (Filling Material)',
        quantity: 1200,
        unit: 'Feet',
        ratePerUnit: 25,
        basicAmount: 30000,
        gstPercentage: 5,
        gstAmount: 1500,
        totalAmount: 31500,
      },
    ],
    basicAmount: 63600,
    gstAmount: 3180,
    billTotal: 66780,
    amountPaid: 35000,
    outstandingAmount: 31780,
    paymentDueDate: '2026-03-12',
    paymentMode: 'Cheque',
    remarks: 'Road leveling and internal layout metalling material.',
    createdAt: '2026-02-12',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'bill-2',
    billNumber: 'GOD-2026-14',
    billDate: '2026-02-20',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    vendorId: 'ven-2',
    vendorName: 'Godavari Natural Sand Suppliers',
    isGstBill: true,
    items: [
      {
        materialName: 'Reti (River Sand)',
        quantity: 650,
        unit: 'Feet',
        ratePerUnit: 75,
        basicAmount: 48750,
        gstPercentage: 5,
        gstAmount: 2437.5,
        totalAmount: 51187.5,
      },
    ],
    basicAmount: 48750,
    gstAmount: 2437.5,
    billTotal: 51187.5,
    amountPaid: 25000,
    outstandingAmount: 26187.5,
    paymentDueDate: '2026-03-20',
    paymentMode: 'Bank Transfer',
    remarks: 'Sand for first floor slab casting.',
    createdAt: '2026-02-20',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'bill-3',
    billNumber: 'SAI-2026-302',
    billDate: '2026-02-25',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    vendorId: 'ven-3',
    vendorName: 'Shree Sai Building Materials & Cement',
    isGstBill: true,
    items: [
      {
        materialName: 'Ultratech Cement (PPC 53)',
        quantity: 200,
        unit: 'Bags',
        ratePerUnit: 360,
        basicAmount: 72000,
        gstPercentage: 18,
        gstAmount: 12960,
        totalAmount: 84960,
      },
      {
        materialName: 'TMT Steel Bars (Fe 550D)',
        quantity: 4,
        unit: 'Tonnes',
        ratePerUnit: 58000,
        basicAmount: 232000,
        gstPercentage: 18,
        gstAmount: 41760,
        totalAmount: 273760,
      },
    ],
    basicAmount: 304000,
    gstAmount: 54720,
    billTotal: 358720,
    amountPaid: 200000,
    outstandingAmount: 158720,
    paymentDueDate: '2026-03-25',
    paymentMode: 'RTGS',
    remarks: 'Cement and reinforcement steel delivered at site.',
    createdAt: '2026-02-25',
    createdBy: 'Sachin Jadhav',
  },
];

const initialMaterialReceipts: MaterialReceiptRecord[] = [
  {
    id: 'mr-1',
    purchaseBillId: 'bill-1',
    billNumber: 'BAL-2026-88',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    vendorId: 'ven-1',
    vendorName: 'Balaji Stone Crushers & Transporters',
    materialName: 'Gitti (Aggregate 20mm/10mm)',
    orderedQuantity: 800,
    receivedQuantity: 800,
    unit: 'Feet',
    receiptDate: '2026-02-13',
    remarks: 'Received and verified on site. Quantity measured 800 Feet in dumper truck.',
    createdAt: '2026-02-13',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'mr-2',
    purchaseBillId: 'bill-1',
    billNumber: 'BAL-2026-88',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    vendorId: 'ven-1',
    vendorName: 'Balaji Stone Crushers & Transporters',
    materialName: 'Murum (Filling Material)',
    orderedQuantity: 1200,
    receivedQuantity: 1200,
    unit: 'Feet',
    receiptDate: '2026-02-14',
    remarks: 'Received 1200 Feet Murum for road compaction.',
    createdAt: '2026-02-14',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'mr-3',
    purchaseBillId: 'bill-2',
    billNumber: 'GOD-2026-14',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    vendorId: 'ven-2',
    vendorName: 'Godavari Natural Sand Suppliers',
    materialName: 'Reti (River Sand)',
    orderedQuantity: 650,
    receivedQuantity: 650,
    unit: 'Feet',
    receiptDate: '2026-02-21',
    remarks: 'Measured in Feet, high quality river sand received.',
    createdAt: '2026-02-21',
    createdBy: 'Sachin Jadhav',
  },
];

const initialMaterialUsages: MaterialUsageRecord[] = [
  {
    id: 'mu-1',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    materialName: 'Murum (Filling Material)',
    quantityUsed: 500,
    unit: 'Feet',
    usageDate: '2026-02-24',
    workLocation: 'North-East 40ft Main Road',
    workDescription: 'Road leveling, layering and roller rolling',
    approvedBy: 'Sachin Jadhav (Site Engineer)',
    remarks: 'First layer finished with water spraying.',
    createdAt: '2026-02-24',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'mu-2',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    materialName: 'Gitti (Aggregate 20mm/10mm)',
    quantityUsed: 350,
    unit: 'Feet',
    usageDate: '2026-02-26',
    workLocation: 'Compound wall foundation & drainage bed',
    workDescription: 'PCC footing casting for boundary demarcations',
    approvedBy: 'Sachin Jadhav (Site Engineer)',
    remarks: 'Approved by structural supervisor.',
    createdAt: '2026-02-26',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'mu-3',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    materialName: 'Ultratech Cement (PPC 53)',
    quantityUsed: 120,
    unit: 'Bags',
    usageDate: '2026-03-01',
    workLocation: 'Stilt Parking Columns and Plinth Beam',
    workDescription: 'Concrete casting of 16 columns',
    approvedBy: 'Sachin Jadhav (Site Engineer)',
    remarks: 'Batching plant concrete mix.',
    createdAt: '2026-03-01',
    createdBy: 'Sachin Jadhav',
  },
];

const initialVendorPayments: VendorPayment[] = [
  {
    id: 'vp-1',
    voucherNumber: 'VD-VP-2026-001',
    vendorId: 'ven-1',
    vendorName: 'Balaji Stone Crushers & Transporters',
    billId: 'bill-1',
    billNumber: 'BAL-2026-88',
    paymentDate: '2026-02-15',
    amount: 35000,
    paymentMode: 'Cheque',
    bankAccount: 'HDFC Bank Ltd',
    transactionRef: 'CHQ-772190',
    remarks: 'Part payment against bill BAL-2026-88',
    createdAt: '2026-02-15',
    createdBy: 'Ramesh Sharma',
  },
  {
    id: 'vp-2',
    voucherNumber: 'VD-VP-2026-002',
    vendorId: 'ven-2',
    vendorName: 'Godavari Natural Sand Suppliers',
    billId: 'bill-2',
    billNumber: 'GOD-2026-14',
    paymentDate: '2026-02-22',
    amount: 25000,
    paymentMode: 'Bank Transfer',
    bankAccount: 'HDFC Bank Ltd',
    transactionRef: 'IMPS-99210291',
    remarks: 'Advance against sand delivery',
    createdAt: '2026-02-22',
    createdBy: 'Ramesh Sharma',
  },
  {
    id: 'vp-3',
    voucherNumber: 'VD-VP-2026-003',
    vendorId: 'ven-3',
    vendorName: 'Shree Sai Building Materials & Cement',
    billId: 'bill-3',
    billNumber: 'SAI-2026-302',
    paymentDate: '2026-02-28',
    amount: 200000,
    paymentMode: 'RTGS',
    bankAccount: 'HDFC Bank Ltd',
    transactionRef: 'RTGS-HDFC-102948',
    remarks: 'Steel and cement advance part payment',
    createdAt: '2026-02-28',
    createdBy: 'Ramesh Sharma',
  },
];

const initialLabours: Labour[] = [
  {
    id: 'lab-1',
    name: 'Baburao Ramchandra Shinde',
    mobileNumber: '9890123456',
    address: 'Shramik Nagar, Satpur, Nashik',
    labourType: 'Mason',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    joiningDate: '2026-01-10',
    wageBasis: 'Daily Rate',
    paymentFrequency: 'Weekly',
    dailyRateOrSalary: 900,
    overtimeRate: 120,
    active: true,
    remarks: 'Lead brickwork and stone mason.',
    createdAt: '2026-01-10',
  },
  {
    id: 'lab-2',
    name: 'Dilip Tukaram More',
    mobileNumber: '9890234567',
    address: 'Ambad Gaon, Nashik',
    labourType: 'Barbender',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    joiningDate: '2026-01-15',
    wageBasis: 'Daily Rate',
    paymentFrequency: 'Every 15 Days',
    dailyRateOrSalary: 850,
    overtimeRate: 110,
    active: true,
    remarks: 'Specialized in column & slab steel bending.',
    createdAt: '2026-01-15',
  },
  {
    id: 'lab-3',
    name: 'Kashinath Sonu Bhalerao',
    mobileNumber: '9890345678',
    address: 'Panchavati, Nashik',
    labourType: 'Supervisor',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    joiningDate: '2025-11-15',
    wageBasis: 'Monthly Salary',
    paymentFrequency: 'Monthly',
    dailyRateOrSalary: 28000,
    overtimeRate: 0,
    active: true,
    remarks: 'Civil site supervisor for layout roads.',
    createdAt: '2025-11-15',
  },
];

const initialLabourAttendance: LabourAttendanceRecord[] = [
  {
    id: 'att-1',
    labourId: 'lab-1',
    labourName: 'Baburao Ramchandra Shinde',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    date: '2026-03-01',
    status: 'Present',
    overtimeHours: 2,
    wageCalculated: 1140, // 900 + (2 * 120)
    remarks: 'Retaining wall masonry completed.',
  },
  {
    id: 'att-2',
    labourId: 'lab-2',
    labourName: 'Dilip Tukaram More',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    date: '2026-03-01',
    status: 'Present',
    overtimeHours: 1,
    wageCalculated: 960, // 850 + 110
    remarks: 'Beam fabrication finished.',
  },
];

const initialLabourPayments: LabourPaymentRecord[] = [
  {
    id: 'lp-1',
    voucherNumber: 'VD-LP-2026-001',
    labourId: 'lab-1',
    labourName: 'Baburao Ramchandra Shinde',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    date: '2026-02-15',
    type: 'Advance',
    amount: 5000,
    paymentMode: 'Cash',
    remarks: 'Advance for personal emergency.',
    createdAt: '2026-02-15',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'lp-2',
    voucherNumber: 'VD-LP-2026-002',
    labourId: 'lab-3',
    labourName: 'Kashinath Sonu Bhalerao',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    date: '2026-02-28',
    type: 'Wage Payment',
    amount: 28000,
    paymentMode: 'Bank Transfer',
    remarks: 'February monthly salary credited.',
    createdAt: '2026-02-28',
    createdBy: 'Ramesh Sharma',
  },
];

const initialAdvisers: Adviser[] = [
  {
    id: 'adv-1',
    name: 'Vijay Varma (Sai Properties)',
    mobileNumber: '9422112233',
    address: 'Shop 12, Shopping Complex, Gangapur Road, Nashik',
    email: 'vijay.saiproperties@gmail.com',
    commissionType: 'Percentage',
    commissionRate: 2,
    commissionBasis: 'On Property Total Price',
    projectId: 'proj-1',
    remarks: 'Top channel partner for plotted layout bookings.',
    createdAt: '2026-01-10',
  },
  {
    id: 'adv-2',
    name: 'Sanjay More (Real Deal Realtors)',
    mobileNumber: '9422223344',
    address: '2nd Floor, City Center Mall, Nashik',
    email: 'sanjay.realdeal@yahoo.com',
    commissionType: 'Fixed Amount',
    commissionRate: 35000,
    commissionBasis: 'Fixed per plot deal',
    projectId: 'proj-1',
    remarks: 'Experienced local real estate consultant.',
    createdAt: '2026-01-15',
  },
];

const initialAdviserCommissions: AdviserCommission[] = [
  {
    id: 'advc-1',
    adviserId: 'adv-1',
    adviserName: 'Vijay Varma (Sai Properties)',
    bookingId: 'bkg-1',
    bookingRef: 'VD-BKG-2026-001',
    customerId: 'cust-1',
    customerName: 'Mahendra Rajesh Deshmukh',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyNumber: 'Plot No. 1',
    propertyValue: 2400000,
    commissionType: 'Percentage (2%)',
    commissionRate: 2,
    eligibleCommission: 48000,
    paidCommission: 25000,
    outstandingCommission: 23000,
    createdAt: '2026-02-10',
  },
  {
    id: 'advc-2',
    adviserId: 'adv-2',
    adviserName: 'Sanjay More (Real Deal Realtors)',
    bookingId: 'bkg-2',
    bookingRef: 'VD-BKG-2026-002',
    customerId: 'cust-2',
    customerName: 'Sunita Anandrao Shinde',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    propertyNumber: 'Plot No. 2',
    propertyValue: 1860000,
    commissionType: 'Fixed Amount',
    commissionRate: 35000,
    eligibleCommission: 35000,
    paidCommission: 15000,
    outstandingCommission: 20000,
    createdAt: '2026-02-18',
  },
];

const initialAdviserPayments: AdviserPayment[] = [
  {
    id: 'ap-1',
    voucherNumber: 'VD-AP-2026-001',
    adviserId: 'adv-1',
    adviserName: 'Vijay Varma (Sai Properties)',
    bookingId: 'bkg-1',
    paymentDate: '2026-02-25',
    amount: 25000,
    paymentMode: 'Bank Transfer',
    transactionRef: 'IMPS-9921820',
    remarks: 'First installment of commission for Plot No. 1 booking',
    createdAt: '2026-02-25',
    createdBy: 'Ramesh Sharma',
  },
  {
    id: 'ap-2',
    voucherNumber: 'VD-AP-2026-002',
    adviserId: 'adv-2',
    adviserName: 'Sanjay More (Real Deal Realtors)',
    bookingId: 'bkg-2',
    paymentDate: '2026-03-01',
    amount: 15000,
    paymentMode: 'Cash',
    transactionRef: 'CASH-REC-092',
    remarks: 'Advance commission against Plot No. 2 booking',
    createdAt: '2026-03-01',
    createdBy: 'Ramesh Sharma',
  },
];

const initialExpenses: ExpenseRecord[] = [
  {
    id: 'exp-1',
    voucherNumber: 'VD-EXP-2026-001',
    expenseDate: '2026-02-05',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    category: 'Electricity',
    description: 'Temporary 3-phase commercial electricity meter installation & bill',
    vendorOrPaidTo: 'MSEDCL (Maharashtra State Electricity)',
    billNumber: 'MSEB-882910',
    amountBeforeGst: 14500,
    gstAmount: 2610,
    totalAmount: 17110,
    paymentMode: 'Bank Transfer',
    account: 'HDFC Bank Ltd',
    amountPaid: 17110,
    outstandingAmount: 0,
    remarks: 'Site power supply sanctioned.',
    createdAt: '2026-02-05',
    createdBy: 'Ramesh Sharma',
  },
  {
    id: 'exp-2',
    voucherNumber: 'VD-EXP-2026-002',
    expenseDate: '2026-02-14',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    category: 'Transport',
    description: 'JCB excavation and tractor leveling charges for 3 days',
    vendorOrPaidTo: 'Mahalaxmi Earthmovers',
    billNumber: 'MLX-044',
    amountBeforeGst: 32000,
    gstAmount: 0,
    totalAmount: 32000,
    paymentMode: 'Cash Account',
    account: 'Cash Account',
    amountPaid: 32000,
    outstandingAmount: 0,
    remarks: '32 hours excavation work @ Rs 1000/hr.',
    createdAt: '2026-02-14',
    createdBy: 'Sachin Jadhav',
  },
  {
    id: 'exp-3',
    voucherNumber: 'VD-EXP-2026-003',
    expenseDate: '2026-03-02',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    category: 'Office Expense',
    description: 'Site office marketing brochures, signboards & site flags',
    vendorOrPaidTo: 'Impressions Advertising & Print',
    billNumber: 'IMP-2026-91',
    amountBeforeGst: 18000,
    gstAmount: 3240,
    totalAmount: 21240,
    paymentMode: 'HDFC Bank Ltd',
    account: 'HDFC Bank Ltd',
    amountPaid: 21240,
    outstandingAmount: 0,
    remarks: 'Project launch banners & customer walkthrough leaflets.',
    createdAt: '2026-03-02',
    createdBy: 'Ramesh Sharma',
  },
];

const initialTransactions: FinancialTransaction[] = [
  // Initial capital / opening bank balance
  {
    id: 'txn-0',
    voucherNumber: 'VD-OB-001',
    txnDate: '2026-01-01',
    type: 'OTHER_INCOME',
    category: 'Capital Infusion',
    description: 'Opening Capital Deposit by Partners',
    entityType: 'BANK',
    entityName: 'Vishwas Developer Capital',
    debit: 0,
    credit: 2500000,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Bank Transfer',
    refNumber: 'CAP-2026-001',
    createdAt: '2026-01-01',
    createdBy: 'Suresh Patil',
  },
  // Cash opening balance
  {
    id: 'txn-0b',
    voucherNumber: 'VD-OB-002',
    txnDate: '2026-01-01',
    type: 'OTHER_INCOME',
    category: 'Petty Cash',
    description: 'Opening Office Cash Float',
    entityType: 'BANK',
    entityName: 'Cash Float',
    debit: 0,
    credit: 150000,
    account: 'Cash Account',
    paymentMode: 'Cash',
    refNumber: 'FLOAT-2026-01',
    createdAt: '2026-01-01',
    createdBy: 'Suresh Patil',
  },
  // Customer Receipt 1: Mahendra Deshmukh
  {
    id: 'txn-1',
    voucherNumber: 'VD-RCP-2026-001',
    txnDate: '2026-02-10',
    type: 'CUSTOMER_RECEIPT',
    category: 'Property Booking Receipt',
    description: 'Token and down payment received for Plot No. 1',
    entityType: 'CUSTOMER',
    entityId: 'cust-1',
    entityName: 'Mahendra Rajesh Deshmukh',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 0,
    credit: 600000,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Bank Transfer',
    refNumber: 'HDFC-RTGS-882910',
    createdAt: '2026-02-10',
    createdBy: 'Suresh Patil',
  },
  // Customer Receipt 2: Sunita Shinde
  {
    id: 'txn-2',
    voucherNumber: 'VD-RCP-2026-002',
    txnDate: '2026-02-18',
    type: 'CUSTOMER_RECEIPT',
    category: 'Property Booking Receipt',
    description: 'Down payment cheque clearance for Plot No. 2',
    entityType: 'CUSTOMER',
    entityId: 'cust-2',
    entityName: 'Sunita Anandrao Shinde',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 0,
    credit: 400000,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Cheque',
    refNumber: 'CHQ-552819-ICICI',
    createdAt: '2026-02-18',
    createdBy: 'Ramesh Sharma',
  },
  // Customer Receipt 3: Ganesh Kadam
  {
    id: 'txn-3',
    voucherNumber: 'VD-RCP-2026-003',
    txnDate: '2026-03-05',
    type: 'CUSTOMER_RECEIPT',
    category: 'Property Booking Receipt',
    description: 'Down payment for Flat 101',
    entityType: 'CUSTOMER',
    entityId: 'cust-3',
    entityName: 'Ganesh Vasantrao Kadam',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    debit: 0,
    credit: 800000,
    account: 'HDFC Bank Ltd',
    paymentMode: 'RTGS',
    refNumber: 'SBI-RTGS-991028',
    createdAt: '2026-03-05',
    createdBy: 'Suresh Patil',
  },
  // Vendor Payment 1: Balaji Stone
  {
    id: 'txn-4',
    voucherNumber: 'VD-VP-2026-001',
    txnDate: '2026-02-15',
    type: 'VENDOR_PAYMENT',
    category: 'Material Vendor Payment',
    description: 'Part payment to Balaji Stone against Bill BAL-2026-88',
    entityType: 'VENDOR',
    entityId: 'ven-1',
    entityName: 'Balaji Stone Crushers & Transporters',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 35000,
    credit: 0,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Cheque',
    refNumber: 'CHQ-772190',
    createdAt: '2026-02-15',
    createdBy: 'Ramesh Sharma',
  },
  // Vendor Payment 2: Godavari Sand
  {
    id: 'txn-5',
    voucherNumber: 'VD-VP-2026-002',
    txnDate: '2026-02-22',
    type: 'VENDOR_PAYMENT',
    category: 'Material Vendor Payment',
    description: 'Payment to Godavari Sand for Reti',
    entityType: 'VENDOR',
    entityId: 'ven-2',
    entityName: 'Godavari Natural Sand Suppliers',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    debit: 25000,
    credit: 0,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Bank Transfer',
    refNumber: 'IMPS-99210291',
    createdAt: '2026-02-22',
    createdBy: 'Ramesh Sharma',
  },
  // Vendor Payment 3: Shree Sai Materials
  {
    id: 'txn-6',
    voucherNumber: 'VD-VP-2026-003',
    txnDate: '2026-02-28',
    type: 'VENDOR_PAYMENT',
    category: 'Material Vendor Payment',
    description: 'Payment for Cement and TMT Steel',
    entityType: 'VENDOR',
    entityId: 'ven-3',
    entityName: 'Shree Sai Building Materials & Cement',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    debit: 200000,
    credit: 0,
    account: 'HDFC Bank Ltd',
    paymentMode: 'RTGS',
    refNumber: 'RTGS-HDFC-102948',
    createdAt: '2026-02-28',
    createdBy: 'Ramesh Sharma',
  },
  // Labour Advance: Baburao Shinde
  {
    id: 'txn-7',
    voucherNumber: 'VD-LP-2026-001',
    txnDate: '2026-02-15',
    type: 'LABOUR_ADVANCE',
    category: 'Labour Advance',
    description: 'Cash advance to Baburao Shinde (Mason)',
    entityType: 'LABOUR',
    entityId: 'lab-1',
    entityName: 'Baburao Ramchandra Shinde',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 5000,
    credit: 0,
    account: 'Cash Account',
    paymentMode: 'Cash',
    refNumber: 'VCH-ADV-01',
    createdAt: '2026-02-15',
    createdBy: 'Sachin Jadhav',
  },
  // Labour Salary: Kashinath Bhalerao
  {
    id: 'txn-8',
    voucherNumber: 'VD-LP-2026-002',
    txnDate: '2026-02-28',
    type: 'LABOUR_PAYMENT',
    category: 'Labour Salary',
    description: 'Supervisor salary for February 2026',
    entityType: 'LABOUR',
    entityId: 'lab-3',
    entityName: 'Kashinath Sonu Bhalerao',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 28000,
    credit: 0,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Bank Transfer',
    refNumber: 'SAL-FEB-03',
    createdAt: '2026-02-28',
    createdBy: 'Ramesh Sharma',
  },
  // Adviser Commission Payment 1: Vijay Varma
  {
    id: 'txn-9',
    voucherNumber: 'VD-AP-2026-001',
    txnDate: '2026-02-25',
    type: 'ADVISER_COMMISSION',
    category: 'Adviser Commission Payment',
    description: 'Commission payment for Plot No. 1 booking',
    entityType: 'ADVISER',
    entityId: 'adv-1',
    entityName: 'Vijay Varma (Sai Properties)',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 25000,
    credit: 0,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Bank Transfer',
    refNumber: 'IMPS-9921820',
    createdAt: '2026-02-25',
    createdBy: 'Ramesh Sharma',
  },
  // Adviser Commission Payment 2: Sanjay More
  {
    id: 'txn-10',
    voucherNumber: 'VD-AP-2026-002',
    txnDate: '2026-03-01',
    type: 'ADVISER_COMMISSION',
    category: 'Adviser Commission Payment',
    description: 'Advance commission against Plot No. 2',
    entityType: 'ADVISER',
    entityId: 'adv-2',
    entityName: 'Sanjay More (Real Deal Realtors)',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 15000,
    credit: 0,
    account: 'Cash Account',
    paymentMode: 'Cash',
    refNumber: 'CASH-REC-092',
    createdAt: '2026-03-01',
    createdBy: 'Ramesh Sharma',
  },
  // Expense 1: MSEB Power
  {
    id: 'txn-11',
    voucherNumber: 'VD-EXP-2026-001',
    txnDate: '2026-02-05',
    type: 'EXPENSE',
    category: 'Electricity',
    description: 'Temporary commercial power supply installation',
    entityType: 'EXPENSE',
    entityName: 'MSEDCL',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 17110,
    credit: 0,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Bank Transfer',
    refNumber: 'MSEB-882910',
    createdAt: '2026-02-05',
    createdBy: 'Ramesh Sharma',
  },
  // Expense 2: JCB Excavation
  {
    id: 'txn-12',
    voucherNumber: 'VD-EXP-2026-002',
    txnDate: '2026-02-14',
    type: 'EXPENSE',
    category: 'Transport',
    description: 'JCB road excavation & compaction work',
    entityType: 'EXPENSE',
    entityName: 'Mahalaxmi Earthmovers',
    projectId: 'proj-1',
    projectName: 'Vishwas Green Meadows',
    debit: 32000,
    credit: 0,
    account: 'Cash Account',
    paymentMode: 'Cash',
    refNumber: 'MLX-044',
    createdAt: '2026-02-14',
    createdBy: 'Sachin Jadhav',
  },
  // Expense 3: Office Brochures
  {
    id: 'txn-13',
    voucherNumber: 'VD-EXP-2026-003',
    txnDate: '2026-03-02',
    type: 'EXPENSE',
    category: 'Office Expense',
    description: 'Site launch marketing brochures & signage',
    entityType: 'EXPENSE',
    entityName: 'Impressions Advertising & Print',
    projectId: 'proj-2',
    projectName: 'Vishwas Heights Phase 1',
    debit: 21240,
    credit: 0,
    account: 'HDFC Bank Ltd',
    paymentMode: 'Bank Transfer',
    refNumber: 'IMP-2026-91',
    createdAt: '2026-03-02',
    createdBy: 'Ramesh Sharma',
  },
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-01-01 10:00:00',
    user: 'Suresh Patil',
    action: 'SYSTEM_INITIALIZATION',
    module: 'Master Settings',
    details: 'System initialized for Vishwas Developer ERP with company profile and master charts.',
  },
  {
    id: 'log-2',
    timestamp: '2026-02-10 11:30:15',
    user: 'Suresh Patil',
    action: 'BOOKING_CREATED',
    module: 'Customer Entry',
    details: 'New booking created VD-BKG-2026-001 for Plot No. 1 (Vishwas Green Meadows). Received token & downpayment Rs 6,00,000.',
  },
  {
    id: 'log-3',
    timestamp: '2026-02-18 14:22:00',
    user: 'Ramesh Sharma',
    action: 'BOOKING_CREATED',
    module: 'Customer Entry',
    details: 'New booking created VD-BKG-2026-002 for Plot No. 2 (Vishwas Green Meadows). Received Rs 4,00,000.',
  },
  {
    id: 'log-4',
    timestamp: '2026-03-05 16:45:10',
    user: 'Suresh Patil',
    action: 'BOOKING_CREATED',
    module: 'Customer Entry',
    details: 'New booking created VD-BKG-2026-003 for Flat 101 (Vishwas Heights Phase 1). Received Rs 8,00,000.',
  },
];

export function generateProjectCode(projects: Project[] = []): string {
  let maxNum = 0;
  projects.forEach((p) => {
    const match = p.code?.match(/(?:VYO|PRJ|VGM|VHP|VCH)[-_]?(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  const next = maxNum + 1;
  return `VYO-${next < 10 ? '0' + next : next}`;
}

export function getInitialDatabase(): DatabaseState {
  const defaultComp: CompanyProfile = {
    ...initialCompany,
    id: 'comp-1',
    name: initialCompany.companyName,
    shortCode: 'COMP1',
    tagline: 'Leading Real Estate Developer & Promoter',
    active: true,
    isDefault: true,
  };
  return {
    company: initialCompany,
    companies: [defaultComp],
    activeCompanyId: 'comp-1',
    masterSettings: initialMasterSettings,
    users: initialUsers,
    projects: initialProjects,
    properties: initialProperties,
    customers: initialCustomers,
    bookings: initialBookings,
    customerReceipts: initialReceipts,
    materials: initialMaterials,
    materialPurchases: initialMaterialPurchases,
    materialReceipts: initialMaterialReceipts,
    materialUsages: initialMaterialUsages,
    vendors: initialVendors,
    vendorPayments: initialVendorPayments,
    labours: initialLabours,
    labourAttendance: initialLabourAttendance,
    labourPayments: initialLabourPayments,
    attendanceCorrections: [],
    advisers: initialAdvisers,
    adviserCommissions: initialAdviserCommissions,
    adviserPayments: initialAdviserPayments,
    expenses: initialExpenses,
    transactions: initialTransactions,
    auditLogs: initialAuditLogs,
  };
}

export interface CloudSyncStatus {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: string | null;
  error?: string;
  source: 'cloud' | 'local';
}

class StorageService {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<() => void> = [];
  private syncListeners: Array<(status: CloudSyncStatus) => void> = [];
  private syncStatus: CloudSyncStatus = {
    status: 'syncing',
    lastSyncTime: null,
    source: 'local',
  };
  private isWritingToRemote = false;
  private firestoreUnsubscribe: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('vishwas_erp_sync_bus');
      this.channel.onmessage = (event) => {
        if (event.data === 'DATABASE_UPDATED') {
          this.notify();
        }
      };
    }

    if (typeof window !== 'undefined') {
      this.initFirestoreSync();
    }
  }

  private initFirestoreSync(): void {
    const docPath = 'erp_state/current';
    const stateDocRef = doc(db, 'erp_state', 'current');

    try {
      this.syncStatus = {
        ...this.syncStatus,
        status: 'syncing',
      };
      this.notifySync();

      this.firestoreUnsubscribe = onSnapshot(
        stateDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const remoteData = snapshot.data();
            if (remoteData && remoteData.projects) {
              // Remote state is present
              const fullState: DatabaseState = {
                company: remoteData.company || initialCompany,
                masterSettings: {
                  ...initialMasterSettings,
                  ...(remoteData.masterSettings || {}),
                },
                users: remoteData.users || initialUsers,
                projects: remoteData.projects || initialProjects,
                properties: remoteData.properties || initialProperties,
                customers: remoteData.customers || initialCustomers,
                bookings: remoteData.bookings || initialBookings,
                customerReceipts: remoteData.customerReceipts || initialReceipts,
                materials: remoteData.materials || initialMaterials,
                materialPurchases: remoteData.materialPurchases || initialMaterialPurchases,
                materialReceipts: remoteData.materialReceipts || initialMaterialReceipts,
                materialUsages: remoteData.materialUsages || initialMaterialUsages,
                vendors: remoteData.vendors || initialVendors,
                vendorPayments: remoteData.vendorPayments || initialVendorPayments,
                labours: remoteData.labours || initialLabours,
                labourAttendance: remoteData.labourAttendance || initialLabourAttendance,
                labourPayments: remoteData.labourPayments || initialLabourPayments,
                advisers: remoteData.advisers || initialAdvisers,
                adviserCommissions: remoteData.adviserCommissions || initialAdviserCommissions,
                adviserPayments: remoteData.adviserPayments || initialAdviserPayments,
                expenses: remoteData.expenses || initialExpenses,
                transactions: remoteData.transactions || initialTransactions,
                auditLogs: remoteData.auditLogs || initialAuditLogs,
              };

              // Persist locally
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
              this.syncStatus = {
                status: 'synced',
                lastSyncTime: new Date().toLocaleTimeString(),
                source: 'cloud',
              };
              this.notifySync();
              this.notify();
            }
          } else {
            // Document does not exist in Firestore yet: seed initial data to Cloud
            const local = this.getDatabase();
            this.pushToFirestore(local);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot listener error (falling back to offline local):', error);
          this.syncStatus = {
            status: 'offline',
            lastSyncTime: this.syncStatus.lastSyncTime,
            error: error.message,
            source: 'local',
          };
          this.notifySync();
          // Log through error handling framework if not offline
          if (!error.message.includes('offline') && !error.message.includes('unavailable')) {
            try {
              handleFirestoreError(error, OperationType.GET, docPath);
            } catch (e) {
              console.warn('Firestore handler caught:', e);
            }
          }
        }
      );
    } catch (err) {
      console.warn('Failed setting up Firestore onSnapshot:', err);
      this.syncStatus = {
        status: 'offline',
        lastSyncTime: null,
        error: String(err),
        source: 'local',
      };
      this.notifySync();
    }
  }

  private async pushToFirestore(state: DatabaseState): Promise<void> {
    const docPath = 'erp_state/current';
    try {
      this.syncStatus = {
        ...this.syncStatus,
        status: 'syncing',
      };
      this.notifySync();

      const stateDocRef = doc(db, 'erp_state', 'current');
      await setDoc(stateDocRef, {
        ...state,
        version: '2.0',
        lastUpdated: new Date().toISOString(),
      });

      this.syncStatus = {
        status: 'synced',
        lastSyncTime: new Date().toLocaleTimeString(),
        source: 'cloud',
      };
      this.notifySync();
    } catch (error) {
      console.warn('Firestore write error (saved to local device storage):', error);
      this.syncStatus = {
        status: 'offline',
        lastSyncTime: this.syncStatus.lastSyncTime,
        error: error instanceof Error ? error.message : String(error),
        source: 'local',
      };
      this.notifySync();

      if (
        error instanceof Error &&
        !error.message.includes('offline') &&
        !error.message.includes('unavailable')
      ) {
        try {
          handleFirestoreError(error, OperationType.WRITE, docPath);
        } catch (e) {
          console.warn('Firestore handler logged write error:', e);
        }
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribeSync(listener: (status: CloudSyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    listener(this.syncStatus);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  public getSyncStatus(): CloudSyncStatus {
    return this.syncStatus;
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error notifying storage listener', e);
      }
    });
  }

  private notifySync(): void {
    this.syncListeners.forEach((listener) => {
      try {
        listener(this.syncStatus);
      } catch (e) {
        console.error('Error notifying sync listener', e);
      }
    });
  }

  public getDatabase(): DatabaseState {
    if (typeof window === 'undefined') return getInitialDatabase();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const initial = getInitialDatabase();
        this.saveDatabase(initial);
        return initial;
      }
      const parsed = JSON.parse(stored) as DatabaseState;
      if (!parsed.masterSettings) {
        parsed.masterSettings = initialMasterSettings;
      } else {
        parsed.masterSettings = {
          ...initialMasterSettings,
          ...parsed.masterSettings,
        };
      }
      if (!parsed.companies || !Array.isArray(parsed.companies) || parsed.companies.length === 0) {
        parsed.companies = [
          {
            ...parsed.company,
            id: 'comp-1',
            name: (parsed.company as any)?.companyName || 'VYAPAR ONE INFRASTRUCTURE',
            shortCode: 'COMP1',
            tagline: 'Leading Real Estate Developer & Promoter',
            active: true,
            isDefault: true,
          },
        ];
        parsed.activeCompanyId = 'comp-1';
      }
      if (!parsed.attendanceCorrections || !Array.isArray(parsed.attendanceCorrections)) {
        parsed.attendanceCorrections = [];
      }
      return parsed;
    } catch (err) {
      console.error('Failed reading database from localStorage, initializing fresh', err);
      const initial = getInitialDatabase();
      this.saveDatabase(initial);
      return initial;
    }
  }

  public getMasterSettings(): MasterSettingsData {
    const db = this.getDatabase();
    return db.masterSettings || initialMasterSettings;
  }

  public addMasterItem(category: keyof MasterSettingsData, item: string): void {
    const db = this.getDatabase();
    if (!db.masterSettings) {
      db.masterSettings = { ...initialMasterSettings };
    }
    const list = db.masterSettings[category];
    if (Array.isArray(list)) {
      const trimmed = item.trim();
      if (trimmed && !list.includes(trimmed)) {
        (db.masterSettings[category] as string[]).push(trimmed);
        this.saveDatabase(db);
      }
    }
  }

  public saveDatabase(state: DatabaseState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.channel?.postMessage('DATABASE_UPDATED');
      this.notify();

      // Trigger asynchronous push to Firebase Firestore cloud database
      this.pushToFirestore(state).catch((err) => {
        console.warn('Background pushToFirestore error handled:', err);
      });
    } catch (err) {
      console.error('Failed writing to localStorage', err);
    }
  }

  public async syncNow(): Promise<void> {
    const current = this.getDatabase();
    await this.pushToFirestore(current);
  }

  public logAudit(user: string, action: string, module: string, details: string): void {
    const db = this.getDatabase();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user,
      action,
      module,
      details,
    };
    db.auditLogs.unshift(newLog);
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    this.saveDatabase(db);
  }

  public resetToDefault(): void {
    const fresh = getInitialDatabase();
    this.saveDatabase(fresh);
  }
}

export const dbService = new StorageService();

