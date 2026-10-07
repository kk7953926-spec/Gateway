import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Upload,
  Image as ImageIcon,
  Check,
  Sparkles,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Curated Merchant Profile Photo Album Presets
const AVATAR_ALBUM = [
  {
    id: 'preset-1',
    name: 'Modern Merchant',
    url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&auto=format&fit=crop&q=80',
    tag: 'Business',
  },
  {
    id: 'preset-2',
    name: 'Tech Founder',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    tag: 'Professional',
  },
  {
    id: 'preset-3',
    name: 'Minimalist Store',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    tag: 'Modern',
  },
  {
    id: 'preset-4',
    name: 'Creative Agency',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    tag: 'Creative',
  },
  {
    id: 'preset-5',
    name: 'UPI FinTech Lead',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    tag: 'FinTech',
  },
  {
    id: 'preset-6',
    name: 'Digital Creator',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
    tag: 'Creative',
  },
  {
    id: 'preset-7',
    name: 'Executive Merchant',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    tag: 'Executive',
  },
  {
    id: 'preset-8',
    name: 'Vibrant Gradient',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80',
    tag: 'Design',
  },
];

type SettingsTab =
  | 'Profile Photo & Album'
  | 'Account Details'
  | 'Security';

export const ProfileView: React.FC<{
  onNavigate?: (nav: string) => void;
  initialTab?: SettingsTab;
}> = ({ onNavigate, initialTab }) => {
  const { user, token, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    initialTab || 'Profile Photo & Album'
  );

  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    user?.avatar_url || AVATAR_ALBUM[0].url
  );
  const [customUrl, setCustomUrl] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File Upload handler with instant client-side canvas compression to crisp HD WebP/JPEG
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedPhoto(compressedDataUrl);
          setCustomUrl('');
          setSuccessMsg('Photo uploaded successfully! Click "Save Changes" to apply.');
          setTimeout(() => setSuccessMsg(null), 4000);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          avatar_url: selectedPhoto,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      if (user) {
        updateUser({
          ...user,
          name: name.trim(),
          phone: phone.trim(),
          avatar_url: selectedPhoto,
        });
      }

      setSuccessMsg('Merchant profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile.');
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
            <span>Settings & Merchant Profile</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure gateway settings, merchant branding, and account security.
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
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

      {/* Notifications */}
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
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 flex-wrap">
        {(
          [
            'Profile Photo & Album',
            'Account Details',
            'Security',
          ] as SettingsTab[]
        ).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Profile Photo & Album */}
      {activeTab === 'Profile Photo & Album' && (
        <div className="space-y-6">
          {/* Active Preview Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
              <Camera className="w-4 h-4 text-purple-600" />
              <span>Current Selected Profile Avatar</span>
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="relative">
                <img
                  src={selectedPhoto || user?.avatar_url || AVATAR_ALBUM[0].url}
                  alt="Avatar Preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg shadow-purple-600/10 ring-2 ring-purple-500/20"
                />
                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1.5 rounded-full shadow-md">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="font-extrabold text-slate-900 text-base flex items-center justify-center sm:justify-start gap-2">
                  <span>{name || user?.name}</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-mono px-2 py-0.5 rounded-full font-bold border border-purple-200">
                    Live Avatar
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  This photo represents your merchant brand across the Top Navigation, Sidebar, Merchant Dashboard, and Customer Checkout QR page.
                </p>

                {/* Upload from Device Button */}
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <label className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 cursor-pointer flex items-center gap-2 transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo From Device / Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Curated Album Grid */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Choose from Profile Photo Album</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any photo in the album below to set it as your profile avatar.
                </p>
              </div>
              <span className="text-xs font-mono text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 font-bold">
                {AVATAR_ALBUM.length} Presets Available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {AVATAR_ALBUM.map((item) => {
                const isSelected = selectedPhoto === item.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedPhoto(item.url);
                      setCustomUrl('');
                    }}
                    className={`group relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2.5 text-center ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-600/20'
                        : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-purple-600 text-white p-1 rounded-full shadow-sm">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{item.tag}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom URL Input Option */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                <span>Or Enter Custom Image URL:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/my-avatar.jpg"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    if (e.target.value) setSelectedPhoto(e.target.value);
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Account Details */}
      {activeTab === 'Account Details' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-purple-600" />
            <span>Merchant Profile Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name / Merchant Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kalam Akash"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
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
                  placeholder="1234567890"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Account Email (Verified)</label>
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{user?.email}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Verified Merchant
                </span>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Unique Merchant ID</label>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs font-mono font-extrabold text-purple-900">
                MID: {user?.merchant_id || '1443184937'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Security */}
      {activeTab === 'Security' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Account Security & Gateway Role</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-slate-500 font-semibold">User Role</div>
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
              <div className="text-slate-500 font-semibold">IMAP Auto-Confirmation Listener</div>
              <div className="font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{user?.fampay_gmail || 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Account Logout Action Card */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-800">End Session / Switch Merchant</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Safely sign out of your merchant dashboard across this device.
              </p>
            </div>

            <button
              onClick={() => logout()}
              className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Log Out of Account</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
