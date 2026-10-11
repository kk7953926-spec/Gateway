import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Clock,
  CreditCard,
  QrCode,
  X,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SubscriptionView: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [quickActivating, setQuickActivating] = useState(false);

  const isAdmin = user?.role === 'admin';
  const daysLeft = user?.subscription_expires_at
    ? Math.max(0, Math.ceil((new Date(user.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isExpired = Boolean(
    !user ||
    user.subscription_status === 'expired' ||
    user.subscription_status === 'inactive' ||
    daysLeft <= 0 ||
    !user.subscription_expires_at
  );

  const handleInstantQuickUnlock = async () => {
    if (!token) return;
    setQuickActivating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/toggle-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStatus: isExpired ? 'active' : 'expired',
          planId: isExpired ? 'Business Pro Tier' : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: isExpired
            ? '🎉 சந்தா ஆன் செய்யப்பட்டது! அனைத்து கேட்வே ஆப்ஷன்களும் அன்லாக் செய்யப்பட்டன! (Plan Activated! All options unlocked)'
            : '🔒 சந்தா லாக் செய்யப்பட்டது (Subscription locked for testing)',
        });
        await refreshProfile();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update subscription.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error updating subscription.' });
    } finally {
      setQuickActivating(false);
    }
  };

  // Subscription QR Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPlanName, setCheckoutPlanName] = useState('');
  const [checkoutPrice, setCheckoutPrice] = useState(0);
  const [checkoutQrDataUrl, setCheckoutQrDataUrl] = useState('');
  const [checkoutPaymentId, setCheckoutPaymentId] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState<'PENDING' | 'CONFIRMED' | 'FAILED'>('PENDING');
  const [checkoutTimeLeft, setCheckoutTimeLeft] = useState(300); // 5 minutes countdown
  const [checkoutUtr, setCheckoutUtr] = useState('');
  const [checkoutVerifying, setCheckoutVerifying] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkoutPollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPlans = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/subscription-plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.plans) setPlans(data.plans);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [token]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (checkoutTimerRef.current) clearInterval(checkoutTimerRef.current);
      if (checkoutPollRef.current) clearInterval(checkoutPollRef.current);
    };
  }, []);

  const handleOpenCheckout = async (planId: string) => {
    if (!token || !user) return;
    setActivatingPlanId(planId);
    setCheckoutError(null);
    setCheckoutUtr('');
    setCheckoutStatus('PENDING');
    setCheckoutTimeLeft(300); // 5 minutes fresh

    try {
      const res = await fetch('/api/payment/subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCheckoutPlanName(data.planName);
        setCheckoutPrice(data.price);
        setCheckoutQrDataUrl(data.qrCodeUrl);
        setCheckoutPaymentId(data.payment.id);
        setCheckoutModalOpen(true);

        // Start Countdown Timer
        if (checkoutTimerRef.current) clearInterval(checkoutTimerRef.current);
        checkoutTimerRef.current = setInterval(() => {
          setCheckoutTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(checkoutTimerRef.current!);
              setCheckoutStatus('FAILED');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Start Auto-detection Polling
        if (checkoutPollRef.current) clearInterval(checkoutPollRef.current);
        const poll = async () => {
          try {
            const pRes = await fetch(`/api/payment/auto-detect/${data.payment.id}?amount=${data.price}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.status === 'CONFIRMED') {
                setCheckoutStatus('CONFIRMED');
                clearInterval(checkoutTimerRef.current!);
                clearInterval(checkoutPollRef.current!);
                await refreshProfile();
              }
            }
          } catch {
            // Ignore
          }
        };
        checkoutPollRef.current = setInterval(poll, 3000);

      } else {
        setMessage({
          type: 'error',
          text: `Error: ${data.error || 'Failed to initialize subscription checkout.'}`,
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Network error initializing checkout. Please try again.',
      });
    } finally {
      setActivatingPlanId(null);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !checkoutUtr || checkoutVerifying) return;
    setCheckoutVerifying(true);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/payment/verify-email-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId: checkoutPaymentId,
          utr: checkoutUtr,
          amount: checkoutPrice,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCheckoutStatus('CONFIRMED');
        if (checkoutTimerRef.current) clearInterval(checkoutTimerRef.current);
        if (checkoutPollRef.current) clearInterval(checkoutPollRef.current);
        await refreshProfile();
      } else {
        setCheckoutError(data.error || 'Manual verification failed. Please check UTR or make sure payment is made.');
      }
    } catch {
      setCheckoutError('Network error during manual verification.');
    } finally {
      setCheckoutVerifying(false);
    }
  };

  const getDaysRemaining = () => {
    if (!user?.subscription_expires_at) return 0;
    const diff = new Date(user.subscription_expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-6 h-6 text-purple-600" />
          <span>My Subscriptions</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your current gateway subscription plan, trials, and billing.
        </p>
      </div>

      {/* Current Subscription Status Card */}
      <div className={`p-6 rounded-3xl text-white border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden ${
        isExpired
          ? 'bg-gradient-to-br from-[#1c0c14] via-[#150a12] to-[#0c080f] border-rose-900/60 shadow-rose-950/20'
          : 'bg-gradient-to-br from-[#0c1424] via-[#090f1d] to-[#070b15] border-slate-800 shadow-slate-950/30'
      }`}>
        {/* Glow */}
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isExpired ? 'bg-rose-600/10' : 'bg-emerald-500/10'
        }`} />

        <div className="space-y-3 relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
            <span className={isExpired ? 'text-rose-400' : 'text-emerald-400'}>
              {isExpired ? 'ACCESS RESTRICTED • GATEWAY LOCKED' : 'SECURE SYSTEM ACTIVE • UNLIMITED ACCESS'}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Plan:</span>
              <span className={`font-mono ${isExpired ? 'text-rose-300' : 'text-indigo-400'}`}>
                {user?.subscription_plan_id || (isExpired ? 'Expired Plan' : 'Active Plan')}
              </span>
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Merchant ID: <code className="font-mono text-white bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">{user?.merchant_id}</code>
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
            <span className={`font-bold ${isExpired ? 'text-rose-400' : 'text-slate-200'}`}>
              {isExpired ? '0 Days Remaining (Expired)' : `${daysLeft} Days Remaining`}
            </span>
            <span className="text-slate-700">·</span>
            <span>Expires: {user?.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString() : 'N/A'}</span>
          </div>

          {isExpired && (
            <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-3 rounded-xl font-medium">
              சந்தா முடிவடைந்தது! உங்கள் பரிவர்த்தனைகள், ஏபிஐ சாவி மற்றும் பணம் செலுத்தும் இணைப்புகள் லாக் செய்யப்பட்டுள்ளன.
            </p>
          )}
        </div>

        <div className="relative z-10 flex flex-col gap-3 min-w-[220px]">
          <div className={`p-4 rounded-2xl border text-center ${
            isExpired ? 'bg-rose-950/40 border-rose-900/60' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Account Status</div>
            <div className={`text-xl font-black font-mono mt-0.5 uppercase ${
              isExpired ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {isExpired ? 'EXPIRED (LOCKED)' : (user?.subscription_status || 'ACTIVE')}
            </div>
          </div>

          <button
            onClick={handleInstantQuickUnlock}
            disabled={quickActivating}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isExpired
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            {quickActivating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            )}
            <span>{isExpired ? '⚡ 1-Click Activate (Unlock)' : 'Simulate Expiration (Lock)'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold font-mono flex items-center gap-2 border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Available Plans Selection */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Upgrade / Renew Premium Subscription</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center text-xs text-slate-400 font-bold py-8">
              Loading premium subscription plans...
            </div>
          ) : plans.length > 0 ? (
            plans.map((p) => {
              const isCurrent = user?.subscription_plan_id === p.name || user?.subscription_plan_id === p.id;
              return (
                <div
                  key={p.id}
                  className={`p-6 rounded-2xl bg-white border transition-all space-y-5 relative ${
                    isCurrent
                      ? 'border-2 border-indigo-600 shadow-sm'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-mono text-indigo-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <span>CURRENT PLAN</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">{p.name}</h4>
                    <p className="text-xs text-slate-500">{p.duration_days} Days Full Validity</p>
                  </div>

                  <div className="flex items-baseline gap-1 border-t border-b border-slate-100 py-3.5">
                    <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">₹{p.price}</span>
                    <span className="text-xs text-slate-400 font-medium">/one-time</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Zero (0%) UPI Gateway Fee</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Instant 100% Settlements</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Dynamic Phone Album QR Saving</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Unlimited checkout links</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    disabled={activatingPlanId !== null}
                    onClick={() => handleOpenCheckout(p.id)}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {activatingPlanId === p.id ? 'Processing...' : isCurrent ? 'Renew Plan' : 'Purchase / Activate'}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 text-center text-xs text-slate-400 font-medium py-8">
              No subscription plans configured by admin yet.
            </div>
          )}
        </div>
      </div>

      {/* UPI QR Code Subscription Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0a0e1a] border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden relative my-auto">
            
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">
                  Premium Subscription Activation
                </h3>
              </div>
              <button
                onClick={() => {
                  setCheckoutModalOpen(false);
                  if (checkoutTimerRef.current) clearInterval(checkoutTimerRef.current);
                  if (checkoutPollRef.current) clearInterval(checkoutPollRef.current);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {checkoutStatus === 'CONFIRMED' ? (
              /* SUCCESS STATE */
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="w-10 h-10 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Payment Confirmed!</h2>
                  <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
                    Excellent! Your subscription plan <strong>{checkoutPlanName}</strong> is now activated. Your merchant limits are fully unlocked!
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/30"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : checkoutStatus === 'FAILED' ? (
              /* EXPIRED STATE */
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Checkout Expired</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    The 5-minute payment window has expired. Please try again.
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all"
                >
                  Close & Try Again
                </button>
              </div>
            ) : (
              /* PENDING / SCAN TO PAY STATE */
              <div className="p-6 space-y-5 text-center">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-bold">Activating Scheme</span>
                  <h4 className="text-lg font-black text-white">{checkoutPlanName}</h4>
                  <div className="text-2xl font-black text-purple-400 mt-1">₹{(Number(checkoutPrice) || 0).toFixed(2)}</div>
                </div>

                {/* QR Display */}
                <div className="p-3 bg-white rounded-3xl border-2 border-dashed border-purple-500/90 inline-block mx-auto shadow-xl">
                  {checkoutQrDataUrl ? (
                    <img src={checkoutQrDataUrl} alt="UPI QR" className="w-48 h-48 mx-auto" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-slate-900 rounded-2xl">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Countdown Progress */}
                <div className="space-y-1">
                  <div className="text-xs font-bold font-mono text-purple-300 flex items-center justify-center gap-1.5 animate-pulse">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>Real-Time Auto-Confirmation: ACTIVE</span>
                  </div>
                  <div className="text-xs text-slate-400 font-bold">
                    Expires in <span className="font-mono text-white text-sm">{formatTimer(checkoutTimeLeft)}</span>
                  </div>
                </div>

                {/* Manual UTR Submit Form */}
                <form onSubmit={handleManualVerify} className="pt-3 border-t border-slate-800/80 space-y-3 text-left">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Already paid? Paste Bank UPI UTR for Instant Activation:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={checkoutUtr}
                        onChange={(e) => setCheckoutUtr(e.target.value)}
                        placeholder="Enter 12-digit UTR No. (e.g. 482917305614)"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-600 font-semibold"
                      />
                      <button
                        type="submit"
                        disabled={checkoutVerifying}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all shadow-md shrink-0 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        {checkoutVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                  </div>
                  {checkoutError && (
                    <p className="text-[10px] text-rose-400 font-semibold leading-relaxed bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30">
                      {checkoutError}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
