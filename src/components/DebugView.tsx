import React, { useState, useEffect } from 'react';
import {
  Terminal,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Mail,
  ArrowRight,
  Database
} from 'lucide-react';

interface DiagnosticLog {
  id: string;
  action: string;
  ip: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'INFO';
  details: string;
  created_at: string;
}

interface DebugViewProps {
  token: string | null;
}

export const DebugView: React.FC<DebugViewProps> = ({ token }) => {
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payment/diagnostic-logs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Retrieve and slice to last 20 logs
        setLogs(data.logs ? data.logs.slice(0, 20) : []);
      }
    } catch (err) {
      console.error('Failed to retrieve diagnostic logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>SUCCESS</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 shrink-0" />
            <span>FAILED</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>WARNING</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-300 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-900 text-slate-100 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Ecosystem diagnostic log terminal (Live 20 Logs)</span>
              {autoRefresh && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              )}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Inspect whether the 'FamPay X' filters are correctly identifying and matching payment emails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-800/50 px-2.5 py-1.5 rounded-xl border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-purple-500 rounded"
            />
            <span>Auto Refresh</span>
          </label>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all disabled:opacity-50 text-[11px] font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 py-0.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by amount, ref or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-semibold"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Filter:</span>
          <div className="flex gap-1 overflow-x-auto">
            {['ALL', 'SUCCESS', 'FAILED', 'WARNING'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shrink-0 ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white border border-purple-500'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline of Logs */}
      <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-slate-950/50 border border-slate-800/50 text-slate-500 space-y-2">
            <Mail className="w-7 h-7 mx-auto opacity-30 text-purple-400" />
            <p className="text-xs font-semibold">No diagnostic logs found matching current criteria.</p>
            <p className="text-[10px] opacity-75">Initiate a payment simulation or submit a UTR to populate logs.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2"
            >
              {/* Top row */}
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-purple-400 font-mono text-[9px] font-bold">
                    {log.action}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                  </span>
                </div>
                {getStatusBadge(log.status)}
              </div>

              {/* Message Details */}
              <div className="text-xs text-slate-200 leading-relaxed font-mono select-text break-words">
                {log.details}
              </div>

              {/* Advanced Explainer / Debug assistant block */}
              {log.details.toLowerCase().includes('not verified') || log.status === 'FAILED' ? (
                <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-300 text-[10px] leading-relaxed flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Debugging Hint:</span>
                    {log.details.includes('received before') ? (
                      <span> The email found was sent before the checkout page was rendered. Pay again and verify fresh.</span>
                    ) : log.details.includes('fampay x payment') ? (
                      <span> Strict filter checked for fampay parameters but matching emails had headers from external providers. Verify sender address contains 'fampay'.</span>
                    ) : (
                      <span> Google App Password might be incorrect, or the bank notification email has not arrived in Gmail. Verify Gmail Connection status.</span>
                    )}
                  </div>
                </div>
              ) : null}

              {log.status === 'SUCCESS' && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-300 text-[10px] leading-relaxed flex gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Sync Verification OK:</span> Verified UPI transaction. Wallet balances updated successfully in memory/Firestore.
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Diagnostic Tip */}
      <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-[10px] text-purple-300 flex items-start gap-2.5 leading-relaxed font-mono">
        <Database className="w-4 h-4 shrink-0 text-purple-400" />
        <div>
          <span className="font-bold">Database Sync Status:</span> Real-time IMAP scan reads are matched automatically against pending checkout IDs. All verification attempts generate structured persistent audit records.
        </div>
      </div>
    </div>
  );
};
