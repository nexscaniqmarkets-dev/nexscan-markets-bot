import { useEffect, useRef, useState } from 'react';
import { ShieldAlert, TrendingDown, AlertTriangle, RefreshCw, X } from 'lucide-react';

interface SessionLostModalProps {
  isOpen: boolean;
  profit: number;
  wins: number;
  losses: number;
  stake: number;
  currency: string;
  onClose: () => void;
}

export function SessionLostModal({
  isOpen,
  profit,
  wins,
  losses,
  stake,
  currency,
  onClose,
}: SessionLostModalProps) {
  const [animate, setAnimate] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 50);
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />

      {/* Modal */}
      <div className={`relative z-10 w-full max-w-sm mx-auto transition-all duration-500 ${animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-12'}`}>
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-rose-950/30 to-slate-900 border border-rose-700/40 rounded-3xl shadow-2xl p-6">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-28 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Close X */}
          <button
            onClick={() => onCloseRef.current()}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Shield Icon */}
          <div className="flex justify-center mb-5 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500/20 to-rose-900/10 border border-rose-500/40 flex items-center justify-center shadow-2xl shadow-rose-950/40">
                <ShieldAlert className="w-12 h-12 text-rose-400 drop-shadow-lg" />
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1.5 mb-5 relative z-10">
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400 uppercase">
                Capital Protection Triggered
              </span>
              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
              Session Stopped 🛡️
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              5 consecutive losses detected. Bot stopped to protect your capital.
            </p>
          </div>

          {/* Loss Summary Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-950/60 to-slate-950/80 border border-rose-700/30 rounded-2xl p-5 mb-4 text-center z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2">
              Net Session Result
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-black font-mono text-rose-400 drop-shadow-lg">
                {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
              </span>
              <span className="text-base font-mono font-bold text-rose-600 uppercase">{currency}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-mono text-rose-500 font-semibold">
                {winRate.toFixed(0)}% win rate · {totalTrades} contracts executed
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-4 relative z-10">
            <div className="bg-slate-950/70 border border-emerald-900/40 rounded-xl p-3 text-center">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block mb-1">WINS</span>
              <span className="text-2xl font-black font-mono text-emerald-400">{wins}</span>
            </div>
            <div className="bg-slate-950/70 border border-rose-900/40 rounded-xl p-3 text-center">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block mb-1">LOSSES</span>
              <span className="text-2xl font-black font-mono text-rose-400">{losses}</span>
            </div>
            <div className="bg-slate-950/70 border border-indigo-900/40 rounded-xl p-3 text-center">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block mb-1">STAKE</span>
              <span className="text-2xl font-black font-mono text-indigo-400">${stake}</span>
            </div>
          </div>

          {/* Advice */}
          <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-4 relative z-10">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono text-amber-300/80 leading-relaxed">
              Take a break before starting a new session. Review market conditions before trading again.
            </p>
          </div>

          {/* Reset note */}
          <p className="text-center text-[9px] font-mono text-slate-500 mb-3 relative z-10">
            Clicking OK resets performance stats for a fresh session. Scanner keeps running.
          </p>

          {/* OK Button */}
          <button
            onClick={() => onCloseRef.current()}
            className="relative z-10 w-full py-4 bg-gradient-to-r from-rose-700 to-slate-700 hover:from-rose-600 hover:to-slate-600 text-white font-mono font-black text-base rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 shadow-xl shadow-rose-950/50 tracking-wider"
          >
            <RefreshCw className="w-5 h-5" />
            OK — START NEW SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
