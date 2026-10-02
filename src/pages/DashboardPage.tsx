import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Activity,
  Send,
  Terminal,
  ShieldCheck,
  Zap,
  Key,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GatewayStats, SystemLog } from '../types';

export const DashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<GatewayStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    verificationRequests: 0,
    successfulVerifications: 0,
    failedAttempts: 0,
    apiRequests: 0,
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Test API Console
  const [apiEndpoint, setApiEndpoint] = useState<string>('/api/auth/register');
  const [apiMethod, setApiMethod] = useState<'POST' | 'GET'>('POST');
  const [apiPayload, setApiPayload] = useState<string>(
    JSON.stringify(
      {
        name: 'Test Developer',
        email: 'developer@famgateway.in',
        password: 'Password123!',
      },
      null,
      2
    )
  );
  const [apiResponse, setApiResponse] = useState<string>('Ready to execute API request...');
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'console' | 'health-checks'>('console');

  // Simulation form states
  const [simFrom, setSimFrom] = useState('notifications@fampay.in');
  const [simSubject, setSimSubject] = useState('FamPay Payment Received Alert - ₹100.00');
  const [simBody, setSimBody] = useState('Dear Merchant, You have received a payment of ₹100.00 on your UPI ID kalamakash@fam from customer Alexander. Ref No: fpx-pay-482910, Bank UTR: 427389102381.');
  const [simAmount, setSimAmount] = useState('100.00');
  const [simUtr, setSimUtr] = useState('427389102381');
  const [simRef, setSimRef] = useState('fpx-pay-482910');
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const handleSimPreset = (type: 'fampay' | 'idfc' | 'yesbank' | 'invalid') => {
    setSimResult(null);
    setSimError(null);
    switch (type) {
      case 'fampay':
        setSimFrom('notifications@fampay.in');
        setSimSubject('FamPay Payment Received');
        setSimBody('Payment Successful! ₹100.00 credited to kalamakash@fam. Txn ID: fpx-pay-817293. Bank UTR: 427389102381.');
        setSimAmount('100.00');
        setSimUtr('427389102381');
        setSimRef('fpx-pay-817293');
        break;
      case 'idfc':
        setSimFrom('alerts@idfcfirstbank.com');
        setSimSubject('A/C Credited Alert');
        setSimBody('Dear Customer, your IDFC FIRST Bank A/C XX3910 has been credited with ₹1.00 by UPI Ref: 427389102381. UPI ID: kalamakash@fam.');
        setSimAmount('1.00');
        setSimUtr('427389102381');
        setSimRef('');
        break;
      case 'yesbank':
        setSimFrom('yesbank-upi@yesbank.co.in');
        setSimSubject('UPI Payment Credited');
        setSimBody('YES BANK: Your account has been credited with Rs 500.00 by UPI Ref 427389102381. Ref ID: fpx-pay-482910.');
        setSimAmount('500.00');
        setSimUtr('427389102381');
        setSimRef('fpx-pay-482910');
        break;
      case 'invalid':
        setSimFrom('google-noreply@google.com');
        setSimSubject('Security Alert');
        setSimBody('New sign-in detected on your Google Account kalam172010@gmail.com from a new Linux device.');
        setSimAmount('10.00');
        setSimUtr('');
        setSimRef('');
        break;
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimRunning(true);
    setSimResult(null);
    setSimError(null);

    try {
      const res = await fetch('/api/payment/simulate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: simSubject,
          from: simFrom,
          body: simBody,
          amount: simAmount,
          utr: simUtr,
          transactionRef: simRef,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSimResult(data.simulation);
      } else {
        setSimError(data.error || 'Failed to simulate email parsing.');
      }
    } catch {
      setSimError('Network connection failed.');
    } finally {
      setSimRunning(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/public/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.stats) setStats(data.stats);
      }

      if (token) {
        const logsRes = await fetch('/api/admin/logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (logsRes.ok) {
          const data = await logsRes.json();
          if (data.logs) setLogs(data.logs);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handlePresetSelect = (endpoint: string, method: 'POST' | 'GET', payloadObj: object) => {
    setApiEndpoint(endpoint);
    setApiMethod(method);
    setApiPayload(JSON.stringify(payloadObj, null, 2));
  };

  const handleExecuteConsole = async () => {
    setExecuting(true);
    setApiResponse('Sending request...');
    setApiStatus(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestInit = { method: apiMethod, headers };
      if (apiMethod === 'POST') options.body = apiPayload;

      const startTime = performance.now();
      const res = await fetch(apiEndpoint, options);
      const endTime = performance.now();

      setApiStatus(res.status);
      const resText = await res.text();

      let formattedJson = resText;
      try {
        formattedJson = JSON.stringify(JSON.parse(resText), null, 2);
      } catch {
        // Keep raw
      }

      setApiResponse(`// HTTP Status: ${res.status} (${Math.round(endTime - startTime)}ms)\n` + formattedJson);
      fetchDashboardData();
    } catch (e) {
      setApiResponse(`// Network Error:\n${(e as Error).message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>{typeof window !== 'undefined' ? window.location.origin : 'https://gateway'} Developer Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Analytics & Console
          </h1>
          <p className="text-xs text-slate-600">
            Live telemetric reporting for 16-digit verification code requests, FamPay UPI payments, and API rates
          </p>
        </div>

        {user && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl min-w-[280px] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <Key className="w-3.5 h-3.5 text-amber-500" /> API Bearer Token
              </span>
              <button
                onClick={handleCopyToken}
                className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 font-bold"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-indigo-800 truncate max-w-[260px] bg-white p-2 rounded-lg border border-slate-200">
              {token || 'No active bearer session'}
            </div>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-bold">
            <span>Total API & Verification Requests</span>
            <Activity className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-indigo-950 font-mono tracking-tight">{stats.apiRequests}</div>
          <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Total Requests (Live)</div>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
            <span>Successfully Confirmed Payments</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-950 font-mono tracking-tight">{stats.confirmedPayments || 0}</div>
          <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Confirmed Payments (Success)</div>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
            <span>Failed Verification Attempts</span>
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-rose-950 font-mono tracking-tight">{stats.failedAttempts}</div>
          <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Failed Attempts</div>
        </div>

        <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-purple-800 text-xs font-bold">
            <span>Total Sales Volume / Wallet Renewals</span>
            <QrCode className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-950 font-mono tracking-tight">₹{(stats.totalPaymentAmount || 0).toFixed(2)}</div>
          <div className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Total Renewals</div>
        </div>
      </div>

      {/* Tab selection bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'console'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Developer API Console
        </button>
        <button
          onClick={() => setActiveTab('health-checks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'health-checks'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Ecosystem Health Checks & Simulation
        </button>
      </div>

      {activeTab === 'console' ? (
        /* Interactive Developer Test Console */
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Interactive REST API Test Console
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    LIVE GATEWAY
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Send real API requests directly to FamGateway.in backend endpoints
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() =>
                  handlePresetSelect('/api/auth/register', 'POST', {
                    name: 'Test User',
                    email: `test_${Math.floor(Math.random() * 10000)}@famgateway.in`,
                    password: 'Password123!',
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                + Preset Register
              </button>
              <button
                onClick={() =>
                  handlePresetSelect('/api/auth/verify-email', 'POST', {
                    email: 'test@famgateway.in',
                    code: '4829173056148273',
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                + Preset Verify Code
              </button>
              <button
                onClick={() =>
                  handlePresetSelect('/api/payment/create-qr', 'POST', {
                    upiId: 'alexander@fampay',
                    amount: 500,
                    note: 'FamGateway.in Order',
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                + Preset Create UPI QR
              </button>
            </div>
          </div>

          {/* Console Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">HTTP Method</label>
              <select
                value={apiMethod}
                onChange={(e) => setApiMethod(e.target.value as 'POST' | 'GET')}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>

            <div className="md:col-span-7">
              <label className="block text-xs font-bold text-slate-700 mb-1">Endpoint Path</label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={handleExecuteConsole}
                disabled={executing}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                <span>{executing ? 'Executing...' : 'Execute API'}</span>
              </button>
            </div>
          </div>

          {/* Request & Response */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                JSON Request Body {apiMethod === 'GET' && '(Disabled for GET)'}
              </label>
              <textarea
                rows={8}
                disabled={apiMethod === 'GET'}
                value={apiPayload}
                onChange={(e) => setApiPayload(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-indigo-900 focus:outline-none focus:border-indigo-600 disabled:opacity-40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Live API Response Output</label>
                {apiStatus && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      apiStatus >= 200 && apiStatus < 300
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    HTTP {apiStatus}
                  </span>
                )}
              </div>
              <pre className="w-full h-48 p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-auto whitespace-pre-wrap">
                {apiResponse}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* Ecosystem Health Checks & Simulation Tab */
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Ecosystem Health Checks & Simulation
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 font-bold">
                  SANDBOX
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Test and verify the 'FamPay X' email alert parsing engine in real-time
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => handleSimPreset('fampay')}
                className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 cursor-pointer"
              >
                + FamPay App Preset
              </button>
              <button
                onClick={() => handleSimPreset('idfc')}
                className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 cursor-pointer"
              >
                + IDFC Bank Preset
              </button>
              <button
                onClick={() => handleSimPreset('yesbank')}
                className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 cursor-pointer"
              >
                + YES Bank Preset
              </button>
              <button
                onClick={() => handleSimPreset('invalid')}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 cursor-pointer"
              >
                + Non-Payment Preset
              </button>
            </div>
          </div>

          <form onSubmit={handleRunSimulation} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">From Sender Address</label>
                  <input
                    type="text"
                    required
                    value={simFrom}
                    onChange={(e) => setSimFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Amount (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line</label>
                <input
                  type="text"
                  required
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email HTML / Plain Text Body</label>
                <textarea
                  rows={4}
                  required
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UTR Number (Optional)</label>
                  <input
                    type="text"
                    value={simUtr}
                    onChange={(e) => setSimUtr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Order Ref (Optional)</label>
                  <input
                    type="text"
                    value={simRef}
                    onChange={(e) => setSimRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={simRunning}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Activity className={`w-3.5 h-3.5 ${simRunning ? 'animate-spin' : ''}`} />
                  <span>{simRunning ? 'Simulating...' : 'Run Simulation & Health Check'}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <label className="block text-xs font-bold text-slate-700">Simulation Parser Output</label>
              {simError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {simError}
                </div>
              )}

              {simResult ? (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 text-xs space-y-3 font-mono">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="font-bold text-slate-400">STATUS:</span>
                    {simResult.matched ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-bold">
                        VERIFIED MATCH ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20 font-bold">
                        FAILED MATCH ✗
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ecosystem Recognition:</span>
                      <span className={simResult.parsed.isUpiEcosystem ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {simResult.parsed.isUpiEcosystem ? 'PASSED' : 'SKIPPED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Action Keywords:</span>
                      <span className={simResult.parsed.hasPaymentKeywords ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {simResult.parsed.hasPaymentKeywords ? 'PASSED' : 'SKIPPED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Currency & Amount Match:</span>
                      <span className={simResult.parsed.hasAmountWithCurrency ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {simResult.parsed.hasAmountWithCurrency ? 'PASSED' : 'SKIPPED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Direct UTR Match:</span>
                      <span className={simResult.parsed.hasUtrMatch ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {simResult.parsed.hasUtrMatch ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Extracted Transaction ID:</span>
                      <span className="text-purple-300 font-bold">{simResult.parsed.extractedTxnId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Extracted UTR:</span>
                      <span className="text-purple-300 font-bold">{simResult.parsed.extractedUtr || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-300 leading-relaxed">
                    <strong>Engine Explanation:</strong>
                    <p className="mt-1 text-slate-400">{simResult.explanation}</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center text-slate-400 p-4 space-y-2">
                  <Activity className="w-8 h-8 opacity-25 text-purple-600" />
                  <p className="text-xs font-semibold">Ready to run parsing simulation</p>
                  <p className="text-[10px] max-w-[200px] leading-relaxed">
                    Select a preset or edit the email body content and click 'Run Simulation' to inspect results
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      )}


      {/* Activity Log Stream */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Recent Gateway Activity Stream</h3>
          </div>
          <button
            onClick={fetchDashboardData}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stream</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">IP Address</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? (
                logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-bold text-indigo-700">{log.action}</td>
                    <td className="py-2.5 text-slate-600">{log.ip}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-700 truncate max-w-xs">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No gateway activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
