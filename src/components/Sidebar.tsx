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
  Lock,
  Zap,
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

  const isAdmin = user?.role === 'admin';

  const daysLeft = user?.subscription_expires_at
    ? Math.max(0, Math.ceil((new Date(user.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isSubActive = Boolean(
    user &&
    user.subscription_status !== 'expired' &&
    user.subscription_status !== 'inactive' &&
    user.subscription_expires_at &&
    new Date(user.subscription_expires_at).getTime() > Date.now()
  );

  const navGroups = [
    {
      title: 'Core Gateway',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, locked: !isSubActive },
        { id: 'transactions', label: 'Transactions', icon: CreditCard, locked: !isSubActive },
        { id: 'payment-links', label: 'Payment Links', icon: Link2, locked: !isSubActive },
        { id: 'customize', label: 'Checkout Design', icon: Palette, locked: !isSubActive },
        {
          id: 'subscriptions',
          label: 'Premium Plan',
          icon: Zap,
          locked: false,
          badge: !isSubActive ? 'Activate' : `${daysLeft}d left`,
          badgeColor: !isSubActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        },
      ],
    },
    {
      title: 'Integrations & API',
      items: [
        { id: 'integrations', label: 'IMAP & UPI Routing', icon: Sliders, locked: !isSubActive },
        { id: 'api-keys', label: 'API Credentials', icon: Key, locked: !isSubActive },
        { id: 'webhooks', label: 'Webhooks & Events', icon: Webhook, locked: !isSubActive },
        { id: 'documentation', label: 'API Reference', icon: BookOpen, locked: !isSubActive },
      ],
    },
    {
      title: 'Account & System',
      items: [
        ...(isAdmin ? [{ id: 'admin', label: 'Admin Command', icon: ShieldAlert, locked: false }] : []),
        { id: 'settings', label: 'Profile', icon: UserIcon, locked: false },
        { id: 'status', label: 'Platform Status', icon: Activity, locked: false },
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
              onClick={() => handleNavClick(isSubActive ? 'dashboard' : 'subscriptions')}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30 shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm text-white tracking-tight leading-tight group-hover:text-purple-300 transition-colors">
                  Fam Pay
                </span>
                <span className="text-[10px] text-purple-400 font-mono tracking-wider font-bold">
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
                            : item.locked
                            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? 'text-white'
                                : item.locked
                                ? 'text-slate-500'
                                : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {item.badge && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                item.badgeColor || 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.locked && (
                            <span title="Locked - Subscription required" className="inline-flex items-center">
                              <Lock className="w-3 h-3 text-amber-400/80 shrink-0" />
                            </span>
                          )}
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                        </div>
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
          {/* Subscription Status Banner */}
          {!isSubActive ? (
            <div
              onClick={() => handleNavClick('subscriptions')}
              className="p-2.5 rounded-xl bg-gradient-to-r from-rose-950/80 to-amber-950/80 border border-rose-800/80 text-rose-200 cursor-pointer hover:border-rose-500 transition-all flex items-center justify-between group shadow-sm"
              title="Click to activate subscription"
            >
              <div className="flex items-center gap-2 truncate">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="text-left truncate">
                  <div className="text-[11px] font-bold text-white leading-tight truncate">Plan Expired · Locked</div>
                  <div className="text-[10px] text-rose-300 leading-tight truncate">Click to Activate & Unlock</div>
                </div>
              </div>
              <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            </div>
          ) : (
            <div
              onClick={() => handleNavClick('subscriptions')}
              className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 cursor-pointer hover:border-emerald-600 transition-colors flex items-center justify-between text-[11px] font-medium"
              title="Manage subscription plan"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-bold">Pro Active</span>
                <span className="text-emerald-400 font-mono text-[10px]">({daysLeft}d left)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          )}

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
                  {user?.fampay_upi_id || user?.email || 'Setup Required'}
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
