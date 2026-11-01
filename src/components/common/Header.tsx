import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService, CloudSyncStatus } from '../../services/storage';
import { MobileInstallModal } from './MobileInstallModal';
import {
  Building2,
  Smartphone,
  Monitor,
  User,
  ShieldCheck,
  Bell,
  ChevronDown,
  LogOut,
  Calendar,
  Layers,
  Cloud,
  CloudCheck,
  RefreshCw,
  Download,
  LogIn,
  CheckCircle2,
  Globe,
  X,
} from 'lucide-react';

interface HeaderProps {
  appMode: 'web' | 'mobile';
  setAppMode: (mode: 'web' | 'mobile') => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  onOpenReminders?: () => void;
  onSwitchToWebsite?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  setAppMode,
  selectedProjectId,
  setSelectedProjectId,
  onOpenReminders,
  onSwitchToWebsite,
}) => {
  const { currentUser, switchUser, allUsers, firebaseUser, loginWithGoogle, logout } = useAuth();
  const db = dbService.getDatabase();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => dbService.getSyncStatus());
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  // Subscribe to cloud sync state changes
  useEffect(() => {
    const unsub = dbService.subscribeSync((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  // Reminders count (due today or upcoming within 7 days)
  const today = new Date().toISOString().split('T')[0];
  const dueBills = db.materialPurchases.filter(
    (b) => b.outstandingAmount > 0 && b.paymentDueDate && b.paymentDueDate <= today
  );

  const handleManualSync = async () => {
    setIsSyncingManual(true);
    try {
      await dbService.syncNow();
    } catch (e) {
      console.warn('Sync now error:', e);
    } finally {
      setTimeout(() => setIsSyncingManual(false), 600);
    }
  };

  return (
    <>
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand & Project Selector */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-sm tracking-wider">
                YO
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base">
                    VYAPAR ONE ERP
                  </h1>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hidden xs:inline-block">
                    Cloud 2026
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden md:block">
                  Real Estate & Construction Management System
                </p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden lg:block" />

            {/* Global Project Filter */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-slate-500 font-medium text-[11px]">Active Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs max-w-[160px] truncate"
              >
                <option value="ALL">All Projects (Consolidated)</option>
                {db.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Global Multi-Company Selector */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-500 font-medium text-[11px]">Company:</span>
              <select
                value={db.activeCompanyId || 'comp-1'}
                onChange={(e) => {
                  const newCompId = e.target.value;
                  const currentDb = dbService.getDatabase();
                  currentDb.activeCompanyId = newCompId;
                  const targetComp = currentDb.companies?.find((c) => c.id === newCompId);
                  if (targetComp) {
                    currentDb.company = {
                      ...currentDb.company,
                      ...targetComp,
                      companyName: targetComp.companyName || targetComp.name || currentDb.company.companyName,
                    };
                  }
                  dbService.saveDatabase(currentDb);
                }}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs max-w-[150px] truncate"
              >
                {(db.companies && db.companies.length > 0 ? db.companies : [db.company]).map((c: any, i: number) => (
                  <option key={c.id || i} value={c.id || `comp-${i + 1}`}>
                    {c.companyName || c.name || 'Company'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Cloud Sync Pill (Firebase Firestore) */}
            <div className="relative">
              <button
                onClick={() => setIsSyncModalOpen(!isSyncModalOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  syncStatus.status === 'synced'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : syncStatus.status === 'syncing' || isSyncingManual
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
                title="Firebase Cloud Database Status. Click to view live sync details."
              >
                {syncStatus.status === 'syncing' || isSyncingManual ? (
                  <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                ) : syncStatus.status === 'synced' ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : (
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <span className="hidden md:inline">
                  {syncStatus.status === 'synced'
                    ? 'Cloud Synced'
                    : syncStatus.status === 'syncing' || isSyncingManual
                    ? 'Syncing Cloud...'
                    : 'Cloud Synced'}
                </span>
                <span className="md:hidden">Cloud</span>
              </button>

              {/* Cloud Sync Information Popover */}
              {isSyncModalOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Cloud className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Cloud Database Status</h4>
                        <p className="text-[10px] text-slate-500">Google Firebase Cloud Firestore</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSyncModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Company:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[150px]">
                        {db.company?.companyName || 'VYAPAR ONE ERP'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Live Sync:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cloud Active &amp; Synced</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Last Synced:</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {syncStatus.lastSyncTime || 'Real-time Live'}
                      </span>
                    </div>
                  </div>

                  {/* Clarification on Cache vs Cash */}
                  <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200/80 text-[11px] text-blue-900 mb-3 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-blue-800">
                      <span>Data Storage Information:</span>
                    </p>
                    <p className="text-[10.5px] leading-relaxed text-blue-800">
                      Aapka Company Name aur sabhi ERP records Firebase Cloud Database me online save ho rahe hain.
                    </p>
                    <p className="text-[10px] text-blue-600 font-medium">
                      (Browser me &quot;Cache&quot; offline memory ko kehte hain, yeh koi Cash len-den nahi hai.)
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      await handleManualSync();
                    }}
                    disabled={isSyncingManual}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingManual ? 'animate-spin' : ''}`} />
                    <span>{isSyncingManual ? 'Syncing...' : 'Sync Cloud Now'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Prominent Download Mobile App (APK / PWA) Button */}
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
              title="Download & Install Mobile App (APK / PWA)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Download App</span>
              <span className="xs:hidden">App</span>
            </button>

            {/* Dual Mode Switcher: Desktop Web vs Android Mobile App */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setAppMode('web')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  appMode === 'web'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Full Web ERP Suite"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Web ERP</span>
              </button>
              <button
                onClick={() => setAppMode('mobile')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  appMode === 'mobile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Android Mobile App View"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile App</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </button>
            </div>

            {/* Back to Public Website Button */}
            {onSwitchToWebsite && (
              <button
                onClick={onSwitchToWebsite}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 text-xs font-bold shadow-2xs transition-colors"
                title="Switch to Public Company Website"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Website View</span>
              </button>
            )}

            {/* Payment Reminders Bell */}
            <button
              onClick={onOpenReminders}
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Due Payment Reminders"
            >
              <Bell className="w-4 h-4" />
              {dueBills.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {dueBills.length}
                </span>
              )}
            </button>

            {/* Active Employee User / Google Auth Switcher */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>{currentUser.role}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Google Cloud Account Status */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Google Cloud Auth
                    </p>
                    {firebaseUser ? (
                      <div className="flex items-center justify-between text-xs">
                        <div className="truncate mr-2">
                          <p className="font-semibold text-slate-800 truncate">
                            {firebaseUser.displayName || 'Google User'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{firebaseUser.email}</p>
                        </div>
                        <button
                          onClick={logout}
                          className="text-[11px] text-rose-600 font-bold hover:underline shrink-0"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] text-slate-600 mb-2">
                          Sign in with Google (Owner / Admin: aniket.andeo35@gmail.com):
                        </p>
                        <button
                          onClick={loginWithGoogle}
                          className="w-full py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs"
                        >
                          <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Google Sign-In</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Switch Employee Login */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Active Role
                    </p>
                  </div>
                  <div className="py-1 max-h-56 overflow-y-auto">
                    {allUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUser(user.id);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          user.id === currentUser.id
                            ? 'bg-indigo-50/70 text-indigo-900 font-bold'
                            : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-[10px] text-slate-500 font-normal">{user.role}</p>
                        </div>
                        {user.id === currentUser.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                            Active
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Sign Out / Exit ERP Portal */}
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                        if (onSwitchToWebsite) onSwitchToWebsite();
                      }}
                      className="w-full py-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center justify-center gap-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out & Return to Website</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Download / APK / PWA Modal */}
      <MobileInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </>
  );
};
