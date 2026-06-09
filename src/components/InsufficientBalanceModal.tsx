import React from 'react';
import { Wallet, Coins, AlertOctagon, CircleX } from 'lucide-react';
import { motion } from 'motion/react';

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  isDemo: boolean;
  balance: number;
  currency: string;
  stake: number;
  onClose: () => void;
}

export function InsufficientBalanceModal({
  isOpen,
  isDemo,
  balance,
  currency,
  stake,
  onClose
}: InsufficientBalanceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-950 border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-6"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 animate-pulse">
            <Wallet className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-full tracking-widest font-bold">
            Fund Shortfall
          </span>
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-100 uppercase">
            Insufficient Trade Capital
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            Your current account balance cannot cover the required stake amount needed for this trade sequence.
          </p>
        </div>

        {/* Balance Stats */}
        <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-4 grid grid-cols-2 gap-4 font-mono text-left">
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Available Balance</span>
            <span className="text-base font-black text-slate-205 block mt-0.5 text-slate-200">
              ${balance.toFixed(2)} {currency}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Required Stake</span>
            <span className="text-base font-black text-rose-455 block mt-0.5">
              ${stake.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-left bg-amber-500/5 rounded-lg p-3 border border-amber-500/10 leading-normal">
          {isDemo ? (
            <span>💡 <strong>Demo Account Notice:</strong> You can instantly claim a demo balance refresh in the Wallet (Cashier) tab to top up and continue testing.</span>
          ) : (
            <span>🔒 <strong>Real Account Notice:</strong> Please deposit funds into your secure brokerage account, or reduce the entry stake bounds to re-align your capital management rules.</span>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full cursor-pointer py-3 px-6 rounded-xl font-mono text-xs uppercase font-extrabold tracking-widest bg-slate-805 hover:bg-slate-755 text-slate-200 border border-slate-800 transition-all flex items-center justify-center gap-1.5"
        >
          <CircleX className="w-4 h-4 text-rose-500" /> DISMISSS & IDLE BOT
        </button>
      </motion.div>
    </div>
  );
}
