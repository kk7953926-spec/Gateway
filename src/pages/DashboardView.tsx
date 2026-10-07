import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Clock,
  QrCode,
  Link2,
  RefreshCw,
  Plus,
  Sliders,
  ChevronRight,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { UpiPaymentRecord } from '../types';

interface DashboardViewProps {
  onNavigate: (nav: string) => void;
}

const TrialProgressCard: React.FC<{ user: any; onNavigate: (nav: string) => void }> = ({ user, onNavigate }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    percent: number;
    isExpired: boolean;
    isTrial: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    percent: 100,
    isExpired: false,
    isTrial: true,
  });

  useEffect(() => {
    const calculateTime = () => {
      if (!user) return;

      const isAdmin = user.role === 'admin';
      const expiresAt = user.subscription_expires_at
        ? new Date(user.subscription_expires_at).getTime()
        : Date.now() + 5 * 24 * 60 * 60 * 1000;

      const createdAt = user.created_at
        ? new Date(user.created_at).getTime()
        : expiresAt - 5 * 24 * 60 * 60 * 1000;

      const now = Date.now();
      const totalDuration = Math.max(1, expiresAt - createdAt);
      const remainingMs = Math.max(0, expiresAt - now);

      const isExpired = !isAdmin && (user.subscription_status === 'expired' || remainingMs <= 0);
      const percent = isAdmin ? 100 : Math.min(100, Math.max(0, (remainingMs / totalDuration) * 100));

      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

      const isTrial = !user.subscription_plan_id || user.subscription_plan_id.toLowerCase().includes('trial') || user.subscription_plan_id.toLowerCase().includes('free');

      setTimeLeft({
        days,
        hours,
        minutes,
        percent,
        isExpired,
        isTrial,
      });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 10000);
    return () => clearInterval(timer);
  }, [user]);

  if (user?.role === 'admin') {
    return (
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Administrator Tier</span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium">UNLIMITED SETTLEMENTS</span>
            </div>
            <p className="text-[11px] text-slate-400">Full system access, live multi-merchant IMAP monitoring, and zero-fee processing enabled.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('admin')}
          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Admin Console
        </button>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className="p-4 rounded-xl bg-rose-950/40 text-rose-200 border border-rose-800/60 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Trial Expired</div>
            <p className="text-[11px] text-rose-300">Your 5-day free gateway trial has expired. Activate a subscription plan to resume live settlements.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('subscriptions')}
          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Activate Plan</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {timeLeft.isTrial ? '5-Day Free Trial' : 'Subscription Active'}
            </span>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold">
              {timeLeft.days}d {timeLeft.hours}h remaining
            </span>
          </div>
          <div className="w-48 sm:w-64 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${timeLeft.percent}%` }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onNavigate('subscriptions')}
        className="self-start md:self-auto px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
      >
        <Zap className="w-3 h-3 text-amber-300" />
        <span>{timeLeft.isTrial ? 'Upgrade Plan' : 'Manage Subscription'}</span>
      </button>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [copiedMid, setCopiedMid] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({
    totalRequests: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    revenue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Recent transactions state
  const [recentPayments, setRecentPayments] = useState<UpiPaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Interactive Live Quick Terminal state
  const [terminalAmount, setTerminalAmount] = useState('100');
  const [terminalQrUrl, setTerminalQrUrl] = useState<string>('');
  const [terminalUpiUri, setTerminalUpiUri] = useState<string>('');
  const [copiedTerminalLink, setCopiedTerminalLink] = useState(false);

  const merchantId = user?.merchant_id || '1443184937';
  const merchantVpa = user?.fampay_upi_id || '8056317218@fam';
  const isImapActive = Boolean(user?.imap_connected);

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchRecentPayments();
    }
  }, [token]);

  // Generate dynamic QR for the live terminal tool
  useEffect(() => {
    const amt = parseFloat(terminalAmount) || 100;
    const cleanPa = merchantVpa.trim();
    const note = `Quick Payment`;
    const uri = `upi://pay?pa=${cleanPa}&pn=${encodeURIComponent(user?.name || 'FamGateway Merchant')}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    setTerminalUpiUri(uri);

    QRCode.toDataURL(uri, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setTerminalQrUrl)
      .catch(() => {});
  }, [terminalAmount, merchantVpa, user?.name]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/user/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const res = await fetch('/api/payment/my-payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.payments) {
          setRecentPayments(data.payments.slice(0, 6));
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleCopyMid = () => {
    navigator.clipboard.writeText(merchantId);
    setCopiedMid(true);
    setTimeout(() => setCopiedMid(false), 2000);
  };

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(merchantVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleCopyTerminalLink = () => {
    navigator.clipboard.writeText(terminalUpiUri);
    setCopiedTerminalLink(true);
    setTimeout(() => setCopiedTerminalLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome, {user?.name || 'Merchant'}
            </h1>
            <span className="text-xs font-mono text-slate-400">·</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="text-slate-400">VPA:</span>
              <span className="font-semibold text-slate-800">{merchantVpa}</span>
              <button
                onClick={handleCopyVpa}
                className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                title="Copy UPI VPA"
              >
                {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Real-time zero-fee FamPay & UPI payment verification gateway.
          </p>
        </div>

        {/* Status Indicators & Fast CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('integrations')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              isImapActive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isImapActive ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span>{isImapActive ? 'IMAP 993 Active' : 'Setup IMAP'}</span>
          </button>

          <button
            onClick={() => onNavigate('payment-links')}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Payment Link</span>
          </button>
        </div>
      </div>

      {/* Trial Countdown / Plan Status */}
      <TrialProgressCard user={user} onNavigate={onNavigate} />

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Volume</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {loadingStats ? (
              <span className="inline-block w-20 h-7 bg-slate-100 rounded-md animate-pulse" />
            ) : (
              `₹${(Number(stats?.revenue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold font-mono">0% fee</span>
            <span>· Instant settlement</span>
          </div>
        </div>

        {/* Card 2: Captured Orders */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Captured Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {loadingStats ? (
              <span className="inline-block w-14 h-7 bg-slate-100 rounded-md animate-pulse" />
            ) : (
              stats.successful.toLocaleString()
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <span className="text-emerald-600 font-semibold">100%</span>
            <span>verified via alert</span>
          </div>
        </div>

        {/* Card 3: Pending / Verifying */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pending Verifications</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {loadingStats ? (
              <span className="inline-block w-14 h-7 bg-slate-100 rounded-md animate-pulse" />
            ) : (
              (stats.pending || 0).toLocaleString()
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Heartbeat poller:</span>
            <span className="text-slate-800 font-medium font-mono">every 2.5s</span>
          </div>
        </div>

        {/* Card 4: Active Gateway Routing & Terminal MID */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active UPI Terminal</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-sm font-bold font-mono text-indigo-600 truncate py-1">
            {user?.fampay_upi_id || '8056317218@fam'}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-slate-400">MID:</span>
            <span className="font-mono text-slate-700">{merchantId}</span>
            <button
              onClick={handleCopyMid}
              className="text-slate-400 hover:text-indigo-600 transition-colors ml-auto cursor-pointer"
              title="Copy Merchant ID"
            >
              {copiedMid ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive QR Terminal (Left) + Quick Developer Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Terminal & Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Live UPI Terminal */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Instant UPI QR Payment Terminal</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test live UPI payments instantly. Generates dynamic scannable QR for your active VPA.
                </p>
              </div>

              <div className="text-xs font-mono font-semibold text-indigo-600 hidden sm:block">
                {merchantVpa}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
              {/* QR Image Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center">
                {terminalQrUrl ? (
                  <img
                    src={terminalQrUrl}
                    alt="Instant UPI QR"
                    className="w-44 h-44 rounded-lg object-contain bg-white p-2 shadow-2xs"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                    <QrCode className="w-8 h-8 animate-pulse" />
                  </div>
                )}
                <div className="text-[10px] font-mono text-slate-500 mt-2 text-center">
                  Scan via GPay / PhonePe / FamPay
                </div>
              </div>

              {/* Controls */}
              <div className="sm:col-span-2 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={terminalAmount}
                      onChange={(e) => setTerminalAmount(e.target.value)}
                      placeholder="100"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5">
                  {['50', '100', '250', '500', '1000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTerminalAmount(preset)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                        terminalAmount === preset
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyTerminalLink}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedTerminalLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTerminalLink ? 'Copied URI' : 'Copy UPI Link'}</span>
                  </button>

                  <a
                    href={terminalUpiUri}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Launch UPI App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions Ledger Table */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Real-time ledger of inbound UPI settlements</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRecentPayments}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Refresh Transactions"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onNavigate('transactions')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loadingPayments ? (
              <div className="py-10 text-center text-xs text-slate-400 font-mono">
                Loading transaction stream...
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700">No transactions recorded yet</div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Create your first payment link or test the live QR terminal above to simulate incoming payments.
                </p>
                <button
                  onClick={() => onNavigate('payment-links')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Payment Link</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 font-medium">
                      <th className="pb-2 font-medium">Order / Ref</th>
                      <th className="pb-2 font-medium">Bank UTR</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPayments.map((p) => {
                      const isConfirmed = p.status === 'CONFIRMED' || (p.status as string) === 'CAPTURED';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 font-medium text-slate-800">
                            <div>{p.note || 'Payment Order'}</div>
                            <div className="text-[10px] font-mono text-slate-400">{p.id}</div>
                          </td>
                          <td className="py-2.5 font-mono text-slate-600">
                            {p.transaction_ref ? (
                              <span className="text-[11px] font-semibold text-slate-700">{p.transaction_ref}</span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium font-mono">
                              <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                              <span className={isConfirmed ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                                {isConfirmed ? 'CAPTURED' : 'PENDING'}
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 font-mono font-bold text-slate-900 text-right tabular-nums">
                            ₹{Number(p.amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-slate-400 text-right text-[11px] font-mono">
                            {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Tool Cards */}
        <div className="space-y-6">
          {/* Quick Integration Checklist */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              Gateway Quick Setup
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('integrations')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${isImapActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                      Connect Gmail IMAP
                    </div>
                    <div className="text-[10px] text-slate-400">16-digit Google App Password</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('api-keys')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                      API Credentials
                    </div>
                    <div className="text-[10px] text-slate-400">fam_live_... for custom integrations</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('customize')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                      Checkout Page Design
                    </div>
                    <div className="text-[10px] text-slate-400">Logo, brand colors, custom note</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('documentation')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                      API Documentation
                    </div>
                    <div className="text-[10px] text-slate-400">cURL, Node.js, and Python examples</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Engine Status Callout */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Engine Protocol</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">ONLINE</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Inward transaction listener active on <code className="text-indigo-300 font-mono">imap.gmail.com:993</code> with TLS encryption. 
              Zero-fee settlements dispatched instantly to your UPI VPA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
