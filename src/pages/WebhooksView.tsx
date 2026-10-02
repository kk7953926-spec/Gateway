import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  AlertTriangle, 
  ShieldCheck, 
  Save, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  History,
  Activity,
  Code,
  Copy,
  Check,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const WebhooksView: React.FC<{ onNavigate: (nav: string) => void }> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'Inbound Handler' | 'Outgoing Webhook' | 'Event Logs'>('Inbound Handler');
  
  // Merchant Outgoing Webhook state
  const [url, setUrl] = useState(user?.webhook_url || '');
  const [secret, setSecret] = useState(user?.webhook_secret || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Inbound Gateway Simulator state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [simPaymentId, setSimPaymentId] = useState('');
  const [simStatus, setSimStatus] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
  const [simUtr, setSimUtr] = useState(`UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`);
  const [simAmount, setSimAmount] = useState('100');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  const isImapConfigured = Boolean(user?.imap_connected);
  const inboundWebhookUrl = `${window.location.origin}/api/payment/webhook`;

  useEffect(() => {
    if (activeTab === 'Event Logs' && token) {
      fetchLogs();
    }
  }, [activeTab, token]);

  useEffect(() => {
    // Load recent payments to provide easy selection for testing
    if (token) {
      fetch('/api/payment/my-payments', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.payments && data.payments.length > 0) {
            setRecentPayments(data.payments);
            if (!simPaymentId) {
              setSimPaymentId(data.payments[0].id);
              setSimAmount(data.payments[0].amount.toString());
            }
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/payment/diagnostic-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter for all webhook related logs (both inbound and outbound)
        const webhookLogs = (data.logs || []).filter((l: any) => 
          l.action.startsWith('WEBHOOK_') || l.action.includes('WEBHOOK')
        );
        setLogs(webhookLogs);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCopyInboundUrl = () => {
    navigator.clipboard.writeText(inboundWebhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simPaymentId.trim()) return;

    setSimulating(true);
    setSimResult(null);

    try {
      const payload = {
        event: simStatus === 'SUCCESS' ? 'payment.captured' : 'payment.failed',
        paymentId: simPaymentId.trim(),
        status: simStatus,
        utr: simStatus === 'SUCCESS' ? simUtr.trim() : undefined,
        amount: parseFloat(simAmount) || 100,
      };

      const res = await fetch('/api/payment/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Signature': user?.webhook_secret || 'sim_sig',
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      setSimResult({
        success: res.ok,
        data: resData,
        error: !res.ok ? resData.error || 'Webhook returned error' : undefined,
      });

      // Generate a new random UTR for next test
      setSimUtr(`UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`);
      // Refresh logs
      fetchLogs();
    } catch (err) {
      setSimResult({
        success: false,
        error: (err as Error).message,
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveOutgoing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/integrations/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url, secret })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Merchant webhook settings updated successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Webhook className="w-6 h-6 text-indigo-600" />
          <span>Real-Time Webhook Engine</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Receive real-time asynchronous notifications from payment gateways to update transaction statuses reliably, and forward captured events to your merchant server.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
          {(['Inbound Handler', 'Outgoing Webhook', 'Event Logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab === 'Inbound Handler' && <ArrowDownLeft className="w-3.5 h-3.5" />}
              {tab === 'Outgoing Webhook' && <ArrowUpRight className="w-3.5 h-3.5" />}
              {tab === 'Event Logs' && <History className="w-3.5 h-3.5" />}
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: INBOUND GATEWAY WEBHOOK HANDLER */}
        {activeTab === 'Inbound Handler' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Live Webhook Handler URL Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white border border-indigo-900 shadow-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider font-mono">
                    Gateway Webhook Handler Active
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  HTTP POST • JSON
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Your Webhook Endpoint URL (Provide to Payment Gateway / Banks):
                </label>
                <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <code className="text-xs font-mono text-indigo-300 select-all flex-1 truncate">
                    {inboundWebhookUrl}
                  </code>
                  <button
                    onClick={handleCopyInboundUrl}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                When external payment gateways (PhonePe, FamPay, Razorpay, Cashfree, or UPI bank switches) confirm a customer payment, their servers send an HTTP POST request to this endpoint. The gateway handler extracts the UTR/RRN, validates idempotency, marks the transaction as <span className="text-emerald-400 font-bold">CONFIRMED</span>, credits your merchant wallet, and dispatches automated customer receipts.
              </p>
            </div>

            {/* Interactive Real-Time Webhook Simulator */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Real-Time Gateway Webhook Simulator</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">Test real-time async status updates</span>
              </div>

              <form onSubmit={handleSimulateWebhook} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Payment / Order ID</label>
                    <input
                      type="text"
                      value={simPaymentId}
                      onChange={(e) => setSimPaymentId(e.target.value)}
                      placeholder="e.g. pay_demo or link ID"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    {recentPayments.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                        <span>Recent:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSimPaymentId(recentPayments[0].id);
                            setSimAmount(recentPayments[0].amount.toString());
                          }}
                          className="text-indigo-600 hover:underline font-mono font-bold truncate max-w-[120px]"
                        >
                          {recentPayments[0].id}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Gateway Status</label>
                    <select
                      value={simStatus}
                      onChange={(e) => setSimStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="SUCCESS">SUCCESS (Confirmed / Paid)</option>
                      <option value="FAILED">FAILED (Transaction Failed)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Bank UTR / RRN</label>
                    <input
                      type="text"
                      value={simUtr}
                      onChange={(e) => setSimUtr(e.target.value)}
                      disabled={simStatus === 'FAILED'}
                      placeholder="12-digit UTR"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Amount (₹ INR)</label>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={simulating || !simPaymentId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Trigger Inbound Webhook Notification</span>
                </button>
              </form>

              {/* Simulation Result Box */}
              {simResult && (
                <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                  simResult.success 
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
                    : 'bg-rose-50/80 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-center gap-2 font-bold font-sans">
                    {simResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-800">Status 200 OK — Webhook Handled Successfully</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span className="text-rose-800">Webhook Rejected: {simResult.error}</span>
                      </>
                    )}
                  </div>
                  <pre className="p-3 bg-white/80 rounded-lg text-[11px] overflow-x-auto border border-slate-200">
                    {JSON.stringify(simResult.data || { error: simResult.error }, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Supported Payload Specifications */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-500" />
                <span>Supported Payload Formats</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                The inbound handler automatically recognizes standard gateway formats from PhonePe, FamPay, Razorpay, Cashfree, and custom UPI webhooks:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">1. Standard Flat / UPI Gateway:</div>
                  <pre className="text-[10px] font-mono text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-x-auto">
{`{
  "event": "payment.captured",
  "paymentId": "ORD_1024",
  "status": "SUCCESS",
  "utr": "428910284719",
  "amount": 500.00
}`}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">2. Event-Based / Nested:</div>
                  <pre className="text-[10px] font-mono text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-x-auto">
{`{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_98214",
        "order_id": "ORD_1024",
        "status": "captured",
        "amount": 500,
        "acquirer_data": { "rrn": "428910284719" }
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OUTGOING MERCHANT WEBHOOK SETTINGS */}
        {activeTab === 'Outgoing Webhook' && (
          <form onSubmit={handleSaveOutgoing} className="space-y-5 animate-in fade-in duration-200">
            {!isImapConfigured && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Action Required: Connect your FamPay Gmail App Password before configuring outgoing webhooks.</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('integrations')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                >
                  Connect FamPay Gmail
                </button>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>All payloads sent to your server are cryptographically signed with HMAC-SHA256 in header <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">X-FamGateway-Signature</code>.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Your Server's Callback URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-api.com/webhooks/fampay"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
                <p className="text-[10px] text-slate-400">The destination URL on your server where we'll POST real-time payment updates.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Webhook Secret (Signing Key)</label>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="e.g. whsec_your_secret_key"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
                <p className="text-[10px] text-slate-400">Used to sign payloads with HMAC-SHA256. If empty, your Default API Key is used.</p>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !isImapConfigured}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Webhook Settings</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: EVENT & DELIVERY LOGS */}
        {activeTab === 'Event Logs' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                <span>Real-Time Webhook Activity & Delivery Logs</span>
              </h3>
              <button 
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Activity className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold">
                Loading webhook event history...
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log) => {
                  const isInbound = log.action.includes('PAYMENT_CONFIRMED') || log.action.includes('IDEMPOTENT') || log.action.includes('REJECTED');
                  const isSuccess = log.status === 'SUCCESS' || log.status === 'INFO';
                  return (
                    <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isInbound ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-black uppercase text-indigo-600 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                              {log.action.replace('WEBHOOK_', '')}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-900 mt-1">{log.details}</div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          isSuccess 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isSuccess ? 'HTTP 200' : 'ERROR'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">No webhook events logged yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Use the Inbound Handler simulator tab or configure your payment gateway to test real-time notifications.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
