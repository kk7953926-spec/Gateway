import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Link2,
  Key,
  Webhook,
  Sliders,
  User as UserIcon,
  BookOpen,
  Activity,
  Palette,
  ShieldAlert,
  LogOut,
  X,
  Wallet,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentNav: string;
  onSelectNav: (nav: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout, siteSettings } = useAuth();

  const navGroups = [
    {
      title: 'Core Gateway',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'payment-links', label: 'Payment Links', icon: Link2 },
        { id: 'customize', label: 'Checkout Design', icon: Palette },
        { id: 'subscriptions', label: 'Plans & Billing', icon: Sliders },
      ],
    },
    {
      title: 'Integrations & API',
      items: [
        { id: 'integrations', label: 'IMAP & UPI Routing', icon: Sliders },
        { id: 'api-keys', label: 'API Credentials', icon: Key },
        { id: 'webhooks', label: 'Webhooks & Events', icon: Webhook },
        { id: 'documentation', label: 'API Reference', icon: BookOpen },
      ],
    },
    {
      title: 'Account & System',
      items: [
        ...(user?.role === 'admin' || user?.email === 'kalam172010@gmail.com' || user?.email === 'kk7953926@gmail.com'
          ? [{ id: 'admin', label: 'Admin Command', icon: ShieldAlert }]
          : []),
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'status', label: 'Platform Status', icon: Activity },
      ],
    },
  ];

  const handleNavClick = (id: string) => {
    onSelectNav(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0f1d] text-slate-300 flex flex-col justify-between border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleNavClick('dashboard')}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-600/30 overflow-hidden shrink-0">
                {siteSettings.site_logo_url ? (
                  <img src={siteSettings.site_logo_url} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <span>{siteSettings.site_name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white tracking-tight leading-tight group-hover:text-indigo-300 transition-colors">
                  {siteSettings.site_name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                  UPI GATEWAY
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-175px)]">
            {navGroups.map((group, idx) => (
              <div key={idx}>
                <div className="px-3 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      currentNav === item.id ||
                      (item.id === 'settings' && currentNav === 'profile') ||
                      (item.id === 'profile' && currentNav === 'settings');
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer: User Wallet & Quick Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b15]">
          {/* Wallet Mini-Card */}
          <div
            onClick={() => handleNavClick('transactions')}
            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all mb-2.5 group"
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3 h-3 text-indigo-400" />
                <span>Settled Balance</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">LIVE</span>
            </div>
            <div className="text-sm font-bold font-mono text-white tabular-nums group-hover:text-indigo-300 transition-colors">
              ₹{(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* User Profile / Logout Row */}
          <div className="flex items-center justify-between px-1.5 pt-1">
            <div
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2 cursor-pointer truncate mr-2 group"
            >
              <div className="w-6 h-6 rounded-md bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-bold flex items-center justify-center shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'M'}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-medium text-slate-300 truncate group-hover:text-white leading-tight">
                  {user?.name || 'Merchant'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate leading-tight">
                  {user?.fampay_upi_id || '8056317218@fam'}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
