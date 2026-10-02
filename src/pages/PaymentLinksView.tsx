import React, { useState, useEffect } from 'react';
import {
  Link2,
  AlertTriangle,
  Plus,
  Copy,
  Check,
  ExternalLink,
  X,
  QrCode,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PaymentLinkRecord } from '../types';
import QRCode from 'qrcode';

interface PaymentLinksViewProps {
  onNavigate: (nav: string) => void;
}

export const PaymentLinksView: React.FC<PaymentLinksViewProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [links, setLinks] = useState<PaymentLinkRecord[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [successUrl, setSuccessUrl] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');
  const [copiedId, setCopiedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // In-page Test Modal state
  const [testModalLink, setTestModalLink] = useState<PaymentLinkRecord | null>(null);
  const [testQrUrl, setTestQrUrl] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'PENDING' | 'CONFIRMED'>('PENDING');
  const [testVerifying, setTestVerifying] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [testUtr, setTestUtr] = useState('');

  const isImapConfigured = Boolean(user?.imap_connected);

  const fetchLinks = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payment-links', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.links) setLinks(data.links);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [token]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || amount <= 0) return;
    setCreating(true);

    try {
      const res = await fetch('/api/payment-links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title, 
          amount,
          success_url: successUrl.trim() || undefined,
          cancel_url: cancelUrl.trim() || undefined
        }),
      });

      if (res.ok) {
        setTitle('');
        setAmount(100);
        setSuccessUrl('');
        setCancelUrl('');
        fetchLinks();
      }
    } catch {
      // Ignore
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenTestModal = async (link: PaymentLinkRecord) => {
    setTestModalLink(link);
    setTestStatus(link.status === 'CAPTURED' ? 'CONFIRMED' : 'PENDING');
    setTestVerifying(false);
    setTestError(null);
    setTestSuccessMessage(null);

    const upiUri = `upi://pay?pa=${encodeURIComponent(user?.fampay_upi_id || 'kalamakash@fam')}&pn=${encodeURIComponent(user?.name || 'FamGateway Merchant')}&am=${link.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(link.title)}`;
    try {
      const qrUrl = await QRCode.toDataURL(upiUri, { margin: 1, width: 260 });
      setTestQrUrl(qrUrl);
    } catch {
      setTestQrUrl(null);
    }
  };

  const handleSimulateTestPayment = async () => {
    if (!testModalLink) return;
    setTestVerifying(true);
    setTestError(null);
    setTestSuccessMessage(null);

    try {
      const res = await fetch('/api/payment/verify-email-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId: testModalLink.id,
          utr: testUtr.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestStatus('CONFIRMED');
        setTestSuccessMessage(data.message || 'Real Gmail IMAP Payment Alert Verified & Captured!');
        fetchLinks();
      } else {
        setTestError(data.error || data.message || 'Payment not verified. No matching alert email in Gmail inbox.');
      }
    } catch {
      setTestError('Failed to connect to IMAP service. Check your internet connection.');
    } finally {
      setTestVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payment Links</h1>
        <p className="text-xs text-slate-500 mt-1">
          Create, test, and manage checkout URLs to share with your customers.
        </p>
      </div>

      {/* Generate Payment Link Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Link2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">Generate Payment Link</h2>
        </div>

        <p className="text-xs text-slate-600">
          Create an instant checkout link with auto-generated ID to share with your customers.
        </p>

        {!isImapConfigured ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Payment Gateway Not Configured</span>
            </div>
            <p className="text-amber-700">
              Please configure your FamPay IMAP settings to start creating payment links.
            </p>
            <button
              onClick={() => onNavigate('integrations')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition-colors"
            >
              Configure Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateLink} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. VIP Subscription"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (INR ₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Success URL (Optional)</label>
                <input
                  type="url"
                  value={successUrl}
                  onChange={(e) => setSuccessUrl(e.target.value)}
                  placeholder="https://yoursite.com/success"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cancel URL (Optional)</label>
                <input
                  type="url"
                  value={cancelUrl}
                  onChange={(e) => setCancelUrl(e.target.value)}
                  placeholder="https://yoursite.com/failed"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{creating ? 'Creating Link...' : 'Create Payment Link'}</span>
            </button>
          </form>
        )}
      </div>

      {/* My Payment Links Directory */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">My Payment Links</h3>

        {links.length > 0 ? (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{link.title}</span>
                    {link.status === 'CAPTURED' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        CAPTURED ✓
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px] mt-0.5">{link.checkout_url}</div>
                  {(link.success_url || link.cancel_url) && (
                    <div className="flex gap-3 mt-1.5 opacity-70">
                      {link.success_url && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          <Check className="w-2.5 h-2.5" /> S: {new URL(link.success_url).hostname}
                        </div>
                      )}
                      {link.cancel_url && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                          <X className="w-2.5 h-2.5" /> C: {new URL(link.cancel_url).hostname}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-extrabold text-emerald-600 text-sm mr-2">
                    ₹{link.amount.toFixed(2)}
                  </span>

                  {/* Test Payment Link Button */}
                  <button
                    onClick={() => handleOpenTestModal(link)}
                    className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test In Same Page</span>
                  </button>

                  {/* Copy Link Button */}
                  <button
                    onClick={() => handleCopyLink(link.checkout_url, link.id)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === link.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedId === link.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No active payment links created yet.
          </div>
        )}
      </div>

      {/* In-Page Test Checkout Modal */}
      {testModalLink && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-[#0a0e1a] border border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden relative my-auto">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 px-4 py-3 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full border border-white/40 overflow-hidden bg-slate-900 shrink-0">
                  <img
                    src={user?.checkout_settings?.avatar_url || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'}
                    alt="Merchant Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-extrabold text-white text-sm leading-tight">
                    {user?.checkout_settings?.brand_name || 'UNKNOWN GATEWAY'}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-300 uppercase mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>{user?.checkout_settings?.subtitle || 'VERIFIED MERCHANT'}</span>
                  </div>
                </div>
              </div>

              {/* Header Cancel / Close Button */}
              <button
                type="button"
                onClick={() => setTestModalLink(null)}
                className="px-2.5 py-1 rounded-full bg-black/25 hover:bg-black/40 text-rose-200 text-xs font-bold border border-rose-300/30 flex items-center gap-1 transition-colors cursor-pointer"
                title="Cancel & Close"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {testStatus === 'CONFIRMED' ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Payment Verified & Captured!</h3>
                    <p className="text-xs text-emerald-400 font-mono font-bold mt-1">
                      {testSuccessMessage || 'Real Gmail IMAP Alert Verified'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-left space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="text-emerald-400 font-bold">₹{testModalLink.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Title:</span>
                      <span>{testModalLink.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Merchant UPI:</span>
                      <span className="text-indigo-400">{user?.fampay_upi_id || 'kalamakash@fam'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verification:</span>
                      <span className="text-emerald-400 font-bold">REAL GMAIL IMAP ✓</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setTestModalLink(null)}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
                  >
                    Close Test Window
                  </button>
                </div>
              ) : (
                <>
                  {/* QR Card with Purple Dashed Border */}
                  <div className="rounded-2xl bg-[#0f1422] border border-slate-800 p-4 text-center space-y-4">
                    <div className="p-3 rounded-2xl bg-white border-2 border-dashed border-purple-500 inline-block mx-auto shadow-md">
                      {testQrUrl ? (
                        <img src={testQrUrl} alt="UPI QR Code" className="w-52 h-52 mx-auto rounded-lg" />
                      ) : (
                        <QrCode className="w-52 h-52 mx-auto text-slate-400" />
                      )}
                    </div>

                    <div>
                      <a
                        href={testQrUrl || '#'}
                        download={`UPI-QR-${testModalLink.id}.png`}
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[11px] inline-flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save QR to Gallery</span>
                      </a>
                    </div>

                    <div>
                      <div className="text-3xl font-black text-white">
                        ₹{testModalLink.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Transaction ID: {testModalLink.id}
                      </div>
                    </div>
                  </div>

                  {/* Real Error Notice */}
                  {testError && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{testError}</span>
                    </div>
                  )}

                  {/* Pay by Apps */}
                  <div className="rounded-xl bg-[#0f1422] border border-slate-800 p-3 space-y-2">
                    <div className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>PAY BY APPS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-[#141a29] border border-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 font-black text-[9px] flex items-center justify-center">Fam</div>
                        <div>
                          <div className="font-bold text-[11px] text-white">FamPay</div>
                          <div className="text-[9px] text-slate-400">Tap to open</div>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#141a29] border border-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center">G</div>
                        <div>
                          <div className="font-bold text-[11px] text-white">GPay</div>
                          <div className="text-[9px] text-slate-400">Tap to open</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* UTR input box */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono">
                      Already Paid? Enter 12-Digit UTR
                    </label>
                    <input
                      type="text"
                      value={testUtr}
                      onChange={(e) => setTestUtr(e.target.value)}
                      placeholder="e.g. 427618294012"
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f1d] border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Verify Action Button */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSimulateTestPayment}
                      disabled={testVerifying}
                      className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                          <span>Scanning Gmail IMAP Inbox...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-300" />
                          <span>Verify Real IMAP Payment</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestModalLink(null)}
                      className="w-full py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Cancel Payment & Exit</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
