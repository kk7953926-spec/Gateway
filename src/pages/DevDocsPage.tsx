import React, { useState } from 'react';
import { FileCode2, Copy, Check, QrCode, Shield, Key, AlertTriangle, Zap, Mail, Globe } from 'lucide-react';

export const DevDocsPage: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const host = typeof window !== 'undefined' ? window.location.origin : 'https://famgateway.in';

  const copyCode = (code: string, sectionKey: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const createOrderPost = `curl -X POST "${host}/api/create-order" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e" \\
  -d '{
    "amount": 499.00,
    "customer_name": "Rahul Sharma",
    "customer_email": "rahul@example.com",
    "redirect_url": "https://yoursite.com/payment-success"
  }'`;

  const createOrderGet = `curl -X GET "${host}/api/qr.php?api_key=fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e&amount=499&customer_name=Rahul"`;

  const checkStatusSnippet = `curl -X GET "${host}/api/order-status/lnk_1024" \\
  -H "X-Api-Key: fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e"`;

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

      {/* Section 1: Canonical REST API POST /api/create-order */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
              POST
            </span>
            <span className="font-bold text-slate-900 text-sm">/api/create-order</span>
          </div>
          <button
            onClick={() => copyCode(createOrderPost, 'createOrderPost')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSection === 'createOrderPost' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'createOrderPost' ? 'Copied' : 'Copy cURL'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Canonical REST API (POST JSON) — Recommended for production web stores, SaaS checkouts, and mobile apps.
        </p>

        <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          {createOrderPost}
        </pre>
      </div>

      {/* Section 2: Quick Query Alias GET /api/qr.php */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-mono text-xs font-bold border border-emerald-200">
              GET
            </span>
            <span className="font-bold text-slate-900 text-sm">/api/qr.php</span>
          </div>
          <button
            onClick={() => copyCode(createOrderGet, 'createOrderGet')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSection === 'createOrderGet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'createOrderGet' ? 'Copied' : 'Copy cURL'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Query Alias (GET) — Ideal for quick terminal testing, Telegram/Discord bots, and lightweight script integrations.
        </p>

        <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          {createOrderGet}
        </pre>
      </div>

      {/* Section 3: Check Order Status */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 font-mono text-xs font-bold border border-purple-200">
              GET
            </span>
            <span className="font-bold text-slate-900 text-sm">/api/order-status/:order_id</span>
          </div>
          <button
            onClick={() => copyCode(checkStatusSnippet, 'checkStatusSnippet')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSection === 'checkStatusSnippet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'checkStatusSnippet' ? 'Copied' : 'Copy cURL'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Check live payment status, transaction ID, and bank UTR confirmation.
        </p>

        <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          {checkStatusSnippet}
        </pre>
      </div>
    </div>
  );
};
