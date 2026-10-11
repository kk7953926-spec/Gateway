import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  siteSettings: {
    site_name: string;
    site_logo_url: string;
    primary_color: string;
    maintenance_mode: boolean;
  };
  pendingVerificationEmail: string | null;
  pendingUserId: string | null;
  pendingExpiresAt: number | null;
  simulatedCodeNotice: string | null;
  setPendingVerification: (email: string, userId: string, expiresAt?: number, simulatedNotice?: string) => void;
  setAuthSession: (user: User, token: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => void;
  activeTab: 'app' | 'dashboard' | 'admin' | 'docs';
  setActiveTab: (tab: 'app' | 'dashboard' | 'admin' | 'docs') => void;
}

const DEFAULT_MERCHANT: User = {
  id: 'usr_03jhw1sda',
  merchant_id: '1443184937',
  name: 'Kalam Akash',
  email: 'kalam172010@gmail.com',
  phone: '8056317218',
  email_verified: true,
  fampay_gmail: 'kalam172010@gmail.com',
  fampay_upi_id: '8056317218@fam',
  google_app_password: 'bbvnfxkuxhbynvpv',
  imap_connected: true,
  api_key: 'fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e',
  role: 'admin',
  wallet_balance: 0,
  subscription_plan_id: 'VIP Pro Plan',
  subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  subscription_status: 'active',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fampay_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_MERCHANT;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fampay_token') || null;
  });

  const [siteSettings, setSiteSettings] = useState({
    site_name: 'FAMGATEWAY',
    site_logo_url: '',
    primary_color: 'indigo',
    maintenance_mode: false,
  });

  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingExpiresAt, setPendingExpiresAt] = useState<number | null>(null);
  const [simulatedCodeNotice, setSimulatedCodeNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'app' | 'dashboard' | 'admin' | 'docs'>('app');

  const setPendingVerification = (
    email: string,
    userId: string,
    expiresAt?: number,
    simulatedNotice?: string
  ) => {
    setPendingVerificationEmail(email);
    setPendingUserId(userId);
    if (expiresAt) setPendingExpiresAt(expiresAt);
    if (simulatedNotice) setSimulatedCodeNotice(simulatedNotice);
  };

  const setAuthSession = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('fampay_user', JSON.stringify(newUser));
    localStorage.setItem('fampay_token', newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPendingVerificationEmail(null);
    setPendingUserId(null);
    setPendingExpiresAt(null);
    setSimulatedCodeNotice(null);
    localStorage.removeItem('fampay_user');
    localStorage.removeItem('fampay_token');
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('fampay_user', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshSiteSettings = async () => {
    try {
      const res = await fetch('/api/public/site-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSiteSettings(data.settings);
      }
    } catch { /* Ignore */ }
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('fampay_user', JSON.stringify(data.user));
        }
      }
    } catch {
      // Keep session intact
    }
  };

  useEffect(() => {
    refreshSiteSettings();
    if (token) {
      refreshProfile();
    } else {
      // Auto-retrieve active session token for merchant
      fetch('/api/auth/default-session')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.token && data.user) {
            setAuthSession(data.user, data.token);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        siteSettings,
        pendingVerificationEmail,
        pendingUserId,
        pendingExpiresAt,
        simulatedCodeNotice,
        setPendingVerification,
        setAuthSession,
        logout,
        refreshProfile,
        updateUser,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
