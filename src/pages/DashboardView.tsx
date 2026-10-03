import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  X,
  ExternalLink,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  AlertTriangle,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  onNavigate: (nav: string) => void;
}

const TrialProgressCard: React.FC<{ user: any; onNavigate: (nav: string) => void }> = ({ user, onNavigate }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    percent: number;
    isExpired: boolean;
    isTrial: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
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
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const isTrial = !user.subscription_plan_id || user.subscription_plan_id.toLowerCase().includes('trial') || user.subscription_plan_id.toLowerCase().includes('free');

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        percent,
        isExpired,
        isTrial,
      });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [user]);

  if (user?.role === 'admin') {
    return (
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">Administrator Lifetime Account</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">UNLIMITED ACCESS</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">You have permanent full system control and gateway processing privileges.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('admin')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
        >
          Manage Platform
        </button>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white border border-rose-500/40 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-[10px] font-extrabold uppercase tracking-wider">
                Trial Expired
              </span>
              <h3 className="text-base font-black text-white mt-0.5">Your 5-Day Free Trial Has Ended</h3>
            </div>
          </div>

          <button
            onClick={() => onNavigate('subscription')}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Subscribe & Activate Gateway</span>
          </button>
        </div>

        {/* Progress Bar 0% */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-rose-300 font-bold">0 Days Remaining</span>
            <span className="text-rose-400 font-bold">0% Completed</span>
          </div>
          <div className="w-full h-3 rounded-full bg-rose-950 border border-rose-800/50 p-0.5 overflow-hidden">
            <div className="h-full rounded-full bg-rose-600/30 w-0 transition-all duration-500" />
          </div>
        </div>

        <p className="text-xs text-rose-200/80 leading-relaxed">
          Payment link generation and automated API payment detection are currently paused for your account. Please activate a plan to resume processing UPI transactions instantly.
        </p>
      </div>
    );
  }

  // Active Trial or Subscription Mode
  const progressColor =
    timeLeft.percent > 40
      ? 'from-emerald-500 to-teal-400'
      : timeLeft.percent > 15
      ? 'from-amber-500 to-orange-400'
      : 'from-rose-500 to-pink-500';

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xl space-y-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Status Badge */}
      <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {timeLeft.isTrial ? '5-Day Free Trial Active' : 'Pro Subscription Active'}
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-0.5">
              {timeLeft.isTrial ? 'Free Trial Countdown & Progress' : 'Subscription Active Period'}
            </h3>
          </div>
        </div>

        <button
          onClick={() => onNavigate('subscription')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 border border-indigo-400/30 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>{timeLeft.isTrial ? 'Upgrade Plan' : 'Extend Subscription'}</span>
        </button>
      </div>

      {/* Live Countdown Timer Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center font-mono relative z-10">
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-xl sm:text-2xl font-black text-white">{String(timeLeft.days).padStart(2, '0')}</div>
          <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mt-0.5">Days</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-xl sm:text-2xl font-black text-indigo-300">{String(timeLeft.hours).padStart(2, '0')}</div>
          <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mt-0.5">Hours</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-xl sm:text-2xl font-black text-indigo-300">{String(timeLeft.minutes).padStart(2, '0')}</div>
          <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mt-0.5">Mins</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
          <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mt-0.5">Secs</div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-indigo-200 font-bold">
            {timeLeft.days > 0 ? `${timeLeft.days} Days & ${timeLeft.hours} Hours Remaining` : `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s Remaining`}
          </span>
          <span className="text-emerald-400 font-extrabold">{timeLeft.percent.toFixed(1)}% Remaining</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-800/80 border border-white/10 p-0.5 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-1000 shadow-sm`}
            style={{ width: `${timeLeft.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [copiedMid, setCopiedKey] = useState(false);
  const [chartMetric, setChartMetric] = useState<'Revenue' | 'Requests'>('Requests');
  const [chartPeriod, setChartPeriod] = useState<'7D' | '15D' | '30D'>('7D');
  const [dismissGuide, setDismissGuide] = useState(false);
  
  const [stats, setStats] = useState({
    totalRequests: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    revenue: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const merchantId = user?.merchant_id || '1443184937';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Kalam';
  const isImapConfigured = Boolean(user?.imap_connected);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/user/stats', {
        headers: { Authorization: `Bearer ${token}` }
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

  const handleCopyMid = () => {
    navigator.clipboard.writeText(merchantId);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {getTimeGreeting()}, {firstName} 👋
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Welcome to your FAMGATEWAY merchant dashboard.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* MID Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 shadow-xs">
            <span className="font-bold text-slate-400">MID:</span>
            <span className="font-black text-indigo-600">{merchantId}</span>
            <button
              onClick={handleCopyMid}
              className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Copy MID"
            >
              {copiedMid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* IMAP Status Badge */}
          {!isImapConfigured ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Gateway Offline</span>
              <button
                onClick={() => onNavigate('integrations')}
                className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-black text-[10px] hover:bg-amber-600 transition-colors ml-1 uppercase"
              >
                Setup
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>LIVE & SYNCING</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Progress Bar & Countdown Timer for 5-Day Free Trial */}
      <TrialProgressCard user={user} onNavigate={onNavigate} />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="TOTAL REQUESTS" 
          value={stats.totalRequests.toString()} 
          icon={<Activity className="w-5 h-5" />} 
          color="blue" 
          loading={loadingStats}
        />
        <StatCard 
          title="SUCCESSFUL" 
          value={stats.successful.toString()} 
          icon={<CheckCircle2 className="w-5 h-5" />} 
          color="emerald" 
          loading={loadingStats}
        />
        <StatCard 
          title="FAILED / PENDING" 
          value={(stats.failed + stats.pending).toString()} 
          icon={<AlertCircle className="w-5 h-5" />} 
          color="rose" 
          loading={loadingStats}
        />
        <StatCard 
          title="TOTAL REVENUE" 
          value={`₹${(Number(stats?.revenue) || 0).toFixed(2)}`} 
          icon={<Wallet className="w-5 h-5" />} 
          color="indigo" 
          loading={loadingStats}
          isRevenue
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions & Integration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Setup Guide Card */}
          {!dismissGuide && (
            <div className="p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl space-y-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              
              <button
                onClick={() => setDismissGuide(true)}
                className="text-white/60 hover:text-white absolute top-4 right-4 z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative z-10 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                    Quick Integration Guide
                  </h3>
                  <p className="text-xs text-indigo-100 font-medium">
                    Complete these steps to start accepting real-time UPI payments.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <CheckItem label="Connect Gmail IMAP" active={isImapConfigured} />
                    <CheckItem label="Generate API Key" active={Boolean(user?.api_key)} />
                    <CheckItem label="Setup Webhooks" active={Boolean(user?.webhook_url)} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={() => onNavigate('documentation')}
                      className="w-full py-2.5 rounded-xl bg-white text-indigo-600 font-black text-xs shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <span>View API Docs</span>
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Chart Area */}
          <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Transaction Volume</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Real-time payment performance</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                {['7D', '15D', '30D'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p as any)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                      chartPeriod === p ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 px-2">
              {[40, 70, 35, 90, 50, 100, 60].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div 
                    className="w-full bg-indigo-100 rounded-t-lg transition-all group-hover:bg-indigo-500 relative" 
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {h}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Day {i+1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Tools & Status */}
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Quick Tools</h3>
            
            <div className="space-y-3">
              <QuickAction 
                icon={<Globe className="w-4 h-4" />} 
                label="Payment Page Design" 
                onClick={() => onNavigate('customize')} 
              />
              <QuickAction 
                icon={<TrendingUp className="w-4 h-4" />} 
                label="View Sales Report" 
                onClick={() => onNavigate('transactions')} 
              />
              <QuickAction 
                icon={<ShieldCheck className="w-4 h-4" />} 
                label="System Health" 
                onClick={() => onNavigate('status')} 
              />
            </div>
          </div>

          <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5 fill-indigo-400" />
              </div>
              <div>
                <div className="text-xs font-black">FAMGATEWAY V1.2</div>
                <div className="text-[10px] text-slate-400 font-bold">Stable Release</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              Your server is currently running the latest version of FamPay Engine. 
              Zero-fee settlements are <strong>ACTIVE</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; loading?: boolean; isRevenue?: boolean }> = ({ title, value, icon, color, loading, isRevenue }) => {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  };

  return (
    <div className="p-5 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-4 transition-transform hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</div>
        <div className={`p-2 rounded-xl border ${colors[color] || colors.blue}`}>
          {icon}
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
        ) : (
          <div className={`text-2xl font-black font-mono tracking-tight ${isRevenue ? 'text-indigo-600' : 'text-slate-900'}`}>
            {value}
          </div>
        )}
        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-500">
          <TrendingUp className="w-3 h-3" />
          <span>+0% this week</span>
        </div>
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div className="flex items-center gap-2.5">
    {active ? (
      <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center shadow-sm">
        <Check className="w-2.5 h-2.5 text-white" />
      </div>
    ) : (
      <div className="w-4 h-4 rounded-full border border-white/20 bg-white/5" />
    )}
    <span className={`text-[11px] font-bold ${active ? 'text-white' : 'text-indigo-200'}`}>{label}</span>
  </div>
);

const QuickAction: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group cursor-pointer"
  >
    <div className="flex items-center gap-3">
      <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-900">{label}</span>
    </div>
    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-all" />
  </button>
);
