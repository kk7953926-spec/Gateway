import React, { useState } from 'react';
import { Send, X, ExternalLink, Bot, Sparkles } from 'lucide-react';

export const TelegramFloatingButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white space-y-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-y-0.5 space-x-2">
              <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Telegram Bot Gateway</h4>
                <p className="text-[10px] text-slate-400">Instant Automated Payments</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Connect your Telegram Bot to create dynamic UPI orders, auto-verify UTRs, and receive instant payment alerts.
          </p>

          <div className="space-y-1.5 pt-1">
            <a
              href="https://t.me/FamGatewayBot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" /> Launch Telegram Bot <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
            <a
              href="#/integrations"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-400" /> View Integration API Docs
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 bg-gradient-to-tr from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl shadow-xl shadow-sky-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
        title="Telegram Bot Integration"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Send className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        )}
      </button>
    </div>
  );
};
