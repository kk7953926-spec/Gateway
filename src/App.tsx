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
      case 'profile':
        return <ProfileView />;
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
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-[#0a101d] text-white flex items-center justify-between border-b border-slate-800 sticky top-0 z-30 shadow-sm">
          {/* Left Title / Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 lg:hidden hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-baseline">
              <span className="font-extrabold text-base text-white tracking-tight">FAMGATEWAY</span>
              <span className="text-[10px] text-purple-400 font-bold ml-1.5 uppercase font-mono">
                FamPay Engine
              </span>
            </div>
          </div>

          {/* Right Controls: Live Visitors Badge + Profile Avatar */}
          <div className="flex items-center gap-3">
            {/* Live Visitors Real-time Indicator */}
            <button
              onClick={() => setLiveModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/60 flex items-center gap-2 transition-all cursor-pointer shadow-xs group"
              title="Click to view live visitors and customer activity"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 relative" />
              </div>
              <span className="text-xs font-bold font-mono text-emerald-400">
                {liveCount} Live
              </span>
              <span className="text-[11px] text-slate-300 hidden sm:inline group-hover:text-white">
                Website Users
              </span>
            </button>

            {/* Profile Avatar Quick Link */}
            <div
              onClick={() => setCurrentNav('profile')}
              className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 cursor-pointer transition-colors"
              title="View Profile"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-purple-500/50 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="hidden md:flex flex-col text-left pr-1">
                <span className="text-xs font-bold text-slate-200 truncate max-w-[110px] leading-tight">
                  {user.name}
                </span>
                <span className="text-[9px] font-mono text-purple-400 font-semibold leading-tight">
                  MID: {user.merchant_id || '1443184937'}
                </span>
              </div>
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
              <ShieldCheck className="w-4 h-4 text-purple-600" />
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
