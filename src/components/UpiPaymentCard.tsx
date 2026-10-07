import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Wallet,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UpiPaymentRecord } from '../types';

export const UpiPaymentCard: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const [upiId, setUpiId] = useState<string>(user?.fampay_upi_id || `${user?.name?.toLowerCase().replace(/\s+/g, '') || 'user'}@fam`);
  const [amount, setAmount] = useState<number>(500);
  const [note, setNote] = useState<string>('FamGateway.in Account Upgrade');

  const [currentPayment, setCurrentPayment] = useState<UpiPaymentRecord | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [verifyingEmailAlert, setVerifyingEmailAlert] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [paymentHistory, setPaymentHistory] = useState<UpiPaymentRecord[]>([]);

  const fetchMyPayments = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payment/my-payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.payments) setPaymentHistory(data.payments);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchMyPayments();
  }, [token]);

  // Real-time automatic background IMAP scanner when QR is on screen
  useEffect(() => {
    if (!currentPayment || currentPayment.status === 'CONFIRMED') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/auto-detect/${currentPayment.id}?amount=${currentPayment.amount}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'CONFIRMED' && data.payment) {
            setCurrentPayment(data.payment);
            setSuccessMsg(`Payment Confirmed in Real-Time! ₹${currentPayment.amount} credited. UTR: ${data.payment.transaction_ref}`);
            refreshProfile();
            fetchMyPayments();
          }
        }
      } catch {
        // Ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentPayment?.id, currentPayment?.status]);

  const handleGenerateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim() || !upiId.includes('@')) {
      setError('Please enter a valid FamPay UPI ID (e.g. username@fam).');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than ₹0.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/payment/create-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          upiId: upiId.trim(),
          amount,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to generate payment QR code.');
        setLoading(false);
        return;
      }

      setCurrentPayment(data.payment);
      setQrCodeUrl(data.qrCodeUrl);
      fetchMyPayments();
    } catch {
      setError('Connection error while contacting FamGateway.in server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailAlert = async () => {
    if (!currentPayment) return;
    setError(null);
    setSuccessMsg(null);
    setVerifyingEmailAlert(true);

    try {
      const res = await fetch('/api/payment/verify-email-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId: currentPayment.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Payment email alert verification failed.');
        setVerifyingEmailAlert(false);
        return;
      }

      setSuccessMsg(`Payment Confirmed! ₹${amount} credited. Receipt dispatched to ${user?.email}`);
      setCurrentPayment(data.payment);
      refreshProfile();
      fetchMyPayments();
    } catch {
      setError('Error verifying payment via email alert.');
    } finally {
      setVerifyingEmailAlert(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>FamGateway.in UPI QR Engine</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">FamPay UPI Payment & Email Verification</h2>
          <p className="text-xs text-slate-600">
            Configure your FamPay UPI ID, generate dynamic payment QR codes, and confirm payments via email alerts.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block">Terminal Status</span>
            <span className="text-sm font-mono font-extrabold text-emerald-600">
              Active (0% Fee)
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form & QR Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <form onSubmit={handleGenerateQr} className="md:col-span-6 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">1. Configure FamPay UPI Payment</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              FamPay UPI ID (VPA)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@fam"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-indigo-900 focus:outline-none focus:border-indigo-600"
              />
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Example: <code className="text-indigo-600">username@fam</code> or <code className="text-indigo-600">merchant@yesfam</code></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Amount (INR ₹)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <span className="text-slate-500 font-mono text-sm absolute left-3.5 top-1/2 -translate-y-1/2">₹</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Transaction Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="FamGateway.in Account Upgrade"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span>Generating Dynamic QR Code...</span>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <span>Generate FamPay UPI QR Code</span>
              </>
            )}
          </button>
        </form>

        <div className="md:col-span-6 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-between text-center space-y-4">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>2. UPI Payment QR Code</span>
            </h3>
            {currentPayment && (
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                  currentPayment.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {currentPayment.status === 'CONFIRMED' ? 'PAYMENT CONFIRMED ✓' : 'AWAITING SCAN'}
              </span>
            )}
          </div>

          {qrCodeUrl ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm relative">
                <img src={qrCodeUrl} alt="FamPay UPI QR Code" className="w-52 h-52 rounded-lg" />
              </div>

              <div className="text-xs font-mono space-y-1 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>FamPay VPA:</span>
                  <span className="text-indigo-700 font-bold">{currentPayment?.upi_id}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Transaction Ref:</span>
                  <span className="text-slate-900">{currentPayment?.transaction_ref}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Due:</span>
                  <span className="text-emerald-600 font-extrabold text-sm">₹{(Number(currentPayment?.amount) || 0).toFixed(2)} INR</span>
                </div>
              </div>

              {currentPayment?.status !== 'CONFIRMED' ? (
                <button
                  type="button"
                  onClick={handleVerifyEmailAlert}
                  disabled={verifyingEmailAlert}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Mail className={`w-4 h-4 ${verifyingEmailAlert ? 'animate-spin' : ''}`} />
                  <span>
                    {verifyingEmailAlert
                      ? 'Checking Live IMAP Inbox...'
                      : 'Check FamPay Email Alert (Live IMAP)'}
                  </span>
                </button>
              ) : (
                <div className="w-full p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payment Verified via Email Alert!</span>
                </div>
              )}
            </div>
          ) : (
            <div className="my-auto py-12 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <QrCode className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Enter your FamPay UPI ID on the left and click "Generate FamPay UPI QR Code" to display the QR code.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-600" />
            <span>Your FamPay UPI Payment History</span>
          </h3>
          <button
            type="button"
            onClick={fetchMyPayments}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="pb-3">Transaction Ref</th>
                <th className="pb-3">UPI VPA</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentHistory.length > 0 ? (
                paymentHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-bold text-indigo-700">{p.transaction_ref}</td>
                    <td className="py-3 text-slate-700">{p.upi_id}</td>
                    <td className="py-3 font-bold text-emerald-600">₹{(Number(p?.amount) || 0).toFixed(2)}</td>
                    <td className="py-3">
                      {p.status === 'CONFIRMED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          CONFIRMED ✓
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No payment transactions generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
