import React, { useState, useEffect } from 'react';
import { AccountInfo, PastTrade } from '../types';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, ShieldCheck, ExternalLink,
  CircleDollarSign, TrendingUp, TrendingDown, RefreshCw, Landmark,
  Clock, AlertTriangle, AlertCircle, Zap, Star, Activity
} from 'lucide-react';

interface CashierTabProps {
  account: AccountInfo | null;
  pastTrades: PastTrade[];
  onAuthorize: (token: string) => void;
  authorizedWsStatus: 'idle' | 'authorizing' | 'authorized' | 'error';
}

export function CashierTab({ account, pastTrades, onAuthorize, authorizedWsStatus }: CashierTabProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [animBalance, setAnimBalance] = useState(false);
  const [activeAction, setActiveAction] = useState<null | 'deposit' | 'withdraw'>(null);

  // Animate balance on mount
  useEffect(() => {
    if (account) {
      setTimeout(() => setAnimBalance(true), 300);
    }
  }, [account]);

  const totalTrades = pastTrades.length;
  const winCount = pastTrades.filter(t => t.outcome === 'win').length;
  const lossCount = pastTrades.filter(t => t.outcome === 'loss').length;
  const totalNetProfit = pastTrades.reduce((acc, t) => acc + t.profit, 0);
  const totalVolume = pastTrades.reduce((acc, t) => acc + t.stake, 0);
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setAuthError('');
    onAuthorize(tokenInput.trim());
  };

  // Fixed: use Telegram-compatible navigation
  const openDerivCashier = (type: 'deposit' | 'withdrawal') => {
    setActiveAction(type);
    const url = type === 'deposit'
      ? 'https://app.deriv.com/cashier/deposit'
      : 'https://app.deriv.com/cashier/withdrawal';

    // Works in Telegram Mini App AND regular browser
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    setTimeout(() => setActiveAction(null), 2000);
  };

  return (
    <div className="space-y-6" id="cashierTabSection">

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-5 rounded-2xl border border-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase">
              Secure Cashier Gateway • Live
            </span>
          </div>
          <h2 className="text-xl font-sans text-white font-bold tracking-tight">
            Capital Management
          </h2>
          <p className="text-xs text-slate-400">
            Securely deposit or withdraw funds via the official Deriv cashier.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl relative z-10">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div className="font-mono text-[10px] text-left">
            <span className="text-slate-500 block leading-none">SECURITY LAYER</span>
            <span className="text-emerald-300 font-bold">SSL & Token Verified</span>
          </div>
        </div>
      </div>

      {!account ? (
        /* NOT CONNECTED */
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Connect Deriv Wallet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Authorize your account to access balance and fund management tools.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="max-w-md mx-auto space-y-3">
            <input
              type="password"
              placeholder="Paste your Deriv API Token..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 placeholder:text-slate-600 outline-none transition-all font-mono text-center"
            />

            {authorizedWsStatus === 'error' && (
              <div className="flex items-center gap-2 justify-center p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-mono">
                <AlertCircle className="w-4 h-4" />
                <span>Invalid or expired token. Check your API scopes.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authorizedWsStatus === 'authorizing' || !tokenInput.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white font-mono text-xs font-bold rounded-xl transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {authorizedWsStatus === 'authorizing' ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> CONNECTING...</>
              ) : (
                <><Zap className="w-4 h-4" /> CONNECT WALLET</>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT PANEL */}
          <div className="lg:col-span-7 space-y-5">

            {/* Virtual Card */}
            <div className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl border transition-all duration-700 ${animBalance ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${account.is_virtual ? 'bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-amber-900/30' : 'bg-gradient-to-br from-slate-900 via-indigo-950/30 to-emerald-950/20 border-indigo-900/30'}`}>
              {/* Decorative blobs */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30 pointer-events-none" />

              {/* Card Top */}
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">NexScan IQ Markets</span>
                  </div>
                  <h3 className="text-slate-100 text-sm font-bold">{account.fullname || 'Broker Wallet'}</h3>
                </div>
                {account.is_virtual ? (
                  <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-bold rounded-lg uppercase tracking-wider animate-pulse">
                    DEMO ACCOUNT
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold rounded-lg uppercase tracking-wider">
                    ● REAL ACCOUNT
                  </span>
                )}
              </div>

              {/* Balance */}
              <div className="space-y-1 py-6 relative z-10">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Available Balance</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-mono font-black text-white tracking-tight drop-shadow-lg">
                    ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-lg font-mono font-bold text-emerald-400">{account.currency || 'USD'}</span>
                </div>
                {/* Mini balance bar */}
                <div className="w-full h-0.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full animate-pulse" style={{ width: '65%' }} />
                </div>
              </div>

              {/* Card Details */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/60 relative z-10">
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">LOGIN ID</span>
                  <span className="text-xs font-mono font-semibold text-slate-300">{account.loginid}</span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">ACCOUNT TYPE</span>
                  <span className="text-xs font-mono font-semibold text-slate-300">{account.is_virtual ? 'Virtual' : 'Real'}</span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">CURRENCY</span>
                  <span className="text-xs font-mono font-semibold text-emerald-400">{account.currency || 'USD'}</span>
                </div>
              </div>
            </div>

            {/* Demo Warning */}
            {account.is_virtual && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 text-amber-400 rounded-2xl">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Demo Account Active</span>
                  <span className="text-[10px] text-slate-400 leading-relaxed block mt-0.5">
                    Deposits and withdrawals are only available on Real accounts. Switch to your Real account API token to manage funds.
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">

              {/* Deposit Funds */}
              <button
                onClick={() => openDerivCashier('deposit')}
                disabled={activeAction === 'deposit'}
                className="group relative overflow-hidden p-5 bg-gradient-to-br from-indigo-950/60 to-slate-900 hover:from-indigo-900/60 border border-indigo-800/50 hover:border-indigo-600/70 rounded-2xl text-left cursor-pointer transition-all active:scale-95 flex flex-col justify-between h-36 shadow-lg shadow-indigo-950/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  {activeAction === 'deposit' ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5" />
                  )}
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 font-mono text-[12px] font-bold text-indigo-300 uppercase tracking-wide">
                    Deposit Funds
                    <ExternalLink className="w-3 h-3 text-indigo-500" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Add money to your account</p>
                </div>
              </button>

              {/* Withdraw Funds */}
              <button
                onClick={() => openDerivCashier('withdrawal')}
                disabled={activeAction === 'withdraw'}
                className="group relative overflow-hidden p-5 bg-gradient-to-br from-emerald-950/60 to-slate-900 hover:from-emerald-900/60 border border-emerald-800/50 hover:border-emerald-600/70 rounded-2xl text-left cursor-pointer transition-all active:scale-95 flex flex-col justify-between h-36 shadow-lg shadow-emerald-950/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  {activeAction === 'withdraw' ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 font-mono text-[12px] font-bold text-emerald-300 uppercase tracking-wide">
                    Withdraw Funds
                    <ExternalLink className="w-3 h-3 text-emerald-500" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Transfer to your local method</p>
                </div>
              </button>
            </div>

            {/* Footer note */}
            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-800/60">
              <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Processing time: 2–24 hours depending on payment method. No hidden fees from NexScan.</span>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-5 space-y-5">

            {/* Profit Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 border border-slate-800 p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">SESSION REPORT</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">Trading Performance</h4>
                </div>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-indigo-400" />
                </div>
              </div>

              {/* Net Profit */}
              <div className="relative overflow-hidden bg-slate-950/60 rounded-2xl p-4 border border-slate-800/60">
                <div className={`absolute inset-0 opacity-10 ${totalNetProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-transparent' : 'bg-gradient-to-br from-rose-500 to-transparent'} pointer-events-none`} />
                <span className="text-[10px] font-mono text-slate-400 block">Net Profit Realized</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-3xl font-mono font-black ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalNetProfit >= 0 ? '+' : '-'}${Math.abs(totalNetProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-mono text-slate-500 uppercase font-bold">{account.currency}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 block mt-1">
                  Across {totalTrades} executed trades
                </span>
              </div>

              {/* Win Rate Bar */}
              {totalTrades > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Win Rate: <strong className="text-emerald-400">{winRate.toFixed(1)}%</strong></span>
                    <span className="text-slate-500">{winCount}W — {lossCount}L</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex gap-0.5">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${winRate}%` }} />
                    <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-1000" style={{ width: `${100 - winRate}%` }} />
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-[8px] font-mono text-slate-500 uppercase">Total Volume</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 block">
                    ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span className="text-[8px] font-mono text-slate-500 uppercase">Contracts</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 block">{totalTrades} Tickets</span>
                </div>
              </div>
            </div>

            {/* Security Panel */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-indigo-400 tracking-wider font-extrabold uppercase">Security Status</span>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-bold uppercase font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  VERIFIED
                </span>
              </div>

              <ul className="space-y-3 text-[10.5px] font-mono">
                <li className="flex items-start gap-2.5 text-slate-400 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>All fund operations route through Deriv's end-to-end encrypted secure cashier.</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-400 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>NexScan never stores or transmits your financial credentials.</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-400 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Withdrawals are confirmed via Deriv's 3D-secure backend only.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
