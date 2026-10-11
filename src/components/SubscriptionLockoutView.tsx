import React, { useState } from 'react';
import {
  Lock,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sliders,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  Sparkles,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SubscriptionLockoutViewProps {
  onNavigate: (nav: string) => void;
}

export const SubscriptionLockoutView: React.FC<SubscriptionLockoutViewProps> = ({ onNavigate }) => {
  const { user, token, refreshProfile } = useAuth();
  const [activating, setActivating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleInstantActivate = async (planId: string = 'Pro Business Tier') => {
    if (!token) return;
    setActivating(planId);
    setFeedback(null);
    try {
      const res = await fetch('/api/user/toggle-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStatus: 'active',
          planId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          msg: '🎉 சந்தா வெற்றிகரமாக ஆன் செய்யப்பட்டது! அனைத்து ஆப்ஷன்களும் அன்லாக் செய்யப்பட்டன! (Plan Activated! All options unlocked!)',
        });
        await refreshProfile();
      } else {
        setFeedback({
          type: 'error',
          msg: data.error || 'Failed to activate plan. Please try again.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        msg: 'Network error while activating subscription.',
      });
    } finally {
      setActivating(null);
    }
  };

  const plans = [
    {
      id: 'plan_starter',
      name: 'Starter Gateway',
      price: 199,
      duration: '30 Days',
      badge: 'Basic Access',
      desc: 'Ideal for small merchants starting with direct UPI payments.',
      features: [
        'Instant UPI Dynamic QR Generation',
        '0% Gateway Fee Per Transaction',
        'Direct IMAP Bank Alerts',
        'Basic Payment Links',
        'Standard Email Support',
      ],
      popular: false,
    },
    {
      id: 'plan_gold',
      name: 'Business Pro Tier',
      price: 499,
      duration: '30 Days',
      badge: 'Most Popular',
      desc: 'Full-featured power gateway for scaling merchants & businesses.',
      features: [
        'Everything in Starter Gateway',
        'Unlimited Payment Links & Checkout Pages',
        'High-Speed Webhook Dispatch & Retries',
        'Full REST API Keys & Documentation',
        'Custom Checkout Branding & Colors',
        'Priority 24/7 IMAP Settlement Daemon',
      ],
      popular: true,
    },
    {
      id: 'plan_vip',
      name: 'VIP Enterprise',
      price: 999,
      duration: '365 Days (1 Year)',
      badge: 'Best Value',
      desc: 'Maximum throughput and complete uninterrupted access for a full year.',
      features: [
        'All Pro Tier Gateway Features',
        '365 Days Uninterrupted Active Status',
        'Unlimited Monthly Transaction Volume',
        'Custom Webhook Domain & Secrets',
        'Dedicated IMAP Daemon Processing',
        'Direct Priority VIP Support',
      ],
      popular: false,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 animate-in fade-in duration-300">
      {/* Top Lockout Hero */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#0e1424] via-[#0a0f1d] to-[#080c18] border border-slate-800 text-white p-6 sm:p-10 shadow-2xl overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>ACCESS RESTRICTED • GATEWAY LOCKED</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              சந்தா முடிவடைந்தது • அனைத்து ஆப்ஷன்களும் லாக் ஆகியுள்ளன
            </h1>

            <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed">
              Your merchant payment gateway features (Live Dashboard, Transactions, API Keys, Payment Links, and Webhooks) are currently locked. Activate an active plan to instantly unlock all features.
            </p>

            {/* Merchant Details Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                MID: <strong className="text-white">{user?.merchant_id || '1443184937'}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                Current Plan: <strong className="text-indigo-300">{user?.subscription_plan_id || 'Free Trial'}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold">
                Status: EXPIRED
              </span>
            </div>
          </div>

          {/* Quick 1-Click Fast Unlock Action */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[240px]">
            <button
              onClick={() => handleInstantActivate('Business Pro Tier')}
              disabled={activating !== null}
              className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {activating === 'Business Pro Tier' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                  <span>⚡ 1-Click Activate (30 Days)</span>
                </>
              )}
            </button>

            <button
              onClick={() => onNavigate('subscriptions')}
              className="w-full px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Full Billing & UPI Checkout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Plan Selection Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Select a Plan to Unlock All Options
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Choose your gateway subscription tier. All plans include 0% gateway transaction fees and real-time bank settlement.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Instant Automated Activation</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl transition-all duration-200 relative flex flex-col justify-between overflow-hidden p-6 ${
                p.popular
                  ? 'bg-gradient-to-b from-indigo-950/20 via-white to-white border-2 border-indigo-600 shadow-xl shadow-indigo-500/10'
                  : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              {p.popular && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-sm">
                  Recommended
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-mono">
                    {p.badge}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {p.desc}
                  </p>
                </div>

                <div className="py-2 border-y border-slate-100 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">
                    ₹{p.price}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    / {p.duration}
                  </span>
                </div>

                <ul className="space-y-2.5 pt-1 text-xs">
                  {p.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleInstantActivate(p.name)}
                  disabled={activating !== null}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50 ${
                    p.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {activating === p.name ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating {p.name}...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate {p.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Zero Fee Note */}
      <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-800">100% Real-time Automated UPI Verification</span>
          <span>· Direct bank credit via IMAP · Zero platform deductions</span>
        </div>
        <button
          onClick={() => onNavigate('subscriptions')}
          className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline cursor-pointer"
        >
          View Full Plan Details &rarr;
        </button>
      </div>
    </div>
  );
};
