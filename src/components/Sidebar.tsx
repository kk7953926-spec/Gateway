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

        {/* Footer: User Profile & Quick Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b15] space-y-2">
          {/* User Profile Card */}
          <div
            onClick={() => handleNavClick('settings')}
            className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 cursor-pointer transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5 truncate mr-1">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || 'M'}
                </div>
              )}
              <div className="truncate text-left">
                <div className="text-xs font-bold text-slate-200 truncate group-hover:text-white leading-tight">
                  {user?.name || 'Merchant'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate leading-tight mt-0.5">
                  {user?.email || user?.fampay_upi_id || '8056317218@fam'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
          </div>

          {/* Prominent Logout Button */}
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out / Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
