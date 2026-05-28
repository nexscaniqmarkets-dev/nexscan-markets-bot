import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Star, Zap, X, RefreshCw } from 'lucide-react';

interface SessionCompleteModalProps {
  isOpen: boolean;
  profit: number;
  wins: number;
  losses: number;
  stake: number;
  currency: string;
  onClose: () => void;
}

export function SessionCompleteModal({
  isOpen,
  profit,
  wins,
  losses,
  stake,
  currency,
  onClose,
}: SessionCompleteModalProps) {
  const [animate, setAnimate] = useState(false);
  const [particles, setParticles] = useState<{ x: number; y: number; delay: number; size: number; color: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 50);
      setParticles(
        Array.from({ length: 20 }, (_, i) => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: i * 0.08,
          size: Math.random() * 10 + 4,
          color: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#a855f7'][i % 6],
        }))
      );
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

      {/* Confetti Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none animate-ping"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: '1.2s',
            opacity: 0.7,
          }}
        />
      ))}

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-sm mx-auto transition-all duration-500 ${
          animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-12'
        }`}
      >
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/50 to-emerald-950/20 border border-indigo-600/40 rounded-3xl shadow-2xl p-6">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-28 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close X */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Trophy */}
          <div className="flex justify-center mb-5 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/25 to-yellow-600/10 border border-amber-500/40 flex items-center justify-center shadow-2xl shadow-amber-950/40">
                <Trophy className="w-12 h-12 text-amber-400 drop-shadow-lg" />
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-lg">
                <Star className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-indigo-500 border-2 border-slate-900 rounded-full animate-bounce" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1.5 mb-5 relative z-10">
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                Auto-Trader Goal Achieved
              </span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
              Target Reached! 🎯
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your win target has been met. Here's your session summary.
            </p>
          </div>

          {/* Profit Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/70 to-slate-950/80 border border-emerald-700/40 rounded-2xl p-5 mb-4 text-center z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-transparent pointer-events-none" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2">
              Session Profit Realized
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-black font-mono text-emerald-400 drop-shadow-lg">
                +${profit.toFixed(2)}
              </span>
              <span className="text-base font-mono font-bold text-emerald-600 uppercase">{currency}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                {winRate.toFixed(0)}% win rate · {totalTrades} contracts executed
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-5 relative z-10">
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

          {/* Reset note */}
          <p className="text-center text-[9px] font-mono text-slate-500 mb-3 relative z-10">
            Clicking OK resets performance stats for a fresh session. Scanner keeps running.
          </p>

          {/* OK Button */}
          <button
            onClick={onClose}
            className="relative z-10 w-full py-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-mono font-black text-base rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-950/50 tracking-wider"
          >
            <RefreshCw className="w-5 h-5" />
            OK — START NEW SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
