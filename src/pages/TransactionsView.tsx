import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CreditCard,
  RefreshCw,
  Zap,
  Download,
  ShieldCheck,
  CheckCircle2,
  Activity,
  AlertCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OrderTransactionRecord } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateTransactionPdfReport } from '../utils/pdfGenerator';

interface DiagnosticLogItem {
  id: string;
  time: string;
  type: 'SYNC' | 'CONFIRM' | 'PENDING' | 'ERROR' | 'HEARTBEAT';
  message: string;
  details?: string;
}

export const TransactionsView: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'All' | 'Created' | 'Captured' | 'Expired' | 'Failed'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<OrderTransactionRecord[]>([]);
  const transactionsRef = useRef<OrderTransactionRecord[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [verifyingTxnId, setVerifyingTxnId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Heartbeat & Diagnostics State
  const [heartbeatActive, setHeartbeatActive] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>(new Date());
  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLogItem[]>([
    {
      id: 'init',
      time: new Date().toLocaleTimeString(),
      type: 'HEARTBEAT',
      message: 'Gateway Engine initialized. Background IMAP & Firestore listener active.',
    },
  ]);

  // Keep ref synchronized with state
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  const addDiagnosticLog = (type: DiagnosticLogItem['type'], message: string, details?: string) => {
    setDiagnosticLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        type,
        message,
        details,
      },
      ...prev.slice(0, 49), // Keep latest 50 logs
    ]);
  };

  // 1. Fetch transactions via REST API
  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
          setLastHeartbeat(new Date());
        }
      }
    } catch (err: any) {
      addDiagnosticLog('ERROR', 'Failed to fetch transactions from server', err.message);
    }
  };

  // 2. Real-Time Firestore Listener for Live Transaction Updates
  useEffect(() => {
    fetchTransactions();

    if (!user?.id) return;

    try {
      const q = query(
        collection(db, 'upi_payments'),
        where('user_id', '==', user.id)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fsUpdates: Record<string, any> = {};
            snapshot.docs.forEach((docSnap) => {
              fsUpdates[docSnap.id] = docSnap.data();
            });

            setTransactions((prev) => {
              if (prev.length === 0) return prev;
              return prev.map((item) => {
                const fsData = fsUpdates[item.id];
                if (fsData) {
                  if (fsData.status === 'CONFIRMED' && item.status !== 'CAPTURED') {
                    addDiagnosticLog(
                      'CONFIRM',
                      `Order ${item.id} confirmed via Firestore live sync!`,
                      `UTR: ${fsData.transaction_ref || 'Captured'}`
                    );
                  }
                  return {
                    ...item,
                    status: fsData.status || item.status,
                    confirmed_at: fsData.confirmed_at || item.confirmed_at,
                    transaction_ref: fsData.transaction_ref || (item as any).transaction_ref,
                  };
                }
                return item;
              });
            });
            setLastHeartbeat(new Date());
          }
        },
        (err) => {
          console.warn('[TransactionsView Listener Notice]:', err.message);
        }
      );

      return () => unsubscribe();
    } catch {
      // Fallback
    }
  }, [user?.id, token]);

  // 3. Resilient Background Gateway Engine Heartbeat & Auto-Sync Poller
  useEffect(() => {
    if (!token) return;

    const poller = setInterval(async () => {
      const currentList = transactionsRef.current;
      const pendingItems = currentList.filter(
        (t) => t.status === 'CREATED' || t.status === 'PENDING'
      );

      setLastHeartbeat(new Date());
      setHeartbeatCount((c) => c + 1);

      if (pendingItems.length === 0) {
        return;
      }

      for (const t of pendingItems.slice(0, 3)) {
        try {
          const res = await fetch(`/api/payment/sync/${t.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === 'CONFIRMED' || data.status === 'CAPTURED') {
              addDiagnosticLog(
                'CONFIRM',
                `Order ${t.id} (₹${t.amount}) auto-confirmed via IMAP Engine!`,
                `UTR: ${data.payment?.transaction_ref || 'Confirmed'}`
              );

              setTransactions((prev) =>
                prev.map((item) =>
                  item.id === t.id
                    ? {
                        ...item,
                        status: 'CAPTURED',
                        confirmed_at: data.payment?.confirmed_at || new Date().toISOString(),
                        transaction_ref: data.payment?.transaction_ref || (item as any).transaction_ref,
                      }
                    : item
                )
              );
            } else {
              addDiagnosticLog(
                'PENDING',
                `Scanned INBOX for Order ${t.id} (₹${t.amount})`,
                `Status: PENDING • ${data.message || 'No matching credit email received yet'}`
              );
            }
          }
        } catch (err: any) {
          addDiagnosticLog('ERROR', `Auto-sync error on Order ${t.id}`, err.message);
        }
      }
    }, 6000);

    return () => clearInterval(poller);
  }, [token]);

  // 4. Manual Single Transaction Verification Against Gateway Engine
  const handleVerifySingle = async (txnId: string) => {
    if (!token) return;
    setVerifyingTxnId(txnId);
    setSyncMsg(`Scanning Gmail IMAP for ${txnId}...`);
    addDiagnosticLog('SYNC', `Manual IMAP check initiated for ${txnId}`);

    try {
      const res = await fetch(`/api/payment/sync/${txnId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'CONFIRMED' || data.status === 'CAPTURED') {
          const utr = data.payment?.transaction_ref || 'Confirmed';
          setSyncMsg(`✓ Transaction ${txnId} verified & confirmed! Bank Ref: ${utr}`);
          addDiagnosticLog('CONFIRM', `Transaction ${txnId} successfully verified!`, `Bank Ref: ${utr}`);
          fetchTransactions();
        } else {
          setSyncMsg(`ℹ Status for ${txnId}: PENDING (${data.message || 'No matching payment credit alert found in Gmail inbox'}).`);
          addDiagnosticLog('PENDING', `IMAP Check Result for ${txnId}`, data.message || 'No matching email in INBOX');
        }
      } else {
        setSyncMsg(`Failed to query gateway for ${txnId}.`);
        addDiagnosticLog('ERROR', `Failed to query gateway for ${txnId}`);
      }
    } catch (err: any) {
      setSyncMsg(`Error verifying transaction ${txnId}.`);
      addDiagnosticLog('ERROR', `Error verifying ${txnId}`, err.message);
    } finally {
      setVerifyingTxnId(null);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  };

  // 5. Bulk Reconciliation
  const handleReconcilePending = async () => {
    if (!token) return;
    setReconciling(true);
    setSyncMsg('Running Gateway Engine cross-referencing auto-sync...');
    addDiagnosticLog('SYNC', 'Bulk reconciliation triggered across all pending orders');

    try {
      const res = await fetch('/api/payment/reconcile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSyncMsg(data.message || 'Reconciliation complete.');
        addDiagnosticLog(
          'SYNC',
          `Reconciliation completed: checked ${data.checked} orders, confirmed ${data.confirmed}`,
          data.message
        );
        fetchTransactions();
      }
    } catch (err: any) {
      setSyncMsg('Reconciliation failed.');
      addDiagnosticLog('ERROR', 'Bulk reconciliation failed', err.message);
    } finally {
      setReconciling(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  const handleDownloadSalesReport = () => {
    generateTransactionPdfReport(filtered, activeTab, user?.name || 'FamGateway Merchant');
  };

  const pendingCount = transactions.filter(
    (t) => t.status === 'CREATED' || t.status === 'PENDING'
  ).length;

  const capturedCount = transactions.filter((t) => t.status === 'CAPTURED').length;

  const filtered = transactions.filter((t) => {
    if (activeTab === 'Created') if (t.status !== 'CREATED' && t.status !== 'PENDING') return false;
    if (activeTab === 'Captured') if (t.status !== 'CAPTURED') return false;
    if (activeTab === 'Expired') if (t.status !== 'EXPIRED') return false;
    if (activeTab === 'Failed') if (t.status !== 'FAILED') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const idMatch = t.id && t.id.toLowerCase().includes(q);
      const upiMatch = t.upi_id && t.upi_id.toLowerCase().includes(q);
      const refMatch = (t as any).transaction_ref && String((t as any).transaction_ref).toLowerCase().includes(q);
      return idMatch || upiMatch || refMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Transactions Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time transaction stream with automated Gateway Engine verification.
          </p>
        </div>
      </div>

      {/* 24/7 Gateway Engine Heartbeat & Live Diagnostics Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0e1320] border border-slate-800 text-slate-100 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono">Gateway Poller: Healthy & Live</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30 font-mono">
                  HEARTBEAT ACTIVE (6s)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono flex items-center gap-3">
                <span>Last Sync: <strong className="text-slate-200">{lastHeartbeat.toLocaleTimeString()}</strong></span>
                <span>•</span>
                <span>Pending Orders Monitored: <strong className="text-amber-400">{pendingCount}</strong></span>
                <span>•</span>
                <span>Captured: <strong className="text-emerald-400">{capturedCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>{showDiagnostics ? 'Hide Live Logs' : 'View Verification Logs'}</span>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Live Diagnostics Console */}
        {showDiagnostics && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-purple-400" />
                <span className="font-bold text-slate-300">Live Engine Diagnostics & IMAP Inspection Events</span>
              </div>
              <span>Total Events: {diagnosticLogs.length}</span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl bg-[#090d16] border border-slate-800/90 p-3 space-y-1.5 font-mono text-[11px]">
              {diagnosticLogs.map((log) => {
                let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                if (log.type === 'CONFIRM') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
                if (log.type === 'ERROR') badgeColor = 'bg-rose-950 text-rose-300 border-rose-700/60';
                if (log.type === 'PENDING') badgeColor = 'bg-amber-950 text-amber-300 border-amber-700/60';
                if (log.type === 'SYNC') badgeColor = 'bg-indigo-950 text-indigo-300 border-indigo-700/60';

                return (
                  <div key={log.id} className="flex items-start gap-2 border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0">
                    <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">{log.time}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${badgeColor}`}>
                      {log.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-200 font-semibold">{log.message}</span>
                      {log.details && (
                        <div className="text-[10px] text-slate-400 truncate">{log.details}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-mono">
          {(['All', 'Created', 'Captured', 'Expired', 'Failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-bold cursor-pointer transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'Created' ? 'Pending' : tab}
            </button>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in Order ID, UTR, UPI..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={handleReconcilePending}
              disabled={reconciling}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 font-bold cursor-pointer transition-all disabled:opacity-50"
              title="Auto-Sync & Cross-Reference Pending Orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
              <span>{reconciling ? 'Syncing...' : '⚡ Sync & Reconcile'}</span>
            </button>
            <button
              onClick={handleDownloadSalesReport}
              className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 flex items-center gap-1 font-bold cursor-pointer"
              title="Download PDF Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={fetchTransactions}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-mono font-bold flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
            <span>{syncMsg}</span>
          </div>
        )}

        {/* Transactions Table / Empty State */}
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Merchant UPI</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Gateway Check</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t, idx) => {
                  const txnId = t?.id || '';
                  const isApiOnly =
                    t?.source === 'API_ONLY' ||
                    Boolean(txnId && typeof txnId === 'string' && txnId.startsWith('txn_')) ||
                    Boolean(t?.note && typeof t.note === 'string' && t.note.includes('Order'));

                  const isCaptured = t.status === 'CAPTURED';

                  return (
                    <tr key={`${t.id || 'txn'}-${t.created_at || ''}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-bold text-indigo-700">
                        {t.id}
                        {(t as any)?.transaction_ref && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            UTR: {(t as any).transaction_ref}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        {isApiOnly ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200" title="API Transaction (No public payment link generated)">
                            API_ONLY
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200" title="Merchant Created Payment Link">
                            MERCHANT_LINK
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-700">{t.upi_id}</td>
                      <td className="py-3 font-bold text-slate-900">₹{(Number(t?.amount) || 0).toFixed(2)}</td>
                      <td className="py-3">
                        {isCaptured ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            CONFIRMED ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {t.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {isCaptured ? (
                          <span className="text-[10px] text-slate-400 font-sans">Verified by Engine</span>
                        ) : (
                          <button
                            onClick={() => handleVerifySingle(t.id)}
                            disabled={verifyingTxnId === t.id}
                            className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            title="Verify against Gateway IMAP Engine"
                          >
                            <ShieldCheck className={`w-3 h-3 ${verifyingTxnId === t.id ? 'animate-spin' : ''}`} />
                            <span>{verifyingTxnId === t.id ? 'Verifying...' : 'Verify Engine'}</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 text-slate-500">{t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">No transactions found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No payments match your current search and filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
