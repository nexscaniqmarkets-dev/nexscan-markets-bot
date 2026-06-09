import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Zap, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdContainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdContainer({ isOpen, onClose }: AdContainerProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-950 border border-amber-500/25 rounded-2xl shadow-2xl overflow-hidden relative"
      >
        {/* Skip button top-right */}
        <button
          onClick={countdown === 0 ? onClose : undefined}
          disabled={countdown > 0}
          className={`absolute top-4 right-4 p-2 rounded-full border transition-all ${
            countdown === 0
              ? 'bg-slate-900 border-slate-700 text-slate-350 hover:text-white cursor-pointer hover:bg-slate-800'
              : 'bg-slate-950/50 border-slate-900 text-slate-600 cursor-not-allowed'
          }`}
        >
          {countdown > 0 ? (
            <span className="text-[10px] font-mono px-1.5">{countdown}s</span>
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>

        <div className="p-8 space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[9.5px] uppercase tracking-widest rounded-full leading-none font-bold">
              <Star className="w-3 h-3 fill-amber-400/20" /> SPONSORED PROMOTIONAL INSTRUCTION
            </div>
            <h2 className="text-xl md:text-2xl font-sans font-black tracking-tight text-slate-100 uppercase mt-2">
              UPGRADE TO <span className="text-amber-400">NEXSCAN IQ PREMIUM</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-sm">
              Unlock the core potential of the neural-network digitized trend scanner. Bypass delay brackets and run multiple parallel sessions seamlessly.
            </p>
          </div>

          {/* Core Premium Highlights */}
          <div className="space-y-3 font-sans">
            <div className="flex items-start gap-3 p-3 bg-slate-900/40 border border-slate-900 rounded-xl">
              <Zap className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">0.2s Real-Time Deep Tick Scanning</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Maximize speed and reduce slippage bracket issues. Gain millisecond advantage on DIGITOVER barrier transitions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-900/40 border border-slate-900 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Full Multi-Asset Concurrent Autopilot</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Watch, analyze, and automate entry points across up to 10 Volatility Indices at the same time with instant automatic pair-swapping.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onClose}
              className="w-full cursor-pointer py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-black tracking-widest bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transition-all text-center"
            >
              🚀 UPGRADE ACCOUNT NOW
            </button>
            <button
              onClick={countdown === 0 ? onClose : undefined}
              disabled={countdown > 0}
              className={`w-full py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-extrabold tracking-widest border transition-all text-center ${
                countdown === 0
                  ? 'bg-transparent border-slate-800 text-slate-400 hover:text-white cursor-pointer hover:bg-slate-900'
                  : 'bg-transparent border-slate-950 text-slate-600 cursor-not-allowed'
              }`}
            >
              {countdown > 0 ? `SKIP IN ${countdown}s` : 'DISMISS ADVERT'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
