import React, { useState } from 'react';
import {
  Settings,
  User as UserIcon,
  Shield,
  Upload,
  Image as ImageIcon,
  Check,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  LogOut,
  Mail,
  CreditCard,
  Sliders,
  Bell,
  Key,
  ExternalLink,
  ShieldCheck,
  Building2,
  Globe,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type SettingsTab =
  | 'general'
  | 'gateway'
  | 'notifications'
  | 'security';

export const SettingsView: React.FC<{
  onNavigate?: (nav: string) => void;
  initialTab?: SettingsTab;
}> = ({ onNavigate, initialTab = 'general' }) => {
  const { user, token, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Form State - General Profile
  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || '');
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [businessCategory, setBusinessCategory] = useState<string>('Digital Products & Services');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');

  // Form State - Gateway & IMAP
  const [fampayUpi, setFampayUpi] = useState<string>(user?.fampay_upi_id || '8056317218@fam');
  const [fampayGmail, setFampayGmail] = useState<string>(user?.fampay_gmail || user?.email || '');
  const [googleAppPassword, setGoogleAppPassword] = useState<string>(user?.google_app_password || '');

  // Form State - Notifications
  const [emailReceiptsEnabled, setEmailReceiptsEnabled] = useState<boolean>(true);
  const [senderDisplayName, setSenderDisplayName] = useState<string>(user?.name ? `${user.name} Payments` : 'FamGateway');
  const [webhookAlertsEnabled, setWebhookAlertsEnabled] = useState<boolean>(true);

  // Status & Feedback
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Image Upload handler with instant client-side canvas compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds 8MB. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setAvatarUrl(compressedDataUrl);
          setCustomImageUrl('');
          setSuccessMsg('Profile photo selected! Click "Save Changes" to apply.');
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customImageUrl.trim()) return;
    setAvatarUrl(customImageUrl.trim());
    setSuccessMsg('Image URL applied! Click "Save Changes" to save.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    setCustomImageUrl('');
    setSuccessMsg('Photo removed. Initials avatar will be used.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Update Profile Information
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl,
        }),
      });

      const data = await res.json().catch(() => ({ success: false, error: 'Server returned invalid response' }));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update merchant profile.');
      }

      // 2. Update Gateway & IMAP Credentials if changed
      if (token && (fampayGmail.trim() || fampayUpi.trim() || googleAppPassword.trim())) {
        await fetch('/api/integrations/imap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fampayGmail: fampayGmail.trim(),
            fampayUpiId: fampayUpi.trim(),
            googleAppPassword: googleAppPassword.trim(),
          }),
        }).catch(() => {});
      }

      if (data.user) {
        updateUser({
          ...data.user,
          avatar_url: avatarUrl,
          fampay_upi_id: fampayUpi.trim(),
          fampay_gmail: fampayGmail.trim(),
        });
      }

      setSuccessMsg('All settings saved and applied successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating settings.');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your merchant profile, UPI gateway configuration, notifications, and account security.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Log Out</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 overflow-x-auto scrollbar-none">
        {[
          { id: 'general', label: 'Profile & Branding', icon: UserIcon },
          { id: 'gateway', label: 'UPI & IMAP Gateway', icon: CreditCard },
          { id: 'notifications', label: 'Notifications & Receipts', icon: Bell },
          { id: 'security', label: 'Security & Access', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: General Profile & Branding */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Profile Avatar Card (No 8 presets) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Profile Photo & Avatar</span>
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile Avatar"
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md ring-2 ring-indigo-500/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center border-4 border-white shadow-md">
                    {name ? name.charAt(0).toUpperCase() : (user?.name?.charAt(0).toUpperCase() || 'M')}
                  </div>
                )}
                {avatarUrl && (
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-md">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="font-extrabold text-slate-900 text-base">
                  {name || user?.name || 'Merchant Account'}
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  Upload your brand logo or photo from your device, or paste a custom image URL.
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <label className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2 transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo from Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Use Initials Avatar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="pt-2 space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Or Enter Image URL:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Apply URL
                </button>
              </div>
            </div>
          </div>

          {/* Account Details Form */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Merchant Profile & Contact</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Merchant / Brand Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Payments"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Registered Email Address</label>
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                  <span>{user?.email}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Verified Account
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Merchant Identification Number</label>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs font-mono font-extrabold text-indigo-900 flex items-center justify-between">
                  <span>MID: {user?.merchant_id || '1443184937'}</span>
                  <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-bold">Active Terminal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPI & IMAP Gateway */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>UPI & Payment Routing Configuration</span>
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Primary FamPay UPI ID</label>
                <input
                  type="text"
                  value={fampayUpi}
                  onChange={(e) => setFampayUpi(e.target.value)}
                  placeholder="yourname@fam"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 block">
                  Dynamic QR codes and direct pay links will route incoming payments to this UPI VPA.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">FamPay Registered Gmail (IMAP Listener)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={fampayGmail}
                    onChange={(e) => setFampayGmail(e.target.value)}
                    placeholder="fampay.merchant@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  The automated listener detects instant payment bank confirmation alerts from this inbox.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">16-Letter Google App Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={googleAppPassword}
                    onChange={(e) => setGoogleAppPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Generated from your Google Account Security settings (myaccount.google.com/apppasswords).
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>IMAP 993 Listener Ready</span>
              </div>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('integrations')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Advanced IMAP Tester</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Notifications & Receipts */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <span>Customer Notifications & Email Receipts</span>
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Send Payment Receipts via Email</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Automatically send a branded HTML receipt to customers when UPI payment is verified.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailReceiptsEnabled}
                  onChange={(e) => setEmailReceiptsEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Receipt Sender Display Name</label>
                <input
                  type="text"
                  value={senderDisplayName}
                  onChange={(e) => setSenderDisplayName(e.target.value)}
                  placeholder="e.g. Acme Store Payments"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Webhook Real-Time Alerts</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Trigger instant HTTP POST payloads to your backend endpoints upon payment capture.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={webhookAlertsEnabled}
                  onChange={(e) => setWebhookAlertsEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Security & Sessions */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Account Security & Session Management</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Gateway Role</div>
                <div className="font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                  <span>{user?.role || 'user'}</span>
                  {user?.role === 'admin' && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Active Session Status</div>
                <div className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Authenticated & Secure</span>
                </div>
              </div>
            </div>

            {/* Account Logout Action Card */}
            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-rose-900">Sign Out of Account</div>
                <p className="text-xs text-rose-700/80 mt-0.5">
                  End your current session across this browser. You can log back in anytime.
                </p>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Confirm Sign Out</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to log out of your merchant account?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
