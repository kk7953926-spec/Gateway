import React, { useState } from 'react';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Check,
  RefreshCw,
  Server,
  Settings2,
  Activity,
  Copy,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DebugView } from '../components/DebugView';
import { EmailTemplatePreviewTool } from '../components/EmailTemplatePreviewTool';

export const IntegrationsView: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const [fampayGmail, setFampayGmail] = useState(user?.fampay_gmail || user?.email || 'kalam172010@gmail.com');
  const [fampayUpiId, setFampayUpiId] = useState(user?.fampay_upi_id || '8056317218@fam');
  const [backupUpiId, setBackupUpiId] = useState(user?.backup_upi_id || '');
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiSuccessMsg, setUpiSuccessMsg] = useState<string | null>(null);
  const [upiError, setUpiError] = useState<string | null>(null);
  const [appPassword, setAppPassword] = useState(user?.google_app_password || (user?.email === 'kalam172010@gmail.com' || user?.email === 'kk7953926@gmail.com' ? 'bbvnfxkuxhbynvpv' : ''));
  const [showPassword, setShowPassword] = useState(false);
  const [imapHost, setImapHost] = useState(user?.imap_host || 'imap.gmail.com');
  const [imapPort, setImapPort] = useState(user?.imap_port || 993);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedKeepAlive, setCopiedKeepAlive] = useState(false);

  const healthUrl = `${window.location.origin}/health`;

  const handleCopyHealth = () => {
    navigator.clipboard.writeText(healthUrl);
    setCopiedKeepAlive(true);
    setTimeout(() => setCopiedKeepAlive(false), 2500);
  };

  const [connecting, setConnecting] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Status state
  const [listenerStatus, setListenerStatus] = useState<'Active' | 'Connecting' | 'Error' | 'Idle'>('Idle');

  const [activeTab, setActiveTab] = useState<'Gmail & IMAP' | 'Email Preview & SMTP Tester' | 'Setup Instructions'>('Gmail & IMAP');

  const isConnected = Boolean(user?.imap_connected);

  // Poll status on load
  React.useEffect(() => {
    if (isConnected) setListenerStatus('Active');
  }, [isConnected]);

  const handleRefreshConnection = async () => {
    setListenerStatus('Connecting');
    setError(null);
    try {
      // Re-run test connection
      await handleTestConnection();
      setListenerStatus('Active');
    } catch {
      setListenerStatus('Error');
      setError('Failed to refresh connection.');
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setTestResult(null);
    setListenerStatus('Connecting');

    if (!fampayGmail || !fampayGmail.includes('@')) {
      setError('Please provide a valid email address.');
      setListenerStatus('Error');
      return;
    }

    if (!fampayUpiId || !fampayUpiId.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. username@fam, merchant@upi).');
      setListenerStatus('Error');
      return;
    }

    const cleanPass = appPassword.replace(/\s+/g, '');
    if (cleanPass.length < 8) {
      setError('App Password must be provided. For Google accounts, use a 16-character App Password.');
      setListenerStatus('Error');
      return;
    }

    setConnecting(true);

    try {
      const res = await fetch('/api/integrations/imap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fampayGmail: fampayGmail.trim(),
          fampayUpiId: fampayUpiId.trim(),
          googleAppPassword: cleanPass,
          imapHost: imapHost.trim() || undefined,
          imapPort: Number(imapPort) || 993,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'IMAP verification failed. Check App Password.');
        setListenerStatus('Error');
        setConnecting(false);
        return;
      }

      setSuccessMsg(data.message || 'Mail IMAP connected successfully! Live payment alert verification active.');
      setListenerStatus('Active');
      refreshProfile();
    } catch {
      setListenerStatus('Error');
      setError('Failed to connect to server.');
    } finally {
      setConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingImap(true);
    setTestResult(null);
    setError(null);

    try {
      const res = await fetch('/api/integrations/test-imap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: fampayGmail.trim(),
          appPassword: appPassword.replace(/\s+/g, ''),
          host: imapHost.trim() || undefined,
          port: Number(imapPort) || 993,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(`✓ ${data.message}`);
      } else {
        setError(data.error || 'IMAP test failed. Please verify your App Password and ensure IMAP is enabled in Gmail.');
      }
    } catch {
      setError('Failed to reach server for IMAP test.');
    } finally {
      setTestingImap(false);
    }
  };

  const handleSaveUpiOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError(null);
    setUpiSuccessMsg(null);

    if (!fampayUpiId || !fampayUpiId.includes('@')) {
      setUpiError('Please enter a valid Primary UPI ID (e.g. username@fam, merchant@upi).');
      return;
    }

    if (backupUpiId.trim() && !backupUpiId.includes('@')) {
      setUpiError('Backup UPI ID must be a valid UPI ID (e.g. username@okaxis, username@ybl).');
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
        body: JSON.stringify({
          fampayUpiId: fampayUpiId.trim(),
          backupUpiId: backupUpiId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUpiSuccessMsg('UPI routing updated successfully! All active checkout pages and QR codes have been refreshed with your updated UPI ID.');
        refreshProfile();
      } else {
        setUpiError(data.error || 'Failed to update UPI ID.');
      }
    } catch {
      setUpiError('Failed to connect to server.');
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Integrations</h1>
        <p className="text-xs text-slate-500 mt-1">
          Connect your Email IMAP to automate real-time FamPay UPI payment verification.
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 flex-wrap">
        {[
          'Gmail & IMAP',
          'Email Preview & SMTP Tester',
          'Setup Instructions'
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Gmail & IMAP' && (
        <div className="space-y-6">
          {/* 24/7 Keep-Alive & Continuous IMAP Worker Banner */}
          <div className="p-5 rounded-2xl bg-[#090d16] text-white shadow-md border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">24/7 Auto-Confirmation Worker Active</h3>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>RUNNING 24×7</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Background listener cross-references incoming FamPay & UPI credit alerts every 5 seconds.
                  </p>
                </div>
              </div>

              {/* Keep-Alive Copy Button */}
              <button
                type="button"
                onClick={handleCopyHealth}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                {copiedKeepAlive ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Keep-Alive URL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Copy Keep-Alive Ping URL</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>
                💡 <strong>Free Host Sleep Prevention:</strong> Paste your Keep-Alive URL (<code className="font-mono text-indigo-300">{healthUrl}</code>) into free monitors like <a href="https://uptimerobot.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold">UptimeRobot.com</a> or <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold">cron-job.org</a> (every 5 mins) to prevent Render/Cloud hosts from sleeping!
              </span>
            </div>
          </div>

          {/* UPI Routing & Transfer Limit Prevention Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>UPI ID Routing & Daily Limit Protection</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set your Primary & Backup UPI IDs. Update anytime without re-entering your email password.
                </p>
              </div>

              <div className="text-xs font-mono font-semibold text-emerald-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Instant QR Sync</span>
              </div>
            </div>

            {/* Daily Limit Info Banner */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  Daily Transfer Limit Protection for UPI Apps
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  FamPay and personal wallet accounts have daily NPCI transfer limits. When your primary UPI ID reaches its daily receiving limit, you can switch to your Bank UPI ID (e.g. <code>@okaxis</code>, <code>@oksbi</code>, <code>@ybl</code>, <code>@paytm</code>) or set a <strong>Backup UPI ID</strong> below so customers can complete payments without errors.
                </p>
              </div>
            </div>

            {upiSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{upiSuccessMsg}</span>
              </div>
            )}

            {upiError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{upiError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUpiOnly} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary UPI ID (VPA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fampayUpiId}
                    onChange={(e) => setFampayUpiId(e.target.value)}
                    placeholder="e.g. 8056317218@fam"
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Main account for receiving payments</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Backup / Alternate UPI ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={backupUpiId}
                    onChange={(e) => setBackupUpiId(e.target.value)}
                    placeholder="e.g. username@okaxis"
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Fallback when primary hits daily limit</span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={savingUpi}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingUpi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Dynamic QR Routing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Update UPI Routing & Refresh QR Codes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Email IMAP Automated Listener Connection Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Automated Real-Time IMAP Verification</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connects to your mail server via SSL to inspect incoming FamPay / UPI payment alerts
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                  <span className={`w-2 h-2 rounded-full ${
                    listenerStatus === 'Active' ? 'bg-emerald-500' :
                    listenerStatus === 'Connecting' ? 'bg-amber-500 animate-pulse' :
                    listenerStatus === 'Error' ? 'bg-rose-500' :
                    'bg-slate-400'
                  }`} />
                  <span className={
                    listenerStatus === 'Active' ? 'text-emerald-700' :
                    listenerStatus === 'Connecting' ? 'text-amber-700' :
                    listenerStatus === 'Error' ? 'text-rose-700' :
                    'text-slate-600'
                  }>{listenerStatus}</span>
                </div>
                
                <button
                  type="button"
                  onClick={handleRefreshConnection}
                  disabled={listenerStatus === 'Connecting'}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${listenerStatus === 'Connecting' ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Clarification banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">
                  Your Account Email: <span className="font-mono text-indigo-600">{user?.email || 'kalam172010@gmail.com'}</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  <strong>imap.gmail.com</strong> is Google's incoming mail server address (Host) that delivers emails to your inbox. You only need to enter your personal email and your 16-character Google App Password below.
                </p>
              </div>
            </div>

            {testResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{testResult}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Gmail Address
                </label>
                <input
                  type="email"
                  required
                  value={fampayGmail}
                  onChange={(e) => setFampayGmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The inbox that receives UPI payment notifications from FamPay.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merchant UPI ID (VPA) <span className="text-slate-400 font-normal">(e.g. username@fam)</span>
                </label>
                <input
                  type="text"
                  required
                  value={fampayUpiId}
                  onChange={(e) => setFampayUpiId(e.target.value)}
                  placeholder="e.g. 8056317218@fam"
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Google App Password (16 Characters)
                  </label>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>Generate 16-Letter App Password</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use a 16-character dedicated App Password from Google Security settings.
                </p>
              </div>

              {/* Advanced Host Settings Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{showAdvanced ? 'Hide Advanced Server Host Settings' : 'Advanced: View Mail Server Host (Default: imap.gmail.com:993)'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Incoming Mail Server (Host)</label>
                      <input
                        type="text"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        placeholder="imap.gmail.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                      />
                      <span className="text-[10px] text-slate-400">Default for Gmail: imap.gmail.com</span>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">IMAP Port (SSL)</label>
                      <input
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(Number(e.target.value))}
                        placeholder="993"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                      />
                      <span className="text-[10px] text-slate-400">Default: 993 (SSL)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying ({imapHost})...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Test & Save IMAP Connection</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingImap}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {testingImap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                  <span>Quick Test</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'Email Preview & SMTP Tester' && (
        <EmailTemplatePreviewTool />
      )}

      {activeTab === 'Setup Instructions' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700">
          <h2 className="text-base font-bold text-slate-900">
            How to Set Up Automated FamPay Alert Verification
          </h2>

          <ol className="list-decimal list-inside space-y-3 leading-relaxed">
            <li>
              Go to your Google Account:{' '}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="text-purple-600 font-bold underline inline-flex items-center gap-1"
              >
                myaccount.google.com/security <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Ensure <strong>2-Step Verification</strong> is turned <strong>ON</strong>.</li>
            <li>
              Visit the App Passwords page:{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-purple-600 font-bold underline inline-flex items-center gap-1"
              >
                myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Type <strong>"FamGateway"</strong> as the app name and click <strong>Create</strong>.</li>
            <li>Copy the generated 16-character code (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">abcd efgh ijkl mnop</code>).</li>
            <li>Ensure <strong>IMAP is enabled</strong> in your Gmail Settings: <em>Gmail &gt; Settings &gt; Forwarding and POP/IMAP &gt; Enable IMAP</em>.</li>
            <li>Paste the 16 characters into the form on the previous tab and click <strong>Test & Save IMAP Connection</strong>.</li>
          </ol>
        </div>
      )}

      <div className="pt-4 border-t border-slate-200">
        <DebugView token={token} />
      </div>
    </div>
  );
};
