import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fampay_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fampay_token') || null;
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
    if (token) {
      refreshProfile();
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
