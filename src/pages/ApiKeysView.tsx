import React, { useState } from 'react';
import { Key, AlertTriangle, Eye, EyeOff, Copy, Check, RefreshCw, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ApiKeysViewProps {
  onNavigate: (nav: string) => void;
}

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({ onNavigate }) => {
  const { user, token, refreshProfile } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rolling, setRolling] = useState(false);

  const apiKey = user?.api_key || 'fam_live_samplekey1234567890';
  const isImapConfigured = Boolean(user?.imap_connected);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRollKey = async () => {
    if (!token) return;
    setRolling(true);
    try {
      const res = await fetch('/api/apikeys/roll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        refreshProfile();
      }
    } catch {
      // Ignore
    } finally {
      setRolling(false);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return 'fam_****************';
    return key.substring(0, 8) + '•'.repeat(24);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">API Keys</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage secret API credentials for your backend integrations.
          </p>
        </div>

        <button
          onClick={() => onNavigate('documentation')}
          className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-xs"
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>API Documentation</span>
        </button>
      </div>

      {/* Action Required Banner if IMAP not connected */}
      {!isImapConfigured && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Action Required: You must connect your FamPay Gmail App Password before you can view or use your API keys.</span>
          </div>
          <button
            onClick={() => onNavigate('integrations')}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs transition-colors"
          >
            Connect FamPay Gmail
          </button>
        </div>
      )}

      {/* Auth Info */}
      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Authenticate all API requests with header <code className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">Authorization: Bearer &lt;KEY&gt;</code></span>
        </div>
        <div className="font-mono text-[11px] font-bold text-slate-500">
          🔄 100 Reset Chances Left
        </div>
      </div>

      {/* Default Key Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Default Key</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-300">
              Active
            </span>
          </div>

          <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
            <span>0 requests</span>
            <span>•</span>
            <span>Never used</span>
            <span>•</span>
            <span>Created Oct 02, 2026</span>
          </div>
        </div>

        {/* Key Box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono text-xs text-slate-900">
          <span className="font-bold tracking-wider">
            {showKey ? apiKey : maskKey(apiKey)}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
              title="Reveal Key"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-[11px] font-bold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleRollKey}
              disabled={rolling}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rolling ? 'animate-spin' : ''}`} />
              <span>Roll Key</span>
            </button>
          </div>
        </div>
      </div>

      {/* Traffic Cards */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">API Request Traffic</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">PERIOD REQUESTS</div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">0</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">DAILY AVERAGE</div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">0.0</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">PEAK DAY VOLUME</div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">0</div>
          </div>
        </div>
      </div>
    </div>
  );
};
