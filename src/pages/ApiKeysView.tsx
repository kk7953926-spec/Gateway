import React, { useState } from 'react';
import { 
  Key, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RefreshCw, 
  BookOpen, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  CheckCircle2,
  Code2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ApiKeysViewProps {
  onNavigate: (nav: string) => void;
}

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({ onNavigate }) => {
  const { user, token, refreshProfile } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [showConfirmRoll, setShowConfirmRoll] = useState(false);

  const apiKey = user?.api_key || 'fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e';
  const isImapConfigured = Boolean(user?.imap_connected);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://famgateway.in';

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCurl = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurl(id);
    setTimeout(() => setCopiedCurl(null), 2000);
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
        await refreshProfile();
        setShowConfirmRoll(false);
      }
    } catch {
      // Ignore
    } finally {
      setRolling(false);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return 'fam_••••••••••••••••••••••••••••••••••••••••';
    return key.substring(0, 8) + '•'.repeat(28);
  };

  const quickPostCurl = `curl -X POST "${baseUrl}/api/create-order" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: ${apiKey}" \\
  -d '{
    "amount": 499.00,
    "customer_name": "Rahul Sharma",
    "customer_email": "rahul@example.com",
    "redirect_url": "https://yoursite.com/payment-success"
  }'`;

  const quickGetCurl = `curl -X GET "${baseUrl}/api/qr.php?api_key=${apiKey}&amount=499&customer_name=Rahul"`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-mono font-bold mb-2">
            <Key className="w-3.5 h-3.5" />
            <span>Developer Credentials</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">API Keys & Authentication</h1>
          <p className="text-xs text-slate-500 mt-1">
            Production API keys for server-to-server payments and automated FamPay UPI order generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('documentation')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Full API Docs</span>
          </button>
        </div>
      </div>

      {/* Action Required Banner if IMAP not connected */}
      {!isImapConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Connect your FamPay Gmail IMAP in Integrations for automatic 0-fee payment verification.</span>
          </div>
          <button
            onClick={() => onNavigate('integrations')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Configure IMAP
          </button>
        </div>
      )}

      {/* Main Modern API Key Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl relative overflow-hidden space-y-6">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Live Production Key</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Prefix: <span className="text-purple-300 font-bold">fam_</span> • 256-bit Secure
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero Fee FamPay Engine</span>
          </div>
        </div>

        {/* API Key Display Box */}
        <div className="relative z-10 p-3.5 sm:p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-slate-800 text-purple-400 shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-purple-200 select-all break-all">
              {showKey ? apiKey : maskKey(apiKey)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={showKey ? 'Hide Key' : 'Reveal Key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 text-xs transition-all shadow-md cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Key'}</span>
            </button>

            <button
              onClick={() => setShowConfirmRoll(true)}
              disabled={rolling}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800/60 text-slate-300 hover:text-rose-300 font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer"
              title="Regenerate API Key"
            >
              <RefreshCw className={`w-4 h-4 ${rolling ? 'animate-spin' : ''}`} />
              <span>Roll Key</span>
            </button>
          </div>
        </div>

        {/* Authentication Instructions Banner */}
        <div className="relative z-10 p-4 rounded-2xl bg-purple-950/40 border border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-200">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Pass in header: <code className="px-2 py-0.5 rounded-lg bg-purple-900/60 font-mono font-bold text-purple-300 border border-purple-800/80">X-Api-Key: {apiKey.substring(0, 12)}...</code></span>
          </div>
          <span className="text-[11px] font-mono text-purple-400 font-medium">Or as query param: <code className="text-purple-300 font-bold">?api_key=...</code></span>
        </div>
      </div>

      {/* Confirmation Modal for Rolling Key */}
      {showConfirmRoll && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Roll API Key?</h3>
                <p className="text-xs text-slate-500">Your existing API key will be immediately deactivated.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              Any active backend scripts or mobile apps using the current key will need to be updated with the new key.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmRoll(false)}
                disabled={rolling}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRollKey}
                disabled={rolling}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {rolling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Generate New Key</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Integration Examples */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Quick Integration Samples</h2>
          </div>
          <button
            onClick={() => onNavigate('documentation')}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Languages (PHP, Node, Python)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sample 1: POST /api/create-order */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-2.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30">
                  POST
                </span>
                <span className="text-xs font-bold text-slate-100 font-mono">/api/create-order</span>
              </div>
              <button
                onClick={() => handleCopyCurl(quickPostCurl, 'postCurl')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedCurl === 'postCurl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurl === 'postCurl' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 bg-slate-950/80 rounded-xl leading-relaxed">
              {quickPostCurl}
            </pre>
          </div>

          {/* Sample 2: GET /api/qr.php */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-2.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                  GET
                </span>
                <span className="text-xs font-bold text-slate-100 font-mono">/api/qr.php</span>
              </div>
              <button
                onClick={() => handleCopyCurl(quickGetCurl, 'getCurl')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedCurl === 'getCurl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurl === 'getCurl' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 bg-slate-950/80 rounded-xl leading-relaxed">
              {quickGetCurl}
            </pre>
          </div>
        </div>
      </div>

      {/* Status & Limits Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">KEY STATUS</div>
          <div className="text-xl font-extrabold text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>Operational</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">RATE LIMIT</div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">Unlimited</div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-mono text-slate-500 font-bold uppercase">COMMISSION FEE</div>
          <div className="text-xl font-extrabold text-purple-600 font-mono">0.00% (Zero Fee)</div>
        </div>
      </div>
    </div>
  );
};
