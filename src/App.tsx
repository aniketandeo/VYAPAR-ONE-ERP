import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { dbService, DatabaseState } from './services/storage';
import { Header } from './components/common/Header';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { CustomerEntryView } from './components/customers/CustomerEntryView';
import { PlotFlatManagementView } from './components/properties/PlotFlatManagementView';
import { MaterialManagementView } from './components/materials/MaterialManagementView';
import { VendorManagementView } from './components/vendors/VendorManagementView';
import { LabourManagementView } from './components/labour/LabourManagementView';
import { AdviserManagementView } from './components/advisers/AdviserManagementView';
import { AccountsView } from './components/accounts/AccountsView';
import { ReportsView } from './components/reports/ReportsView';
import { MasterSettingsView } from './components/settings/MasterSettingsView';
import { MobileAppView } from './components/mobile/MobileAppView';
import { LandingPageView } from './components/public/LandingPageView';
import { formatCurrency, formatDate } from './utils/formatters';
import { Bell, X, AlertCircle, Clock } from 'lucide-react';

function MainERPContent() {
  const { isAuthenticated } = useAuth();
  const [db, setDb] = useState<DatabaseState>(() => dbService.getDatabase());
  const [currentView, setCurrentView] = useState<'website' | 'erp'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vishwas_erp_view_mode');
      if (saved === 'erp' && localStorage.getItem('vishwas_is_authenticated') === 'true') {
        return 'erp';
      }
    }
    return 'website'; // Default: First show public company website
  });

  const [appMode, setAppMode] = useState<'web' | 'mobile'>('web');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedReportCategory, setSelectedReportCategory] = useState<string>('customer');
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);

  // Subscribe to live database updates across tabs and mobile views
  useEffect(() => {
    const unsubscribe = dbService.subscribe(() => {
      setDb(dbService.getDatabase());
    });
    return unsubscribe;
  }, []);

  const handleEnterERP = () => {
    setCurrentView('erp');
    if (typeof window !== 'undefined') {
      localStorage.setItem('vishwas_erp_view_mode', 'erp');
    }
  };

  const handleSwitchToWebsite = () => {
    setCurrentView('website');
    if (typeof window !== 'undefined') {
      localStorage.setItem('vishwas_erp_view_mode', 'website');
    }
  };

  // If user is not authenticated and view is ERP, default to public website
  if (!isAuthenticated && currentView === 'erp') {
    return (
      <LandingPageView
        db={db}
        onEnterERP={handleEnterERP}
      />
    );
  }

  // 1. PUBLIC WEBSITE / LANDING PAGE (First screen visible to visitors)
  if (currentView === 'website') {
    return (
      <LandingPageView
        db={db}
        onEnterERP={handleEnterERP}
      />
    );
  }

  // 2. ERP SOFTWARE SUITE (Visible after Portal Login)
  const today = new Date().toISOString().split('T')[0];
  const dueVendorBills = db.materialPurchases.filter(
    (b) => b.outstandingAmount > 0 && b.paymentDueDate && b.paymentDueDate <= today
  );
  const upcomingVendorBills = db.materialPurchases.filter(
    (b) => b.outstandingAmount > 0 && b.paymentDueDate && b.paymentDueDate > today
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* If Mobile Mode selected, render dedicated Android Mobile App View */}
      {appMode === 'mobile' ? (
        <MobileAppView db={db} onSwitchToWeb={() => setAppMode('web')} />
      ) : (
        /* Full Web Application */
        <div className="flex-1 flex flex-col">
          <Header
            appMode={appMode}
            setAppMode={setAppMode}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            onOpenReminders={() => setIsRemindersOpen(true)}
            onSwitchToWebsite={handleSwitchToWebsite}
          />

          <div className="flex-1 flex overflow-hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 overflow-y-auto bg-slate-50">
              {activeTab === 'dashboard' && (
                <DashboardView
                  db={db}
                  selectedProjectId={selectedProjectId}
                  setSelectedProjectId={setSelectedProjectId}
                  setActiveTab={setActiveTab}
                  onSelectReportTab={(cat) => setSelectedReportCategory(cat)}
                />
              )}

              {activeTab === 'projects' && <ProjectsView db={db} />}

              {activeTab === 'customers' && <CustomerEntryView db={db} />}

              {activeTab === 'plots-flats' && <PlotFlatManagementView db={db} />}

              {activeTab === 'materials' && <MaterialManagementView db={db} />}

              {activeTab === 'vendors' && <VendorManagementView db={db} />}

              {activeTab === 'labour' && <LabourManagementView db={db} />}

              {activeTab === 'advisers' && <AdviserManagementView db={db} />}

              {activeTab === 'accounts' && <AccountsView db={db} />}

              {activeTab === 'reports' && (
                <ReportsView db={db} initialReportCategory={selectedReportCategory} />
              )}

              {activeTab === 'settings' && <MasterSettingsView db={db} />}
            </main>
          </div>
        </div>
      )}

      {/* Due Payment Reminders Drawer / Modal */}
      {isRemindersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm">Payment Due Reminders</h3>
              </div>
              <button
                onClick={() => setIsRemindersOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="font-bold text-rose-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Due Today & Overdue Vendor Payments ({dueVendorBills.length})</span>
                </h4>
                {dueVendorBills.length > 0 ? (
                  <div className="space-y-2">
                    {dueVendorBills.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{b.vendorName}</p>
                          <p className="text-[10px] text-slate-500">
                            Bill #{b.billNumber} • Due Date: {formatDate(b.paymentDueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-rose-700">
                            {formatCurrency(b.outstandingAmount)}
                          </p>
                          <button
                            onClick={() => {
                              setIsRemindersOpen(false);
                              setActiveTab('materials');
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                          >
                            Pay in Materials ↗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No overdue vendor bills at present.</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Upcoming Dues ({upcomingVendorBills.length})</span>
                </h4>
                <div className="space-y-2">
                  {upcomingVendorBills.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{b.vendorName}</p>
                        <p className="text-[10px] text-slate-500">
                          Due: {formatDate(b.paymentDueDate)}
                        </p>
                      </div>
                      <p className="font-mono font-semibold text-slate-800">
                        {formatCurrency(b.outstandingAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsRemindersOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainERPContent />
    </AuthProvider>
  );
}
