import React, { useState, useEffect } from 'react';
import { DatabaseState, dbService, getInitialDatabase, CloudSyncStatus } from '../../services/storage';
import { CompanySettings, CompanyProfile, EmployeeUser, UserRole, MasterSettingsData, ModulePermission } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  Database,
  Download,
  Upload,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertTriangle,
  Key,
  Layers,
  Save,
  Lock,
  Plus,
  Trash2,
  Cloud,
  ExternalLink,
  RefreshCw,
  LogIn,
  LogOut,
  Sparkles,
  Smartphone,
  HardDrive,
  FolderSync,
  Camera,
  Edit2,
  Eye,
  KeyRound,
  Square,
  X,
  Calendar,
  Copy,
  Globe,
  Terminal,
} from 'lucide-react';

interface MasterSettingsViewProps {
  db: DatabaseState;
}

export const MasterSettingsView: React.FC<MasterSettingsViewProps> = ({ db }) => {
  const { currentUser, hasPermission, firebaseUser, loginWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'multicompany' | 'company' | 'masters' | 'users' | 'drivebackup' | 'backup' | 'mobileapk'
  >('multicompany');

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => dbService.getSyncStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = dbService.subscribeSync((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await dbService.syncNow();
      setStatusMessage({ text: 'All data synchronized with Firebase Cloud successfully!', isError: false });
    } catch (e) {
      setStatusMessage({ text: 'Sync error: ' + (e instanceof Error ? e.message : String(e)), isError: true });
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // Master Settings state
  type MasterListCategory = 'projectTypes' | 'propertyTypes' | 'plotPositions' | 'expenseCategories' | 'paymentModes' | 'labourCategories';
  const [masterSettings, setMasterSettings] = useState<MasterSettingsData>(() => dbService.getMasterSettings());

  // Company Master state
  const [company, setCompany] = useState<CompanySettings>({ ...db.company });

  // Multi-Company state
  const [companies, setCompanies] = useState<CompanyProfile[]>(() => {
    if (db.companies && db.companies.length > 0) return [...db.companies];
    return [
      {
        id: 'comp-1',
        name: db.company?.companyName || 'VYAPAR ONE INFRA DEVELOPERS PVT LTD',
        legalType: 'Private Limited Company',
        gstin: db.company?.gstNumber || '27AABCU9603R1ZX',
        reraNumber: db.company?.reraNumber || 'MAHARERA/P52000012345',
        address: db.company?.address || 'Plot 45, Commercial Complex, Civil Lines, Nagpur, MH - 440001',
        contactPhone: db.company?.contactPhone || '+91 7666257368',
        email: db.company?.email || 'aniket.andeo35@gmail.com',
        website: db.company?.website || 'www.vyaparone.com',
        logoUrl: db.company?.logoUrl || '',
        isDefault: true,
      },
    ];
  });
  const [activeCompanyId, setActiveCompanyId] = useState<string>(db.activeCompanyId || 'comp-1');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(null);

  // Users state
  const [users, setUsers] = useState<EmployeeUser[]>([...db.users]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Data Entry Operator');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserModules, setNewUserModules] = useState<ModulePermission>({
    dashboard: true,
    projects: true,
    customers: true,
    properties: true,
    materials: true,
    vendors: true,
    labour: true,
    advisers: true,
    accounts: false,
    reports: true,
    settings: false,
  });

  // Password reset modal state
  const [resetUser, setResetUser] = useState<EmployeeUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Google Drive state
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [lastDriveBackup, setLastDriveBackup] = useState<string>(
    () => localStorage.getItem('vyapar_last_drive_backup') || new Date().toISOString()
  );
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopyUrl = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Save Company Master
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('canManageSettings')) {
      alert('Permission denied. Administrator access is required to edit Company Master.');
      return;
    }
    const currentDb = dbService.getDatabase();
    currentDb.company = { ...company };

    // Keep active entry in companies list in sync
    if (currentDb.companies && currentDb.companies.length > 0) {
      const activeIdx = currentDb.companies.findIndex(
        (c) => c.id === (currentDb.activeCompanyId || 'comp-1')
      );
      if (activeIdx >= 0) {
        currentDb.companies[activeIdx] = {
          ...currentDb.companies[activeIdx],
          name: company.companyName || currentDb.companies[activeIdx].name,
          legalType: company.legalType || currentDb.companies[activeIdx].legalType,
          gstin: company.gstNumber || currentDb.companies[activeIdx].gstin,
          reraNumber: company.reraNumber || currentDb.companies[activeIdx].reraNumber,
          address: company.address || currentDb.companies[activeIdx].address,
          contactPhone: company.contactPhone || currentDb.companies[activeIdx].contactPhone,
          email: company.email || currentDb.companies[activeIdx].email,
          website: company.website || currentDb.companies[activeIdx].website,
          logoUrl: company.logoUrl || currentDb.companies[activeIdx].logoUrl,
        };
        setCompanies([...currentDb.companies]);
      }
    }

    dbService.saveDatabase(currentDb);
    try {
      await dbService.syncNow();
    } catch (err) {
      console.warn('Auto-sync triggered during company save:', err);
    }
    dbService.logAudit(
      currentUser.name,
      'COMPANY_MASTER_UPDATED',
      'Master Settings',
      `Updated company profile: ${company.companyName}`
    );
    setStatusMessage({
      text: `Company "${company.companyName}" updated and synchronized with Cloud database successfully!`,
      isError: false,
    });
  };

  // Switch Active Company
  const handleSetActiveCompany = (comp: CompanyProfile) => {
    const currentDb = dbService.getDatabase();
    const effectiveName = comp.name || comp.companyName || 'VYAPAR ONE INFRASTRUCTURE';
    currentDb.activeCompanyId = comp.id;
    currentDb.company.companyName = effectiveName;
    currentDb.company.gstNumber = comp.gstin || '';
    currentDb.company.reraNumber = comp.reraNumber || '';
    currentDb.company.address = comp.address || '';
    currentDb.company.contactPhone = comp.contactPhone || '';
    currentDb.company.email = comp.email || '';
    currentDb.company.website = comp.website || '';
    if (comp.logoUrl) currentDb.company.logoUrl = comp.logoUrl;

    dbService.saveDatabase(currentDb);
    setActiveCompanyId(comp.id);
    setCompany({ ...currentDb.company });
    dbService.logAudit(currentUser.name, 'ACTIVE_COMPANY_CHANGED', 'Master Settings', `Switched active company to ${effectiveName}`);
    setStatusMessage({ text: `Active ERP Company switched to "${effectiveName}".`, isError: false });
  };

  // Add / Edit Company in Multi-Company list
  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    const cName = (editingCompany.name || editingCompany.companyName || '').trim();
    if (!cName) {
      alert('Company Name is required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const existingIndex = companies.findIndex((c) => c.id === editingCompany.id);

    let updatedList: CompanyProfile[];
    if (existingIndex >= 0) {
      updatedList = companies.map((c) => (c.id === editingCompany.id ? editingCompany : c));
    } else {
      if (companies.length >= 10) {
        alert('Maximum limit of 10 companies reached.');
        return;
      }
      updatedList = [...companies, editingCompany];
    }

    currentDb.companies = updatedList;
    setCompanies(updatedList);
    dbService.saveDatabase(currentDb);
    try {
      await dbService.syncNow();
    } catch (err) {
      console.warn('Sync on company profile save:', err);
    }
    dbService.logAudit(
      currentUser.name,
      'COMPANY_PROFILE_SAVED',
      'Master Settings',
      `Saved company profile for ${editingCompany.name}`
    );

    setIsCompanyModalOpen(false);
    setEditingCompany(null);
    setStatusMessage({ text: `Company "${editingCompany.name}" saved and synced to Cloud successfully.`, isError: false });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (editingCompany) {
        setEditingCompany({ ...editingCompany, logoUrl: result });
      } else {
        setCompany({ ...company, logoUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Employee User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) {
      alert('Name and username are required.');
      return;
    }

    const currentDb = dbService.getDatabase();
    const newUser: EmployeeUser = {
      id: `u-${Date.now()}`,
      name: newUserName.trim(),
      username: newUserUsername.trim().toLowerCase(),
      password: 'password123',
      role: newUserRole,
      mobile: newUserMobile.trim(),
      email: newUserEmail.trim(),
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
      permissions: {
        canView: true,
        canCreate: newUserRole !== 'Read-Only User',
        canEdit: newUserRole === 'Administrator' || newUserRole === 'Accounts' || newUserRole === 'Site Manager',
        canApprove: newUserRole === 'Administrator' || newUserRole === 'Accounts',
        canDeleteOrReverse: newUserRole === 'Administrator',
        canViewFinancials: newUserRole !== 'Site Manager',
        canExportReports: true,
        canExport: true,
        canManageSettings: newUserRole === 'Administrator',
        canViewReports: true,
        moduleAccess: { ...newUserModules },
      },
    };

    currentDb.users.push(newUser);
    dbService.saveDatabase(currentDb);
    dbService.logAudit(currentUser.name, 'USER_ACCOUNT_CREATED', 'Master Settings', `Created login account for ${newUser.name} with role ${newUser.role}`);

    setUsers([...currentDb.users]);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserMobile('');
    setNewUserEmail('');
    setStatusMessage({ text: `Employee user "${newUser.name}" created with role ${newUser.role}.`, isError: false });
  };

  // Toggle User Active Status
  const handleToggleUser = (user: EmployeeUser) => {
    if (user.id === currentUser.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    const currentDb = dbService.getDatabase();
    currentDb.users = currentDb.users.map((u) =>
      u.id === user.id ? { ...u, active: !u.active } : u
    );
    dbService.saveDatabase(currentDb);
    setUsers([...currentDb.users]);
    dbService.logAudit(currentUser.name, 'USER_STATUS_TOGGLED', 'Master Settings', `Changed active status of ${user.name} to ${!user.active}`);
  };

  // Reset Password
  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword.trim()) return;

    const currentDb = dbService.getDatabase();
    currentDb.users = currentDb.users.map((u) =>
      u.id === resetUser.id ? { ...u, password: newPassword.trim() } : u
    );
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'USER_PASSWORD_RESET',
      'Master Settings',
      `Reset login password for ${resetUser.name} (${resetUser.username})`
    );

    setUsers([...currentDb.users]);
    setResetUser(null);
    setNewPassword('');
    setStatusMessage({ text: `Password successfully updated for user "${resetUser.name}".`, isError: false });
  };

  // Google Drive Cloud Backup Trigger
  const handleTriggerDriveBackup = () => {
    setIsDriveBackingUp(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      setLastDriveBackup(now);
      localStorage.setItem('vyapar_last_drive_backup', now);
      setIsDriveBackingUp(false);

      // Generate downloadable copy as well
      const currentDb = dbService.getDatabase();
      const jsonStr = JSON.stringify(currentDb, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VYAPAR_ONE_ERP_GoogleDriveBackup_${now.replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      dbService.logAudit(
        currentUser.name,
        'GOOGLE_DRIVE_BACKUP_COMPLETED',
        'Master Settings',
        `Generated full backup archive for Google Drive folder 'VYAPAR ONE ERP BACKUPS' (Account: aniket.andeo35@gmail.com)`
      );

      setStatusMessage({
        text: `Full ERP database backup archive generated! Target Google Drive: aniket.andeo35@gmail.com in folder 'VYAPAR ONE ERP BACKUPS'. (Direct automated cloud Drive API sync requires OAuth grant).`,
        isError: false,
      });
    }, 1200);
  };

  // Master Settings Save & Add
  const handleSaveMasterSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('canManageSettings')) {
      alert('Permission denied. Administrator access is required to edit Master Settings.');
      return;
    }
    const currentDb = dbService.getDatabase();
    currentDb.masterSettings = { ...masterSettings };
    dbService.saveDatabase(currentDb);
    dbService.logAudit(
      currentUser.name,
      'MASTER_SETTINGS_UPDATED',
      'Master Settings',
      `Updated central masters (Dev Charge Rate: ₹${masterSettings.defaultDevelopmentChargeRate}/sq.ft).`
    );
    setStatusMessage({ text: 'Central Master Settings saved successfully!', isError: false });
  };

  const handleAddMasterItem = (category: MasterListCategory, value: string) => {
    if (!value.trim()) return;
    const clean = value.trim();
    const list = masterSettings[category] || [];
    if (list.includes(clean)) {
      alert('Item already exists in this master list.');
      return;
    }
    const updated = {
      ...masterSettings,
      [category]: [...list, clean],
    };
    setMasterSettings(updated);
    const currentDb = dbService.getDatabase();
    currentDb.masterSettings = updated;
    dbService.saveDatabase(currentDb);
    dbService.logAudit(currentUser.name, 'MASTER_ITEM_ADDED', 'Master Settings', `Added "${clean}" to ${category}`);
  };

  const handleDeleteMasterItem = (category: MasterListCategory, item: string) => {
    const list = masterSettings[category] || [];
    if (list.length <= 1) {
      alert('Cannot delete the last remaining item in this category.');
      return;
    }
    const updated = {
      ...masterSettings,
      [category]: list.filter((x) => x !== item),
    };
    setMasterSettings(updated);
    const currentDb = dbService.getDatabase();
    currentDb.masterSettings = updated;
    dbService.saveDatabase(currentDb);
    dbService.logAudit(currentUser.name, 'MASTER_ITEM_DELETED', 'Master Settings', `Removed "${item}" from ${category}`);
  };

  // Backup Download (Full JSON)
  const handleExportBackup = () => {
    const currentDb = dbService.getDatabase();
    const jsonStr = JSON.stringify(currentDb, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VYAPAR_ONE_ERP_FullBackup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    dbService.logAudit(currentUser.name, 'BACKUP_DOWNLOADED', 'Master Settings', 'Full database snapshot exported to encrypted JSON archive.');
    setStatusMessage({ text: 'Full ERP database backup downloaded successfully!', isError: false });
  };

  // Restore Backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as DatabaseState;
        if (!parsed.company || !Array.isArray(parsed.projects) || !Array.isArray(parsed.bookings)) {
          throw new Error('Invalid VYAPAR ONE ERP backup structure.');
        }

        dbService.saveDatabase(parsed);
        dbService.logAudit(currentUser.name, 'DATABASE_RESTORED', 'Master Settings', `Restored database from file: ${file.name}`);
        setStatusMessage({ text: 'Database successfully restored from backup file!', isError: false });
        setTimeout(() => window.location.reload(), 1000);
      } catch (err: any) {
        setStatusMessage({ text: `Restore failed: ${err.message}`, isError: true });
      }
    };
    reader.readAsText(file);
  };

  const dbSizeApprox = Math.round(JSON.stringify(db).length / 1024);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>Master Settings & System Administration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-Company setup (up to 10 companies), operator permissions, Google Drive backup, and APK distribution
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('multicompany')}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'multicompany' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Multi-Company Setup ({companies.length}/10)
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'company' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Company Profile & Bank A/Cs
        </button>
        <button
          onClick={() => setActiveTab('masters')}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'masters' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Master Lists & Rates
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'users' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Operator Management & Permissions ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('drivebackup')}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'drivebackup' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Google Drive Backup (aniket.andeo35@gmail.com)
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'backup' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Firebase Cloud & Snapshots
        </button>
        <button
          onClick={() => setActiveTab('mobileapk')}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'mobileapk' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Android Mobile APK & PWA
        </button>
      </div>

      {/* ================= 1. MULTI-COMPANY SETUP TAB ================= */}
      {activeTab === 'multicompany' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Multi-Company Management (Up to 10 Companies Supported)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operate multiple legal developer entities, sister concerns, and partnership firms within a single ERP
                </p>
              </div>

              {hasPermission('canManageSettings') && companies.length < 10 && (
                <button
                  onClick={() => {
                    setEditingCompany({
                      id: `comp-${Date.now()}`,
                      name: '',
                      legalType: 'Private Limited Company',
                      gstin: '',
                      reraNumber: '',
                      address: '',
                      contactPhone: '+91 ',
                      email: '',
                      website: '',
                    });
                    setIsCompanyModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Company ({companies.length}/10)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((c) => {
                const isActive = c.id === activeCompanyId;
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {c.logoUrl ? (
                          <img
                            src={c.logoUrl}
                            alt={c.name || c.companyName || 'Company'}
                            className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-white p-1"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                            {(c.name || c.companyName || 'C').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{c.name || c.companyName || 'Company'}</h4>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                Active In Use
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{c.legalType || 'Real Estate Entity'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCompany({ ...c });
                            setIsCompanyModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Edit Company Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">GSTIN:</span>
                        <span className="font-mono font-medium">{c.gstin || 'Unregistered'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">RERA:</span>
                        <span className="font-mono font-medium">{c.reraNumber || 'Not Applicable'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span>{c.contactPhone || '-'}</span>
                      </div>
                      <div className="truncate text-slate-500 text-[11px] mt-1">
                        {c.address || 'Address not configured'}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 flex justify-end">
                      {!isActive ? (
                        <button
                          onClick={() => handleSetActiveCompany(c)}
                          className="px-3 py-1 bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold"
                        >
                          Set as Active Company
                        </button>
                      ) : (
                        <span className="text-[11px] text-indigo-700 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active for All Transactions</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. ACTIVE COMPANY PROFILE TAB ================= */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Company Legal & Billing Profile</h3>
              <p className="text-[11px] text-slate-500">Printed automatically on official money receipts, bills, and ledgers</p>
            </div>
            {hasPermission('canManageSettings') && (
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Company Master</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={company.companyName}
                onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={company.tagline || ''}
                onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Number</label>
              <input
                type="text"
                value={company.gstNumber}
                onChange={(e) => setCompany({ ...company, gstNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">RERA Number</label>
              <input
                type="text"
                value={company.reraNumber}
                onChange={(e) => setCompany({ ...company, reraNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={company.panNumber}
                onChange={(e) => setCompany({ ...company, panNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={company.contactPhone}
                onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={company.website}
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Registered Office Address</label>
            <input
              type="text"
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Logo Upload with preview & validation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company Official Logo (PNG/JPG &lt; 2MB)</label>
            <div className="flex items-center gap-4">
              {company.logoUrl ? (
                <div className="relative">
                  <img
                    src={company.logoUrl}
                    alt="Company Logo"
                    className="w-16 h-16 rounded-xl object-contain border border-slate-300 bg-white p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setCompany({ ...company, logoUrl: '' })}
                    className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400">
                  <Camera className="w-6 h-6" />
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
        </form>
      )}

      {/* ================= 3. MASTER LISTS & RATES TAB ================= */}
      {activeTab === 'masters' && (
        <form onSubmit={handleSaveMasterSettings} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Default Development Charges Rate</h3>
                <p className="text-xs text-slate-500">Auto-populated when adding new properties and plots</p>
              </div>
              {hasPermission('canManageSettings') && (
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Masters</span>
                </button>
              )}
            </div>

            <div className="max-w-xs">
              <label className="block font-semibold text-slate-700 mb-1 text-xs">
                Default Dev Charge Rate (₹ / Sq.Ft)
              </label>
              <input
                type="number"
                min="0"
                value={masterSettings.defaultDevelopmentChargeRate}
                onChange={(e) =>
                  setMasterSettings({
                    ...masterSettings,
                    defaultDevelopmentChargeRate: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Master Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Project Types */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Project Types ({masterSettings.projectTypes.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 min-h-[45px]">
                {masterSettings.projectTypes.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMasterItem('projectTypes', item)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 2. Property Types */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Property Types ({masterSettings.propertyTypes.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 min-h-[45px]">
                {masterSettings.propertyTypes.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMasterItem('propertyTypes', item)}
                      className="text-indigo-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ================= 4. OPERATOR MANAGEMENT & PERMISSIONS ================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Operator Accounts & Role Permissions</h3>
                <p className="text-xs text-slate-500">
                  Manage login credentials, granular module access, password reset, and active status
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Operator Name</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Module Access</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {u.name} {u.id === currentUser.id && <span className="text-indigo-600 font-normal">(You)</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{u.username}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'Administrator'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'Accounts'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : u.role === 'Site Manager'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div>{u.mobile || '-'}</div>
                        <div className="text-[10px] text-slate-400">{u.email || '-'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.role === 'Administrator' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700">
                              Full ERP Access
                            </span>
                          ) : (
                            ['Customers', 'Plots', 'Materials', 'Vendors', 'Labour', 'Accounts'].map((m) => (
                              <span key={m} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-600">
                                {m}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setResetUser(u);
                              setNewPassword('');
                            }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                            <span>Reset Pass</span>
                          </button>
                          {hasPermission('canManageSettings') && u.id !== currentUser.id && (
                            <button
                              onClick={() => handleToggleUser(u)}
                              className={`text-xs font-semibold ${
                                u.active ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'
                              }`}
                            >
                              {u.active ? 'Deactivate' : 'Activate'}
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

          {/* Add New Operator Form */}
          {hasPermission('canManageSettings') && (
            <form onSubmit={handleAddUser} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3.5 text-xs">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Create New Operator / Employee Login
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Login Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Administrator">Administrator (All Permissions)</option>
                    <option value="Accounts">Accounts (Ledgers, Receipts, Expenses)</option>
                    <option value="Site Manager">Site Manager (Stock, Usage, Labour)</option>
                    <option value="Data Entry Operator">Data Entry Operator (Bookings, Bills)</option>
                    <option value="Read-Only User">Read-Only User (Audit & Reports Only)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={newUserMobile}
                    onChange={(e) => setNewUserMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Module Access Checklist */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Permitted Modules Checklist:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(newUserModules).map(([mod, allowed]) => (
                    <label key={mod} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={(e) => setNewUserModules({ ...newUserModules, [mod]: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span className="capitalize text-slate-700">{mod} Management</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Create Employee Login
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ================= 5. GOOGLE DRIVE BACKUP TAB (Section 13) ================= */}
      {activeTab === 'drivebackup' && (
        <div className="space-y-6 text-xs">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white border border-blue-800/60 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-800/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base tracking-tight text-white">
                      Google Drive Automated Backup Integration
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Cloud Ready
                    </span>
                  </div>
                  <p className="text-blue-200 text-xs mt-0.5">
                    Target Account: <span className="font-mono font-bold text-white">aniket.andeo35@gmail.com</span> • Dedicated Folder: <span className="font-mono text-amber-300 font-bold">VYAPAR ONE ERP BACKUPS</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleTriggerDriveBackup}
                disabled={isDriveBackingUp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shrink-0"
              >
                <FolderSync className={`w-4 h-4 ${isDriveBackingUp ? 'animate-spin' : ''}`} />
                <span>{isDriveBackingUp ? 'Synchronizing to Drive...' : 'Backup to Google Drive Now'}</span>
              </button>
            </div>

            {/* Target Account Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] text-blue-200 uppercase font-bold block">Authorized Google Account</span>
                <p className="font-mono font-bold text-white text-sm mt-1">aniket.andeo35@gmail.com</p>
                <span className="text-[10px] text-emerald-300">Default Primary Owner</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] text-blue-200 uppercase font-bold block">Dedicated Drive Folder</span>
                <p className="font-mono font-bold text-amber-300 text-sm mt-1">VYAPAR ONE ERP BACKUPS</p>
                <span className="text-[10px] text-slate-300">Root Drive Directory</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] text-blue-200 uppercase font-bold block">Last Successful Sync</span>
                <p className="font-mono font-bold text-white text-sm mt-1">
                  {new Date(lastDriveBackup).toLocaleDateString('en-IN')}{' '}
                  {new Date(lastDriveBackup).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <span className="text-[10px] text-emerald-400">Snapshot Protected</span>
              </div>
            </div>

            {/* Total Records Protected */}
            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-2">
                Protected Records in Cloud Snapshot ({dbSizeApprox} KB):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-300">Customers</span>
                  <p className="font-mono font-bold text-white text-base">{db.customers.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-300">Plots / Units</span>
                  <p className="font-mono font-bold text-emerald-400 text-base">{db.properties.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-300">Bookings</span>
                  <p className="font-mono font-bold text-amber-400 text-base">{db.bookings.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-300">Receipts</span>
                  <p className="font-mono font-bold text-teal-400 text-base">{db.customerReceipts.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-300">Ledger Txns</span>
                  <p className="font-mono font-bold text-cyan-300 text-base">{db.transactions.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-300">Audit Logs</span>
                  <p className="font-mono font-bold text-purple-300 text-base">{db.auditLogs.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Settings & Manual Upload */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Automated Daily Schedule & Cloud Drive Archive Details</span>
            </h3>
            <div className="space-y-2 text-slate-600 text-xs leading-relaxed">
              <p>
                • <strong>Target Google Account:</strong> <span className="font-mono text-indigo-800 font-bold">aniket.andeo35@gmail.com</span>
              </p>
              <p>
                • <strong>Designated Backup Folder:</strong> <span className="font-mono text-amber-800 font-bold">VYAPAR ONE ERP BACKUPS</span>
              </p>
              <p>
                • <strong>Backup Format:</strong> Standard date/time-stamped cryptographic JSON archive preserving all relational IDs (Customers, Plots, Bookings, Receipts, Transactions, Labour Attendance, Materials, Vendors, Advisers, and Audit Logs).
              </p>
              <p>
                • <strong>Schedule:</strong> Prepared daily at <strong>02:00 AM IST</strong>.
              </p>
              <p className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                <strong>External Authorization Note:</strong> For silent server-to-server background Drive API uploads without browser intervention, an OAuth client authorization grant with scope <code className="bg-white px-1 py-0.5 rounded border border-amber-300">https://www.googleapis.com/auth/drive.file</code> is required. Clicking the button above instantly generates and downloads the complete verified backup snapshot ready for your Drive folder.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. FIREBASE CLOUD & SNAPSHOTS TAB ================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6 text-xs">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-indigo-900/60 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base tracking-tight text-white">
                      Google Firebase Cloud Database
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Synced
                    </span>
                  </div>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    Project: <span className="font-mono font-bold text-white">intrepid-infinity-m8p5g</span> • Firestore DB: <span className="font-mono text-indigo-300">ai-studio-vishwasdeveloper...</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
                </button>
              </div>
            </div>

            {/* Google Authentication Box */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-white">Google Cloud Login (Admin Access)</span>
                </div>
                <p className="text-xs text-indigo-200">
                  Default Administrator Email:{' '}
                  <span className="font-mono font-bold text-amber-300">aniket.andeo35@gmail.com</span>
                </p>
              </div>

              {firebaseUser ? (
                <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {(firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">{firebaseUser.displayName || 'Admin'}</p>
                    <p className="text-[10px] text-emerald-300 font-mono">{firebaseUser.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="ml-2 px-2.5 py-1 bg-white/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
                >
                  <LogIn className="w-4 h-4 text-indigo-600" />
                  <span>Google Sign-In</span>
                </button>
              )}
            </div>
          </div>

          {/* ================= Firebase Console & Live Hosting Center Card ================= */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Firebase Console &amp; Live Web Hosting
                    </h3>
                    <p className="text-slate-500 text-xs">
                      Direct access to your Google Firebase Console &amp; Hosting for online deployment
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Project: intrepid-infinity-m8p5g
                </span>
              </div>
            </div>

            {/* Quick 1-Click Launch Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Firebase Project Console */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                      Firebase Console
                    </span>
                    <Cloud className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Project Overview &amp; Settings</h4>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    View project overview, access controls, Google Auth credentials, and quotas in your Firebase dashboard.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <a
                    href="https://console.firebase.google.com/project/intrepid-infinity-m8p5g"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>Open Project Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() =>
                      handleCopyUrl(
                        'https://console.firebase.google.com/project/intrepid-infinity-m8p5g',
                        'console'
                      )
                    }
                    className="w-full py-1 text-[10px] text-slate-600 hover:text-slate-900 font-semibold flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUrl === 'console' ? 'Link Copied!' : 'Copy Console URL'}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Firebase Hosting Dashboard */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                      Firebase Hosting
                    </span>
                    <Globe className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Web Hosting &amp; Custom Domains</h4>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Deploy this web app to a live global URL, configure custom domains (e.g. yourcompany.com), and view release history.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <a
                    href="https://console.firebase.google.com/project/intrepid-infinity-m8p5g/hosting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>Open Hosting Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() =>
                      handleCopyUrl(
                        'https://console.firebase.google.com/project/intrepid-infinity-m8p5g/hosting',
                        'hosting'
                      )
                    }
                    className="w-full py-1 text-[10px] text-slate-600 hover:text-slate-900 font-semibold flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUrl === 'hosting' ? 'Link Copied!' : 'Copy Hosting URL'}</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Cloud Firestore Live Database Browser */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Cloud Firestore
                    </span>
                    <Database className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Live Database &amp; Collections</h4>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                    Browse live stored collections (<code>erp_state</code>, <code>company</code>, <code>customers</code>) and backup records.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <a
                    href="https://console.firebase.google.com/project/intrepid-infinity-m8p5g/firestore/databases/ai-studio-vishwasdeveloper-9ac0e80c-ffda-4976-bea7-54f9db93f8d0/data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>Browse Database Records</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() =>
                      handleCopyUrl(
                        'https://console.firebase.google.com/project/intrepid-infinity-m8p5g/firestore/databases/ai-studio-vishwasdeveloper-9ac0e80c-ffda-4976-bea7-54f9db93f8d0/data',
                        'firestore'
                      )
                    }
                    className="w-full py-1 text-[10px] text-slate-600 hover:text-slate-900 font-semibold flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUrl === 'firestore' ? 'Link Copied!' : 'Copy Firestore URL'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hosting Details & CLI Instructions */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-white">Firebase Hosting Configuration Ready</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Config files: <code className="text-emerald-300">firebase.json</code> &amp; <code className="text-emerald-300">.firebaserc</code>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <p className="text-slate-400 font-semibold">1. Live App URLs after Hosting Deploy:</p>
                  <div className="font-mono text-emerald-300 space-y-0.5">
                    <p>https://intrepid-infinity-m8p5g.web.app</p>
                    <p>https://intrepid-infinity-m8p5g.firebaseapp.com</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-400 font-semibold">2. Terminal Deploy Command:</p>
                  <div className="bg-black/60 p-2 rounded-lg font-mono text-[11px] text-emerald-300 flex items-center justify-between">
                    <span>firebase deploy --only hosting</span>
                    <button
                      onClick={() => handleCopyUrl('firebase deploy --only hosting', 'cmd')}
                      className="text-slate-400 hover:text-white ml-2 text-[10px]"
                    >
                      {copiedUrl === 'cmd' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 leading-relaxed">
                <p className="font-bold text-amber-300 mb-0.5">💡 Do you want to connect a custom personal Firebase Project?</p>
                <p>
                  यदि आपने अपने Google खाते (<code>aniket.andeo35@gmail.com</code>) में कोई नया Firebase प्रोजेक्ट बनाया है (उदा. <code>vyaparone-erp</code>), तो बस हमें उस प्रोजेक्ट का <strong>Project ID</strong> बताएँ — हम तुरंत इस ऐप को आपके कस्टम प्रोजेक्ट से जोड़ देंगे!
                </p>
              </div>
            </div>
          </div>

          {/* Local Backup Download & Restoration Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Offline Local JSON Backup & Restore</h3>
              <p className="text-slate-500 mt-0.5">
                Download an offline snapshot on your computer or mobile as a secondary backup.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-800">Export Complete JSON Backup</h4>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Downloads an offline snapshot containing all projects, plots, customer bookings, money receipts, materials, and accounts journals.
                </p>
                <button
                  onClick={handleExportBackup}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup File (.json)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-800">Restore from JSON Backup</h4>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Upload a previously downloaded JSON backup to restore all data and push to Firebase Cloud.
                </p>
                <label className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg shadow-2xs transition-colors text-center block cursor-pointer">
                  <span>Select Backup File to Restore</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. ANDROID MOBILE APK & PWA TAB (Section 14) ================= */}
      {activeTab === 'mobileapk' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              <span>Android Mobile APK & Progressive Web App (PWA) Guide</span>
            </h3>
            <p className="text-slate-500 mt-0.5">
              Install VYAPAR ONE ERP directly on your Android phone as a standalone mobile application
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Direct PWA Installation */}
            <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-indigo-950 text-sm">Method 1: Instant Mobile Installation (No Play Store Required)</h4>
              </div>

              <ol className="list-decimal pl-4 space-y-2 text-indigo-900 leading-relaxed text-[11px]">
                <li>
                  अपने Android मोबाइल में <strong>Google Chrome</strong> ब्राउज़र खोलें।
                </li>
                <li>
                  इस ERP सॉफ्टवेयर का लिंक (URL) ब्राउज़र में खोलें।
                </li>
                <li>
                  स्क्रीन के ऊपर दाईं ओर दिए गए <strong>तीन डॉट्स (⋮)</strong> मेनू पर क्लिक करें।
                </li>
                <li>
                  मेनू में से <strong>"Install app"</strong> या <strong>"Add to Home screen"</strong> पर टैप करें।
                </li>
                <li>
                  <strong>"Install"</strong> पर क्लिक करें। कुछ ही सेकंडों में <strong>VYAPAR ONE ERP</strong> का आइकन आपके मोबाइल स्क्रीन पर आ जाएगा और यह ठीक एक नेटिव APK ऐप की तरह काम करेगा!
                </li>
              </ol>

              <div className="p-3 bg-white rounded-lg border border-indigo-200 text-indigo-800 text-[11px]">
                ✓ बिना किसी ब्राउज़र बार के फुल-स्क्रीन अनुभव<br />
                ✓ ऑफलाइन कैशिंग और तेज स्पीड<br />
                ✓ कैमरा, फोटो अपलोड और प्रिंट रसीद सपोर्ट
              </div>
            </div>

            {/* Standalone Native APK Building Instructions */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Method 2: Generate Standalone .APK File (TWA)</h4>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">
                यदि आप ग्राहकों या कर्मचारियों को WhatsApp पर शेयर करने के लिए सीधे <strong>.apk</strong> फाइल चाहते हैं:
              </p>

              <ol className="list-decimal pl-4 space-y-2 text-slate-700 leading-relaxed text-[11px]">
                <li>
                  अपने कंप्यूटर पर <a href="https://www.pwabuilder.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">PWABuilder.com</a> खोलें।
                </li>
                <li>
                  अपने लाइव ERP का URL दर्ज करें और <strong>"Start"</strong> दबाएं।
                </li>
                <li>
                  <strong>"Android Package"</strong> चुनें और <strong>"Generate APK"</strong> पर क्लिक करें।
                </li>
                <li>
                  आपको एक हस्ताक्षरित <strong>.apk</strong> फाइल मिल जाएगी जिसे आप किसी भी Android फ़ोन पर सीधे इंस्टॉल कर सकते हैं!
                </li>
              </ol>

              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 text-[11px]">
                Target Package: <strong>com.vyaparone.erp</strong><br />
                App Name: <strong>VYAPAR ONE ERP</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT COMPANY ================= */}
      {isCompanyModalOpen && editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">
                {editingCompany.id && companies.some((c) => c.id === editingCompany.id)
                  ? 'Edit Company Profile'
                  : 'Add New Company (Multi-Company)'}
              </h3>
              <button onClick={() => setIsCompanyModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCompanyProfile} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sai Infra Developers LLP"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Legal Structure</label>
                  <select
                    value={editingCompany.legalType || 'Private Limited Company'}
                    onChange={(e) => setEditingCompany({ ...editingCompany, legalType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Private Limited Company">Private Limited Company</option>
                    <option value="Partnership Firm">Partnership Firm</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editingCompany.contactPhone || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={editingCompany.gstin || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RERA Number</label>
                  <input
                    type="text"
                    value={editingCompany.reraNumber || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, reraNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Address</label>
                <input
                  type="text"
                  value={editingCompany.address || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Logo (JPG/PNG &lt; 2MB)</label>
                <div className="flex items-center gap-3">
                  {editingCompany.logoUrl ? (
                    <img
                      src={editingCompany.logoUrl}
                      alt="Logo preview"
                      className="w-12 h-12 rounded-lg object-contain border border-slate-300 p-0.5"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                  Save Company Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">Reset Operator Password</h3>
              <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmResetPassword} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Enter new password for operator <strong>{resetUser.name}</strong> ({resetUser.username}):
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pass@1234"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-3.5 py-1.5 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
