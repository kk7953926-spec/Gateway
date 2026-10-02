import React, { useState, useEffect } from 'react';
import {
  Palette,
  ShieldCheck,
  Save,
  Check,
  Smartphone,
  CreditCard,
  Download,
  Clock,
  Headphones,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CheckoutCustomizationSettings } from '../types';

export const CustomizeView: React.FC = () => {
  const { user, token } = useAuth();

  const [brandName, setBrandName] = useState('FAMGATEWAY');
  const [subtitle, setSubtitle] = useState('VERIFIED MERCHANT');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'
  );
  const [themeColor, setThemeColor] = useState<'purple' | 'indigo' | 'emerald' | 'cyan' | 'rose' | 'amber'>('purple');
  const [sessionTimeout, setSessionTimeout] = useState<number>(8);
  const [contactUrl, setContactUrl] = useState('https://wa.me/911234567890');
  const [enableUtr, setEnableUtr] = useState<boolean>(true);
  const [enableSaveQr, setEnableSaveQr] = useState<boolean>(true);
  const [showApps, setShowApps] = useState<boolean>(true);
  const [successUrl, setSuccessUrl] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preset Avatars
  const presetAvatars = [
    {
      name: 'Gamer / Anime',
      url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Modern Store',
      url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Cyberpunk Tech',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'VIP Gold',
      url: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&auto=format&fit=crop&q=80',
    },
  ];

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/payment/checkout-settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setBrandName(data.settings.brand_name || 'UNKNOWN GATEWAY');
            setSubtitle(data.settings.subtitle || 'VERIFIED MERCHANT');
            if (data.settings.avatar_url) setAvatarUrl(data.settings.avatar_url);
            if (data.settings.theme_color) setThemeColor(data.settings.theme_color);
            if (data.settings.session_timeout_minutes) setSessionTimeout(data.settings.session_timeout_minutes);
            if (data.settings.contact_url) setContactUrl(data.settings.contact_url);
            if (data.settings.enable_utr_submission !== undefined) setEnableUtr(data.settings.enable_utr_submission);
            if (data.settings.enable_save_qr !== undefined) setEnableSaveQr(data.settings.enable_save_qr);
            if (data.settings.show_apps !== undefined) setShowApps(data.settings.show_apps);
            if (data.settings.success_url) setSuccessUrl(data.settings.success_url);
            if (data.settings.cancel_url) setCancelUrl(data.settings.cancel_url);
          }
        }
      } catch {
        // Fallback
      }
    };
    loadSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const payload: CheckoutCustomizationSettings = {
      brand_name: brandName.trim() || 'UNKNOWN GATEWAY',
      subtitle: subtitle.trim() || 'VERIFIED MERCHANT',
      avatar_url: avatarUrl.trim(),
      theme_color: themeColor,
      session_timeout_minutes: sessionTimeout,
      contact_url: contactUrl.trim(),
      enable_utr_submission: enableUtr,
      enable_save_qr: enableSaveQr,
      show_apps: showApps,
      success_url: successUrl.trim(),
      cancel_url: cancelUrl.trim(),
    };

    try {
      const res = await fetch('/api/payment/checkout-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: payload }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Palette className="w-6 h-6 text-purple-600" />
          <span>Payment Page Customization</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Customize your checkout page branding, logo, colors, and options. Changes apply instantly to all your payment links.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Customization Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Branding Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Brand Identity & Header</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gateway / Store Name
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. UNKNOWN GATEWAY"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-semibold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Displayed prominently at the top of the payment screen.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Verified Badge / Subtitle
                  </label>
                  <input
                    type="text"
                    required
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. VERIFIED MERCHANT"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Merchant Avatar / Logo Image
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-300 shrink-0 bg-slate-100 flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5 w-full">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 1.5 * 1024 * 1024) {
                            alert("Image is too large. Please select an image under 1.5MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setAvatarUrl(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                        id="avatar-upload-file"
                      />
                      <div className="flex gap-2">
                        <label
                          htmlFor="avatar-upload-file"
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm inline-block"
                        >
                          Choose from Phone Gallery
                        </label>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarUrl('')}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG or SVG format. Max size 1.5MB.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Or type a custom Image URL:
                    </label>
                    <input
                      type="url"
                      value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  {/* Preset Avatar Pickers */}
                  <div className="mt-2.5">
                    <span className="text-[11px] font-bold text-slate-500">Or select from presets:</span>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {presetAvatars.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                            avatarUrl === preset.url
                              ? 'border-purple-600 bg-purple-50 text-purple-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-4 h-4 rounded-full object-cover" />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features & Options Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Timer & Checkout Controls</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Session Countdown Duration (Minutes)
                  </label>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-semibold"
                  >
                    <option value={1}>1 Minute</option>
                    <option value={2}>2 Minutes</option>
                    <option value={3}>3 Minutes</option>
                    <option value={5}>5 Minutes</option>
                    <option value={8}>8 Minutes (Recommended)</option>
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (1 Hour)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Us WhatsApp / Support Link
                  </label>
                  <input
                    type="url"
                    value={contactUrl}
                    onChange={(e) => setContactUrl(e.target.value)}
                    placeholder="e.g. https://wa.me/911234567890"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Opens when customers click the floating "Contact Us" button.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Success Redirect URL
                    </label>
                    <input
                      type="url"
                      value={successUrl}
                      onChange={(e) => setSuccessUrl(e.target.value)}
                      placeholder="e.g. https://your-website.com/success"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Redirects customer after payment is CONFIRMED.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cancel / Failure URL
                    </label>
                    <input
                      type="url"
                      value={cancelUrl}
                      onChange={(e) => setCancelUrl(e.target.value)}
                      placeholder="e.g. https://your-website.com/failed"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Redirects if customer cancels or session expires.
                    </p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="pt-2 space-y-3 border-t border-slate-100">
                  {/* Save QR to Gallery Toggle */}
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">"Save QR to Gallery" Button</div>
                        <div className="text-[11px] text-slate-500">Allow customers to download QR to phone</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableSaveQr}
                      onChange={(e) => setEnableSaveQr(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500"
                    />
                  </label>

                  {/* Pay by Apps Toggle */}
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-4 h-4 text-teal-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">"PAY BY APPS" Launchers</div>
                        <div className="text-[11px] text-slate-500">Show 1-tap PhonePe, GPay, Paytm, FamPay cards</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showApps}
                      onChange={(e) => setShowApps(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500"
                    />
                  </label>

                  {/* Manual UTR Verification Toggle */}
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">"Already Paid? Enter UTR" Box</div>
                        <div className="text-[11px] text-slate-500">Allow customers to input 12-digit UTR ref</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableUtr}
                      onChange={(e) => setEnableUtr(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Checkout Design</span>
                  </>
                )}
              </button>

              {savedSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Design saved successfully!</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Real-Time Mobile Phone Mockup Preview (5 Cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="text-center mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Live Real-Time Checkout Preview
            </span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-[340px] mx-auto rounded-[40px] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800">
            {/* Camera notch */}
            <div className="w-28 h-4 bg-slate-950 rounded-full mx-auto mb-2" />

            {/* Inner Phone Screen */}
            <div className="rounded-[30px] overflow-hidden bg-[#070a12] text-slate-100 text-xs shadow-inner min-h-[580px] flex flex-col justify-between relative pb-10 border border-slate-800">
              {/* Header */}
              <div>
                <div className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 px-3.5 py-3 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-white/40 overflow-hidden bg-slate-900 shrink-0">
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-extrabold text-white text-xs leading-tight">{brandName}</div>
                      <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-300 uppercase">
                        <ShieldCheck className="w-3 h-3 text-emerald-300" />
                        <span>{subtitle}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">
                    ✕
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-3 space-y-3">
                  {/* QR Card */}
                  <div className="rounded-2xl bg-[#0e1320] border border-slate-800 p-3.5 text-center space-y-3 shadow-md">
                    <div className="p-2 rounded-2xl bg-white border-2 border-dashed border-purple-500 inline-block mx-auto">
                      <div className="w-36 h-36 bg-slate-100 flex items-center justify-center rounded-lg">
                        <div className="grid grid-cols-4 gap-1 p-2">
                          <div className="w-6 h-6 bg-slate-900 rounded-xs" />
                          <div className="w-6 h-6 bg-slate-900 rounded-xs" />
                          <div className="w-6 h-6 bg-slate-300 rounded-xs" />
                          <div className="w-6 h-6 bg-slate-900 rounded-xs" />
                          <div className="w-6 h-6 bg-slate-300 rounded-xs" />
                          <div className="w-6 h-6 bg-slate-900 rounded-xs" />
                          <div className="w-6 h-6 bg-slate-900 rounded-xs" />
                          <div className="w-6 h-6 bg-slate-300 rounded-xs" />
                        </div>
                      </div>
                    </div>

                    {enableSaveQr && (
                      <div>
                        <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-[10px] inline-flex items-center gap-1.5 shadow-sm">
                          <Download className="w-3 h-3" />
                          <span>Save QR to Gallery</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-2xl font-black text-white">₹ 50.00</div>
                      <div className="text-[9px] font-mono text-slate-400">
                        Transaction ID: ZU8CF7B24B7C929C1E
                      </div>
                    </div>
                  </div>

                  {/* Pay by Apps */}
                  {showApps && (
                    <div className="rounded-xl bg-[#0e1320] border border-slate-800 p-2.5 space-y-2">
                      <div className="text-[9px] font-extrabold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        <span>PAY BY APPS</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-1.5 rounded-lg bg-[#141a29] border border-slate-800 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[8px]">
                            G
                          </div>
                          <div>
                            <div className="font-bold text-[10px] text-white">GPay</div>
                            <div className="text-[8px] text-slate-400">Tap to open</div>
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#141a29] border border-slate-800 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[8px]">
                            Pay
                          </div>
                          <div>
                            <div className="font-bold text-[10px] text-white">Paytm</div>
                            <div className="text-[8px] text-slate-400">Tap to open</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Circular Timer */}
                  <div className="rounded-xl bg-[#0e1320] border border-slate-800 p-2.5 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full border-2 border-teal-400 flex items-center justify-center font-mono font-bold text-[10px] text-white shrink-0">
                      0{sessionTimeout}:00
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase font-mono">
                        SESSION EXPIRES IN
                      </div>
                      <div className="text-[9px] text-slate-300">
                        Complete payment before time runs out
                      </div>
                    </div>
                  </div>

                  {/* UTR Box */}
                  {enableUtr && (
                    <div className="rounded-xl bg-[#0e1320] border border-slate-800 p-2.5 space-y-1.5">
                      <div className="text-[9px] font-extrabold text-teal-400 uppercase flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        <span>ALREADY PAID? ENTER UTR</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="flex-1 px-2 py-1.5 rounded-lg bg-[#070b14] border border-slate-700 text-[10px] text-slate-400 font-mono">
                          UTR / Reference
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-[10px]">
                          Verify
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Contact Us in preview */}
              {contactUrl && (
                <div className="absolute bottom-3 right-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-purple-400/30">
                  <Headphones className="w-3 h-3 text-purple-200" />
                  <span>Contact Us</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
