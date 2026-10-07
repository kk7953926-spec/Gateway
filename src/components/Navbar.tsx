import React from 'react';
import { ShieldCheck, LayoutDashboard, Settings, FileCode2, LogOut, Lock, Globe, Smartphone, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, activeTab, setActiveTab } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo with dynamic website URL */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('app')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-[1px] shadow-md">
              <div className="w-full h-full bg-white rounded-[11px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                FAMGATEWAY
                <span className="text-[10px] font-mono text-indigo-600 font-bold">
                  v2.0
                </span>
              </div>
              <div className="text-[10px] font-mono font-medium text-slate-500 tracking-wider lowercase -mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3 text-indigo-500" />
                <span>{typeof window !== 'undefined' ? window.location.host : 'gateway'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('app')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'app'
                  ? 'bg-white text-indigo-700 font-bold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Auth Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-700 font-bold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Developer Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-white text-indigo-700 font-bold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'docs'
                  ? 'bg-white text-indigo-700 font-bold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>API Docs</span>
            </button>
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                    {user.name}
                    {user.role === 'admin' && (
                      <span className="text-amber-700 text-[10px] font-mono font-bold">
                        · Admin
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">{user.email}</span>
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('app')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Portal Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden flex items-center justify-around bg-slate-50 border-t border-slate-200 py-2 px-1 text-xs">
        <button
          onClick={() => setActiveTab('app')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'app' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Auth</span>
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'admin' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Admin</span>
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'docs' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Docs</span>
        </button>
      </div>
    </header>
  );
};
