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
  MessageCircle,
  Palette,
  ShieldAlert,
  LogOut,
  X,
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
  const { user, logout } = useAuth();

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'payment-links', label: 'Payment Links', icon: Link2 },
    { id: 'customize', label: 'Payment Page Design', icon: Palette },
    { id: 'subscriptions', label: 'My Subscriptions', icon: Sliders },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  ];

  const settingsNav = [
    { id: 'integrations', label: 'Integrations', icon: Sliders },
    { id: 'admin', label: 'Admin Panel', icon: ShieldAlert },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'documentation', label: 'Documentation', icon: BookOpen },
    { id: 'status', label: 'System Status', icon: Activity },
  ];

  const handleNavClick = (id: string) => {
    onSelectNav(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a101d] text-slate-300 flex flex-col justify-between border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Logo */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-purple-600/30">
                FG
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-white tracking-tight leading-none">FAMGATEWAY</span>
                <span className="text-[10px] text-purple-400 font-bold mt-0.5">FamPay Engine</span>
              </div>
            </div>

            <button onClick={onCloseMobile} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* MAIN section */}
            <div>
              <div className="px-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                Main
              </div>
              <div className="space-y-1">
                {mainNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SETTINGS section */}
            <div>
              <div className="px-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                Settings
              </div>
              <div className="space-y-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* WhatsApp Support button */}
                <a
                  href="https://wa.me/911234567890"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-950/30 transition-all border border-transparent hover:border-emerald-500/20 mt-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Support</span>
                </a>

                {/* Direct Logout Option in Navigation */}
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-all border border-transparent hover:border-rose-500/20 mt-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-3 border-t border-slate-800/80 bg-[#070b14]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-2.5 overflow-hidden text-left cursor-pointer flex-1 mr-2 hover:opacity-80 transition-opacity"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-indigo-500/40 shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    {user.name}
                    {user.role === 'admin' && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30 font-mono">
                        ADM
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                }}
                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-all shrink-0 cursor-pointer"
                title="Log Out of Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
