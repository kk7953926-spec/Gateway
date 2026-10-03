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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DebugView } from '../components/DebugView';

export const IntegrationsView: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const [fampayGmail, setFampayGmail] = useState(user?.fampay_gmail || user?.email || 'kalam172010@gmail.com');
  const [fampayUpiId, setFampayUpiId] = useState(user?.fampay_upi_id || 'kalamakash@fam');
  const [appPassword, setAppPassword] = useState(user?.google_app_password || '');
  const [imapHost, setImapHost] = useState(user?.imap_host || 'imap.gmail.com');
  const [imapPort, setImapPort] = useState(user?.imap_port || 993);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Status state
  const [listenerStatus, setListenerStatus] = useState<'Active' | 'Connecting' | 'Error' | 'Idle'>('Idle');

  const [activeTab, setActiveTab] = useState<'Gmail & IMAP' | 'Setup Instructions'>('Gmail & IMAP');

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
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(`✓ ${data.message}`);
      } else {
        setError(data.error || 'IMAP test failed. Please verify your App Password.');
      }
    } catch {
      setError('Failed to reach server for IMAP test.');
    } finally {
      setTestingImap(false);
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

      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        {['Gmail & IMAP', 'Setup Instructions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Gmail & IMAP' ? (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                <span>Automated Real-Time IMAP Verification</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Connects to your mail server via SSL to inspect incoming FamPay / UPI payment alerts
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                listenerStatus === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                listenerStatus === 'Connecting' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                listenerStatus === 'Error' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  listenerStatus === 'Active' ? 'bg-emerald-600' :
                  listenerStatus === 'Connecting' ? 'bg-amber-600 animate-pulse' :
                  listenerStatus === 'Error' ? 'bg-rose-600' :
                  'bg-slate-600'
                }`} />
                <span>{listenerStatus}</span>
              </span>
              
              <button
                type="button"
                onClick={handleRefreshConnection}
                disabled={listenerStatus === 'Connecting'}
                className="px-3 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${listenerStatus === 'Connecting' ? 'animate-spin' : ''}`} />
                <span>Refresh Connection</span>
              </button>
            </div>
          </div>

          {/* Clarification banner */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/70 text-purple-900 text-xs flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Your Email Address: <span className="font-mono text-purple-700">{user?.email || 'kk7953926@gmail.com'}</span>
              </p>
              <p className="text-[11px] text-purple-800 mt-0.5">
                <strong>imap.gmail.com</strong> is Google's incoming mail server address (Host) that delivers emails to your inbox. You only need to enter your personal email and your 16-character Google App Password below.
              </p>
            </div>
          </div>

          {testResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{testResult}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleConnect} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Personal Email Address
              </label>
              <input
                type="email"
                required
                value={fampayGmail}
                onChange={(e) => setFampayGmail(e.target.value)}
                placeholder="e.g. kk7953926@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600 font-semibold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The inbox that receives UPI payment notifications from FamPay.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Merchant UPI ID (VPA) <span className="text-slate-400 font-normal">(e.g. username@fam)</span>
              </label>
              <input
                type="text"
                required
                value={fampayUpiId}
                onChange={(e) => setFampayUpiId(e.target.value)}
                placeholder="e.g. kalamakash@fam"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600 font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Google App Password (16 Characters)
                </label>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <span>Generate App Password</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                required
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600 tracking-wider"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Use a 16-character dedicated App Password from Google Security settings.
              </p>
            </div>

            {/* Advanced Host Settings Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{showAdvanced ? 'Hide Advanced Server Host Settings' : 'Advanced: View or Customize Mail Server Host (Default: imap.gmail.com)'}</span>
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Incoming Mail Server (Host)</label>
                    <input
                      type="text"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="imap.gmail.com"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">Default for Gmail: imap.gmail.com</span>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">IMAP Port (SSL)</label>
                    <input
                      type="number"
                      value={imapPort}
                      onChange={(e) => setImapPort(Number(e.target.value))}
                      placeholder="993"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400">Default: 993 (SSL)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={connecting}
                className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with Mail Server ({imapHost})...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Test & Save IMAP Connection</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
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
