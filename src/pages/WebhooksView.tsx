import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  AlertTriangle, 
  ShieldCheck, 
  Save, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  History,
  Activity,
  Code
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const WebhooksView: React.FC<{ onNavigate: (nav: string) => void }> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'Endpoints' | 'Delivery Logs'>('Endpoints');
  
  const [url, setUrl] = useState(user?.webhook_url || '');
  const [secret, setSecret] = useState(user?.webhook_secret || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const isImapConfigured = Boolean(user?.imap_connected);

  useEffect(() => {
    if (activeTab === 'Delivery Logs' && token) {
      fetchLogs();
    }
  }, [activeTab, token]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/payment/diagnostic-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter for webhook related logs
        const webhookLogs = (data.logs || []).filter((l: any) => 
          l.action.startsWith('WEBHOOK_')
        );
        setLogs(webhookLogs);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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
        setMessage({ type: 'success', text: 'Webhook settings updated successfully!' });
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
          <span>Webhooks</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Receive real-time HTTP POST notifications whenever customer payments succeed.
        </p>
      </div>

      {!isImapConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-700">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Action Required: You must connect your FamPay Gmail App Password before you can configure webhooks.</span>
          </div>
          <button
            onClick={() => onNavigate('integrations')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs transition-colors"
          >
            Connect FamPay Gmail
          </button>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>All payloads are cryptographically signed with your secret in header <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">X-FamGateway-Signature</code>.</span>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
          {['Endpoints', 'Delivery Logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Endpoints' ? (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Payload URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-api.com/webhooks/fampay"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
                <p className="text-[10px] text-slate-400">The destination URL where we'll send the POST data.</p>
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
                <p className="text-[10px] text-slate-400">Used to sign the payload. If empty, your Default API Key is used.</p>
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

            <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-500" />
                Example Payload Format
              </h3>
              <pre className="text-[10px] font-mono text-slate-600 bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto">
{`{
  "event": "payment.captured",
  "data": {
    "id": "txn_81j2l9a2",
    "transaction_ref": "482917305614",
    "amount": 100.00,
    "upi_id": "merchant@fam",
    "note": "VIP Order",
    "status": "CONFIRMED",
    "confirmed_at": "2026-10-02T13:45:00Z"
  }
}`}
              </pre>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                Recent Delivery Attempts
              </h3>
              <button 
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Activity className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                Refresh Logs
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold">
                Loading delivery history...
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {log.status === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">{log.details}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{new Date(log.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    {log.status === 'SUCCESS' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-200">
                        HTTP 200
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">No delivery logs yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When a payment is captured, the delivery result will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
