import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Terminal, 
  Code2, 
  Globe, 
  Shield, 
  Sparkles, 
  Cpu, 
  Link2, 
  Webhook, 
  Key, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DocumentationView: React.FC = () => {
  const { user } = useAuth();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'cURL' | 'JavaScript' | 'PHP' | 'Python'>('cURL');

  const apiKey = user?.api_key || 'fgw_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d';
  const baseUrl = window.location.origin;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // cURL Code Snippets
  const curlCreateOrder = `curl -X POST "${baseUrl}/api/v1/order/create" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "amount": 500,
    "note": "Payment for Order #1024",
    "customer_name": "Ramesh Kumar",
    "success_url": "https://yoursite.com/success",
    "cancel_url": "https://yoursite.com/cancel"
  }'`;

  const curlCheckStatus = `curl -X GET "${baseUrl}/api/v1/order/status/txn_a1b2c3d4" \\
  -H "x-api-key: ${apiKey}"`;

  // JavaScript / Node.js
  const jsCode = `// 1. Create Payment Order
const createOrder = async () => {
  const response = await fetch('${baseUrl}/api/v1/order/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${apiKey}'
    },
    body: JSON.stringify({
      amount: 500,
      note: "Order #1024",
      success_url: "https://yoursite.com/success"
    })
  });
  const data = await response.json();
  
  if (data.success) {
    // Redirect customer to the checkout page
    window.location.href = data.payment_url;
  }
};`;

  // PHP
  const phpCode = `<?php
// 1. Create Payment Order in PHP
$apiKey = "${apiKey}";
$ch = curl_init("${baseUrl}/api/v1/order/create");

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: " . $apiKey
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "amount" => 500,
    "note" => "PHP Order #1024",
    "success_url" => "https://yoursite.com/success"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
if ($data['success']) {
    header("Location: " . $data['payment_url']);
}
?>`;

  // Python
  const pythonCode = `import requests

API_KEY = "${apiKey}"
url = "${baseUrl}/api/v1/order/create"

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

payload = {
    "amount": 500,
    "note": "Python Order #1024",
    "success_url": "https://yoursite.com/success"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if data.get("success"):
    print("Redirect customer to:", data.get("payment_url"))`;

  const endpoints = [
    { method: 'POST', path: '/api/v1/order/create', desc: 'Create a new payment session and get QR/Link' },
    { method: 'GET', path: '/api/v1/order/status/:id', desc: 'Check status of a transaction' },
    { method: 'POST', path: '/api/integrations/webhook', desc: 'Configure your notification endpoint' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Hero Header */}
      <div className="relative p-8 rounded-[2rem] bg-indigo-600 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-black uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              Developer API V1.0
            </div>
            <h1 className="text-3xl font-black tracking-tight">API Documentation</h1>
            <p className="text-indigo-100 text-sm max-w-xl font-medium leading-relaxed">
              Integrate FAMGATEWAY Zero-Fee UPI payments into your apps, websites or bots. 
              Real-time payment detection via FamPay alerts.
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="text-[10px] font-bold text-indigo-200 uppercase mb-2">Authenticated As</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 font-bold">
                  {user?.name.charAt(0) || 'D'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{user?.name || 'Developer'}</div>
                  <div className="text-[10px] text-indigo-200 font-mono opacity-80">{apiKey.substring(0, 15)}...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Integration Steps */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            {['cURL', 'JavaScript', 'PHP', 'Python'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                  activeTab === tab
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeTab === 'cURL' && (
              <div className="space-y-6">
                <CodeBlock title="1. Create Payment Session" code={curlCreateOrder} onCopy={() => handleCopy(curlCreateOrder, 1)} isCopied={copiedIndex === 1} icon={<Terminal className="w-4 h-4" />} />
                <CodeBlock title="2. Check Transaction Status" code={curlCheckStatus} onCopy={() => handleCopy(curlCheckStatus, 2)} isCopied={copiedIndex === 2} icon={<Activity className="w-4 h-4" />} />
              </div>
            )}
            {activeTab === 'JavaScript' && (
              <CodeBlock title="Full Implementation (Node/Frontend)" code={jsCode} onCopy={() => handleCopy(jsCode, 3)} isCopied={copiedIndex === 3} icon={<Code2 className="w-4 h-4" />} />
            )}
            {activeTab === 'PHP' && (
              <CodeBlock title="Server-Side Redirect (PHP)" code={phpCode} onCopy={() => handleCopy(phpCode, 4)} isCopied={copiedIndex === 4} icon={<Globe className="w-4 h-4" />} />
            )}
            {activeTab === 'Python' && (
              <CodeBlock title="Integration Script (Python)" code={pythonCode} onCopy={() => handleCopy(pythonCode, 5)} isCopied={copiedIndex === 5} icon={<Sparkles className="w-4 h-4" />} />
            )}
          </div>

          {/* Response Explanation */}
          <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Webhook Verification
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              We send an HMAC-SHA256 signature in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-bold">X-FamGateway-Signature</code> header.
              Verify this signature using your <strong>Webhook Secret</strong> to ensure the request came from us.
            </p>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-indigo-900">Security Recommendation</div>
                <div className="text-[10px] text-indigo-700 font-medium">Never expose your API Key in client-side code. Use server-side proxy calls.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Reference */}
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Endpoint Reference</h3>
            
            <div className="space-y-4">
              {endpoints.map((ep, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      ep.method === 'POST' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-800">{ep.path}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">{ep.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Integration Checklist</h3>
            <div className="space-y-3">
              <CheckItem label="Connect Gmail IMAP" active={Boolean(user?.imap_connected)} />
              <CheckItem label="Generate API Key" active={Boolean(user?.api_key)} />
              <CheckItem label="Set Webhook URL" active={Boolean(user?.webhook_url)} />
              <CheckItem label="Test in Sandbox" active={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CodeBlock: React.FC<{ title: string; code: string; onCopy: () => void; isCopied: boolean; icon: React.ReactNode }> = ({ title, code, onCopy, isCopied, icon }) => (
  <div className="p-5 bg-slate-900 text-slate-100 rounded-[2rem] border border-slate-800 space-y-4 font-mono text-xs shadow-2xl overflow-hidden relative">
    <div className="flex items-center justify-between pb-3 border-b border-white/5 text-slate-400">
      <div className="flex items-center gap-2 font-bold text-indigo-400">
        {icon}
        <span>{title}</span>
      </div>
      <button
        onClick={onCopy}
        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 font-bold text-[10px] transition-all"
      >
        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{isCopied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
      <pre className="text-indigo-100/90 leading-relaxed font-mono whitespace-pre">{code}</pre>
    </div>
  </div>
);

const CheckItem: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div className="flex items-center gap-2.5">
    {active ? (
      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
        <Check className="w-2.5 h-2.5 text-white" />
      </div>
    ) : (
      <div className="w-4 h-4 rounded-full border border-slate-700" />
    )}
    <span className={`text-[11px] font-bold ${active ? 'text-slate-100' : 'text-slate-500'}`}>{label}</span>
  </div>
);
