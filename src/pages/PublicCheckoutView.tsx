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
  Mail,
  ExternalLink,
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
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Confirmed details
  const [confirmedUtr, setConfirmedUtr] = useState<string>('');
  const [confirmedTxnId, setConfirmedTxnId] = useState<string>('');

  // UTR manual entry
  const [utrInput, setUtrInput] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Countdown timer in seconds (default 8 minutes = 480 seconds)
  const [timeLeft, setTimeLeft] = useState<number>(480);
  const totalDurationRef = useRef<number>(480);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Function to return to the previous page or external merchant website
  const handleReturnToPreviousPage = () => {
    const returnUrl = details?.redirect_url || details?.cancel_url || details?.success_url;
    if (returnUrl) {
      window.location.href = returnUrl;
      return;
    }

    if (document.referrer && !document.referrer.includes(window.location.host)) {
      window.location.href = document.referrer;
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = '/';
  };

  const generateAndSetQr = async (upiUri: string) => {
    try {
      const url = await QRCode.toDataURL(upiUri, {
        margin: 1,
        width: 380,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch {
      // Reliable fallback image service if canvas rendering fails
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUri)}`);
    }
  };

  const fetchLinkDetails = async () => {
    try {
      const res = await fetch(`/api/payment/public-link/${linkId}`);
      if (res.ok) {
        const data = await res.json();
        const linkObj = data.link || data.payment;
        if (linkObj) {
          setDetails(linkObj);

          const merchantUpi = linkObj.merchant_upi_id || '8056317218@fam';
          const merchantName = linkObj.merchant_name || 'FAMGATEWAY';
          const amountFormatted = Number(linkObj.amount || 0).toFixed(2);
          const noteParam = linkObj.transaction_ref || linkObj.title || linkId;

          const upiString =
            linkObj.upi_uri ||
            `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(
              merchantName
            )}&am=${amountFormatted}&cu=INR&tn=${encodeURIComponent(noteParam)}`;

          // Generate scannable QR code
          await generateAndSetQr(upiString);

          // Calculate remaining seconds strictly from link.expires_at or link.created_at
          const now = Date.now();
          const expTimestamp = linkObj.expires_at
            ? new Date(linkObj.expires_at).getTime()
            : (linkObj.created_at 
                ? new Date(linkObj.created_at).getTime() + (linkObj.expiry_minutes || linkObj.custom_settings?.session_timeout_minutes || 8) * 60 * 1000
                : now + 480000);

          const totalDurationSecs = (linkObj.expiry_minutes || linkObj.custom_settings?.session_timeout_minutes || 8) * 60;
          totalDurationRef.current = totalDurationSecs;

          const remainingSeconds = Math.max(0, Math.floor((expTimestamp - now) / 1000));
          setTimeLeft(remainingSeconds);

          if (linkObj.status === 'EXPIRED' || remainingSeconds <= 0) {
            setStatus('FAILED');
            setStatusMessage('This payment link has expired and is no longer valid. Please request a new payment link.');
          } else if (linkObj.status === 'CAPTURED' || linkObj.status === 'CONFIRMED') {
            setStatus('CONFIRMED');
            setStatusMessage('This payment link has already been completed.');
            setConfirmedTxnId(linkObj.id);
            setConfirmedUtr(linkObj.transaction_ref || 'VERIFIED');
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
      const amtParam = details?.amount ? `amount=${details.amount}` : '';
      const linkCutoff = details?.created_at
        ? new Date(details.created_at).getTime() - 180000
        : sessionStartTimeRef.current - 180000;
      const sinceParam = `since=${linkCutoff}`;
      const emailParam = customerEmail.trim() ? `customer_email=${encodeURIComponent(customerEmail.trim())}` : '';
      const queryStr = [amtParam, sinceParam, emailParam].filter(Boolean).join('&');
      const res = await fetch(`/api/payment/auto-detect/${linkId}?${queryStr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'CONFIRMED' || data.status === 'CAPTURED') {
          setStatus('CONFIRMED');
          setStatusMessage(data.message || 'Payment Automatically Detected & Confirmed via UPI Alert! 🎉');
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
          since: sessionStartTimeRef.current,
          customer_email: customerEmail.trim() || undefined,
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
          data.error || data.message || 'No matching FamPay payment alert found for this transaction.'
        );
      }
    } catch {
      setErrorMessage('Failed to connect to Gmail IMAP service. Please check network connection.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulatePayment = async () => {
    setVerifying(true);
    setErrorMessage(null);
    try {
      const fakeUtr = utrInput.trim() || `SIM-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      const res = await fetch('/api/payment/public-verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: linkId,
          utr: fakeUtr,
          amount: details?.amount || 100,
          customer_email: customerEmail.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('CONFIRMED');
        setStatusMessage(data.message || 'Payment Simulated & Confirmed successfully! ✓');
        setConfirmedUtr(data.payment?.transaction_ref || fakeUtr);
        setConfirmedTxnId(data.payment?.id || linkId);
      } else {
        setErrorMessage(data.error || 'Verification failed');
      }
    } catch {
      setErrorMessage('Failed to connect to verification service.');
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
    sessionStartTimeRef.current = Date.now();
    setTimeLeft(totalDurationRef.current);
    fetchLinkDetails();
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
            <div class="row"><span>Transaction ID:</span><strong>${confirmedTxnId || linkId}</strong></div>
            <div class="row total"><span>Amount Paid:</span><span>₹${Number(details?.amount || 0).toFixed(2)}</span></div>
            <div class="footer">Thank you for your business. Verified by FamGateway IMAP.</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    fetchLinkDetails();
  }, [linkId]);

  // Real-time Firestore payment listener
  useEffect(() => {
    if (!linkId) return;

    const unsubscribe = listenToPaymentStatus(linkId, (status, paymentData) => {
      if (status === 'CONFIRMED' || status === 'CAPTURED') {
        setStatus('CONFIRMED');
        setStatusMessage('Payment Automatically Detected & Confirmed via UPI Alert! 🎉');
        if (paymentData?.transaction_ref) {
          setConfirmedUtr(paymentData.transaction_ref);
        }
        if (paymentData?.id) {
          setConfirmedTxnId(paymentData.id);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [linkId]);

  // Countdown timer effect
  useEffect(() => {
    if (status !== 'PENDING') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('FAILED');
          setStatusMessage('Payment session expired. Please restart transaction.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Active Gmail IMAP scanning loop (every 2.5 seconds)
  useEffect(() => {
    if (status !== 'PENDING') return;
    const pollInterval = setInterval(checkStatus, 2500);
    return () => clearInterval(pollInterval);
  }, [status, details?.amount, details?.created_at, customerEmail]);

  // Auto redirect on success if redirect_url or success_url exists
  useEffect(() => {
    const returnUrl = details?.redirect_url || details?.success_url;
    if (status === 'CONFIRMED' && returnUrl) {
      setRedirectCountdown(5);
      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(countdownInterval);
            window.location.href = returnUrl;
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [status, details?.redirect_url, details?.success_url]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const custom = details?.custom_settings || {};
  const brandName = custom.brand_name || details?.merchant_name || 'FAMGATEWAY STORE';
  const subtitle = custom.subtitle || 'VERIFIED MERCHANT';
  const avatarUrl =
    custom.avatar_url ||
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80';
  const bannerUrl = custom.banner_url || '';
  const customMessage = custom.custom_message || '';
  const contactUrl = custom.contact_url || '';

  const merchantUpi = details?.merchant_upi_id || '8056317218@fam';
  const amountFormatted = Number(details?.amount || 0).toFixed(2);
  const noteParam = details?.transaction_ref || details?.title || linkId;
  const upiUri =
    details?.upi_uri ||
    `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(
      brandName
    )}&am=${amountFormatted}&cu=INR&tn=${encodeURIComponent(noteParam)}`;

  const timerPercentage = totalDurationRef.current > 0 ? (timeLeft / totalDurationRef.current) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading Secure FamPay UPI Checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col items-center justify-center p-3 sm:p-4 font-sans selection:bg-purple-600 selection:text-white relative">
      {/* Background radial highlights */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-950/20 via-slate-950 to-[#060911]" />

      {/* Main Checkout Container */}
      <div className="w-full max-w-md relative z-10 space-y-4 my-4">
        {bannerUrl && (
          <div className="w-full h-28 rounded-3xl overflow-hidden border border-purple-500/30 shadow-xl relative">
            <img src={bannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-transparent to-transparent" />
          </div>
        )}

        {customMessage && (
          <div className="p-3.5 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs font-semibold text-center shadow-lg backdrop-blur-md">
            {customMessage}
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-3xl bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-900/90 p-4 sm:p-5 border border-purple-500/30 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              {/* Return / Back Button */}
              <button
                type="button"
                onClick={handleReturnToPreviousPage}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                title="Return to Previous Page"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

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
                    ₹{amountFormatted}
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

              {/* Redirect Countdown if redirect_url is present */}
              {redirectCountdown !== null && (
                <div className="p-3 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-200">
                  Redirecting back to store in <strong className="text-white font-bold">{redirectCountdown}s</strong>...
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleReturnToPreviousPage}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Store / Previous Page</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdfReceipt}
                  className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Receipt</span>
                </button>
              </div>
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
                    ? 'The session expired because no payment was captured. Please retry.' 
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
                  <span className="text-slate-300">₹{amountFormatted}</span>
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
                  className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry & Pay Again</span>
                </button>

                <button
                  type="button"
                  onClick={handleReturnToPreviousPage}
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

              {/* Card 1: High-Contrast Scannable QR Code Card */}
              <div className="rounded-3xl bg-[#0e1320] border border-slate-800/80 p-5 sm:p-6 shadow-2xl text-center space-y-4">
                {/* Clean Pure White Container with Rounded Corners for Easy Scanning */}
                <div className="p-4 rounded-3xl bg-white text-slate-900 border-4 border-purple-500/80 shadow-2xl inline-block mx-auto">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="UPI QR Code"
                      className="w-56 h-56 sm:w-60 sm:h-60 mx-auto rounded-lg object-contain block"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-lg">
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
                    <span>{amountFormatted}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 tracking-wide">
                    VPA: <span className="text-purple-300 font-bold">{merchantUpi}</span>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">
                      <Smartphone className="w-4 h-4 text-teal-400" />
                      <span>PAY BY APPS (1-CLICK TAP)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Instant redirect</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Generic UPI / All Apps */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-purple-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-xs shrink-0">
                        UPI
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-purple-300">Any UPI App</div>
                        <div className="text-[10px] text-slate-400">Default app</div>
                      </div>
                    </a>

                    {/* FamPay Button */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-amber-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xs shrink-0">
                        Fam
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-300">FamPay</div>
                        <div className="text-[10px] text-slate-400">Tap to pay</div>
                      </div>
                    </a>

                    {/* Google Pay Button */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-blue-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs shrink-0">
                        GPay
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-300">Google Pay</div>
                        <div className="text-[10px] text-slate-400">Tap to pay</div>
                      </div>
                    </a>

                    {/* PhonePe Button */}
                    <a
                      href={upiUri}
                      className="p-3 rounded-xl bg-[#141a29] border border-slate-800/90 hover:border-purple-500/50 hover:bg-[#182033] flex items-center gap-3 transition-all text-left group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-xs shrink-0">
                        Pe
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-purple-300">PhonePe</div>
                        <div className="text-[10px] text-slate-400">Tap to pay</div>
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
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#1e293b"
                      strokeWidth="5"
                      fill="transparent"
                    />
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
                    Scan & pay before timer reaches 00:00
                  </div>
                </div>
              </div>

              {/* Auto-Confirm Live Indicator */}
              <div className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 font-bold shadow-inner">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Auto-Confirm Active: Confirms instantly upon payment alert!</span>
              </div>

              {/* Card 3.5: Customer Receipt Email */}
              <div className="rounded-2xl bg-[#0e1320] border border-slate-800/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-400 uppercase tracking-wider font-mono">
                    <Mail className="w-3.5 h-3.5 text-teal-400" />
                    <span>Receipt Email Address (Optional)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Instant notification</span>
                </div>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="yourname@gmail.com to receive receipt"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Card 4: MANUAL UTR ENTRY (FALLBACK) */}
              {custom.enable_utr_submission !== false && (
                <div className="rounded-2xl bg-[#0e1320] border border-slate-800/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">
                      <CreditCard className="w-4 h-4 text-teal-400" />
                      <span>MANUAL UTR CONFIRMATION (OPTIONAL)</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">FALLBACK</span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    If not automatically confirmed within seconds of paying, enter your 12-digit UTR:
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder="e.g. 427618294012"
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
                          <span>Confirming...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Find UTR in your bank app history</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulatePayment}
                      disabled={verifying}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-100 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Simulate / Test Verify</span>
                    </button>
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
                  <span>Cancel Payment & Return to Store</span>
                </button>
              </div>
            </>
          )}

          {/* Footer Branding */}
          <div className="text-center pt-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Powered by FAMGATEWAY Zero-Fee UPI Engine</span>
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
                <strong className="text-white">₹{amountFormatted}</strong>? Your order will not be completed.
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
