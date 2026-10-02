import React, { useState } from 'react';
import { FileCode2, Copy, Check, QrCode, Shield, Key, AlertTriangle, Zap, Mail, Globe } from 'lucide-react';

export const DevDocsPage: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const host = window.location.origin;

  const copyCode = (code: string, sectionKey: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const registerCode = `curl -X POST "${host}/api/auth/register" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Alexander Wright",
    "email": "alexander@famgateway.in",
    "password": "Password123!",
    "confirmPassword": "Password123!"
  }'`;

  const verifyCodeSnippet = `curl -X POST "${host}/api/auth/verify-email" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "alexander@famgateway.in",
    "code": "4829173056148273"
  }'`;

  const createPaymentQrCode = `curl -X POST "${host}/api/payment/create-qr" \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "upiId": "alexander@fampay",
    "amount": 500,
    "note": "FamGateway.in Account Upgrade"
  }'`;

  const verifyEmailPaymentSnippet = `curl -X POST "${host}/api/payment/verify-email-alert" \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paymentId": "pay_982104"
  }'`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
          <Globe className="w-3.5 h-3.5 text-indigo-600" />
          <span>FamGateway.in REST API v2.0</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">FamGateway.in API Documentation</h1>
        <p className="text-sm text-slate-600">
          Complete guide for 16-digit email verification and dynamic FamPay UPI payment QR code generation & email alert confirmation.
        </p>
      </div>

      {/* Gateway Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
            <Zap className="w-4 h-4" />
            <span>16-Digit Verification Code</span>
          </div>
          <p className="text-xs text-slate-500">
            Cryptographically generated on Node.js backend. Plaintext codes are never stored — only SHA-256 hashes.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <QrCode className="w-4 h-4" />
            <span>Dynamic FamPay UPI QR</span>
          </div>
          <p className="text-xs text-slate-500">
            Generates standard <code className="text-indigo-600 font-mono">upi://pay</code> URI with custom FamPay UPI VPA, amount, and reference ID.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
            <Mail className="w-4 h-4" />
            <span>Payment Email Verification</span>
          </div>
          <p className="text-xs text-slate-500">
            Parses FamGateway payment notification emails, validates payment reference, and updates wallet status.
          </p>
        </div>
      </div>

      {/* Section 1: POST /api/auth/register */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-mono text-xs border border-indigo-200">
              POST
            </span>
            <span>/api/auth/register</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">User Registration & Code Dispatch</span>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
          {registerCode}
        </pre>
      </div>

      {/* Section 2: POST /api/auth/verify-email */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-mono text-xs border border-indigo-200">
              POST
            </span>
            <span>/api/auth/verify-email</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">Verify 16-Digit Code</span>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
          {verifyCodeSnippet}
        </pre>
      </div>

      {/* Section 3: POST /api/payment/create-qr */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-mono text-xs border border-emerald-200">
              POST
            </span>
            <span>/api/payment/create-qr</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">Generate FamPay UPI QR Code</span>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
          {createPaymentQrCode}
        </pre>
      </div>

      {/* Section 4: POST /api/payment/verify-email-alert */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-800 font-mono text-xs border border-purple-200">
              POST
            </span>
            <span>/api/payment/verify-email-alert</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Verify Payment via Email Alert</span>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
          {verifyEmailPaymentSnippet}
        </pre>
      </div>
    </div>
  );
};
