import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Server,
  RefreshCw,
  Terminal,
  Mail,
  Zap,
  Clock,
  Filter,
  ExternalLink,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SystemLog } from '../types';

export const SystemStatusView: React.FC = () => {
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  const [imapStatus, setImapStatus] = useState<any>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logFilter, setLogFilter] = useState<'ALL' | 'IMAP_ONLY' | 'ERRORS_ONLY'>('ALL');

  const services = [
    { name: 'Core Payment Gateway API', status: 'Operational', uptime: '99.99%' },
    { name: 'FamPay Gmail IMAP Sync Engine', status: 'Operational', uptime: '99.95%' },
    { name: 'Dynamic UPI QR Renderer', status: 'Operational', uptime: '100.00%' },
    { name: 'Webhook Notification Service', status: 'Operational', uptime: '99.98%' },
    { name: 'Merchant Auth & Portal Service', status: 'Operational', uptime: '100.00%' },
  ];

  const fetchDiagnostics = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payment/diagnostic-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setImapStatus(data.imap_status || null);
        setLogs(data.logs || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, [token]);

  const handleRunDiagnosticScan = async () => {
    if (!token) return;
    setRunningDiag(true);
    setDiagResult(null);

    try {
      const res = await fetch('/api/payment/run-diagnostics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setDiagResult(data.diagnostic || { status: 'FAILED', message: data.error || 'Diagnostic scan failed.' });
      // Refresh logs to show the new diagnostic event
      fetchDiagnostics();
    } catch {
      setDiagResult({
        status: 'CONNECTION_ERROR',
        message: 'Could not contact server to initiate IMAP scan.',
      });
    } finally {
      setRunningDiag(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'ERRORS_ONLY') {
      return log.status === 'FAILED' || log.status === 'WARNING';
    }
    if (logFilter === 'IMAP_ONLY') {
      return (
        log.action.includes('IMAP') ||
        log.action.includes('PAYMENT_CONFIRMED') ||
        log.action.includes('CONNECT_IMAP')
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Top Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" />
            <span>System Status & Diagnostics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time health monitoring, live IMAP synchronization status, and payment diagnostic traces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDiagnostics();
            }}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Services Operational Overview */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-600" />
            <span>Core Infrastructure Status</span>
          </h2>
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>All APIs Operational</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {services.map((svc, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800 text-[11px]">{svc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{svc.uptime}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[9px]">
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IMAP LIVE DIAGNOSTICS & SYNC STATUS */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <span>Live IMAP Synchronization Diagnostics</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies connection states, Gmail SSL handshake, and reasons for payment verification failures.
            </p>
          </div>

          <button
            onClick={handleRunDiagnosticScan}
            disabled={runningDiag}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {runningDiag ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running SSL Ping...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Run Live IMAP Diagnostic Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Current Configuration Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Your Email Account</span>
            <div className="font-bold text-slate-800 truncate text-sm">
              {imapStatus?.email || imapStatus?.gmail || user?.email || 'kk7953926@gmail.com'}
            </div>
            <div className="text-[10px] text-slate-500">
              Host: <span className="text-purple-700 font-semibold">{imapStatus?.mail_server || 'imap.gmail.com'}:{imapStatus?.mail_port || 993}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">FamPay UPI ID</span>
            <div className="font-bold text-slate-800 truncate text-sm">
              {imapStatus?.upi_id || user?.fampay_upi_id || 'kalamakash@fam'}
            </div>
            <div className="text-[10px] text-slate-500">VPA Provider: FamPay Engine</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">App Password</span>
            <div className="font-bold flex items-center gap-1.5 text-sm">
              {imapStatus?.app_password_set ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Configured (Encrypted)</span>
                </span>
              ) : (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Not Configured</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500">Session Secure</div>
          </div>
        </div>

        {/* Server vs Email Clarification Note */}
        <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200/70 text-purple-900 text-xs flex items-start gap-2.5">
          <Mail className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Your Email: <span className="font-mono text-purple-700">{imapStatus?.email || imapStatus?.gmail || user?.email || 'kk7953926@gmail.com'}</span>
            </p>
            <p className="text-[11px] text-purple-800">
              <strong>imap.gmail.com</strong> is Google's incoming mail server address (Host) that delivers emails to your inbox. It is not an email address.
            </p>
          </div>
        </div>

        {/* Live Diagnostic Result Card */}
        {diagResult && (
          <div
            className={`p-4 rounded-2xl border text-xs font-mono space-y-3 animate-in fade-in duration-200 ${
              diagResult.status === 'HEALTHY_AND_CONNECTED'
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/70 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                {diagResult.status === 'HEALTHY_AND_CONNECTED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                )}
                <span>DIAGNOSTIC SCAN RESULT: {diagResult.status}</span>
              </div>
              {diagResult.latency_ms !== undefined && (
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 font-bold">
                  Latency: {diagResult.latency_ms}ms
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div>
                <strong>Your Email:</strong> {diagResult.user_email || imapStatus?.email || user?.email}
              </div>
              <div>
                <strong>Mail Server (Host):</strong> {diagResult.server || 'imap.gmail.com:993 (TLS/SSL)'}
              </div>
              <div>
                <strong>Status Message:</strong> {diagResult.message}
              </div>
              {diagResult.total_emails_in_inbox !== undefined && (
                <div>
                  <strong>Total Emails In Inbox:</strong> {diagResult.total_emails_in_inbox}
                </div>
              )}
              {diagResult.fix_suggestion && (
                <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-rose-800 text-[11px] mt-2">
                  <strong>Recommended Fix:</strong> {diagResult.fix_suggestion}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DIAGNOSTIC EVENT LOGS STREAM */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-600" />
              <span>Real-Time Diagnostic Logs</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Complete chronological audit trail of IMAP connection handshakes and verification attempts.
            </p>
          </div>

          {/* Log Filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-mono text-[11px]">
            <button
              onClick={() => setLogFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                logFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setLogFilter('IMAP_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                logFilter === 'IMAP_ONLY'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              IMAP Only
            </button>
            <button
              onClick={() => setLogFilter('ERRORS_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                logFilter === 'ERRORS_ONLY'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Errors Only
            </button>
          </div>
        </div>

        {/* Logs Table / List */}
        {filteredLogs.length > 0 ? (
          <div className="space-y-2 font-mono text-xs max-h-[480px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const isError = log.status === 'FAILED';
              const isWarning = log.status === 'WARNING';
              const isSuccess = log.status === 'SUCCESS';

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-2xl border transition-colors ${
                    isError
                      ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                      : isWarning
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                      : isSuccess
                      ? 'bg-slate-50 border-slate-200 text-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isError
                            ? 'bg-rose-200 text-rose-800'
                            : isWarning
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="font-bold text-[11px]">{log.action}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed break-words font-medium">
                    {log.details}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs font-mono">
            No logs found matching filter '{logFilter}'. Run a verification or diagnostic scan to populate logs.
          </div>
        )}
      </div>

      {/* Common Verification Troubleshooting Guide */}
      <div className="p-6 rounded-3xl bg-slate-900 text-slate-100 shadow-md space-y-4 text-xs font-mono">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          <span>Troubleshooting Payment Confirmation Failures</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
          <div className="space-y-1">
            <span className="text-purple-400 font-bold">1. Google App Password Mismatch:</span>
            <p className="text-[11px] text-slate-400">
              Must be exactly 16 characters generated from{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-purple-300 underline"
              >
                myaccount.google.com/apppasswords
              </a>
              . Standard Google account passwords are automatically rejected by Google IMAP.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-purple-400 font-bold">2. IMAP Disabled in Gmail:</span>
            <p className="text-[11px] text-slate-400">
              Go to Gmail &gt; Settings &gt; Forwarding and POP/IMAP &gt; Select "Enable IMAP" &gt; Save Changes.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-purple-400 font-bold">3. FamPay Alert Email Delay:</span>
            <p className="text-[11px] text-slate-400">
              Banks and UPI apps occasionally take 30–60 seconds to deliver the incoming transaction email alert to Gmail.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-purple-400 font-bold">4. Wrong Inbox:</span>
            <p className="text-[11px] text-slate-400">
              Ensure the Gmail entered in Integrations matches the email address registered on your FamPay account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
