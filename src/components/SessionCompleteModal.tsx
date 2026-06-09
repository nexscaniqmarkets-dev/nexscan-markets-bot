import { useEffect, useRef, useState } from 'react';
import { Trophy, TrendingUp, Crosshair, Star, Zap, X, CircleCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface SessionCompleteModalProps {
  isOpen: boolean;
  profit: number;
  wins: number;
  losses: number;
  stake: number;
  currency: string;
  onClose: () => void;
  isAutopilot?: boolean;
}

export function SessionCompleteModal({
  isOpen,
  profit,
  wins,
  losses,
  stake,
  currency,
  onClose,
  isAutopilot = false,
}: SessionCompleteModalProps) {
  const [animate, setAnimate] = useState(false);
  const [particles, setParticles] = useState<{ x: number; y: number; delay: number; size: number }[]>([]);
  const [countdown, setCountdown] = useState(10);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 50);
      setParticles(
        Array.from({ length: 18 }, (_, i) => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: i * 0.1,
          size: Math.random() * 8 + 4,
        }))
      );
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onCloseRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setAnimate(false);
      setCountdown(10);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // ── AUTOPILOT POPUP ────────────────────────────────────────
  if (isAutopilot) {
    return (
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-slate-950 border border-emerald-500/20 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-6"
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 animate-pulse">
              <Trophy className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full tracking-widest font-bold">
              Crosshair Reached
            </span>
            <h2 className="text-xl font-bold font-sans tracking-tight text-slate-100 uppercase">
              Autopilot Session Complete
            </h2>
            <p className="text-xs text-slate-400 max-w-sm">
              Congratulations! The automated scanner and entry system successfully triggered high-EV entries and reached your target net profit criteria.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-4 grid grid-cols-3 gap-2 font-mono">
            <div className="text-center p-2 rounded bg-slate-950/50 border border-slate-900">
              <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Profit</span>
              <span className="text-sm font-black text-emerald-400 block mt-0.5">+${profit.toFixed(2)}</span>
            </div>
            <div className="text-center p-2 rounded bg-slate-950/50 border border-slate-900">
              <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Wins</span>
              <span className="text-sm font-black text-slate-350 block mt-0.5">{wins}</span>
            </div>
            <div className="text-center p-2 rounded bg-slate-950/50 border border-slate-900">
              <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Losses</span>
              <span className="text-sm font-black text-slate-550 block mt-0.5">{losses}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full cursor-pointer py-3 px-6 rounded-xl font-mono text-xs uppercase font-extrabold tracking-widest bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transform active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <CircleCheck className="w-4 h-4" /> DISARM & RESET SESSION
          </button>
        </motion.div>
      </div>
    );
  }

  // ── NORMAL TRADE POPUP ─────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

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
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'][i % 5],
            animationDelay: `${p.delay}s`,
            animationDuration: '1.5s',
            opacity: 0.6,
          }}
        />
      ))}

      {/* Modal */}
      <div className={`relative z-10 w-full max-w-sm mx-auto transition-all duration-500 ${animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'}`}>
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-700/40 rounded-3xl shadow-2xl shadow-indigo-950/60 p-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer z-10">
            <X className="w-4 h-4" />
          </button>

          {/* Trophy */}
          <div className="flex justify-center mb-4 relative z-10">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-950/30">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1 mb-5 relative z-10">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">Session Complete</span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Crosshair Reached! 🎯</h2>
            <p className="text-xs text-slate-400">Your win target has been met. Great trading session!</p>
          </div>

          {/* Profit */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-800/40 rounded-2xl p-5 mb-4 text-center z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Session Profit</span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-black font-mono text-emerald-400 drop-shadow-lg">+${profit.toFixed(2)}</span>
              <span className="text-sm font-mono font-bold text-emerald-600 uppercase">{currency}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-500">{winRate.toFixed(0)}% win rate this session</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5 relative z-10">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Wins</span>
              <span className="text-lg font-black font-mono text-emerald-400">{wins}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Losses</span>
              <span className="text-lg font-black font-mono text-rose-400">{losses}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Stake</span>
              <span className="text-lg font-black font-mono text-indigo-400">${stake}</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onClose}
            className="relative z-10 w-full py-3.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-mono font-bold text-sm rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40"
          >
            <Zap className="w-4 h-4 animate-bounce" />
            START NEW SESSION ({countdown}s)
          </button>
          <p className="text-[10px] text-center text-slate-500 font-mono mt-2 animate-pulse">
            Next optimal setup check will automatically proceed in {countdown}s
          </p>
        </div>
      </div>
    </div>
  );
}
