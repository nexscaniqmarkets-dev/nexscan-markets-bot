import React, { useState, useEffect } from 'react';
import { AccountInfo, PastTrade, BotConfig, BotState } from '../types';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, ShieldCheck, ExternalLink,
  CircleDollarSign, TrendingUp, TrendingDown, RefreshCw, Landmark,
  Clock, AlertTriangle, AlertCircle, Zap, Star, Activity,
  FlaskConical, Shield, Key, CheckSquare, Eye, EyeOff, RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface CashierTabProps {
  account: AccountInfo | null;
  demoAccount: AccountInfo | null;
  realAccount: AccountInfo | null;
  pastTrades: PastTrade[];
  botConfig: BotConfig;
  onUpdateConfig: (config: Partial<BotConfig>) => void;
  onAuthorize: (token: string) => void;
  onDeauthorize: () => void;
  authorizedWsStatus: 'idle' | 'connecting' | 'connected' | 'error';
  onResetDemoBalance: () => void;
  botState: BotState;
}

export function CashierTab({
  account,
  demoAccount,
  realAccount,
  pastTrades,
  botConfig,
  onUpdateConfig,
  onAuthorize,
  onDeauthorize,
  authorizedWsStatus,
  onResetDemoBalance,
  botState,
}: CashierTabProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [animBalance, setAnimBalance] = useState(false);
  const [activeAction, setActiveAction] = useState<null | 'deposit' | 'withdraw'>(null);
  const [simAmount, setSimAmount] = useState('500');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState('');

  // Animate balance on mount
  useEffect(() => {
    if (account) {
      setTimeout(() => setAnimBalance(true), 150);
    }
  }, [account]);

  const handleSimulateDeposit = async () => {
    const val = parseFloat(simAmount);
    if (isNaN(val) || val <= 0) {
      setSimError('Please specify a positive valid amount.');
      return;
    }
    setSimError('');
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSimError(d.error || 'Failed containing simulation deposit.');
      }
    } catch(e) {
      setSimError('Network connection failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateWithdraw = async () => {
    const val = parseFloat(simAmount);
    if (isNaN(val) || val <= 0) {
      setSimError('Please specify a positive valid amount.');
      return;
    }
    setSimError('');
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSimError(d.error || 'Insufficient practice balance or error.');
      }
    } catch(e) {
      setSimError('Network connection failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const isOnDemo = botConfig.isDemo;
  const demoBalance = demoAccount?.balance ?? 1000;
  const realBalance = realAccount?.balance ?? 0;
  const activeBalance = isOnDemo ? demoBalance : realBalance;
  const activeCurrency = isOnDemo ? 'USD' : (realAccount?.currency ?? 'USD');

  const totalTrades = pastTrades.length;
  const winCount = pastTrades.filter(t => t.outcome === 'win').length;
  const lossCount = pastTrades.filter(t => t.outcome === 'loss').length;
  const totalNetProfit = pastTrades.reduce((acc, t) => acc + t.profit, 0);
  const totalVolume = pastTrades.reduce((acc, t) => acc + t.stake, 0);
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    onAuthorize(tokenInput.trim());
  };

  return (
    <div className="space-y-4" id="cashierTabSection">

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-3 rounded-xl border border-indigo-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-left">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-0.5 relative z-10">
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] font-mono tracking-widest text-emerald-400 font-bold uppercase">
              Capital &amp; Account Security Protocol
            </span>
          </div>
          <h2 className="text-sm font-sans text-white font-bold tracking-tight">
            Wallet Hub
          </h2>
          <p className="text-[10px] text-slate-400">
            Configure active profiles, link assets, or request cashier routing.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-1 rounded-lg relative z-10 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <div className="font-mono text-[7.5px] text-left">
            <span className="text-slate-500 block leading-none">CREDENTIAL STATUS</span>
            <span className="text-emerald-305 text-emerald-405 font-bold">Secure Socket Authenticated</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT COLUMN: ACTIVE PROFILE SWITCHING + CONFIG */}
        <div className="lg:col-span-7 space-y-3">

          {/* Account Toggle Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden" id="accountConfigBox">
            <div className="p-2 px-3 border-b border-slate-800/60 bg-slate-950/40 flex justify-between items-center">
              <span className="text-[8.5px] font-mono font-bold text-slate-300 tracking-wider uppercase">SELECT TRADING PROFILE</span>
              <span className="text-[8px] font-mono text-slate-500">Auto-saves locally</span>
            </div>

            {/* Toggle Switch */}
            <div className="flex p-2 gap-1.5">
              <button
                type="button"
                id="accountToggleDemo"
                onClick={() => { if (!botState.isRunning) onUpdateConfig({ isDemo: true }); }}
                disabled={botState.isRunning}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-extrabold border transition-all duration-205 disabled:cursor-not-allowed uppercase tracking-wider ${
                  isOnDemo
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/15'
                    : 'border-slate-800 text-slate-500 bg-transparent hover:border-slate-750 hover:text-slate-450'
                }`}
              >
                <FlaskConical className="w-3 h-3" />
                Demo Account
              </button>
              <button
                type="button"
                id="accountToggleReal"
                onClick={() => { if (!botState.isRunning) onUpdateConfig({ isDemo: false }); }}
                disabled={botState.isRunning}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-extrabold border transition-all duration-205 disabled:cursor-not-allowed uppercase tracking-wider ${
                  !isOnDemo
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/15'
                    : 'border-slate-800 text-slate-500 bg-transparent hover:border-slate-750 hover:text-slate-450'
                }`}
              >
                <Shield className="w-3 h-3" />
                Real Account
              </button>
            </div>

            <div className="border-t border-slate-800/80" />

            {/* DEMO MODE PRESENTATION */}
            {isOnDemo && (
              <div className="p-3 space-y-2.5 text-left bg-slate-905 bg-slate-950/20">
                <div className="flex gap-2 items-center">
                  <div className="w-7 h-7 rounded-md bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                    <FlaskConical className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[7.5px] font-mono font-bold tracking-widest text-indigo-400 uppercase leading-none block">ACTIVE PROTOCOL: sandbox</span>
                    <h3 className="text-[11px] font-bold text-white leading-none mt-0.5">Virtual Demo Practice Account</h3>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 space-y-0.5">
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest block">DEMO PROFILE BALANCE</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-mono font-black text-white leading-none">
                      ${demoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-500">USD</span>
                  </div>
                  <p className={`text-[8.5px] font-mono font-semibold ${demoBalance >= 1000 ? 'text-emerald-450 text-emerald-450' : 'text-red-400'} leading-none mt-1`}>
                    {demoBalance >= 1000 ? '📈 Profit surplus: +' : '📉 Deficit margin: -'}${Math.abs(demoBalance - 1000).toFixed(2)} USD
                  </p>
                </div>

                {/* Reset Trigger */}
                {demoBalance < 1005 && (
                  <button
                    type="button"
                    onClick={onResetDemoBalance}
                    disabled={botState.isRunning}
                    className="w-full py-1 border border-slate-800 hover:bg-slate-850 disabled:opacity-40 text-slate-400 hover:text-slate-205 text-[9.5px] font-mono rounded-md transition-all flex items-center justify-center gap-1 font-bold uppercase"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> RESET DEMO TO $1,000.00
                  </button>
                )}

                <div className="flex gap-1.5 p-2 rounded-lg bg-indigo-950/10 border border-indigo-900/25 text-[9px] text-slate-450 leading-relaxed">
                  <span className="font-bold text-indigo-400 text-xs leading-none select-none">i</span>
                  <span>
                    Your Demo portfolio starts with a $1,000.00 virtual base. Performance replicates live volatile price feeds without capital exposure.
                  </span>
                </div>
              </div>
            )}

            {/* REAL ACCOUNT PRESENTATION */}
            {!isOnDemo && (
              <div className="p-3 text-left">
                {!realAccount ? (
                  // REAL: NOT LINKED
                  <div className="space-y-2.5">
                    <div className="flex gap-2 items-center">
                      <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[7.5px] font-mono font-bold tracking-widest text-amber-500 uppercase leading-none block">UNCONNECTED GATEWAY</span>
                        <h3 className="text-[11px] font-bold text-white leading-none mt-0.5">Link Your Real Deriv API Token</h3>
                      </div>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-2">
                      <div>
                        <label className="text-[8px] font-mono text-slate-450 block mb-0.5">PASTE YOUR DERIV API KEY</label>
                        <div className="relative">
                          <input
                            type={showToken ? 'text' : 'password'}
                            id="derivTokenInput"
                            placeholder="Enter Deriv token with 'Read' & 'Trade' scopes..."
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-805 focus:border-indigo-505 text-[10px] text-slate-200 placeholder:text-slate-600 outline-none transition-all font-mono h-[32px] text-left"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {authorizedWsStatus === 'connecting' && (
                        <div className="flex items-center gap-1 p-1 rounded-md bg-indigo-950/15 border border-indigo-900/30 text-[8.5px] font-mono text-indigo-300">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Establishing isolated cloud socket ...</span>
                        </div>
                      )}

                      {authorizedWsStatus === 'error' && (
                        <div className="flex items-center gap-1 p-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-[8.5px] font-mono text-rose-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>API token rejected or insufficient scopes (Read + Trade required).</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        id="connectRealAccountBtn"
                        disabled={authorizedWsStatus === 'connecting' || !tokenInput.trim()}
                        className="w-full py-1 bg-emerald-600 hover:bg-emerald-550 disabled:bg-slate-800 disabled:text-slate-600 text-white font-mono text-[10px] font-extrabold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 shadow shadow-emerald-950/15 h-8 uppercase tracking-wider"
                      >
                        {authorizedWsStatus === 'connecting' ? (
                          <><RefreshCw className="w-3 h-3 animate-spin" /> CONNECTING ACCOUNT...</>
                        ) : (
                          <><ShieldCheck className="w-3 h-3" /> CONNECT REAL ACCOUNT</>
                        )}
                      </button>
                    </form>

                    {/* Step-by-Step Guide */}
                    <div className="border-t border-slate-800 pt-3 space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[11px] font-bold text-slate-350">Secure Integration Setup Instructions</span>
                      </div>

                      <div className="space-y-2 font-mono text-[9px] text-slate-450 leading-relaxed">
                        <div className="flex gap-1.5">
                          <span className="text-indigo-400 font-bold shrink-0">[1]</span>
                          <span>
                            Create or sign in to your official{' '}
                            <a href="https://deriv.partners/rx?sidc=C6D4FA86-827B-4AAF-844B-344F9FE57A0F&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU334564" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">
                              Deriv account <ExternalLink className="w-2 h-2" />
                            </a>.
                          </span>
                        </div>

                        <div className="flex gap-1.5">
                          <span className="text-indigo-400 font-bold shrink-0">[2]</span>
                          <span>
                            Navigate to{' '}
                            <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">
                              Account Settings → API Token <ExternalLink className="w-2 h-2" />
                            </a>.
                          </span>
                        </div>

                        <div className="flex gap-1.5">
                          <span className="text-indigo-400 font-bold shrink-0">[3]</span>
                          <div className="space-y-0.5">
                            <span>Request a new token by naming it and ticking exactly these checkmark fields:</span>
                            <div className="flex gap-1.5 mt-0.5">
                              <span className="px-1 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 font-semibold text-[7.5px] rounded">✓ Read</span>
                              <span className="px-1 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 font-semibold text-[7.5px] rounded">✓ Trade</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <span className="text-indigo-400 font-bold shrink-0">[4]</span>
                          <span>Copy that newly created token value, paste it above, and select "Connect Real Account".</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // REAL: CONNECTED CARD
                  <div className="space-y-2.5">
                    <div className="relative overflow-hidden rounded-xl p-3 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-emerald-950/10 border border-emerald-900/20">
                      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5 text-left">
                          <div className="flex items-center gap-1">
                            <Landmark className="w-3 h-3 text-emerald-400" />
                            <span className="text-[7.5px] font-mono font-bold tracking-widest text-slate-400 uppercase">Live Account Connected</span>
                          </div>
                          <h3 className="text-slate-100 text-[11px] font-bold">{realAccount.fullname || 'Real Broker Account'}</h3>
                        </div>
                        <span className="px-1 py-0.5 bg-emerald-505 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[7px] font-bold rounded uppercase tracking-wider">
                          LIVE
                        </span>
                      </div>

                      <div className="py-2 text-left">
                        <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest block">AVAILABLE PORTFOLIO VALUE</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-mono font-black text-white">
                            ${realBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-400">{realAccount.currency || 'USD'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/40 text-[7.5px] font-mono text-slate-405">
                        <div>
                          <span className="text-slate-500 block font-bold text-[8px]">BROKER LOGIN</span>
                          <span className="text-slate-300 font-bold">{realAccount.loginid}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-bold text-[8px]">EMAIL ID</span>
                          <span className="text-slate-350 truncate block max-w-[125px]">{realAccount.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="disconnectRealAccountBtn"
                      onClick={onDeauthorize}
                      disabled={botState.isRunning}
                      className="w-full py-1 bg-slate-950 border border-slate-805 hover:border-slate-705 text-slate-500 hover:text-rose-450 disabled:opacity-40 font-mono text-[10px] rounded-md transition-all active:scale-99 uppercase font-bold"
                    >
                      Disconnect Real Account Profile
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CASHIER TRANSACTION BOX */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-3.5 text-left space-y-3.5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-100 leading-none">Broker Cashier Access</h3>
                <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                  isOnDemo ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {isOnDemo ? 'Practice Mode' : 'Live Real Mode'}
                </span>
              </div>
              <p className="text-[9.5px] text-slate-500 mt-1 leading-normal">
                {isOnDemo 
                  ? 'Simulate and manage practice funds inside your demo environment, or toggle to Live Mode for certified real routing.' 
                  : 'Deposit or withdraw capital securely to/from your linked Deriv account via certified secure cashier gateways.'}
              </p>
            </div>

            {/* DEMO INTERACTIVE SIMULATOR */}
            {isOnDemo ? (
              <div className="p-3 bg-slate-950/45 border border-slate-850 rounded-lg space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                    Practice Transaction Simulator Amount ($ USD)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="10"
                      max="100000"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="Amount..."
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 focus:border-indigo-500/60 text-[10.5px] text-slate-200 font-mono outline-none"
                    />
                    <div className="flex gap-1">
                      {['100', '500', '1000', '5000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSimAmount(preset)}
                          className={`px-2 py-1 text-[8.5px] font-mono rounded border transition-all ${
                            simAmount === preset 
                              ? 'bg-indigo-500/15 border-indigo-505 text-indigo-300 font-extrabold' 
                              : 'bg-slate-900 border-slate-800/80 text-slate-500 hover:text-slate-350 hover:border-slate-700'
                          }`}
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {simError && (
                  <p className="text-[8.5px] font-mono text-rose-400 bg-rose-500/5 p-1.5 rounded border border-rose-500/15">
                    ⚠️ {simError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={handleSimulateDeposit}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-indigo-900/50 to-indigo-950 hover:to-indigo-900 border border-indigo-850 hover:border-indigo-600 rounded-lg text-indigo-400 font-mono text-[9.5px] font-bold transition-all active:scale-97 select-none cursor-pointer duration-200"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 animate-bounce" />
                    Simulate Deposit
                  </button>

                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={handleSimulateWithdraw}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-emerald-900/40 to-emerald-950 hover:to-emerald-900 border border-emerald-900/35 hover:border-emerald-650 rounded-lg text-emerald-400 font-mono text-[9.5px] font-bold transition-all active:scale-97 select-none cursor-pointer duration-200"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Simulate Withdraw
                  </button>
                </div>

                <div className="text-[8px] text-slate-550 leading-relaxed text-slate-550 flex items-center gap-1 bg-slate-900/30 p-1.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 shrink-0" />
                  <span>These actions dynamically modify your virtual demo account balance hosted securely inside your session database.</span>
                </div>
              </div>
            ) : (
              // REAL MODE ACCOUNT SECTIONS
              !realAccount ? (
                <div className="p-3 text-center bg-slate-950/40 border border-slate-850 rounded-lg space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 mx-auto">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 max-w-sm mx-auto">
                    <p className="text-[10px] font-bold text-slate-400">Cashier Offline for Current Profile</p>
                    <p className="text-[9px] text-slate-500 leading-relaxed">
                      You are in Real Profile mode but have not linked your account. Please paste your secure Trade Token above to active.
                    </p>
                  </div>
                </div>
              ) : (
                // IF CONNECTED
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`https://oauth.deriv.com/oauth2/authorize?app_id=${134680}&redirect_uri=https://app.deriv.com/cashier/deposit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="depositFundsBtn"
                    className="group relative overflow-hidden p-2 bg-gradient-to-br from-indigo-950/30 to-slate-950 border border-indigo-900/40 hover:border-indigo-650 rounded-lg text-left cursor-pointer transition-all active:scale-98 flex flex-col justify-between h-[74px] no-underline"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <ArrowDownLeft className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 font-mono text-[9px] font-bold text-indigo-300 uppercase leading-none">
                        Deposit Real
                        <ExternalLink className="w-2 h-2 opacity-60" />
                      </div>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-none">Add actual wallet balance</p>
                    </div>
                  </a>

                  <a
                    href={`https://oauth.deriv.com/oauth2/authorize?app_id=${134680}&redirect_uri=https://app.deriv.com/cashier/withdrawal`}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="withdrawFundsBtn"
                    className="group relative overflow-hidden p-2 bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-emerald-900/40 hover:border-emerald-650 rounded-lg text-left cursor-pointer transition-all active:scale-98 flex flex-col justify-between h-[74px] no-underline"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 font-mono text-[9px] font-bold text-emerald-300 uppercase leading-none">
                        Withdraw Real
                        <ExternalLink className="w-2 h-2 opacity-60" />
                      </div>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-none font-sans">Transfer assets back to local</p>
                    </div>
                  </a>
                </div>
              )
            )}

            <div className="flex items-start gap-1 text-[8px] text-slate-500 font-mono bg-slate-950/40 p-2 rounded-md border border-slate-900 leading-normal">
              <Clock className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
              <span>
                Standard automated processing time is 1 to 24 hours depending strictly on your regional payment gateway. NexScan does not collect transaction fees.
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REVENUE PERFORMANCE & GENERAL SECURITY */}
        <div className="lg:col-span-5 space-y-3 text-left">

          {/* Session Performance Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/10 border border-slate-800 p-3.5 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider block font-bold">ENVIRONMENT AUDIT</span>
                <h4 className="text-xs font-bold text-white mt-0.5">Current Session Performance</h4>
              </div>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            </div>

            {/* Net profit widget */}
            <div className="relative overflow-hidden bg-slate-950/60 rounded-lg p-3 border border-slate-800/60">
              <div className={`absolute inset-0 opacity-10 ${totalNetProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-transparent' : 'bg-gradient-to-br from-rose-500 to-transparent'} pointer-events-none`} />
              <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Net Realized Margin</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-xl font-mono font-black ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalNetProfit >= 0 ? '+' : '-'}${Math.abs(totalNetProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">{activeCurrency}</span>
              </div>
              <span className="text-[8.5px] font-mono text-slate-550 text-slate-500 block mt-0.5">
                Across {totalTrades} executed transactions in active view
              </span>
            </div>

            {/* Win rate indicator */}
            {totalTrades > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-slate-400">Win rate indicator: <strong className="text-emerald-400">{winRate.toFixed(1)}%</strong></span>
                  <span className="text-slate-500">{winCount}W — {lossCount}L</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex gap-0.5">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${winRate}%` }} />
                  <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-1000" style={{ width: `${100 - winRate}%` }} />
                </div>
              </div>
            )}

            {/* Mini metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 space-y-0.5">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase font-bold">Trading Volume</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-350 block leading-tight">
                  ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 space-y-0.5">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase font-bold">Total Operations</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-350 block leading-tight">{totalTrades} Positions</span>
              </div>
            </div>
          </div>

          {/* Privacy & Guarding Checklist */}
          <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-indigo-400 tracking-wider font-extrabold uppercase">SYSTEM PROTOCOL DEPLOYMENT</span>
              <span className="text-[7.5px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase font-mono flex items-center gap-1">
                <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                VERIFIED CORE
              </span>
            </div>

            <ul className="space-y-2.5 text-[9.5px] font-mono text-slate-400">
              <li className="flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>All broker orders are handled via official secure API keys stored directly inside local user browser cache.</span>
              </li>
              <li className="flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Your password is never shared, requested, or compiled by NexScan's server layer.</span>
              </li>
              <li className="flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Withdrawal operations require multi-factor or original email confirmations managed securely by Deriv.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
