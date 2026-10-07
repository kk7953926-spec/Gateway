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
  Copy,
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
  const [selectedUpi, setSelectedUpi] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

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

          const primaryUpi = (linkObj.merchant_upi_id || '8056317218@fam').trim();
          setSelectedUpi(primaryUpi);
          const merchantName = (linkObj.merchant_name || 'FAMGATEWAY').replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 25) || 'Merchant';
          const amountFormatted = Number(linkObj.amount || 0).toFixed(2);
          const noteParam = (linkObj.transaction_ref || linkObj.title || linkId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30) || 'Payment';

          const upiString = `upi://pay?pa=${primaryUpi}&pn=${encodeURIComponent(
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

  // Download high-contrast QR code card image to gallery
  const handleSaveQrToGallery = () => {
    if (!qrDataUrl) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `UPI-QR-${linkId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = 600;
        canvas.height = 760;

        // Clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 760);

        // Header
        ctx.fillStyle = '#581c87';
        ctx.fillRect(0, 0, 600, 110);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((brandName || 'FAMGATEWAY STORE').toUpperCase(), 300, 50);

        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#e9d5ff';
        ctx.fillText('SECURE UPI PAYMENT • ZERO TRANSACTION FEE', 300, 80);

        // High contrast QR Image centered with border
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(90, 130, 420, 420);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(90, 130, 420, 420);

        ctx.drawImage(img, 100, 140, 400, 400);

        // Amount Box
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(50, 570, 500, 95);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(50, 570, 500, 95);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(`₹${amountFormatted}`, 300, 612);

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`UPI ID: ${currentUpi}`, 300, 642);

        // Footer
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText('Scan with GPay, PhonePe, Paytm, FamPay, or BHIM', 300, 715);

        const downloadUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `UPI-Payment-${linkId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      img.src = qrDataUrl;
    } catch {
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `UPI-QR-${linkId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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

  const primaryUpi = (details?.merchant_upi_id || '8056317218@fam').trim();
  const backupUpi = details?.backup_upi_id ? details.backup_upi_id.trim() : null;
  const currentUpi = (selectedUpi || primaryUpi).trim();

  const amountFormatted = Number(details?.amount || 0).toFixed(2);
  const noteParam = (details?.transaction_ref || details?.title || linkId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30) || 'Payment';
  const cleanPn = (brandName || 'FAMGATEWAY').replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 25) || 'Merchant';
  const upiUri = `upi://pay?pa=${currentUpi}&pn=${encodeURIComponent(
    cleanPn
  )}&am=${amountFormatted}&cu=INR&tn=${encodeURIComponent(noteParam)}`;

  const handleSwitchUpi = async (targetVpa: string) => {
    const cleanVpa = targetVpa.trim();
    setSelectedUpi(cleanVpa);
    const newUri = `upi://pay?pa=${cleanVpa}&pn=${encodeURIComponent(cleanPn)}&am=${amountFormatted}&cu=INR&tn=${encodeURIComponent(noteParam)}`;
    await generateAndSetQr(newUri);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(currentUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans selection:bg-indigo-600 selection:text-white relative">
      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950/80 to-[#070b14]" />

      {/* Main Checkout Container */}
      <div className="w-full max-w-md relative z-10 space-y-4 my-4">
        {bannerUrl && (
          <div className="w-full h-28 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative">
            <img src={bannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-transparent" />
          </div>
        )}

        {customMessage && (
          <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 text-indigo-200 text-xs font-medium text-center shadow-sm">
            {customMessage}
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Return / Back Button */}
              <button
                type="button"
                onClick={handleReturnToPreviousPage}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Return to Previous Page"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Merchant Avatar / Logo */}
              <div className="w-10 h-10 rounded-xl border border-slate-700 overflow-hidden bg-slate-950 shrink-0 shadow-sm flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Merchant Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="font-bold text-sm text-indigo-400">
                    {brandName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <div className="font-bold text-white text-sm tracking-tight leading-tight">
                  {brandName}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{subtitle}</span>
                </div>
              </div>
            </div>

            {/* Cancel Action Button in Header */}
            {status === 'PENDING' && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                title="Cancel Payment"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Main Content Body */}
        <div className="space-y-4">
          {status === 'CONFIRMED' ? (
            /* SUCCESS VIEW */
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-xl text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">Payment Confirmed</h2>
                <p className="text-xs text-emerald-400 font-medium font-mono">
                  {statusMessage || 'Payment received and verified in real time.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs font-mono text-left">
                <div className="flex justify-between text-slate-400">
                  <span>Merchant</span>
                  <span className="text-white font-semibold">{brandName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount Paid</span>
                  <span className="text-emerald-400 font-bold text-sm tabular-nums">
                    ₹{amountFormatted}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Order Reference</span>
                  <span className="text-slate-300">{linkId}</span>
                </div>
                {confirmedUtr && (
                  <div className="flex justify-between text-slate-400">
                    <span>Bank UTR</span>
                    <span className="text-indigo-400 font-bold select-all">{confirmedUtr}</span>
                  </div>
                )}
                {confirmedTxnId && (
                  <div className="flex justify-between text-slate-400">
                    <span>Transaction ID</span>
                    <span className="text-slate-300 select-all">{confirmedTxnId}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Status</span>
                  <span className="text-emerald-400 font-semibold">CAPTURED ✓</span>
                </div>
              </div>

              {/* Redirect Countdown if redirect_url is present */}
              {redirectCountdown !== null && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
                  Redirecting back to store in <strong className="text-white font-bold">{redirectCountdown}s</strong>...
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleReturnToPreviousPage}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Store</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdfReceipt}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Receipt</span>
                </button>
              </div>
            </div>
          ) : (status === 'CANCELLED' || status === 'FAILED') ? (
            /* CANCELLED OR EXPIRED VIEW */
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-7 shadow-xl text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {status === 'FAILED' ? 'Payment Session Expired' : 'Payment Cancelled'}
                </h2>
                <p className="text-xs text-slate-400">
                  {status === 'FAILED' 
                    ? 'The session timed out before payment was detected. Please retry.' 
                    : 'This transaction was cancelled. No funds were debited.'}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRestartPayment}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Payment</span>
                </button>

                <button
                  type="button"
                  onClick={handleReturnToPreviousPage}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Previous Page</span>
                </button>
              </div>
            </div>
          ) : (
            /* PENDING CHECKOUT VIEW */
            <>
              {/* Card 1: High-Contrast Scannable QR Code Card */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl text-center space-y-4">
                {/* Amount & Order Ref */}
                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-400">
                    Order Ref: <span className="text-slate-300 font-semibold">{linkId}</span>
                  </div>
                  <div className="text-4xl font-extrabold text-white tracking-tight font-mono tabular-nums">
                    ₹{amountFormatted}
                  </div>
                </div>

                {/* Clean Scannable QR Container */}
                <div className="relative p-4 rounded-2xl bg-white border border-slate-200/90 shadow-lg inline-block mx-auto group">
                  {qrDataUrl ? (
                    <div className="relative">
                      <img
                        src={qrDataUrl}
                        alt="UPI QR Code"
                        className="w-56 h-56 mx-auto rounded-xl object-contain block"
                      />
                      {/* Subtle corner accent guides */}
                      <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-600 rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-600 rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-600 rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-600 rounded-br-sm pointer-events-none" />
                    </div>
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-xl">
                      <QrCode className="w-12 h-12 text-slate-400 animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Scan with any UPI app to pay</span>
                </div>

                {/* UPI VPA Copy Bar */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-xs font-mono text-slate-300 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 select-all font-medium">
                    {currentUpi}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy VPA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Banner if any */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Card 2: 1-Click Pay by 6 Major UPI Apps */}
              {custom.show_apps !== false && (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <span>Instant UPI App Launch</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Mobile 1-Tap</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Google Pay */}
                    <a
                      href={`gpay://upi/pay?pa=${currentUpi}&pn=${encodeURIComponent(cleanPn)}&am=${amountFormatted}&cu=INR&tn=${encodeURIComponent(noteParam)}`}
                      onClick={() => {
                        setTimeout(() => { window.location.href = upiUri; }, 300);
                      }}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/20">
                        G
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">Google Pay</div>
                        <div className="text-[10px] text-slate-400">GPay UPI</div>
                      </div>
                    </a>

                    {/* PhonePe */}
                    <a
                      href={`phonepe://pay?pa=${currentUpi}&pn=${encodeURIComponent(cleanPn)}&am=${amountFormatted}&cu=INR&tn=${encodeURIComponent(noteParam)}`}
                      onClick={() => {
                        setTimeout(() => { window.location.href = upiUri; }, 300);
                      }}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 font-black text-xs flex items-center justify-center shrink-0 border border-purple-500/20">
                        Pe
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">PhonePe</div>
                        <div className="text-[10px] text-slate-400">Instant pay</div>
                      </div>
                    </a>

                    {/* Paytm */}
                    <a
                      href={`paytmmp://pay?pa=${currentUpi}&pn=${encodeURIComponent(cleanPn)}&am=${amountFormatted}&cu=INR&tn=${encodeURIComponent(noteParam)}`}
                      onClick={() => {
                        setTimeout(() => { window.location.href = upiUri; }, 300);
                      }}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 font-black text-xs flex items-center justify-center shrink-0 border border-sky-500/20">
                        Py
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">Paytm</div>
                        <div className="text-[10px] text-slate-400">Wallet/UPI</div>
                      </div>
                    </a>

                    {/* FamPay */}
                    <a
                      href={upiUri}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 font-black text-xs flex items-center justify-center shrink-0 border border-amber-500/20">
                        Fam
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">FamPay</div>
                        <div className="text-[10px] text-slate-400">FamApp UPI</div>
                      </div>
                    </a>

                    {/* BHIM UPI */}
                    <a
                      href={upiUri}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
                        BH
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">BHIM UPI</div>
                        <div className="text-[10px] text-slate-400">Govt NPCI</div>
                      </div>
                    </a>

                    {/* Default UPI System Picker */}
                    <a
                      href={upiUri}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-500/20">
                        UPI
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">Other App</div>
                        <div className="text-[10px] text-slate-400">System picker</div>
                      </div>
                    </a>
                  </div>
                </div>
              )}

              {/* Card 3: Session Countdown & Live Status Radar */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <div className="text-xs font-semibold text-white">Live IMAP Verification Active</div>
                      <div className="text-[11px] text-slate-400">Auto-confirms within 2 seconds of payment</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-indigo-300 tabular-nums">
                      {formatTimer(timeLeft)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono">Remaining</div>
                  </div>
                </div>

                {/* Countdown Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.min(100, Math.max(0, timerPercentage))}%` }}
                  />
                </div>
              </div>

              {/* Card 4: Customer Receipt Email (Optional) */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Send Confirmation Receipt to (Optional)</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Card 5: Manual UTR Verification Drawer */}
              {custom.enable_utr_submission !== false && (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Already paid? Enter 12-Digit Bank UTR</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={16}
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                      placeholder="e.g. 427618294012 (12-digit UTR)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPayment}
                      disabled={verifying || !utrInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-sm"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit UTR</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-0.5">
                    <span>Found in your bank, FamApp, GPay or PhonePe payment receipt</span>
                  </div>
                </div>
              )}
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
