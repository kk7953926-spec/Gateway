import React, { useState } from 'react';
import { Send, X, ExternalLink, ShieldCheck, MessageCircle } from 'lucide-react';

export const TelegramFloatingButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const telegramChannelUrl = 'https://t.me/fampay_gateway_official';
  const telegramSupportUrl = 'https://t.me/fampay_support_bot';

  return (
    <>
      {/* Floating Action Button (FAB) in Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#229ED9] hover:bg-[#1b8bc2] text-white font-black text-xs shadow-xl shadow-sky-500/35 hover:shadow-sky-500/60 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-sky-300/30"
          title="Official Telegram Channel & 24/7 Support"
        >
          {/* Official Telegram Icon */}
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.17-.03.3z" />
            </svg>
          </div>
          <span className="hidden sm:inline tracking-wide">Telegram Channel</span>
          <span className="sm:hidden">Telegram</span>
        </button>
      </div>

      {/* Telegram Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f1926] border border-sky-900/60 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl relative overflow-hidden">
            {/* Ambient Sky Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#229ED9]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-sky-900/40 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shadow-md shadow-sky-500/30">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.17-.03.3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Fam Pay Telegram</h3>
                  <p className="text-[11px] font-mono text-sky-400">Official Community & Support</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Stay updated with instant UPI settlement alerts, gateway server status, merchant API updates, and 24/7 dedicated technical support.
              </p>

              <div className="space-y-2.5">
                <a
                  href={telegramChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl bg-[#229ED9] hover:bg-[#1b8bc2] text-white font-extrabold text-xs transition-all shadow-lg shadow-sky-500/25 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Send className="w-4 h-4" />
                    <span>Join Official Announcement Channel</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-sky-200 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href={telegramSupportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-sky-500/40 font-bold text-xs transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-sky-400" />
                    <span>Contact 24/7 Support Bot</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              <div className="pt-2 text-center">
                <span className="text-[10px] font-mono text-slate-400">
                  Channel ID: <span className="text-sky-300 font-bold">@fampay_gateway_official</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
