import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, Clock, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CodeInput16Digit } from '../components/CodeInput16Digit';

interface VerifyEmailPageProps {
  onVerifiedSuccess: () => void;
  onBackToRegister?: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onVerifiedSuccess, onBackToRegister }) => {
  const {
    pendingVerificationEmail,
    pendingUserId,
    pendingExpiresAt,
    simulatedCodeNotice,
    setAuthSession,
    setPendingVerification,
  } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);

  useEffect(() => {
    if (!pendingExpiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((pendingExpiresAt - now) / 1000));
      setTimeLeft(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pendingExpiresAt]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (codeToSubmit?: string) => {
    const targetCode = codeToSubmit || code;
    const cleanCode = targetCode.replace(/\D/g, '');

    if (cleanCode.length !== 16) {
      setError('Please enter the complete 16-digit verification code.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingVerificationEmail,
          userId: pendingUserId,
          code: cleanCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Verification failed. Please check the code and try again.');
        setLoading(false);
        return;
      }

      setSuccessMessage(data.message || 'Email verified successfully!');
      if (data.user && data.token) {
        setAuthSession(data.user, data.token);
      }

      setTimeout(() => {
        onVerifiedSuccess();
      }, 1200);
    } catch {
      setError('Connection error while contacting FamGateway.in server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingVerificationEmail && !pendingUserId) return;
    setError(null);
    setSuccessMessage(null);
    setResending(true);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingVerificationEmail,
          userId: pendingUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to resend code. Rate limit may apply.');
        setResending(false);
        return;
      }

      setSuccessMessage('A fresh 16-digit code has been dispatched to your email.');
      if (data.expiresAt) {
        setPendingVerification(
          pendingVerificationEmail || '',
          pendingUserId || '',
          data.expiresAt,
          data.simulated ? 'Notice: Simulated SMTP mode active. Check backend output for code.' : undefined
        );
      }
      setCode('');
    } catch {
      setError('Failed to request resend. Please check server connectivity.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
            <Mail className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-mono font-bold text-indigo-700 tracking-wider uppercase bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              Email Verification Required
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Enter Verification Code</h2>
            <p className="text-xs text-slate-600 mt-1">
              We sent a <strong className="text-indigo-600">16-digit numeric code</strong> to:
            </p>
            <div className="inline-block mt-1 font-mono text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              {pendingVerificationEmail || 'your email address'}
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {simulatedCodeNotice && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <span className="font-bold block">Developer Mode Active:</span>
              <span>{simulatedCodeNotice}</span>
            </div>
          </div>
        )}

        {/* Code Input */}
        <div className="space-y-4 pt-2">
          <CodeInput16Digit
            value={code}
            onChange={setCode}
            onComplete={(completedCode) => handleVerify(completedCode)}
            disabled={loading}
            error={Boolean(error)}
          />

          {/* Expiration Timer & Resend */}
          <div className="flex items-center justify-between text-xs text-slate-600 px-1 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Expires in:</span>
              <span className={`font-bold ${timeLeft < 120 ? 'text-rose-600' : 'text-indigo-600'}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending || loading}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Resending...' : 'Resend Code'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={loading || code.replace(/\D/g, '').length !== 16}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{loading ? 'Verifying...' : 'Verify Code & Access Account'}</span>
          </button>
        </div>

        {onBackToRegister && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToRegister}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              &larr; Register with a different email address
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
