import React, { useState, useMemo } from 'react';
import {
  Mail,
  Send,
  Eye,
  Code,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Palette,
  Sliders,
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateEmailHtml, EmailTemplateData } from '../utils/emailTemplates';

const THEME_COLORS = [
  { name: 'Indigo Brand', hex: '#4f46e5', bg: 'bg-indigo-600' },
  { name: 'Emerald Pay', hex: '#059669', bg: 'bg-emerald-600' },
  { name: 'Royal Purple', hex: '#7c3aed', bg: 'bg-purple-600' },
  { name: 'Rose Crimson', hex: '#e11d48', bg: 'bg-rose-600' },
  { name: 'Sky Blue', hex: '#0284c7', bg: 'bg-sky-600' },
  { name: 'Dark Slate', hex: '#0f172a', bg: 'bg-slate-900' },
];

export const EmailTemplatePreviewTool: React.FC = () => {
  const { user } = useAuth();

  // Template Type
  const [templateId, setTemplateId] = useState<EmailTemplateData['templateId']>('payment_success');
  const [lang, setLang] = useState<'en' | 'ta'>('en');

  // Customizer Data
  const [merchantName, setMerchantName] = useState<string>(user?.name || 'FamGateway FinTech');
  const [merchantUpi, setMerchantUpi] = useState<string>(user?.fampay_upi_id || '8056317218@fam');
  const [customerName, setCustomerName] = useState<string>('Akash Kumar');
  const [amount, setAmount] = useState<number>(499.00);
  const [orderId, setOrderId] = useState<string>('ORD-882914');
  const [utrRef, setUtrRef] = useState<string>('428910492817');
  const [themeColor, setThemeColor] = useState<string>('#4f46e5');

  // Preview Mode
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);

  // Live SMTP Test Dispatch
  const [testRecipient, setTestRecipient] = useState<string>(user?.email || 'kalam172010@gmail.com');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);
  const [lastSentInfo, setLastSentInfo] = useState<any>(null);

  // Generate rendered email data
  const templatePayload: EmailTemplateData = useMemo(() => ({
    templateId,
    merchantName: merchantName.trim() || 'FamGateway Merchant',
    merchantEmail: user?.fampay_gmail || user?.email || 'kalam172010@gmail.com',
    merchantUpi: merchantUpi.trim() || '8056317218@fam',
    customerName: customerName.trim() || 'Valued Customer',
    customerEmail: testRecipient,
    amount: Number(amount) || 0,
    orderId: orderId.trim() || 'ORD-0001',
    utrRef: utrRef.trim() || '428910492817',
    themeColor,
    lang,
    invoiceUrl: `${window.location.origin}/pay/${orderId.toLowerCase()}`,
    supportPhone: user?.phone || '+91 80563 17218'
  }), [templateId, merchantName, merchantUpi, customerName, testRecipient, amount, orderId, utrRef, themeColor, lang, user]);

  const rendered = useMemo(() => {
    return generateEmailHtml(templatePayload);
  }, [templatePayload]);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(rendered.html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setSendSuccessMsg(null);
    setSendErrorMsg(null);

    try {
      const res = await fetch('/api/email/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: user?.imap_host || 'smtp.gmail.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: user?.fampay_gmail || user?.email || 'kalam172010@gmail.com',
          smtpPass: user?.google_app_password || 'bbvnfxkuxhbynvpv',
          toEmail: testRecipient.trim(),
          ...templatePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch test email.');
      }

      setSendSuccessMsg(`Test email dispatched successfully to ${testRecipient}! Message ID: ${data.messageId}`);
      setLastSentInfo(data);
    } catch (err: any) {
      setSendErrorMsg(err.message || 'SMTP Connection Error. Please verify Google App Password in Integrations tab.');
    } finally {
      setSendingTest(false);
    }
  };

  // Preset loaders
  const loadPreset = (preset: 'grocery' | 'saas' | 'refund') => {
    if (preset === 'grocery') {
      setTemplateId('payment_success');
      setAmount(850.00);
      setOrderId(`GROC-${Date.now().toString().slice(-4)}`);
      setUtrRef('428981290311');
      setCustomerName('Priya Ramanathan');
    } else if (preset === 'saas') {
      setTemplateId('payment_request');
      setAmount(2499.00);
      setOrderId(`INV-${Date.now().toString().slice(-4)}`);
      setCustomerName('Arun Vignesh');
    } else {
      setTemplateId('refund_processed');
      setAmount(350.00);
      setOrderId(`ORD-${Date.now().toString().slice(-4)}`);
      setCustomerName('Karthik Raja');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-800/50 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              SMTP TEMPLATE WORKBENCH
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
              100% RESPONSIVE HTML
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            <span>Customer Email Template Preview & SMTP Tester</span>
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Test and customize your transactional email templates before sending them to customers.
            Preview on Desktop and Mobile in real-time and send instant test emails via your connected Google SMTP credentials.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => loadPreset('grocery')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Receipt Preset
          </button>
          <button
            onClick={() => loadPreset('saas')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Invoice Preset
          </button>
          <button
            onClick={() => loadPreset('refund')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Refund Preset
          </button>
        </div>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Configurator & SMTP Dispatcher (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Template Selector Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Select Email Template</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'payment_success', label: 'Payment Receipt', sub: 'Instant confirmation' },
                { id: 'payment_request', label: 'Payment Request', sub: 'UPI QR Invoice' },
                { id: 'refund_processed', label: 'Refund Processed', sub: 'Credit confirmation' },
                { id: 'subscription_alert', label: 'Plan Subscription', sub: 'Tier renewal alert' },
              ].map((item) => {
                const isSelected = templateId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTemplateId(item.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                      <span>{item.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{item.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Variables Customizer */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Customize Template Variables</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Merchant Name</label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="Merchant Store"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Merchant UPI ID</label>
                  <input
                    type="text"
                    value={merchantUpi}
                    onChange={(e) => setMerchantUpi(e.target.value)}
                    placeholder="merchant@fam"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Amount (₹ INR)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="499"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Order Reference</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="ORD-12345"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">UPI Bank UTR</label>
                  <input
                    type="text"
                    value={utrRef}
                    onChange={(e) => setUtrRef(e.target.value)}
                    placeholder="428910492817"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Accent Color Palette */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Email Accent Brand Color</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {THEME_COLORS.map((c) => {
                    const isSelected = themeColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setThemeColor(c.hex)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full ${c.bg} transition-all cursor-pointer flex items-center justify-center ${
                          isSelected ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live SMTP Dispatcher Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Live SMTP Test Dispatcher</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                SSL Port 465
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Send this exact rendered template to your test email to verify how it displays in your real Gmail or Apple Mail inbox.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-3">
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700">Test Recipient Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sendingTest}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting & Dispatching via SMTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Live Test Email to Inbox</span>
                  </>
                )}
              </button>
            </form>

            {/* Test Send Feedback Alerts */}
            {sendSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">Email Delivered Successfully!</div>
                  <div className="text-[11px] text-emerald-700 font-mono break-all">{sendSuccessMsg}</div>
                </div>
              </div>
            )}

            {sendErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">SMTP Dispatch Failed</div>
                  <div className="text-[11px] text-rose-700">{sendErrorMsg}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Responsive Preview Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Viewport Control Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-4 flex-wrap">
            {/* View Switch (Visual vs Code) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'visual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Visual Render</span>
              </button>

              <button
                onClick={() => setViewMode('code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-indigo-600" />
                <span>HTML Code</span>
              </button>
            </div>

            {/* Device Switcher (Desktop vs Mobile) */}
            {viewMode === 'visual' && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setDeviceMode('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    deviceMode === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-slate-700" />
                  <span>Desktop (580px)</span>
                </button>

                <button
                  onClick={() => setDeviceMode('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    deviceMode === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-slate-700" />
                  <span>Mobile (375px)</span>
                </button>
              </div>
            )}

            {/* Copy HTML Button */}
            <button
              onClick={handleCopyHtml}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHtml ? 'Copied HTML!' : 'Copy HTML'}</span>
            </button>
          </div>

          {/* Email Header Metadata Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs space-y-1.5 font-sans">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400 w-16 text-[11px]">Subject:</span>
              <span className="font-extrabold text-slate-900 truncate">{rendered.subject}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400 w-16 text-[11px]">From:</span>
              <span className="font-mono text-slate-700 truncate font-semibold">
                "{merchantName}" &lt;{user?.fampay_gmail || user?.email || 'kalam172010@gmail.com'}&gt;
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400 w-16 text-[11px]">Preheader:</span>
              <span className="text-slate-500 truncate italic">{rendered.preheader}</span>
            </div>
          </div>

          {/* Main Visual Preview Window */}
          {viewMode === 'visual' ? (
            <div className="p-6 rounded-3xl bg-slate-100 border border-slate-200 shadow-inner flex justify-center items-start min-h-[580px] overflow-x-auto">
              <div
                className={`transition-all duration-300 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-300 ${
                  deviceMode === 'mobile' ? 'w-[375px]' : 'w-[580px]'
                }`}
              >
                {/* Mobile top speaker & camera bar simulation */}
                {deviceMode === 'mobile' && (
                  <div className="bg-slate-900 py-1.5 px-4 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>9:41</span>
                    <div className="w-16 h-2 bg-slate-800 rounded-full mx-auto" />
                    <span>100% ⚡</span>
                  </div>
                )}

                {/* Sandboxed Email HTML Iframe */}
                <iframe
                  title="Email Template Live Preview"
                  srcDoc={rendered.html}
                  className="w-full h-[620px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            /* Raw HTML Code Viewer */
            <div className="rounded-3xl bg-slate-950 border border-slate-800 shadow-lg overflow-hidden text-xs font-mono">
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                <span>HTML Template Output ({rendered.html.length} bytes)</span>
                <span className="text-emerald-400 font-bold">W3C Email Compliant</span>
              </div>
              <pre className="p-4 text-indigo-300 overflow-x-auto max-h-[580px] leading-relaxed selection:bg-indigo-700 selection:text-white">
                <code>{rendered.html}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
