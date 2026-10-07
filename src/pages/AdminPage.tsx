import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  Sliders,
  Mail,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
  Lock,
  Search,
  Check,
  QrCode,
  Globe,
  Activity,
  Layout,
  Palette,
  Eye,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  HelpCircle,
  Server,
  Wifi,
  Zap,
  Smartphone,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User, VerificationLog, SmtpConfig, SystemLog, UpiPaymentRecord, LiveVisitor } from '../types';
import { useFirestoreRealtime } from '../hooks/useFirestoreRealtime';
import { MailServerDebugger } from '../components/MailServerDebugger';

export const AdminPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'verifications' | 'payments' | 'smtp' | 'logs' | 'subscriptions' | 'customization' | 'activity' | 'imap_inspector'>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<VerificationLog[]>([]);
  
  // Realtime payments
  const { data: realtimePayments } = useFirestoreRealtime<UpiPaymentRecord>('upi_payments');
  const [payments, setPayments] = useState<UpiPaymentRecord[]>([]);

  useEffect(() => {
    setPayments(realtimePayments);
  }, [realtimePayments]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);

  // IMAP Live Inspector state
  const [merchantsImap, setMerchantsImap] = useState<any[]>([]);
  const [testingMerchantId, setTestingMerchantId] = useState<string | null>(null);
  const [merchantTestResults, setMerchantTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number; totalEmails?: number }>>({});
  const [customImapEmail, setCustomImapEmail] = useState('kalam172010@gmail.com');
  const [customImapPass, setCustomImapPass] = useState('');
  const [customImapHost, setCustomImapHost] = useState('imap.gmail.com');
  const [customImapPort, setCustomImapPort] = useState('993');
  const [testingCustomImap, setTestingCustomImap] = useState(false);
  const [customImapResult, setCustomImapResult] = useState<{ success: boolean; message: string; totalEmails?: number; latencyMs?: number } | null>(null);
  const [daemonStatus, setDaemonStatus] = useState<{ connected: boolean; email: string; host: string; port: number; totalInboxMessages: number; cachedPaymentsCount: number; lastError: string | null; lastPingTime: number; uptimeSeconds: number; lastSyncedAt: string | null } | null>(null);
  
  const [siteSettings, setSiteSettings] = useState({
    site_name: 'FAMGATEWAY',
    site_logo_url: '',
    primary_color: 'indigo',
    announcement: '',
    maintenance_mode: false,
  });

  const [settings, setSettings] = useState<SmtpConfig>({
    host: 'smtp.gmail.com',
    port: 587,
    user: 'notifications@famgateway.in',
    from: '"FamGateway.in Verification" <notifications@famgateway.in>',
    maxAttempts: 5,
    codeExpiryMinutes: 10,
    rateLimitPerMin: 5,
    passConfigured: false,
    sendgridKeyConfigured: false,
  });

  const [senderName, setSenderName] = useState('FamGateway Payments');
  const [senderEmail, setSenderEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [sendgridKey, setSendgridKey] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // Subscription administration states
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDays, setNewPlanDays] = useState('30');
  const [newPlanPrice, setNewPlanPrice] = useState('499');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assignDays, setAssignDays] = useState('30');

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const usersRes = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (uData.users) setUsers(uData.users);
      }

      const verRes = await fetch('/api/admin/verifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (verRes.ok) {
        const vData = await verRes.json();
        if (vData.verifications) setVerifications(vData.verifications);
      }

      /*
      const payRes = await fetch('/api/payment/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (payRes.ok) {
        const pData = await payRes.json();
        if (pData.payments) setPayments(pData.payments);
      }
      */

      const setRes = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (setRes.ok) {
        const sData = await setRes.json();
        if (sData.settings) {
          setSettings(sData.settings);
          if (sData.settings.sender_name) {
            setSenderName(sData.settings.sender_name);
          } else if (sData.settings.from && sData.settings.from.includes('"')) {
            setSenderName(sData.settings.from.split('"')[1]);
          }
          if (sData.settings.sender_email) {
            setSenderEmail(sData.settings.sender_email);
          } else if (sData.settings.user) {
            setSenderEmail(sData.settings.user);
          }
        }
      }

      const plansRes = await fetch('/api/admin/subscription-plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (plansRes.ok) {
        const pData = await plansRes.json();
        if (pData.plans) setPlans(pData.plans);
      }

      const logRes = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (logRes.ok) {
        const lData = await logRes.json();
        if (lData.logs) setLogs(lData.logs);
      }

      const visitorsRes = await fetch('/api/public/live-visitors');
      if (visitorsRes.ok) {
        const vData = await visitorsRes.json();
        if (vData.visitors) setVisitors(vData.visitors);
      }

      const siteRes = await fetch('/api/admin/site-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (siteRes.ok) {
        const sData = await siteRes.json();
        if (sData.settings) setSiteSettings(sData.settings);
      }

      // Fetch IMAP Inspector status
      const imapRes = await fetch('/api/admin/imap-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (imapRes.ok) {
        const imapData = await imapRes.json();
        if (imapData.merchants) setMerchantsImap(imapData.merchants);
        if (imapData.daemon) setDaemonStatus(imapData.daemon);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchImapStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/imap-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.merchants) setMerchantsImap(data.merchants);
        if (data.daemon) setDaemonStatus(data.daemon);
      }
    } catch {
      // Ignore
    }
  };

  const handleTestMerchantImap = async (merchantId: string) => {
    if (!token) return;
    setTestingMerchantId(merchantId);
    try {
      const res = await fetch('/api/admin/test-merchant-imap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: merchantId }),
      });

      const data = await res.json();
      setMerchantTestResults((prev) => ({
        ...prev,
        [merchantId]: {
          success: res.ok && data.success,
          message: data.message || data.error || 'Connection failed',
          latencyMs: data.latencyMs,
          totalEmails: data.totalEmails,
        },
      }));
      fetchImapStatus();
    } catch (err: any) {
      setMerchantTestResults((prev) => ({
        ...prev,
        [merchantId]: {
          success: false,
          message: err.message || 'Network error testing IMAP',
        },
      }));
    } finally {
      setTestingMerchantId(null);
    }
  };

  const handleCustomImapTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setTestingCustomImap(true);
    setCustomImapResult(null);

    try {
      const res = await fetch('/api/admin/test-merchant-imap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: customImapEmail.trim(),
          appPassword: customImapPass.replace(/\s+/g, ''),
          host: customImapHost.trim() || undefined,
          port: Number(customImapPort) || 993,
        }),
      });

      const data = await res.json();
      setCustomImapResult({
        success: res.ok && data.success,
        message: data.message || data.error || 'Connection failed',
        totalEmails: data.totalEmails,
        latencyMs: data.latencyMs,
      });
    } catch (err: any) {
      setCustomImapResult({
        success: false,
        message: err.message || 'Network error connecting to IMAP server',
      });
    } finally {
      setTestingCustomImap(false);
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingSettings(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(siteSettings),
      });
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Site customization saved successfully!' });
        fetchAdminData();
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to save site settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTogglePlan = async (planId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/subscription-plans/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Plan status toggled.' });
        fetchAdminData();
      }
    } catch { /* Ignore */ }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleConfirmPaymentManual = async (paymentId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/payment/verify-email-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Payment verified and confirmed by admin.' });
        fetchAdminData();
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to confirm payment.' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingSettings(true);
    setFeedback(null);

    const effectiveName = senderName.trim() || 'FamGateway Payments';
    const effectiveEmail = senderEmail.trim() || settings.user || '';
    const calculatedFrom = `"${effectiveName}" <${effectiveEmail}>`;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          host: settings.host || 'smtp.gmail.com',
          port: settings.port || 465,
          user: effectiveEmail,
          sender_name: effectiveName,
          sender_email: effectiveEmail,
          from: calculatedFrom,
          pass: smtpPassword || undefined,
          sendgridKey: sendgridKey || undefined,
          maxAttempts: settings.maxAttempts,
          codeExpiryMinutes: settings.codeExpiryMinutes,
          rateLimitPerMin: settings.rateLimitPerMin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', msg: data.error || 'Failed to update settings.' });
      } else {
        setFeedback({ type: 'success', msg: 'Sender Email & Name saved successfully in real time!' });
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.sender_name) setSenderName(data.settings.sender_name);
          if (data.settings.sender_email) setSenderEmail(data.settings.sender_email);
        }
        setSmtpPassword('');
        setSendgridKey('');
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error saving settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!token) return;
    setTestingEmail(true);
    setFeedback(null);

    const target = testEmailAddress.trim() || senderEmail.trim() || user?.email || 'kalam172010@gmail.com';

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testEmail: target,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', msg: data.error || 'Test email dispatch failed.' });
      } else if (data.simulated) {
        setFeedback({
          type: 'error',
          msg: `SMTP Notice: Email simulated. Please save your 16-character Google App Password in the form on the left.`,
        });
      } else {
        setFeedback({
          type: 'success',
          msg: `Live Payment Receipt Email sent successfully to ${target}! Check your inbox.`,
        });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error sending test email.' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPlanName) return;
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/subscription-plans/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPlanName,
          durationDays: Number(newPlanDays),
          price: Number(newPlanPrice),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', msg: data.message || 'Plan created!' });
        setNewPlanName('');
        fetchAdminData();
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to create plan.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error.' });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!token) return;
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/subscription-plans/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', msg: 'Subscription plan deleted.' });
        fetchAdminData();
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to delete plan.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error.' });
    }
  };

  const handleAssignSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUserId || !selectedPlanId) return;
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users/assign-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          planId: selectedPlanId,
          durationDays: Number(assignDays),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', msg: 'Plan assigned to user!' });
        setSelectedUserId('');
        setSelectedPlanId('');
        fetchAdminData();
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Failed to assign plan.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error.' });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>Admin Console · {typeof window !== 'undefined' ? window.location.host : 'famgateway.in'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin Command Center</h1>
          <p className="text-xs text-slate-500">
            Manage merchants, inspect verifications, monitor live IMAP socket health, and configure system rules.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-800 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'verifications'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>16-Digit Verifications ({verifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'payments'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>UPI Payments ({payments.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('imap_inspector');
            fetchImapStatus();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'imap_inspector'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>IMAP Live Inspector ({merchantsImap.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'smtp'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Sender Email & Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('customization')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'customization'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Site Customization</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'activity'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Activity ({visitors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Security Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'subscriptions'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Subscription Plans ({plans.length})</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Tab 1: User Directory */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Registered User Directory</span>
            </h3>

            <div className="relative w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-3">User ID</th>
                  <th className="pb-3">Full Name</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">FamPay UPI VPA</th>
                  <th className="pb-3">Wallet Balance</th>
                  <th className="pb-3">Sub Plan</th>
                  <th className="pb-3">Sub Expiry</th>
                  <th className="pb-3">Account Role</th>
                  <th className="pb-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 text-slate-500">{u.id}</td>
                      <td className="py-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="py-3 text-indigo-700">{u.email}</td>
                      <td className="py-3 text-slate-700 font-mono">{u.fampay_upi_id || 'Not configured'}</td>
                      <td className="py-3 font-bold text-emerald-600">₹{(u.wallet_balance || 0).toFixed(2)}</td>
                      <td className="py-3 text-purple-700 font-bold font-mono">
                        {u.subscription_plan_id || 'Free Trial'}
                      </td>
                      <td className="py-3 font-mono text-[10px]">
                        <div className="flex flex-col gap-1">
                          <span className={`font-bold ${new Date(u.subscription_expires_at || 0) > new Date() ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString() : 'N/A'}
                          </span>
                          <input
                            type="date"
                            defaultValue={u.subscription_expires_at ? new Date(u.subscription_expires_at).toISOString().slice(0, 10) : ''}
                            onChange={async (e) => {
                              if (!e.target.value) return;
                              try {
                                const res = await fetch('/api/admin/users/assign-subscription', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    userId: u.id,
                                    expiryDate: e.target.value,
                                    status: 'active',
                                  }),
                                });
                                if (res.ok) {
                                  setFeedback({ type: 'success', msg: `Updated subscription expiry for ${u.name}` });
                                  fetchAdminData();
                                }
                              } catch {
                                setFeedback({ type: 'error', msg: 'Failed to update subscription date.' });
                              }
                            }}
                            className="px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-[10px]"
                          />
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[10px]">
                        <select
                          value={u.role || 'user'}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            try {
                              const res = await fetch('/api/admin/users/update-role', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  userId: u.id,
                                  role: newRole,
                                }),
                              });
                              if (res.ok) {
                                setFeedback({ type: 'success', msg: `Updated account role for ${u.name} to ${newRole.toUpperCase()}` });
                                fetchAdminData();
                              }
                            } catch {
                              setFeedback({ type: 'error', msg: 'Failed to update account role.' });
                            }
                          }}
                          className={`px-2 py-1 rounded border font-bold text-[10px] cursor-pointer ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="user">User (Merchant)</option>
                          <option value="admin">Administrator (Admin)</option>
                        </select>
                      </td>
                      <td className="py-3">
                        {u.email_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3" /> VERIFIED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            UNVERIFIED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No users match your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Verifications */}
      {activeTab === 'verifications' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            <span>16-Digit Verification Code Audit Trail</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-3">Verification ID</th>
                  <th className="pb-3">Recipient Email</th>
                  <th className="pb-3">Code Hash (SHA-256)</th>
                  <th className="pb-3">Attempts</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifications.length > 0 ? (
                  verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 text-slate-500">{v.id}</td>
                      <td className="py-3 font-semibold text-slate-900">{v.user_email}</td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">{v.code_hash}</td>
                      <td className="py-3 font-bold text-indigo-700">{v.attempts} / {v.max_attempts}</td>
                      <td className="py-3">
                        {v.used ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            USED / VERIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ACTIVE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No 16-digit verification records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: UPI Payments */}
      {activeTab === 'payments' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>FamPay UPI Payment Transactions Directory</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-3">Transaction Ref</th>
                  <th className="pb-3">User Email</th>
                  <th className="pb-3">FamPay UPI VPA</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-bold text-indigo-700">{p.transaction_ref}</td>
                      <td className="py-3 text-slate-700">{p.user_email}</td>
                      <td className="py-3 text-slate-700">{p.upi_id}</td>
                      <td className="py-3 font-bold text-emerald-600">₹{(Number(p?.amount) || 0).toFixed(2)}</td>
                      <td className="py-3">
                        {p.status === 'CONFIRMED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            CONFIRMED ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {p.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => handleConfirmPaymentManual(p.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px]"
                          >
                            Verify Email Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No FamPay UPI payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: SMTP / Sender Email Config */}
      {activeTab === 'smtp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleSaveSettings} className="lg:col-span-8 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <span>Sender Email & Payment Confirmation Setup</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure the official email address from which automated payment confirmation receipts (Amount, Transaction ID, Bank UTR) are sent to customers in real time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. FamGateway Payments or Your Brand Name"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Recipient sees this branding name in their email inbox.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sender Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. kalam172010@gmail.com or notifications@domain.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Payment confirmation emails will be sent FROM this address.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  16-Digit Google App Password / SMTP Password
                </label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={settings.passConfigured ? '•••••••••••• (Configured & Active)' : 'Enter 16-character App Password'}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">For Gmail, create an App Password under Google Account Security.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host & Port</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={settings.host}
                    onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                  <input
                    type="number"
                    value={settings.port}
                    onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value, 10) })}
                    placeholder="465"
                    className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default: smtp.gmail.com (Port 465 SSL or 587 TLS)</span>
              </div>
            </div>

            {/* Live Header Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Live Sender Preview:
              </div>
              <div className="font-mono text-indigo-900 font-bold text-[11px] break-all">
                From: "{senderName || 'FamGateway Payments'}" &lt;{senderEmail || settings.user || 'kalam172010@gmail.com'}&gt;
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Saving Real-Time...' : 'Save Sender Email in Real-Time'}</span>
              </button>
            </div>
          </form>

          <div className="lg:col-span-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Send className="w-5 h-5 text-indigo-600" />
              <span>Test Payment Receipt Email</span>
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Test sending an actual payment receipt with <strong>Amount (₹250.00)</strong>, <strong>Transaction ID</strong>, and <strong>Bank UTR Number</strong> to verify delivery.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Send Test Email To</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder={user?.email || 'yourname@gmail.com'}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testingEmail}
              className="w-full py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 border border-indigo-200 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send className={`w-4 h-4 ${testingEmail ? 'animate-spin' : ''}`} />
              <span>{testingEmail ? 'Dispatching Test...' : 'Send Test Payment Receipt'}</span>
            </button>

            {/* Google App Password Guide */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-2 text-[11px]">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>How to use ANY Gmail as Sender Email:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-amber-900 leading-relaxed">
                <li>Go to your Google Account: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="font-bold underline text-indigo-600">Security Settings</a>.</li>
                <li>Turn <strong>ON</strong> 2-Step Verification.</li>
                <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="font-bold underline text-indigo-600">App Passwords</a>.</li>
                <li>Enter App Name: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">FamGateway</code> and click Create.</li>
                <li>Copy the <strong>16-letter App Password</strong> and paste it in the form above.</li>
                <li>Enter your Gmail in <strong>Sender Email Address</strong> and click <strong>Save</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Logs */}
      {activeTab === 'logs' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Full Security Audit Event Log</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action Event</th>
                  <th className="pb-3">Client IP</th>
                  <th className="pb-3">User Email</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length > 0 ? (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-bold text-indigo-700">{l.action}</td>
                      <td className="py-2.5 text-slate-600">{l.ip}</td>
                      <td className="py-2.5 text-slate-700">{l.user_email || 'N/A'}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-700 max-w-xs truncate">{l.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No security audit logs available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Subscription Panels */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create subscription plan */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Create Subscription Plan</span>
              </h3>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="e.g. VIP Gold Plan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Validity (Days)</label>
                    <input
                      type="number"
                      required
                      value={newPlanDays}
                      onChange={(e) => setNewPlanDays(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price (INR)</label>
                    <input
                      type="number"
                      required
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      placeholder="e.g. 499"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md"
                >
                  Create Plan
                </button>
              </form>
            </div>

            {/* Assign subscription to user */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Assign Plan to Merchant Account</span>
              </h3>

              <form onSubmit={handleAssignSubscription} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select User / Merchant</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="">-- Choose User --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Subscription Plan</label>
                    <select
                      required
                      value={selectedPlanId}
                      onChange={(e) => {
                        setSelectedPlanId(e.target.value);
                        const selected = plans.find((p) => p.id === e.target.value);
                        if (selected) setAssignDays(selected.duration_days.toString());
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                    >
                      <option value="">-- Choose Plan --</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Override Validity (Days)</label>
                    <input
                      type="number"
                      required
                      value={assignDays}
                      onChange={(e) => setAssignDays(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all shadow-md"
                >
                  Activate & Renew Subscription
                </button>
              </form>
            </div>
          </div>

          {/* List of active plans */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Active Subscription Plans Directory</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="pb-3">Plan ID</th>
                    <th className="pb-3">Plan Name</th>
                    <th className="pb-3">Duration Days</th>
                    <th className="pb-3">Price (INR)</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.length > 0 ? (
                    plans.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 text-slate-500">{p.id}</td>
                        <td className="py-3 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-3 text-slate-700">{p.duration_days} Days</td>
                        <td className="py-3 font-extrabold text-indigo-700">₹{(Number(p?.price) || 0).toFixed(2)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTogglePlan(p.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                p.status === 'ACTIVE'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                              }`}
                              title={p.status === 'ACTIVE' ? 'Deactivate Plan' : 'Activate Plan'}
                            >
                              {p.status === 'ACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeletePlan(p.id)}
                              className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Delete Plan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No subscription plans found. Add one above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Customization */}
      {activeTab === 'customization' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSiteSettings} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" />
                <span>Global Site Customization</span>
              </h3>
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save All Changes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Platform Name</label>
                  <input
                    type="text"
                    value={siteSettings.site_name}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Platform Logo URL</label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={siteSettings.site_logo_url}
                      onChange={(e) => setSiteSettings({ ...siteSettings, site_logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600 focus:outline-none"
                    />
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                      {siteSettings.site_logo_url ? (
                        <img src={siteSettings.site_logo_url} className="w-full h-full object-contain" alt="Preview" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-3">Logo Gallery (Quick Select)</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      'https://cdn-icons-png.flaticon.com/512/5968/5968260.png',
                      'https://cdn-icons-png.flaticon.com/512/1150/1150592.png',
                      'https://cdn-icons-png.flaticon.com/512/2111/2111615.png',
                      'https://cdn-icons-png.flaticon.com/512/732/732200.png',
                    ].map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSiteSettings({ ...siteSettings, site_logo_url: url })}
                        className={`p-2 rounded-xl border-2 transition-all hover:scale-105 ${
                          siteSettings.site_logo_url === url ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <img src={url} className="w-full h-8 object-contain mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase">Live Preview</h4>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black overflow-hidden shadow-indigo-200 shadow-lg">
                      {siteSettings.site_logo_url ? <img src={siteSettings.site_logo_url} className="w-full h-full object-cover" /> : siteSettings.site_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">{siteSettings.site_name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise Gateway</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">Maintenance Mode</div>
                    <div className="text-[10px] text-slate-500">Temporarily disable merchant access</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSiteSettings({ ...siteSettings, maintenance_mode: !siteSettings.maintenance_mode })}
                    className={`p-1.5 rounded-full transition-colors ${siteSettings.maintenance_mode ? 'text-rose-600' : 'text-slate-300'}`}
                  >
                    {siteSettings.maintenance_mode ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab 9: IMAP Live Health Inspector & Mail Server Debugger */}
      {activeTab === 'imap_inspector' && (
        <div className="space-y-6">
          {/* Real-time MailServerDebugger Component */}
          <MailServerDebugger />

          {/* Header & Live Status Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Merchants</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{merchantsImap.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Monitored Accounts</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Configured IMAP</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {merchantsImap.filter((m) => m.has_app_password).length}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>App Passwords Active</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">24/7 Warm Socket Daemon</div>
              <div className={`text-xl font-bold font-mono mt-1.5 flex items-center gap-2 ${daemonStatus?.connected ? 'text-emerald-600' : 'text-indigo-600'}`}>
                <Activity className={`w-4 h-4 ${daemonStatus?.connected ? 'text-emerald-600' : 'text-indigo-600'} animate-pulse`} />
                <span>{daemonStatus?.connected ? 'CONNECTED' : 'ONLINE 24/7'}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {daemonStatus?.cachedPaymentsCount !== undefined ? `${daemonStatus.cachedPaymentsCount} Alerts Cached` : 'Heartbeat Every 5s'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">INBOX Stream Total</div>
              <div className="text-2xl font-bold font-mono text-indigo-900 mt-1">
                {daemonStatus?.totalInboxMessages ? `${daemonStatus.totalInboxMessages}` : '993 (SSL/TLS)'}
              </div>
              <div className="text-[11px] font-mono text-indigo-600 mt-1 truncate">
                {daemonStatus?.email || 'imap.gmail.com:993'}
              </div>
            </div>
          </div>

          {/* Merchants Live IMAP Table */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-600" />
                  <span>Merchant IMAP Live Connectivity Status</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time status of merchant email listeners. Click "Test Connection" to perform an instant live socket test.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchImapStatus}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="pb-3">Merchant</th>
                    <th className="pb-3">FamPay / Gmail Account</th>
                    <th className="pb-3">UPI ID</th>
                    <th className="pb-3">Server & Port</th>
                    <th className="pb-3">App Password</th>
                    <th className="pb-3">Live Status</th>
                    <th className="pb-3">Live Socket Test</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {merchantsImap.length > 0 ? (
                    merchantsImap.map((m) => {
                      const testRes = merchantTestResults[m.id];
                      const isTesting = testingMerchantId === m.id;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3">
                            <div className="font-bold text-slate-900">{m.name || 'Merchant'}</div>
                            <div className="text-[10px] text-slate-400">{m.id}</div>
                          </td>
                          <td className="py-3 text-indigo-700 font-semibold">{m.fampay_gmail || m.email}</td>
                          <td className="py-3 text-slate-700 font-bold">{m.fampay_upi_id}</td>
                          <td className="py-3 text-slate-500 text-[11px]">{m.imap_host}:{m.imap_port}</td>
                          <td className="py-3">
                            {m.has_app_password ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Configured</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                <span>Missing Pass</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            {testRes ? (
                              testRes.success ? (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                    <Wifi className="w-3 h-3 text-emerald-600" />
                                    <span>ONLINE ({testRes.latencyMs}ms)</span>
                                  </span>
                                  <div className="text-[9px] text-slate-500">INBOX: {testRes.totalEmails || 0} msgs</div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    <span>FAILED</span>
                                  </span>
                                  <div className="text-[9px] text-rose-600 max-w-xs truncate" title={testRes.message}>
                                    {testRes.message}
                                  </div>
                                </div>
                              )
                            ) : m.has_app_password ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
                                <Activity className="w-3 h-3 text-indigo-600" />
                                <span>Ready / Listening</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Unconfigured
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => handleTestMerchantImap(m.id)}
                              disabled={isTesting || !m.has_app_password}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                            >
                              <Zap className={`w-3.5 h-3.5 text-indigo-600 ${isTesting ? 'animate-spin' : ''}`} />
                              <span>{isTesting ? 'Testing Socket...' : 'Test Connection'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No merchants found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick On-Demand IMAP Diagnostic Testing Console */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live On-Demand IMAP Socket Tester</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test direct Google Mail IMAP authentication and INBOX message retrieval in real-time.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCustomImapTest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Gmail Address</label>
                  <input
                    type="email"
                    required
                    value={customImapEmail}
                    onChange={(e) => setCustomImapEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">16-Digit Google App Password</label>
                  <input
                    type="password"
                    required
                    value={customImapPass}
                    onChange={(e) => setCustomImapPass(e.target.value)}
                    placeholder="e.g. abcd efgh ijkl mnop"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">IMAP Host</label>
                  <input
                    type="text"
                    value={customImapHost}
                    onChange={(e) => setCustomImapHost(e.target.value)}
                    placeholder="imap.gmail.com"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">IMAP Port (SSL)</label>
                  <input
                    type="number"
                    value={customImapPort}
                    onChange={(e) => setCustomImapPort(e.target.value)}
                    placeholder="993"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={testingCustomImap}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${testingCustomImap ? 'animate-spin' : ''}`} />
                  <span>{testingCustomImap ? 'Connecting to Mail Server...' : 'Run Live Diagnostic Test'}</span>
                </button>
              </div>
            </form>

            {/* Test Result Box */}
            {customImapResult && (
              <div
                className={`p-4 rounded-2xl border text-xs font-mono space-y-1.5 animate-in fade-in ${
                  customImapResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {customImapResult.success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>IMAP Connection SUCCESSFUL! ✓</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                      <span>IMAP Connection FAILED ✕</span>
                    </>
                  )}
                </div>
                <div>{customImapResult.message}</div>
                {customImapResult.success && (
                  <div className="text-[11px] text-emerald-300 flex items-center gap-4 pt-1">
                    <span>INBOX Total Messages: <strong>{customImapResult.totalEmails}</strong></span>
                    <span>•</span>
                    <span>Response Latency: <strong>{customImapResult.latencyMs}ms</strong></span>
                    <span>•</span>
                    <span>Real-Time Alert Sniffer: <strong>ACTIVE</strong></span>
                  </div>
                )}
                {!customImapResult.success && (
                  <div className="text-[11px] text-rose-300 pt-1 leading-relaxed">
                    💡 <strong>Fix:</strong> Ensure you are using a 16-letter App Password from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-white">myaccount.google.com/apppasswords</a> and that IMAP is enabled in your Gmail settings.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 8: Live Activity */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-[2rem] bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Visitors</div>
              <div className="text-3xl font-black text-slate-900 mt-1">{visitors.length}</div>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-time tracking</span>
              </div>
            </div>
            <div className="p-5 rounded-[2rem] bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checkouts Active</div>
              <div className="text-3xl font-black text-indigo-600 mt-1">
                {visitors.filter(v => v.isCheckout).length}
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">Ready for conversion</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Live Visitor Stream</h3>
            <div className="space-y-2">
              {visitors.length > 0 ? visitors.map((v) => (
                <div key={v.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${Date.now() - v.lastPing < 10000 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        {v.ip}
                        {v.isCheckout && <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black">CHECKOUT</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{v.page}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-700">{v.browser} on {v.device}</div>
                    <div className="text-[9px] text-slate-400">Joined {new Date(v.joinedAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">No active users currently browsing.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
