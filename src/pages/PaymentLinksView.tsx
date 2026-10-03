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
  Trash2,
  Clock,
  Timer,
  ChevronDown,
  ChevronUp,
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
  const [amount, setAmount] = useState<number | string>(100);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(8);
  const [customExpiry, setCustomExpiry] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [title, setTitle] = useState('');
  const [successUrl, setSuccessUrl] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');
  const [copiedId, setCopiedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // In-app Delete Confirmation state (avoids window.confirm in iframe sandbox)
  const [linkToDelete, setLinkToDelete] = useState<PaymentLinkRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  // In-page Test Modal state
  const [testModalLink, setTestModalLink] = useState<PaymentLinkRecord | null>(null);
  const [testQrUrl, setTestQrUrl] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'PENDING' | 'CONFIRMED' | 'EXPIRED'>('PENDING');
  const [testTimeLeft, setTestTimeLeft] = useState<number>(480);
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
        if (data.links) {
          const merchantLinks = data.links.filter((l: any) => l.source !== 'API_ONLY');
          setLinks(merchantLinks);
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [token]);

  // Test modal countdown timer
  useEffect(() => {
    if (!testModalLink || testStatus !== 'PENDING' || testTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setTestTimeLeft((prev) => {
        if (prev <= 1) {
          setTestStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [testModalLink, testStatus, testTimeLeft]);

  // Active real-time background scanner for Test Checkout modal: auto-confirms when user pays!
  useEffect(() => {
    if (!testModalLink || testStatus !== 'PENDING') return;

    let isSubscribed = true;

    const runAutoDetect = async () => {
      if (!isSubscribed || testStatus !== 'PENDING' || !testModalLink) return;
      try {
        const linkCreatedTime = testModalLink.created_at
          ? new Date(testModalLink.created_at).getTime() - 180000
          : Date.now() - 15 * 60 * 1000;
        const res = await fetch(`/api/payment/auto-detect/${testModalLink.id}?amount=${testModalLink.amount}&since=${linkCreatedTime}`);
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed && (data.status === 'CONFIRMED' || data.status === 'CAPTURED')) {
            setTestStatus('CONFIRMED');
            setTestSuccessMessage(data.message || 'Payment Automatically Detected & Confirmed via FamPay/UPI Alert! 🎉');
            if (data.payment?.transaction_ref) {
              setTestUtr(data.payment.transaction_ref);
            }
            fetchLinks();
          }
        }
      } catch {
        // Ignore background polling errors
      }
    };

    const initialTimeout = setTimeout(runAutoDetect, 1200);
    const interval = setInterval(runAutoDetect, 2500);

    return () => {
      isSubscribed = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [testModalLink, testStatus]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) return;
    setCreating(true);

    const finalExpiry = customExpiry ? parseInt(customExpiry, 10) : expiryMinutes;

    try {
      const res = await fetch('/api/payment-links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title: title.trim() || undefined, 
          amount: numAmount,
          expiry_minutes: finalExpiry > 0 ? finalExpiry : 8,
          success_url: successUrl.trim() || undefined,
          cancel_url: cancelUrl.trim() || undefined
        }),
      });

      if (res.ok) {
        setTitle('');
        setAmount(100);
        setCustomExpiry('');
        setSuccessUrl('');
        setCancelUrl('');
        setShowAdvanced(false);
        fetchLinks();
      }
    } catch {
      // Ignore
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLink = (link: PaymentLinkRecord) => {
    setLinkToDelete(link);
  };

  const handleConfirmDelete = async () => {
    if (!linkToDelete || !token) return;
    const id = linkToDelete.id;
    setIsDeleting(true);

    // Optimistically remove from UI immediately
    setLinks((prev) => prev.filter((l) => l.id !== id));

    try {
      const res = await fetch(`/api/payment-links/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteMessage('Payment link deleted successfully.');
        setTimeout(() => setDeleteMessage(null), 3500);
      } else {
        // Re-fetch if deletion failed on server
        fetchLinks();
      }
    } catch {
      fetchLinks();
    } finally {
      setIsDeleting(false);
      setLinkToDelete(null);
    }
  };

  const getFullCheckoutUrl = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    if (typeof window === 'undefined') return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (url.includes('famgateway.in')) {
        return url.replace(/https?:\/\/famgateway\.in/, window.location.origin);
      }
      return url;
    }
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleCopyLink = (url: string, id: string) => {
    const fullUrl = getFullCheckoutUrl(url);
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenTestModal = async (link: PaymentLinkRecord) => {
    setTestModalLink(link);
    const now = Date.now();
    const expTime = link.expires_at 
      ? new Date(link.expires_at).getTime() 
      : (link.created_at ? new Date(link.created_at).getTime() + (link.expiry_minutes || 8) * 60 * 1000 : now + 480000);
    const remaining = Math.max(0, Math.floor((expTime - now) / 1000));
    setTestTimeLeft(remaining);

    if (link.status === 'CAPTURED') {
      setTestStatus('CONFIRMED');
    } else if (link.status === 'EXPIRED' || remaining <= 0) {
      setTestStatus('EXPIRED');
    } else {
      setTestStatus('PENDING');
    }

    setTestVerifying(false);
    setTestError(null);
    setTestSuccessMessage(null);
    setTestUtr('');

    const amountVal = Number(link?.amount) || 0;
    const upiUri = `upi://pay?pa=${encodeURIComponent(user?.fampay_upi_id || 'kalamakash@fam')}&pn=${encodeURIComponent(user?.name || 'FamGateway Merchant')}&am=${amountVal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(link?.title || 'Payment')}`;
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

  const isSubscriptionActive =
    user?.role === 'admin' ||
    (user?.subscription_status === 'active' && user?.subscription_expires_at && new Date(user.subscription_expires_at) > new Date());

  const daysLeft = user?.subscription_expires_at
    ? Math.max(0, Math.ceil((new Date(user.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payment Links</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, test, and manage checkout URLs to share with your customers.
          </p>
        </div>

        {/* Subscription Status Badge */}
        {isSubscriptionActive ? (
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Plan ({daysLeft} Days Remaining)</span>
          </div>
        ) : (
          <div className="px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Subscription Expired</span>
          </div>
        )}
      </div>

      {/* Subscription Expired Paywall Banner */}
      {!isSubscriptionActive && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl border border-purple-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>5-Day Free Trial / Subscription Expired</span>
          </div>
          <p className="text-xs text-purple-200">
            Your 5-day trial period or subscription has ended. Access to generating payment links and processing payments is paused until subscription activation.
          </p>
          <div className="pt-1">
            <a
              href="#subscription"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'subscription';
              }}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs inline-flex items-center gap-2 transition-all shadow-md"
            >
              <span>⚡ Subscribe & Activate Now via QR Code</span>
            </a>
          </div>
        </div>
      )}

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
            {/* Payment Amount Input */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800">
                Payment Amount (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-extrabold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 500)"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl text-sm font-mono font-extrabold text-slate-900 focus:outline-none transition-all"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Quick:</span>
                {[50, 100, 250, 500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      Number(amount) === val
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Expiry Timing Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Link Expiry Duration</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Expires automatically from creation</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: '5 Mins', value: 5 },
                  { label: '8 Mins', value: 8 },
                  { label: '10 Mins', value: 10 },
                  { label: '15 Mins', value: 15 },
                  { label: '30 Mins', value: 30 },
                  { label: '1 Hour', value: 60 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setExpiryMinutes(preset.value);
                      setCustomExpiry('');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                      expiryMinutes === preset.value && !customExpiry
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Or custom minutes:</span>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={customExpiry}
                  onChange={(e) => {
                    setCustomExpiry(e.target.value);
                    if (e.target.value) setExpiryMinutes(parseInt(e.target.value, 10) || 8);
                  }}
                  placeholder="e.g. 20"
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                />
                <span className="text-[11px] text-slate-400">minutes</span>
              </div>

              <p className="text-[10px] text-slate-500 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60 leading-relaxed">
                ⏱️ Once created, this link will strictly expire within <strong>{customExpiry || expiryMinutes} minutes</strong> from creation. Reopening it will show remaining time and will not restart the timer.
              </p>
            </div>

            {/* Optional Collapsible Advanced Settings (Title, Redirects) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showAdvanced ? 'Hide Optional Settings' : 'Advanced Options (Optional Title & Redirect URLs)'}</span>
              </button>

              {showAdvanced && (
                <div className="p-4 mt-2 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Optional Link Title / Note</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. VIP Subscription (Leave empty for auto: Payment ₹Amount)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Success URL</label>
                      <input
                        type="url"
                        value={successUrl}
                        onChange={(e) => setSuccessUrl(e.target.value)}
                        placeholder="https://yoursite.com/success"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cancel URL</label>
                      <input
                        type="url"
                        value={cancelUrl}
                        onChange={(e) => setCancelUrl(e.target.value)}
                        placeholder="https://yoursite.com/failed"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Create Link Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={creating || !amount || Number(amount) <= 0}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{creating ? 'Creating Link...' : 'Create Payment Link'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* My Payment Links Directory */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        {deleteMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{deleteMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">My Payment Links</h3>
          <span className="text-[11px] font-mono text-slate-500 font-bold">{links.length} total link{links.length === 1 ? '' : 's'}</span>
        </div>

        {links.length > 0 ? (
          <div className="space-y-3">
            {links.map((link, idx) => {
              const now = Date.now();
              const expTime = link.expires_at 
                ? new Date(link.expires_at).getTime() 
                : (link.created_at ? new Date(link.created_at).getTime() + (link.expiry_minutes || 8) * 60 * 1000 : 0);
              const isLinkExpired = link.status === 'EXPIRED' || (expTime > 0 && expTime <= now);
              const remainingSecs = Math.max(0, Math.floor((expTime - now) / 1000));
              const remainingMins = Math.ceil(remainingSecs / 60);

              return (
                <div
                  key={`${link.id || 'lnk'}-${idx}`}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{link.title}</span>
                      {link.status === 'CAPTURED' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          CAPTURED ✓
                        </span>
                      ) : isLinkExpired ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-500" /> EXPIRED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 flex items-center gap-1">
                          <Timer className="w-3 h-3 text-indigo-500" /> {remainingMins}m left
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5 break-all">{getFullCheckoutUrl(link.checkout_url)}</div>
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
                      ₹{(Number(link?.amount) || 0).toFixed(2)}
                    </span>

                    {/* Open Checkout Link in New Tab */}
                    <a
                      href={getFullCheckoutUrl(link.checkout_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open payment link in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link</span>
                    </a>

                    {/* Test Payment Link Button */}
                    <button
                      onClick={() => handleOpenTestModal(link)}
                      className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Test Checkout</span>
                    </button>

                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(link.checkout_url, link.id)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedId === link.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{copiedId === link.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    {/* Delete Link Button */}
                    <button
                      onClick={() => handleDeleteLink(link)}
                      className="p-2 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No active payment links created yet.
          </div>
        )}
      </div>

      {/* In-app Delete Confirmation Modal */}
      {linkToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Payment Link?</h3>
                <p className="text-xs text-slate-500">This action will remove the link permanently.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 text-xs truncate">{linkToDelete.title}</div>
              <div className="text-[11px] font-mono text-indigo-600 font-bold">₹{(Number(linkToDelete?.amount) || 0).toFixed(2)} INR</div>
              <div className="text-[10px] font-mono text-slate-400 truncate">{getFullCheckoutUrl(linkToDelete.checkout_url)}</div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Customers will no longer be able to open or make UPI payments through this checkout link.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLinkToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                      <span className="text-emerald-400 font-bold">₹{(Number(testModalLink?.amount) || 0).toFixed(2)}</span>
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
                        ₹{(Number(testModalLink?.amount) || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Transaction ID: {testModalLink.id}
                      </div>
                    </div>

                    {/* Expiry Countdown or Expired Banner */}
                    {testStatus === 'EXPIRED' || testTimeLeft <= 0 ? (
                      <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>This payment link has expired and is no longer valid.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span>Link expires in:</span>
                          <span className="font-mono text-indigo-300 font-extrabold text-sm">
                            {Math.floor(testTimeLeft / 60)}:{(testTimeLeft % 60).toString().padStart(2, '0')}
                          </span>
                        </div>

                        {/* Auto-Confirm Live Status Pill */}
                        <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-purple-950/50 border border-purple-800/40 text-[11px] text-purple-200 font-bold">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Auto-Confirm Active: Confirms automatically when you pay!</span>
                        </div>
                      </div>
                    )}
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

                  {/* Optional Manual Fallback Header */}
                  <div className="text-left pt-1">
                    <div className="text-[10px] text-slate-400 font-medium mb-1">
                      If not auto-confirmed immediately, you can enter UTR and confirm manually:
                    </div>
                  </div>

                  {/* UTR input box */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono">
                      Manual UTR Entry (Fallback)
                    </label>
                    <input
                      type="text"
                      value={testUtr}
                      onChange={(e) => setTestUtr(e.target.value)}
                      placeholder="e.g. 427618294012"
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f1d] border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Confirm Action Button */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSimulateTestPayment}
                      disabled={testVerifying || testStatus === 'EXPIRED' || testTimeLeft <= 0}
                      className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {testVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                          <span>Confirming Payment...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Confirm Payment</span>
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
