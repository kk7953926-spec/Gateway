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
import { DocumentationView } from './pages/DocumentationView';
import { SystemStatusView } from './pages/SystemStatusView';
import { PublicCheckoutView } from './pages/PublicCheckoutView';
import { CustomizeView } from './pages/CustomizeView';
import { AdminPage } from './pages/AdminPage';
import { SubscriptionView } from './pages/SubscriptionView';
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
  Plus
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentNav, setCurrentNav] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [liveModalOpen, setLiveModalOpen] = useState<boolean>(false);
  const [liveCount, setLiveCount] = useState<number>(1);

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
        return <ProfileView onNavigate={setCurrentNav} />;
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
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
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

            {/* Breadcrumb Trail */}
            <nav className="flex items-center gap-2 text-xs font-medium" aria-label="Breadcrumb">
              <span className="text-slate-400 hidden sm:inline">FamGateway</span>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">/</span>
              <span className="text-slate-400 hidden md:inline">Console</span>
              <span className="text-slate-600 hidden md:inline" aria-hidden="true">/</span>
              <span className="text-white font-semibold capitalize">
                {currentNav.replace('-', ' ')}
              </span>
            </nav>
          </div>

          {/* Zone 2: Quiet Unboxed Metadata (No pill badges) */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <button
              onClick={() => setLiveModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer"
              title="View live visitors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold tabular-nums">{liveCount}</span>
              <span>online</span>
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-slate-400">IMAP 993 Active</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-slate-400">0% Gateway Fee</span>
          </div>

          {/* Zone 3: Primary Action & Profile Trigger */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCurrentNav('payment-links')}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Payment Link</span>
              <span className="sm:hidden">Create</span>
            </button>

            {/* Profile Avatar Quick Link */}
            <div
              onClick={() => setCurrentNav('profile')}
              className="flex items-center gap-2 p-1 pl-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 cursor-pointer transition-colors"
              title="View Profile Settings"
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
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderView()}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 text-center">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-800">FAMGATEWAY • Powered by FamPay Engine</span>
            </div>
            <div>&copy; {new Date().getFullYear()} FAMGATEWAY. All rights reserved. Zero-Fee FamPay UPI.</div>
          </div>
        </footer>
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
