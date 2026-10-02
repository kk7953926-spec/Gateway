import React, { useState, useEffect } from 'react';
import { Search, CreditCard, RefreshCw, Zap, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OrderTransactionRecord } from '../types';

export const TransactionsView: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'All' | 'Created' | 'Captured' | 'Expired' | 'Failed'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<OrderTransactionRecord[]>([]);

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) setTransactions(data.transactions);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const handleDownloadSalesReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filtered
      .map(
        (t) => `
        <tr>
          <td>${t.id}</td>
          <td>${t.upi_id}</td>
          <td>₹${t.amount.toFixed(2)}</td>
          <td>${t.status}</td>
          <td>${new Date(t.created_at).toLocaleDateString()}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Monthly Sales Report</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 24px; color: #1e1b4b; }
            p.sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 30px; }
            table { border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 30px; }
            .footer { text-align: center; font-size: 10px; color: #999; margin-top: 50px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>MONTHLY SALES REPORT</h1>
          <p class="sub">Generated on ${new Date().toLocaleDateString()} | Filter: ${activeTab}</p>
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>UPI ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="total">Total Collected: ₹${totalCapturedAmount.toFixed(2)}</div>
          <div class="footer">FamGateway.in - Secure Zero-Fee Instant Payments</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filtered = transactions.filter((t) => {
    if (activeTab === 'Captured' && t.status !== 'CAPTURED') return false;
    if (activeTab === 'Created' && t.status !== 'CREATED' && t.status !== 'PENDING') return false;
    if (activeTab === 'Expired' && t.status !== 'EXPIRED') return false;
    if (activeTab === 'Failed' && t.status !== 'FAILED') return false;

    if (searchTerm) {
      return (
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.upi_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const totalCapturedAmount = transactions
    .filter((t) => t.status === 'CAPTURED')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Transactions</h1>
        <p className="text-xs text-slate-500 mt-1">View and manage all your payments.</p>
      </div>

      {/* Summary Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div>
          <div className="text-xs font-semibold text-slate-500">Collected Amount</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
            ₹{totalCapturedAmount.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            from {transactions.filter((t) => t.status === 'CAPTURED').length} captured payments
          </div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>⚡ 100% of payments are settled instantly to your bank account with 0% fee.</span>
        </div>

        {/* Donut split */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">Split by payment method</div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-700 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>UPI 100%</span>
          </div>
        </div>
      </div>

      {/* Transactions List Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
          {['All', 'Created', 'Captured', 'Expired', 'Failed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in Order ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadSalesReport}
              className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 flex items-center gap-1 font-bold cursor-pointer"
              title="Download PDF Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </button>
            <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">Last 30 Days</span>
            <button
              onClick={fetchTransactions}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Transactions Table / Empty State */}
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">UPI ID</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-bold text-indigo-700">{t.id}</td>
                    <td className="py-3 text-slate-700">{t.upi_id}</td>
                    <td className="py-3 font-bold text-slate-900">₹{t.amount.toFixed(2)}</td>
                    <td className="py-3">
                      {t.status === 'CAPTURED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          CAPTURED ✓
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {t.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
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
