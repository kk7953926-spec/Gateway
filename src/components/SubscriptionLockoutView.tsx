import React from 'react';
import { Lock, Zap, ShieldAlert, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';

interface SubscriptionLockoutViewProps {
  userEmail?: string;
  onUpgrade?: () => void;
  onCheckStatus?: () => void;
}

export const SubscriptionLockoutView: React.FC<SubscriptionLockoutViewProps> = ({
  userEmail,
  onUpgrade,
  onCheckStatus,
}) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Subscription Inactive
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">Account Access Limited</h2>
          <p className="text-slate-400 text-sm">
            Your FamGateway merchant plan or trial period has ended for <span className="text-slate-200 font-medium">{userEmail || 'your account'}</span>.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 text-left text-xs space-y-2">
          <div className="text-slate-300 font-semibold flex items-center">
            <Zap className="w-4 h-4 text-indigo-400 mr-1.5" /> What happens when expired:
          </div>
          <ul className="text-slate-400 space-y-1 list-disc list-inside pl-1">
            <li>API payment creation is paused</li>
            <li>Real-time IMAP Gmail alerts are held</li>
            <li>Instant settlement webhook dispatches are paused</li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={onUpgrade}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 font-bold rounded-xl shadow-lg shadow-indigo-500/25 text-white transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Renew / Upgrade Subscription</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {onCheckStatus && (
            <button
              onClick={onCheckStatus}
              className="w-full py-2.5 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl border border-slate-600/50 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-check Subscription Status
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/50 flex items-center justify-between">
          <span>FamGateway Enterprise</span>
          <span className="text-slate-400">Merchant Support Active</span>
        </div>
      </div>
    </div>
  );
};
