import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  X,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LiveVisitor } from '../types';

interface LiveVisitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVisitorsModal: React.FC<LiveVisitorsModalProps> = ({ isOpen, onClose }) => {
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [activeCount, setActiveCount] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const fetchLiveVisitors = async () => {
    try {
      const res = await fetch('/api/public/live-visitors');
      if (res.ok) {
        const data = await res.json();
        if (data.visitors) {
          setVisitors(data.visitors);
          setActiveCount(data.activeCount || Math.max(1, data.visitors.length));
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchLiveVisitors();
    const interval = setInterval(fetchLiveVisitors, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <Users className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">Live Active Visitors</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold">
                  {activeCount} Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time stream of users and customers currently browsing your website & checkouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              title={soundEnabled ? 'Mute Alerts' : 'Enable Sound Alerts'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visitor Stream List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
            <span>ACTIVE SESSIONS</span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-purple-600" />
              <span>Live Syncing</span>
            </span>
          </div>

          {visitors.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <Activity className="w-8 h-8 text-purple-600 mx-auto animate-pulse" />
              <div className="font-bold text-slate-800 text-sm">Listening for live visitors...</div>
              <p className="text-xs">When customers open your payment links or website, their live session appears here instantly.</p>
            </div>
          ) : (
            visitors.map((v) => {
              const secondsAgo = Math.max(0, Math.floor((Date.now() - v.lastPing) / 1000));
              return (
                <div
                  key={v.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    v.isCheckout
                      ? 'bg-purple-50/60 border-purple-200 shadow-xs'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          v.device === 'Mobile'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {v.device === 'Mobile' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{v.device} • {v.browser}</span>
                          {v.isCheckout && (
                            <span className="bg-purple-600 text-white text-[10px] px-2 py-0.2 rounded-full font-bold flex items-center gap-1">
                              <ShoppingBag className="w-2.5 h-2.5" />
                              Checkout Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-700 font-semibold">{v.page}</span>
                          <span>•</span>
                          <span>IP: {v.ip}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-mono font-bold text-emerald-600 flex items-center gap-1 justify-end">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{secondsAgo === 0 ? 'Active Now' : `${secondsAgo}s ago`}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ref: {v.referrer || 'Direct'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-purple-600" />
            <span>Telemetry automatically broadcasts customer visits & checkouts.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
