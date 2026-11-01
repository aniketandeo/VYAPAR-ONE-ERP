import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  UserPlus,
  Home,
  Truck,
  Store,
  Users,
  Award,
  Wallet,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'projects'
  | 'customers'
  | 'plots-flats'
  | 'materials'
  | 'vendors'
  | 'labour'
  | 'advisers'
  | 'accounts'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: '2. Projects', icon: FolderKanban },
    { id: 'customers', label: '3. Customer Entry', icon: UserPlus },
    { id: 'plots-flats', label: '4. Customer Management', icon: Home },
    { id: 'materials', label: '5. Material Management', icon: Truck },
    { id: 'vendors', label: '6. Vendor Management', icon: Store },
    { id: 'labour', label: '7. Labour Management', icon: Users },
    { id: 'advisers', label: '8. Adviser Management', icon: Award },
    { id: 'accounts', label: '9. Accounts', icon: Wallet },
    { id: 'reports', label: '10. Reports', icon: FileSpreadsheet },
    { id: 'settings', label: '11. Master Settings', icon: Settings },
  ];

  return (
    <aside className="no-print w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-[calc(100vh-4rem)]">
      {/* Menu Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          MAIN ERP MENU
        </span>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
          ONLINE
        </span>
      </div>

      {/* Nav List */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                }`}
              />
              <span className="truncate flex-1 text-left">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 bg-slate-950/40">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-400">Database Engine</span>
          <span className="text-emerald-400 font-mono text-[10px]">Real Store</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Live sync active between Web ERP & Mobile Application.
        </p>
      </div>
    </aside>
  );
};
