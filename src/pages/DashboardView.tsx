import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  RefreshCw,
  Plus,
  ChevronRight,
  ArrowRight,
  X,
  CreditCard,
} from 'lucide-react';
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

      const expiresAt = user.subscription_expires_at
        ? new Date(user.subscription_expires_at).getTime()
        : Date.now() + 5 * 24 * 60 * 60 * 1000;

      const createdAt = user.created_at
        ? new Date(user.created_at).getTime()
        : expiresAt - 5 * 24 * 60 * 60 * 1000;

      const now = Date.now();
      const totalDuration = Math.max(1, expiresAt - createdAt);
      const remainingMs = Math.max(0, expiresAt - now);

      const isExpired = user.subscription_status === 'expired' || user.subscription_status === 'inactive' || remainingMs <= 0;
      const percent = Math.min(100, Math.max(0, (remainingMs / totalDuration) * 100));

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

  if (timeLeft.isExpired) {
    return (
      <div className="p-4 rounded-2xl bg-rose-950/70 text-rose-200 border border-rose-800 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-black text-white">சந்தா முடிந்தது • Subscription Expired (Locked)</div>
            <p className="text-[11px] font-medium text-rose-300">Your gateway subscription has expired. Activate an active plan to resume automated settlements.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('subscriptions')}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>⚡ Activate Plan</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-900">
              {timeLeft.isTrial ? 'Free Trial Period' : (user?.subscription_plan_id || 'Subscription Active')}
            </span>
            <span className="text-[11px] font-mono text-emerald-700 font-extrabold">
              {timeLeft.days}d {timeLeft.hours}h remaining
            </span>
          </div>
          <div className="w-48 sm:w-64 h-2 rounded-full bg-slate-100 overflow-hidden mt-1.5 border border-slate-200/60">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${timeLeft.percent}%` }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onNavigate('subscriptions')}
        className="self-start md:self-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs"
      >
        <Zap className="w-3.5 h-3.5 text-amber-300" />
        <span>{timeLeft.isTrial ? 'Upgrade Plan' : 'Manage Subscription'}</span>
      </button>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, token, updateUser } = useAuth();
  const [copiedMid, setCopiedMid] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Fast UPI Setup Modal state
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiInput, setUpiInput] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiModalError, setUpiModalError] = useState<string | null>(null);
  const [upiModalSuccess, setUpiModalSuccess] = useState<string | null>(null);
  
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

  const merchantId = user?.merchant_id || '1443184937';
  const hasConfiguredUpi = Boolean(user?.fampay_upi_id && user.fampay_upi_id.trim().includes('@'));
  const merchantVpa = hasConfiguredUpi ? (user?.fampay_upi_id || '').trim() : '';
  const isImapActive = Boolean(user?.imap_connected);

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchRecentPayments();
    }
  }, [token]);

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
    if (!merchantVpa) return;
    navigator.clipboard.writeText(merchantVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleSaveUpiFast = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiModalError(null);
    setUpiModalSuccess(null);

    const clean = upiInput.trim();
    if (!clean || !clean.includes('@')) {
      setUpiModalError('Please enter a valid FamPay or Bank UPI ID (e.g. username@fam, 9876543210@fam).');
      return;
    }

    setSavingUpi(true);
    try {
      const res = await fetch('/api/integrations/upi-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fampayUpiId: clean }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save UPI ID.');
      }

      if (data.user) {
        updateUser(data.user);
      } else {
        updateUser({ fampay_upi_id: clean });
      }

      setUpiModalSuccess('FamPay UPI ID configured! You can now create payment links.');
      setTimeout(() => {
        setShowUpiModal(false);
        setUpiModalSuccess(null);
        setUpiInput('');
      }, 1500);
    } catch (err: any) {
      setUpiModalError(err.message || 'Error updating UPI ID.');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleCreatePaymentLinkClick = () => {
    if (!hasConfiguredUpi) {
      setShowUpiModal(true);
      return;
    }
    onNavigate('payment-links');
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Welcome, {user?.name || 'Merchant'}
            </h1>
            <span className="text-xs font-mono text-slate-400">·</span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-500 font-bold">VPA:</span>
              {hasConfiguredUpi ? (
                <>
                  <span className="font-extrabold text-slate-900">{merchantVpa}</span>
                  <button
                    onClick={handleCopyVpa}
                    className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Copy UPI VPA"
                  >
                    {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowUpiModal(true)}
                  className="text-amber-700 hover:text-amber-800 font-black underline cursor-pointer bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                >
                  Configure UPI ID
                </button>
              )}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Real-time zero-fee FamPay & UPI payment verification gateway.
          </p>
        </div>

        {/* Status Indicators & Fast CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('integrations')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isImapActive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isImapActive ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span>{isImapActive ? 'IMAP Alert Active' : 'Setup Alert IMAP'}</span>
          </button>

          <button
            onClick={handleCreatePaymentLinkClick}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Payment Link</span>
          </button>
        </div>
      </div>

      {/* Official Telegram Announcement Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17212b] via-[#0f233d] to-[#152e4d] border border-sky-800/70 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.17-.03.3z" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-sky-300 uppercase tracking-wider">
              Official Telegram Channel & Community
            </div>
            <div className="text-xs sm:text-sm font-black text-white">
              Join for 24/7 instant settlement updates, daemon uptime & priority support
            </div>
          </div>
        </div>

        <a
          href="https://t.me/fampay_gateway_official"
          target="_blank"
          rel="noopener noreferrer"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1b8bc2] text-white font-black text-xs transition-all shadow-md shadow-sky-500/25 flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 border border-sky-400/30"
        >
          <span>Join Channel</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Trial Countdown / Plan Status */}
      <TrialProgressCard user={user} onNavigate={onNavigate} />

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Total Volume</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {loadingStats ? (
              <span className="inline-block w-20 h-7 bg-slate-100 rounded-md animate-pulse" />
            ) : (
              `₹${(Number(stats?.revenue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </div>
          <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
            <span className="text-emerald-700 font-bold font-mono">0% fee</span>
            <span>· Instant settlement</span>
          </div>
        </div>

        {/* Card 2: Captured Orders */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Captured Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {loadingStats ? (
              <span className="inline-block w-14 h-7 bg-slate-100 rounded-md animate-pulse" />
            ) : (
              stats.successful.toLocaleString()
            )}
          </div>
          <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 font-mono">
            <span className="text-emerald-700 font-bold">100%</span>
            <span>verified via alert</span>
          </div>
        </div>

        {/* Card 3: Pending / Verifying */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Pending Verifications</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {loadingStats ? (
              <span className="inline-block w-14 h-7 bg-slate-100 rounded-md animate-pulse" />
            ) : (
              (stats.pending || 0).toLocaleString()
            )}
          </div>
          <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
            <span>Heartbeat poller:</span>
            <span className="text-slate-900 font-bold font-mono">every 2.5s</span>
          </div>
        </div>

        {/* Card 4: Active Gateway Routing & Terminal MID */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Active UPI Routing</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          {hasConfiguredUpi ? (
            <div className="text-sm font-black font-mono text-indigo-600 truncate py-1">
              {merchantVpa}
            </div>
          ) : (
            <div className="text-xs font-black text-amber-700 py-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Pending Configuration</span>
            </div>
          )}
          <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
            <span className="text-slate-500 font-bold">MID:</span>
            <span className="font-mono text-slate-900 font-bold">{merchantId}</span>
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

      {/* Recent Transactions Ledger Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Recent Transactions</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Real-time ledger of inbound UPI settlements</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRecentPayments}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Transactions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loadingPayments ? (
          <div className="py-10 text-center text-xs text-slate-500 font-mono font-bold">
            Loading transaction stream...
          </div>
        ) : recentPayments.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-xs font-black text-slate-800">No transactions recorded yet</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-medium">
              Create your first payment link to start collecting payments.
            </p>
            <button
              onClick={handleCreatePaymentLinkClick}
              className="mt-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-500 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Payment Link</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-2.5">Order / Ref</th>
                  <th className="pb-2.5">Bank UTR</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Amount</th>
                  <th className="pb-2.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((p) => {
                  const isConfirmed = p.status === 'CONFIRMED' || (p.status as string) === 'CAPTURED';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-bold text-slate-900">
                        <div>{p.note || 'Payment Order'}</div>
                        <div className="text-[10px] font-mono text-slate-500 font-semibold">{p.id}</div>
                      </td>
                      <td className="py-3 font-mono">
                        {p.transaction_ref ? (
                          <span className="text-[11px] font-bold text-slate-800">{p.transaction_ref}</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold font-mono px-2 py-0.5 rounded-md ${
                          isConfirmed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <span>{isConfirmed ? 'CAPTURED' : 'PENDING'}</span>
                        </span>
                      </td>
                      <td className="py-3 font-mono font-black text-slate-900 text-right tabular-nums text-sm">
                        ₹{Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-slate-500 text-right text-[11px] font-mono font-semibold">
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

      {/* QUICK UPI SETUP MODAL */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Set Up Your FamPay UPI ID</h3>
                  <p className="text-xs text-slate-500 font-medium">Customer payments will be deposited directly to this VPA</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpiModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {upiModalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{upiModalSuccess}</span>
              </div>
            )}

            {upiModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{upiModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUpiFast} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  FamPay or Bank UPI ID (VPA) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@fam or 9876543210@fam"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:text-slate-400 placeholder:font-sans"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Open your FamPay or UPI app, copy your UPI ID, and paste it here.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpiModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUpi}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {savingUpi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Activate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
