import React, { useState } from 'react';
import {
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Mail,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Send,
  Lock,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DiagnosticStep {
  step: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  details: string;
  durationMs: number;
}

interface DiagnosticResponse {
  success: boolean;
  protocol: 'IMAP' | 'SMTP';
  latencyMs: number;
  summary: string;
  steps: DiagnosticStep[];
  rawLogs: string[];
  diagnostics?: {
    host: string;
    port: number;
    email: string;
    totalEmails?: number;
    secure: boolean;
    recommendation?: string;
  };
  error?: string;
}

export const MailServerDebugger: React.FC = () => {
  const { token, user } = useAuth();

  const [protocol, setProtocol] = useState<'IMAP' | 'SMTP'>('IMAP');
  const [email, setEmail] = useState(user?.fampay_gmail || user?.email || 'kalam172010@gmail.com');
  const [password, setPassword] = useState(user?.google_app_password || 'bbvnfxkuxhbynvpv');
  const [host, setHost] = useState(user?.imap_host || 'imap.gmail.com');
  const [port, setPort] = useState(String(user?.imap_port || '993'));
  const [sendTestMessage, setSendTestMessage] = useState(true);
  const [testRecipient, setTestRecipient] = useState(user?.email || 'kalam172010@gmail.com');

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResponse | null>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Preset switchers
  const applyPreset = (presetName: 'GMAIL_IMAP' | 'GMAIL_SMTP' | 'OUTLOOK_IMAP' | 'HOSTINGER_IMAP') => {
    if (presetName === 'GMAIL_IMAP') {
      setProtocol('IMAP');
      setHost('imap.gmail.com');
      setPort('993');
    } else if (presetName === 'GMAIL_SMTP') {
      setProtocol('SMTP');
      setHost('smtp.gmail.com');
      setPort('465');
    } else if (presetName === 'OUTLOOK_IMAP') {
      setProtocol('IMAP');
      setHost('outlook.office365.com');
      setPort('993');
    } else if (presetName === 'HOSTINGER_IMAP') {
      setProtocol('IMAP');
      setHost('imap.hostinger.com');
      setPort('993');
    }
  };

  const handleProtocolChange = (newProtocol: 'IMAP' | 'SMTP') => {
    setProtocol(newProtocol);
    if (newProtocol === 'IMAP') {
      setHost('imap.gmail.com');
      setPort('993');
    } else {
      setHost('smtp.gmail.com');
      setPort('465');
    }
    setResult(null);
  };

  const handleRunDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setRunning(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/debug-mail-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          protocol,
          email: email.trim(),
          password: password.replace(/\s+/g, ''),
          host: host.trim(),
          port: Number(port),
          testRecipient: testRecipient.trim() || undefined,
          sendTestMessage: protocol === 'SMTP' && sendTestMessage,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        protocol,
        latencyMs: 0,
        summary: err.message || 'Network error connecting to diagnostic backend service.',
        steps: [
          {
            step: 'Connection',
            status: 'FAILED',
            details: 'Could not reach local server endpoint.',
            durationMs: 0,
          },
        ],
        rawLogs: [`[ERROR] ${err.message || 'Network failure'}`],
      });
    } finally {
      setRunning(false);
    }
  };

  const handleCopyLogs = () => {
    if (!result?.rawLogs) return;
    navigator.clipboard.writeText(result.rawLogs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction Banner */}
      <div className="p-6 rounded-2xl bg-[#0a0f1d] text-white border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Mail Server Diagnostic Engine</h2>
                <span className="text-emerald-400 text-xs font-mono font-bold">
                  · Socket Tester
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time protocol verification for IMAP (Inward Alert Sniffer) and SMTP (Outward Email Dispatcher).
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => applyPreset('GMAIL_IMAP')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                protocol === 'IMAP' && host.includes('gmail')
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Gmail IMAP
            </button>
            <button
              type="button"
              onClick={() => applyPreset('GMAIL_SMTP')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                protocol === 'SMTP' && host.includes('gmail')
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Gmail SMTP
            </button>
            <button
              type="button"
              onClick={() => applyPreset('HOSTINGER_IMAP')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
            >
              Hostinger
            </button>
          </div>
        </div>
      </div>

      {/* Main Form & Configuration Panel */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        {/* Protocol Selector */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 font-mono text-xs font-bold">
            <button
              type="button"
              onClick={() => handleProtocolChange('IMAP')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                protocol === 'IMAP'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>IMAP (Payment Alerts)</span>
            </button>
            <button
              type="button"
              onClick={() => handleProtocolChange('SMTP')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                protocol === 'SMTP'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>SMTP (Email Sender)</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            Target: <strong className="text-slate-800">{protocol === 'IMAP' ? 'INBOX Sniffing (Port 993)' : 'Mail Delivery (Port 465/587)'}</strong>
          </div>
        </div>

        <form onSubmit={handleRunDiagnostic} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Account Email Address</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>16-Digit Google App Password</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. abcd efgh ijkl mnop"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Mail Server Host</label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={protocol === 'IMAP' ? 'imap.gmail.com' : 'smtp.gmail.com'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">SSL / TLS Port</label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder={protocol === 'IMAP' ? '993' : '465'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Extra options for SMTP */}
          {protocol === 'SMTP' && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendTestMessage"
                  checked={sendTestMessage}
                  onChange={(e) => setSendTestMessage(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="sendTestMessage" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Dispatch Live Test Verification Email
                </label>
              </div>

              {sendTestMessage && (
                <div className="flex items-center gap-2 w-full sm:w-72">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Recipient email address"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={running}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Socket Diagnostics...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Run Real-Time Connection Diagnostic</span>
                </>
              )}
            </button>

            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Get Google App Password</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </form>

        {/* Diagnostic Output View */}
        {result && (
          <div className="space-y-5 pt-4 border-t border-slate-100 animate-in fade-in">
            {/* Summary Status Header */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                result.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    result.success ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  {result.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="text-sm font-black flex items-center gap-2">
                    <span>{result.success ? 'DIAGNOSTIC PASSED: Mail Server is HEALTHY ✓' : 'DIAGNOSTIC FAILED ✕'}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        result.success ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {result.protocol}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-90">{result.summary || result.error}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 flex items-center gap-1.5 font-bold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{result.latencyMs}ms Latency</span>
                </div>
                {result.diagnostics?.totalEmails !== undefined && (
                  <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 font-bold text-slate-700">
                    INBOX: {result.diagnostics.totalEmails} msgs
                  </div>
                )}
              </div>
            </div>

            {/* Step Pipeline Trace */}
            {result.steps && result.steps.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Protocol Handshake Execution Pipeline</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {result.steps.map((st, i) => {
                    let badgeClass = 'bg-slate-200 text-slate-700 border-slate-300';
                    let Icon = Clock;
                    if (st.status === 'SUCCESS') {
                      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      Icon = CheckCircle2;
                    } else if (st.status === 'FAILED') {
                      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
                      Icon = AlertCircle;
                    }

                    return (
                      <div key={i} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{st.step}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border flex items-center gap-1 ${badgeClass}`}>
                            <Icon className="w-2.5 h-2.5" />
                            <span>{st.status}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">{st.details}</p>
                        <div className="text-[10px] text-slate-400 font-mono">{st.durationMs}ms</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Smart Fix Recommendation */}
            {result.diagnostics?.recommendation && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  result.success
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>{result.success ? 'Engine Verification Note:' : 'Auto-Fix Recommendation:'}</span>
                </div>
                <p>{result.diagnostics.recommendation}</p>
              </div>
            )}

            {/* Live Socket & Terminal Logs Console */}
            {result.rawLogs && result.rawLogs.length > 0 && (
              <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800 text-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <span className="font-bold">Raw Socket Protocol Trace</span>
                    <span className="text-[10px] text-slate-500">({result.rawLogs.length} events)</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLogs ? 'Copied!' : 'Copy Trace'}</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
                  {result.rawLogs.map((logLine, idx) => {
                    let lineClass = 'text-slate-300';
                    if (logLine.includes('SUCCESS') || logLine.includes('OK') || logLine.includes('authenticated')) {
                      lineClass = 'text-emerald-400 font-bold';
                    } else if (logLine.includes('ERROR') || logLine.includes('FAILED') || logLine.includes('NO [') || logLine.includes('FAIL')) {
                      lineClass = 'text-rose-400 font-bold';
                    } else if (logLine.includes('C: ') || logLine.includes('EHLO')) {
                      lineClass = 'text-indigo-300';
                    }

                    return (
                      <div key={idx} className={`${lineClass} break-all`}>
                        {logLine}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
