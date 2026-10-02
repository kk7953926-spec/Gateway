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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User, VerificationLog, SmtpConfig, SystemLog, UpiPaymentRecord } from '../types';

export const AdminPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'verifications' | 'payments' | 'smtp' | 'logs' | 'subscriptions'>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<VerificationLog[]>([]);
  const [payments, setPayments] = useState<UpiPaymentRecord[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
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

      const payRes = await fetch('/api/payment/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (payRes.ok) {
        const pData = await payRes.json();
        if (pData.payments) setPayments(pData.payments);
      }

      const setRes = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (setRes.ok) {
        const sData = await setRes.json();
        if (sData.settings) setSettings(sData.settings);
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
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
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

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          host: settings.host,
          port: settings.port,
          user: settings.user,
          pass: smtpPassword || undefined,
          from: settings.from,
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
        setFeedback({ type: 'success', msg: 'SMTP and gateway settings updated successfully.' });
        if (data.settings) setSettings(data.settings);
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

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testEmail: testEmailAddress || user?.email || 'admin@famgateway.in',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', msg: data.error || 'Test email dispatch failed.' });
      } else {
        setFeedback({
          type: 'success',
          msg: `Test 16-digit verification code email sent! (${data.simulated ? 'Simulated Log Mode' : 'Live SMTP'})`,
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
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>https://famgateway.in Administration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">FamGateway.in Admin Panel</h1>
          <p className="text-xs text-slate-600">
            Manage users, inspect verifications, confirm FamPay UPI payments, configure SMTP & rate limits
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 hover:text-slate-900 flex items-center gap-2 transition-all font-bold"
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
          onClick={() => setActiveTab('smtp')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'smtp'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>SMTP & Gateway Rules</span>
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
          <span>Subscription Panels ({plans.length})</span>
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
                      <td className="py-3 text-purple-700 font-bold font-mono">{u.subscription_plan_id || 'None'}</td>
                      <td className="py-3 text-slate-500 font-mono text-[10px]">
                        {u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString() : 'N/A'}
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
                      <td className="py-3 font-bold text-emerald-600">₹{p.amount.toFixed(2)}</td>
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

      {/* Tab 4: SMTP Config */}
      {activeTab === 'smtp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleSaveSettings} className="lg:col-span-8 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>Nodemailer SMTP & Email Credentials</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.host}
                  onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  value={settings.port}
                  onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={settings.user}
                  onChange={(e) => setSettings({ ...settings, user: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={settings.passConfigured ? '••••••••••••' : 'Enter Password'}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </form>

          <div className="lg:col-span-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Send className="w-5 h-5 text-indigo-600" />
              <span>Test Email Dispatch</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Email</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder={user?.email || 'admin@famgateway.in'}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testingEmail}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${testingEmail ? 'animate-spin' : ''}`} />
              <span>Dispatch Test Email</span>
            </button>
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
                        <td className="py-3 font-extrabold text-indigo-700">₹{p.price.toFixed(2)}</td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] transition-colors"
                          >
                            Delete Plan
                          </button>
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
    </div>
  );
};
