import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { LiveVisitorsModal } from './components/LiveVisitorsModal';
import { DashboardView } from './pages/DashboardView';
import { TransactionsView } from './pages/TransactionsView';
import { PaymentLinksView } from './pages/PaymentLinksView';
import { ApiKeysView } from './pages/ApiKeysView';
import { WebhooksView } from './pages/WebhooksView';
import { IntegrationsView } from './pages/IntegrationsView';
import { ProfileView } from './pages/ProfileView';
import { SettingsView } from './pages/SettingsView';
import { DocumentationView } from './pages/DocumentationView';
import { SystemStatusView } from './pages/SystemStatusView';
import { PublicCheckoutView } from './pages/PublicCheckoutView';
import { CustomizeView } from './pages/CustomizeView';
import { AdminPage } from './pages/AdminPage';
import { SubscriptionView } from './pages/SubscriptionView';
import { SubscriptionLockoutView } from './components/SubscriptionLockoutView';
import { TelegramFloatingButton } from './components/TelegramFloatingButton';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import {
  Menu,
  ShieldCheck,
  Users,
  Activity,
  User as UserIcon,
  Sparkles,
  ShoppingBag,
  Box,
  Zap,
  Wallet,
  Link2,
  CreditCard,
  LayoutGrid,
  Plus,
  LogOut,
  Lock,
  RefreshCw,
  Settings as SettingsIcon
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, logout, token, refreshProfile } = useAuth();
  const [currentNav, setCurrentNav] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [liveModalOpen, setLiveModalOpen] = useState<boolean>(false);
  const [liveCount, setLiveCount] = useState<number>(1);
  const [togglingSub, setTogglingSub] = useState<boolean>(false);

  const isAdmin = user?.role === 'admin';

  const daysLeft = user?.subscription_expires_at
    ? Math.max(0, Math.ceil((new Date(user.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Strict subscription check:
  // Must NOT be explicitly 'expired' or 'inactive', and must have positive duration left
  const isSubscriptionActive = Boolean(
    user &&
    user.subscription_status !== 'expired' &&
    user.subscription_status !== 'inactive' &&
    user.subscription_expires_at &&
    new Date(user.subscription_expires_at).getTime() > Date.now()
  );

  const handleToggleSubscription = async () => {
    if (!token) return;
    setTogglingSub(true);
    try {
      const nextTarget = isSubscriptionActive ? 'expired' : 'active';
      const res = await fetch('/api/user/toggle-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStatus: nextTarget,
          planId: 'Pro Business Tier',
        }),
      });
      if (res.ok) {
        await refreshProfile();
      }
    } catch {
      // Ignore
    } finally {
      setTogglingSub(false);
    }
  };

  // Check if current URL is a customer payment checkout route
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const isPayRoute =
    pathname.startsWith('/pay/') ||
    pathname === '/pay' ||
    searchParams.has('pay') ||
    searchParams.has('order_id');
  const payLinkId =
    pathname.split('/pay/')[1] ||
    searchParams.get('pay') ||
    searchParams.get('order_id') ||
    'demo_link';

  // Heartbeat ping to track active website visitors & customers
  useEffect(() => {
    const pingServer = async () => {
      try {
        const res = await fetch('/api/public/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: window.location.pathname,
            referrer: document.referrer,
            isCheckout: isPayRoute,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.activeCount) {
            setLiveCount(data.activeCount);
          }
        }
      } catch {
        // Ignore ping error
      }
    };

    pingServer();
    const interval = setInterval(pingServer, 10000);
    return () => clearInterval(interval);
  }, [isPayRoute]);

  if (isPayRoute) {
    return <PublicCheckoutView linkId={payLinkId} />;
  }

  // If merchant user is not authenticated
  if (!user) {
    if (authMode === 'register') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
      </div>
    );
  }

  // Render merchant dashboard view based on navigation
  const renderView = () => {
    // Strict subscription lockout: if plan is expired/inactive, lock all merchant tools!
    if (!isSubscriptionActive) {
      if (currentNav === 'subscriptions') {
        return <SubscriptionView />;
      }
      if (currentNav === 'settings' || currentNav === 'profile') {
        return <SettingsView onNavigate={setCurrentNav} />;
      }
      return <SubscriptionLockoutView onNavigate={setCurrentNav} />;
    }

    switch (currentNav) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentNav} />;
      case 'transactions':
        return <TransactionsView />;
      case 'payment-links':
        return <PaymentLinksView onNavigate={setCurrentNav} />;
      case 'customize':
        return <CustomizeView />;
      case 'api-keys':
        return <ApiKeysView onNavigate={setCurrentNav} />;
      case 'webhooks':
        return <WebhooksView onNavigate={setCurrentNav} />;
      case 'integrations':
        return <IntegrationsView />;
      case 'admin':
        return <AdminPage />;
      case 'subscriptions':
        return <SubscriptionView />;
      case 'settings':
      case 'profile':
        return <SettingsView onNavigate={setCurrentNav} />;
      case 'documentation':
        return <DocumentationView />;
      case 'status':
        return <SystemStatusView />;
      default:
        return <DashboardView onNavigate={setCurrentNav} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* Live Visitors Modal */}
      <LiveVisitorsModal
        isOpen={liveModalOpen}
        onClose={() => setLiveModalOpen(false)}
      />

      {/* Sidebar Drawer */}
      <Sidebar
        currentNav={currentNav}
        onSelectNav={setCurrentNav}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen w-full">
        {/* Top Navbar Header (Visible on Desktop and Mobile) */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-[#0a0f1d] text-white flex items-center justify-between border-b border-slate-800/80 sticky top-0 z-30 shadow-xs">
          {/* Zone 1: Contextual Breadcrumb & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 lg:hidden hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Mobile Brand Identity */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-xs">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="font-black text-sm text-white tracking-tight">Fam Pay</span>
            </div>

            {/* Breadcrumb Trail */}
            <nav className="hidden lg:flex items-center gap-2 text-xs font-medium" aria-label="Breadcrumb">
              <span className="text-slate-400">Fam Pay</span>
              <span className="text-slate-600" aria-hidden="true">/</span>
              <span className="text-slate-400">Console</span>
              <span className="text-slate-600" aria-hidden="true">/</span>
              <span className="text-white font-semibold capitalize">
                {currentNav === 'subscriptions' ? 'Premium Plan' : currentNav.replace('-', ' ')}
              </span>
            </nav>
          </div>

          {/* Zone 2: Real-time Status Badges & Quick Plan Controls */}
          <div className="hidden md:flex items-center gap-3 text-xs font-mono">
            {/* Live active visitors */}
            <button
              onClick={() => setLiveModalOpen(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="View live visitors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold tabular-nums">{liveCount}</span>
              <span>online</span>
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>

            {/* Real-time Subscription Status Indicator */}
            {isSubscriptionActive ? (
              <div
                onClick={() => setCurrentNav('subscriptions')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold cursor-pointer hover:border-emerald-600 transition-colors"
                title="Active Subscription Plan"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-bold">PRO ACTIVE</span>
                <span className="text-[10px] text-emerald-400 font-mono">({daysLeft}d left)</span>
              </div>
            ) : (
              <button
                onClick={() => setCurrentNav('subscriptions')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-bold hover:bg-rose-900/80 transition-colors cursor-pointer"
                title="Click to activate subscription"
              >
                <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                <span>EXPIRED (LOCKED)</span>
              </button>
            )}

            {/* Quick Test Toggle Button (Fast One-Click Simulator) */}
            <button
              onClick={handleToggleSubscription}
              disabled={togglingSub}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                isSubscriptionActive
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
              }`}
              title={
                isSubscriptionActive
                  ? 'Click to simulate plan expiry and test locked UI'
                  : 'Click to instantly activate plan and unlock all options'
              }
            >
              {togglingSub ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3 text-amber-300" />
              )}
              <span>{isSubscriptionActive ? 'Test Lock' : '⚡ Activate (Unlock)'}</span>
            </button>
          </div>

          {/* Zone 3: Primary Action & Profile Trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isSubscriptionActive) {
                  setCurrentNav('payment-links');
                } else {
                  setCurrentNav('subscriptions');
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
                isSubscriptionActive
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
              title={isSubscriptionActive ? 'Create New Payment Link' : 'Activate Plan to Create Links'}
            >
              {isSubscriptionActive ? (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Link</span>
                  <span className="sm:hidden">Create</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock Gateway</span>
                </>
              )}
            </button>

            {/* Profile & Settings Trigger */}
            <div
              onClick={() => setCurrentNav('settings')}
              className="flex items-center gap-2 p-1 pl-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 cursor-pointer transition-colors"
              title="View Settings & Profile"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {user.name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums leading-tight">
                  MID: {user.merchant_id || '1443184937'}
                </span>
              </div>

              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-7 h-7 rounded-md object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Navbar Sign Out Button */}
            <button
              onClick={logout}
              title="Log Out of Account"
              className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden md:inline text-rose-300">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full overflow-y-auto">
          {renderView()}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span className="font-bold text-slate-800">Fam Pay Gateway • 24/7 Real-Time Engine</span>
            </div>
            <div>&copy; {new Date().getFullYear()} Fam Pay. All rights reserved. Zero-Fee Instant UPI.</div>
          </div>
        </footer>

        {/* Floating Telegram Support & Community Button */}
        <TelegramFloatingButton />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
