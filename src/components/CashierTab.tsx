import React, { useState } from 'react';
import { AccountInfo, PastTrade } from '../types';
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, ShieldCheck, ExternalLink, 
  CircleDollarSign, TrendingUp, TrendingDown, RefreshCw, Landmark, Clock, AlertTriangle, AlertCircle
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

  // Settle calculations
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

  const openDerivCashier = () => {
    // Official Deriv Cashier Withdrawal link
    window.open('https://app.deriv.com/cashier/withdrawal', '_blank', 'noopener,noreferrer');
  };

  const openDerivDeposit = () => {
    // Official Deriv Cashier Deposit link
    window.open('https://app.deriv.com/cashier/deposit', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6" id="cashierTabSection">
      
      {/* Upper Status Banner */}
      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
              Secure Cashier Gateways
            </span>
          </div>
          <h2 className="text-xl font-sans text-white font-semibold">
            Capital Management & Yield Reports
          </h2>
          <p className="text-xs text-slate-400">
            Monitor real-time account balances, accrued program earnings, and perform secure cashier transfers on the official Deriv terminal.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-805">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div className="font-mono text-[10px] text-left">
            <span className="text-slate-500 block leading-none">SECURITY LAYER</span>
            <span className="text-slate-300 font-bold">SSL & Token Verified</span>
          </div>
        </div>
      </div>

      {!account ? (
        /* DISCONNECTED / NON-AUTHORIZED PROMPT */
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-6" id="cashierAuthPrompt">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Connect Deriv Wallet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              To fetch your active wallet balance and review transaction options, authorize your account by entering your Deriv API Token below.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="max-w-md mx-auto space-y-3">
            <div className="relative">
              <input
                type="password"
                placeholder="Paste your Deriv API Token (e.g. p83u6YshT...)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 placeholder:text-slate-600 outline-none transition-all font-mono text-center"
              />
            </div>
            
            {authorizedWsStatus === 'error' && (
              <div className="flex items-center gap-2 justify-center p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-mono">
                <AlertCircle className="w-4 h-4" />
                <span>Invalid or expired Token. Please review your scopes (Read & Trade are required).</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authorizedWsStatus === 'authorizing' || !tokenInput.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white font-mono text-xs font-bold rounded-xl transition-all active:scale-98 disabled:scale-100 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              {authorizedWsStatus === 'authorizing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  CONNECTING SECURE SOCKETS...
                </>
              ) : (
                'SECURELY CONNECT CO-PASS'
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
            💡 Don't have a token? Switch to the "Automated Trader" tab and use the step-by-step interactive onboarding guide to obtain one instantly from Deriv.
          </p>
        </div>
      ) : (
        /* ACC-CONNECTED CONTENT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Digital Wallet and Cashier Transfers Panel */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ATM Card UI View */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-8" id="virtualMetalCard">
              {/* Abs decoration grids */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />

              {/* Card top */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                      NEXSCAN MARKETS SYSTEM CO-PASS
                    </span>
                  </div>
                  <h3 className="text-slate-100 text-sm font-semibold tracking-tight">
                    {account.fullname || 'Broker Wallet'}
                  </h3>
                </div>
                
                {account.is_virtual ? (
                  <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-bold rounded-lg uppercase tracking-wider">
                    VIRTUAL DEMO
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold rounded-lg uppercase tracking-wider">
                    REAL WALLET
                  </span>
                )}
              </div>

              {/* Wallet numbers with symbol/currency */}
              <div className="space-y-1.5 py-4">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  Available Wallet Balance
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-mono font-black text-white tracking-tight drop-shadow-sm">
                    ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-lg font-mono font-bold text-emerald-400">
                    {account.currency || 'USD'}
                  </span>
                </div>
              </div>

              {/* Card bottom details */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60 text-left">
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">LOGIN ID</span>
                  <span className="text-xs font-mono font-semibold text-slate-300">{account.loginid}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">SECURE CREDENTIALS</span>
                  <span className="text-xs font-mono font-semibold text-slate-300 select-all">••••••••••••</span>
                </div>
                <div className="hidden lg:block space-y-1">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">REGISTERED EMAIL</span>
                  <span className="text-xs font-mono font-semibold text-slate-300 truncate max-w-[150px] block" title={account.email}>
                    {account.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Cashier Operation Hub */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-indigo-400 tracking-wider font-extrabold uppercase block">
                  CASHIER BRIDGES (SSO DELEGATE)
                </span>
                <h4 className="text-md font-sans text-white font-semibold">
                  Secure Fund Operations via Deriv
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When requesting a deposit or withdrawal, you will be redirected to the official end-to-end encrypted Deriv Cashier. For your safety, withdrawals emit a secure confirmation token sent to your email container.
                </p>
              </div>

              {/* Danger/Warning message if on Demo Account */}
              {account.is_virtual && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 text-amber-400 rounded-xl">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">Currently Operating of Virtual Currency</span>
                    <span className="text-[10px] text-slate-400 block leading-relaxed">
                      Withdrawals and deposits are only available on Real accounts. To handle real cash, you must disconnect and authorize using your Real account's trading API token.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Deposit Bridge */}
                <button
                  onClick={openDerivDeposit}
                  className="p-4 bg-slate-950 hover:bg-slate-905 border border-slate-800 hover:border-slate-700 rounded-2xl text-left cursor-pointer transition-all active:scale-98 group flex flex-col justify-between h-32"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/25 transition-colors">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white uppercase tracking-wide">
                      Deposit Capital <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                      Add money to your account
                    </p>
                  </div>
                </button>

                {/* Secure Withdrawal Bridge */}
                <button
                  onClick={openDerivCashier}
                  className="p-4 bg-slate-950 hover:bg-slate-905 border border-emerald-900/50 hover:border-emerald-700/80 rounded-2xl text-left cursor-pointer transition-all active:scale-98 group flex flex-col justify-between h-32 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl" />
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                      Withdraw Earnings <ExternalLink className="w-3.5 h-3.5 text-emerald-400/70" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                      Transfer money to your local methods
                    </p>
                  </div>
                </button>

              </div>

              {/* Safety notice disclaimer */}
              <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                <span>Processing speed varies by payment method (normally 2 to 24 hours). No hidden applet fees.</span>
              </div>

            </div>

          </div>

          {/* RIGHT: Profit Metrics Center & Performance Stats */}
          <div className="lg:col-span-5 space-y-6 text-left">
            
            {/* Cumulative Profit Metric card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-6">
              
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">ACCUMULATION REPORT</span>
                <h4 className="text-sm font-sans text-white font-semibold">Accrued Program Earnings</h4>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block">Total Profit Realized</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-mono font-black ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalNetProfit >= 0 ? '+' : '-'}${Math.abs(totalNetProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-mono text-slate-500 uppercase font-bold">
                    {account.currency}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-slate-500 block">
                  Net earnings computed across {totalTrades} executed strategy tickets.
                </span>
              </div>

              {/* Win/Loss visual performance segment track bar */}
              {totalTrades > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Winning ratio: <strong className="text-emerald-400">{winRate.toFixed(1)}%</strong></span>
                    <span className="text-slate-500">{winCount}W - {lossCount}L</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${winRate}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${100 - winRate}%` }} />
                  </div>
                </div>
              )}

              {/* Performance Bullet indicators */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/60 font-mono text-xs">
                <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-805">
                  <span className="text-[8px] text-slate-500 uppercase block">AGGREGATE VOLUME</span>
                  <span className="font-bold text-slate-300">${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-805">
                  <span className="text-[8px] text-slate-500 uppercase block">NET CONTRACTS</span>
                  <span className="font-bold text-slate-300">{totalTrades} Tickets</span>
                </div>
              </div>

            </div>

            {/* Smart Audit logs */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-indigo-400 tracking-wider font-extrabold uppercase">
                  SECURITY AND CHECKS
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                  VERIFIED
                </span>
              </div>

              <ul className="space-y-3.5 text-[10.5px] font-mono">
                <li className="flex items-start gap-2.5 text-slate-400 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>The applet operates entirely on-device proxy, routing execution through secure WebSocket tunnels directly to your broker.</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-400 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>Withdrawal commands are executed exclusively via Deriv 3D-secure backend. Third-party actors can never intercept funds.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

// Small inline Check icon helper to keep dependency imports lightweight
function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
