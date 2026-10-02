import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  QrCode,
  ArrowRight,
  Loader2,
  Sparkles,
  Smartphone,
  AlertCircle,
  Download,
  Clock,
  Headphones,
  Check,
  X,
  CreditCard,
  Info,
  XCircle,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import QRCode from 'qrcode';
import { listenToPaymentStatus } from '../hooks/usePaymentListener';

interface PublicCheckoutViewProps {
  linkId: string;
}

export const PublicCheckoutView: React.FC<PublicCheckoutViewProps> = ({ linkId }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'PENDING' | 'VERIFYING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED'>('PENDING');
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Confirmed details
  const [confirmedUtr, setConfirmedUtr] = useState<string>('');
  const [confirmedTxnId, setConfirmedTxnId] = useState<string>('');

  // UTR manual entry
  const [utrInput, setUtrInput] = useState('');

  // Countdown timer in seconds (default 8 minutes = 480 seconds)
  const [timeLeft, setTimeLeft] = useState<number>(480);
  const totalDurationRef = useRef<number>(480);

  const fetchLinkDetails = async () => {
    try {
      const res = await fetch(`/api/payment/public-link/${linkId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.link) {
          setDetails(data.link);
          const upiString =
            data.link.upi_uri ||
            `upi://pay?pa=${encodeURIComponent(data.link.merchant_upi_id)}&pn=${encodeURIComponent(
              data.link.merchant_name || 'FAMGATEWAY'
            )}&am=${data.link.amount}&cu=INR&tn=${encodeURIComponent(data.link.title || 'Order')}`;

          try {
            const url = await QRCode.toDataURL(upiString, {
              margin: 1,
              width: 320,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
            setQrDataUrl(url);
          } catch {
            // Fallback
          }

          // Set timeout from custom settings if configured
          if (data.link.custom_settings?.session_timeout_minutes) {
            const dur = data.link.custom_settings.session_timeout_minutes * 60;
            setTimeLeft(dur);
            totalDurationRef.current = dur;
          }
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (status !== 'PENDING') return;
    try {
      const amtParam = details?.amount ? `?amount=${details.amount}` : '';
      const res = await fetch(`/api/payment/auto-detect/${linkId}${amtParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'CONFIRMED' || data.status === 'CAPTURED') {
          setStatus('CONFIRMED');
          setStatusMessage(data.message || 'Payment Automatically Detected & Confirmed via FamPay Alert! 🎉');
          setConfirmedUtr(data.payment?.transaction_ref || 'N/A');
          setConfirmedTxnId(data.payment?.id || 'N/A');
        }
      }
    } catch {
      // Ignore background poll errors
    }
  };

  const handleVerifyPayment = async () => {
    setVerifying(true);
    setErrorMessage(null);
    setStatusMessage('Connecting to Gmail IMAP & scanning incoming payment alerts...');

    try {
      const res = await fetch('/api/payment/public-verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: linkId,
          utr: utrInput.trim() || undefined,
          amount: details?.amount || 100,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('CONFIRMED');
        setStatusMessage(data.message || 'Real Gmail IMAP Payment Alert Verified! Transaction Confirmed.');
        setConfirmedUtr(data.payment?.transaction_ref || utrInput.trim() || 'N/A');
        setConfirmedTxnId(data.payment?.id || 'N/A');
      } else {
        setErrorMessage(
          `NOT PAID. ${data.error || data.message || 'No matching FamPay X payment alert found.'}`
        );
      }
    } catch {
      setErrorMessage('NOT PAID. Failed to scan Gmail IMAP inbox.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelPayment = () => {
    setShowCancelModal(false);
    setStatus('CANCELLED');
    setErrorMessage(null);
  };

  const handleRestartPayment = () => {
    setStatus('PENDING');
    setErrorMessage(null);
    setStatusMessage(null);
    setTimeLeft(totalDurationRef.current);
  };

  // Download QR code image to gallery
  const handleSaveQrToGallery = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `UPI-QR-${linkId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPdfReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${brandName}</title>
          <style>
            body { font-family: monospace; padding: 40px; color: #333; background-color: #fff; }
            .receipt { border: 2px dashed #000; padding: 30px; max-width: 500px; margin: 0 auto; }
            h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin: 12px 0; font-size: 14px; border-bottom: 1px dotted #ccc; padding-bottom: 4px; }
            .total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <h1>FAMGATEWAY RECEIPT</h1>
            <div class="row"><span>Merchant:</span><strong>${brandName}</strong></div>
            <div class="row"><span>Status:</span><strong style="color: green;">CONFIRMED ✓</strong></div>
            <div class="row"><span>Date:</span><strong>${new Date().toLocaleString()}</strong></div>
            <div class="row"><span>Order Ref:</span><strong>${linkId}</strong></div>
            <div class="row"><span>Bank UTR:</span><strong>${confirmedUtr || 'N/A'}</strong></div>
            <div class="row"><span>Transaction ID:</span><strong>${confirmedTxnId || 'N/A'}</strong></div>
            <div class="row total"><span>Amount Paid:</span><strong>₹${details?.amount?.toFixed(2) || '0.00'}</strong></div>
            <div class="footer">Thank you for choosing ${brandName}. This is a secure digitally generated transaction receipt.</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    fetchLinkDetails();
  }, [linkId]);

  useEffect(() => {
    fetch('/api/public/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer,
        isCheckout: true,
        orderAmount: details?.amount,
      }),
    }).catch(() => {});
  }, [linkId, details?.amount]);

  useEffect(() => {
    let unsubscribe: () => void;
    if (linkId) {
      unsubscribe = listenToPaymentStatus(linkId, (newStatus) => {
        // Only allow status to move to CONFIRMED via server callback
        if (newStatus === 'CONFIRMED' || newStatus === 'CAPTURED') {
          setStatus('CONFIRMED');
          setStatusMessage('Payment Successfully Received & Confirmed! 🎉');
        } else if (newStatus === 'VERIFYING') {
          setStatus('VERIFYING');
          setStatusMessage('Payment detected, verifying funds...');
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [linkId]);

  // Countdown timer interval
  useEffect(() => {
    if (status !== 'PENDING' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, status]);

  useEffect(() => {
    if (status === 'PENDING' && timeLeft === 0) {
      setStatus('FAILED');
    }
  }, [timeLeft, status]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Timer progress percentage
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / totalDurationRef.current) * 100));

  // Automatic redirect logic
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (status === 'CONFIRMED' && details?.success_url) {
      timeout = setTimeout(() => {
        try {
          const url = new URL(details.success_url);
          url.searchParams.set('order_id', linkId);
          url.searchParams.set('status', 'success');
          url.searchParams.set('utr', confirmedUtr);
          window.location.href = url.toString();
        } catch {
          window.location.href = details.success_url;
        }
      }, 3000); // 3 second delay so they see the success message
    } else if ((status === 'FAILED' || status === 'CANCELLED') && details?.cancel_url) {
      timeout = setTimeout(() => {
        try {
          const url = new URL(details.cancel_url);
          url.searchParams.set('order_id', linkId);
          url.searchParams.set('status', status.toLowerCase());
          window.location.href = url.toString();
        } catch {
          window.location.href = details.cancel_url;
        }
      }, 3000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [status, details?.success_url, details?.cancel_url, linkId, confirmedUtr]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#070a12] text-slate-100 flex items-center justify-center p-4 font-sans z-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold text-slate-400">Loading Secure UPI Checkout...</p>
        </div>
      </div>
    );
  }

  const custom = details?.custom_settings || {};
  const brandName = custom.brand_name || 'FAMGATEWAY';
  const subtitle = custom.subtitle || 'VERIFIED MERCHANT';
  const avatarUrl =
    custom.avatar_url ||
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80';
  const contactUrl = custom.contact_url || 'https://wa.me/911234567890';
  const upiUri =
    details?.upi_uri ||
    `upi://pay?pa=${encodeURIComponent(details?.merchant_upi_id || 'merchant@fam')}&pn=${encodeURIComponent(
      brandName
    )}&am=${details?.amount || 50}&cu=INR&tn=${encodeURIComponent(details?.title || 'Payment')}`;

  return (
    <div
      className="fixed inset-0 w-full h-full bg-[#070a12] text-slate-100 overflow-y-auto overflow-x-hidden font-sans selection:bg-purple-500 selection:text-white"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
      }}
    >
      {/* Scrollable Container Wrapper */}
      <div className="min-h-full flex flex-col justify-between max-w-md mx-auto relative pb-28 pt-2 px-3 sm:px-4">
        {/* Top Header / Bar */}
        <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-[#0a0f1d] mb-4">
          <div className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 px-4 py-3 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              {/* Merchant Avatar / Logo */}
              <div className="w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden bg-slate-900 shrink-0 shadow-md">
                <img
                  src={avatarUrl}
                  alt="Merchant Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                <div className="font-extrabold text-white text-sm tracking-tight leading-tight">
                  {brandName}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-300 tracking-wider uppercase mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/20" />
                  <span>{subtitle}</span>
                </div>
              </div>
            </div>

            {/* Cancel Action Button in Header */}
            {status === 'PENDING' && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-2.5 py-1 rounded-full bg-black/25 hover:bg-black/40 text-rose-200 hover:text-white text-[11px] font-bold border border-rose-300/30 flex items-center gap-1 transition-colors cursor-pointer"
                title="Cancel Payment"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-300" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Body */}
        <div className="space-y-4">
          {status === 'CONFIRMED' ? (
            /* SUCCESS VIEW */
            <div className="rounded-3xl bg-[#0f1422] border border-slate-800 p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Payment Successful!</h2>
                <p className="text-xs text-emerald-400 font-bold mt-1 font-mono">
                  {statusMessage || 'Payment Received & Verified via FamPay Engine'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#080c16] border border-slate-800 space-y-2.5 text-xs font-mono text-left">
                <div className="flex justify-between text-slate-400">
                  <span>Merchant:</span>
                  <span className="text-white font-bold">{brandName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-400 font-extrabold text-sm">
                    ₹{details?.amount?.toFixed(2) || '50.00'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Order Ref:</span>
                  <span className="text-slate-300">{linkId}</span>
                </div>
                {confirmedUtr && (
                  <div className="flex justify-between text-slate-400">
                    <span>Payer Bank UTR:</span>
                    <span className="text-purple-400 font-extrabold">{confirmedUtr}</span>
                  </div>
                )}
                {confirmedTxnId && (
                  <div className="flex justify-between text-slate-400">
                    <span>Transaction ID:</span>
                    <span className="text-indigo-400 font-bold select-all">{confirmedTxnId}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">CONFIRMED ✓</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPdfReceipt}
                  className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Receipt</span>
                </button>
              </div>

              <p className="text-xs text-slate-500">
                You can safely close this window now. Receipt generated.
              </p>
            </div>
          ) : (status === 'CANCELLED' || status === 'FAILED') ? (
            /* CANCELLED OR EXPIRED VIEW */
            <div className="rounded-3xl bg-[#0f1422] border border-slate-800 p-7 shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
                <XCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {status === 'FAILED' ? 'Payment Session Expired' : 'Payment Cancelled'}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {status === 'FAILED' 
                    ? 'The 5-minute session expired because no payment was captured. Please retry.' 
                    : 'This transaction has been cancelled. No funds were debited.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#080c16] border border-slate-800 space-y-2 text-xs font-mono text-left">
                <div className="flex justify-between text-slate-400">
                  <span>Order ID:</span>
                  <span className="text-slate-300">{linkId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount:</span>
                  <span className="text-slate-300">₹{details?.amount?.toFixed(2) || '50.00'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-rose-400 font-bold">
                    {status === 'FAILED' ? 'EXPIRED (NOT PAID)' : 'CANCELLED'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRestartPayment}
                  className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry & Pay Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="w-full py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Previous Page</span>
                </button>
              </div>
            </div>
          ) : (
            /* PENDING CHECKOUT VIEW */
            <>
              {/* Real-Time Auto-Detection Status Indicator */}
              <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-3 flex items-center justify-between text-xs font-mono shadow-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <span className="text-emerald-300 font-bold tracking-tight">Real-Time IMAP Auto-Detect: ACTIVE</span>
                </div>
                <span className="text-indigo-300 text-[10px] hidden sm:inline">Auto-Confirm On</span>
              </div>

              {/* Card 1: QR Code Card */}
              <div className="rounded-3xl bg-[#0e1320] border border-slate-800/80 p-5 sm:p-6 shadow-2xl text-center space-y-4">
                {/* QR Code Container with Violet Dashed Outline */}
                <div className="p-3.5 rounded-3xl bg-white text-slate-900 border-2 border-dashed border-purple-500/90 shadow-2xl inline-block mx-auto">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="UPI QR Code"
                      className="w-56 h-56 sm:w-60 sm:h-60 mx-auto rounded-xl object-contain block"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-xl">
                      <QrCode className="w-14 h-14 text-slate-400 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Save QR to Gallery Button */}
                {custom.enable_save_qr !== false && (
                  <div>
                    <button
                      type="button"
                      onClick={handleSaveQrToGallery}
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save QR to Gallery</span>
                    </button>
                  </div>
                )}

                {/* Amount Display */}
                <div className="pt-1 space-y-1">
                  <div className="text-4xl font-black text-white tracking-tight flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-bold text-slate-300">₹</span>
                    <span>{details?.amount ? details.amount.toFixed(2) : '50.00'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 tracking-wide">
                    Transaction ID: <span className="text-slate-300">{linkId}</span>
                  </div>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Card 2: PAY BY APPS Section */}
              {custom.show_apps !== false && (
                <div className="rounded-2xl bg-[#0e1320] border border-slate-800/80 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-teal-400" />
                    <span>PAY BY APPS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* FamPay Button */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-purple-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xs shrink-0">
                        Fam
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-purple-300">FamPay</div>
                        <div className="text-[10px] text-slate-400">Tap to open</div>
                      </div>
                    </a>

                    {/* Google Pay Button */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-blue-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs shrink-0">
                        GPay
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-300">GPay</div>
                        <div className="text-[10px] text-slate-400">Tap to open</div>
                      </div>
                    </a>

                    {/* Paytm Button */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-sky-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center font-black text-sky-400 text-[10px] shrink-0">
                        Paytm
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-sky-300">Paytm</div>
                        <div className="text-[10px] text-slate-400">Tap to open</div>
                      </div>
                    </a>

                    {/* PhonePe Button */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-purple-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-xs shrink-0">
                        Pe
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-purple-300">PhonePe</div>
                        <div className="text-[10px] text-slate-400">Tap to open</div>
                      </div>
                    </a>
                  </div>
                </div>
              )}

              {/* Card 3: Circular Countdown Timer */}
              <div className="rounded-2xl bg-[#0e1320] border border-slate-800/80 p-4 flex items-center gap-4">
                {/* Circular SVG Ring */}
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                    {/* Background Ring */}
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#1e293b"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    {/* Progress Ring */}
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#2dd4bf"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={163.36}
                      strokeDashoffset={163.36 - (163.36 * timerPercentage) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute font-mono font-extrabold text-xs text-white">
                    {formatTimer(timeLeft)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    SESSION EXPIRES IN
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    Complete payment before time runs out
                  </div>
                </div>
              </div>

              {/* Card 4: ALREADY PAID? ENTER UTR */}
              {custom.enable_utr_submission !== false && (
                <div className="rounded-2xl bg-[#0e1320] border border-slate-800/80 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">
                    <CreditCard className="w-4 h-4 text-teal-400" />
                    <span>ALREADY PAID? ENTER UTR</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder="UTR / Reference number"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPayment}
                      disabled={verifying}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Find UTR in your bank app transaction history</span>
                  </div>
                </div>
              )}

              {/* Card 5: Prominent Cancel Option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-3 rounded-2xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 hover:text-rose-100 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Cancel Payment & Return</span>
                </button>
              </div>
            </>
          )}

          {/* Footer Branding */}
          <div className="text-center pt-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Powered by Unknown Gateway</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating "Contact Us" Support Action Button */}
      {contactUrl && (
        <a
          href={contactUrl}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl shadow-purple-600/40 border border-purple-400/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
        >
          <Headphones className="w-4 h-4 text-purple-200" />
          <span>Contact Us</span>
        </a>
      )}

      {/* CANCEL PAYMENT CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#0f1424] border border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <XCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Cancel Payment?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to cancel this payment of{' '}
                <strong className="text-white">₹{details?.amount?.toFixed(2) || '50.00'}</strong>? Your order will not be completed.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCancelPayment}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Yes, Cancel Payment
              </button>

              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                No, Keep Paying
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
