import { useState, useRef, useEffect, FormEvent } from 'react';
import { BotConfig, BotState, AccountInfo, LogMessage, SymbolInfo, SymbolState } from '../types';
import {
  Play, Square, RefreshCw, AlertTriangle, Key, ExternalLink,
  ShieldCheck, Terminal, Trash2, CheckSquare, TrendingUp,
  TrendingDown, Eye, EyeOff, RotateCcw, Zap, FlaskConical, Shield
} from 'lucide-react';

interface BotTraderProps {
  activeSymbol: SymbolInfo;
  symbolsState: Record<string, SymbolState>;
  onSelectSymbolForTrading: (symbolId: string, autoStartAfterLoad?: boolean) => void;
  account: AccountInfo | null;
  demoAccount?: AccountInfo | null;
  realAccount?: AccountInfo | null;
  botConfig: BotConfig;
  onUpdateConfig: (config: Partial<BotConfig>) => void;
  onAuthorize: (token: string) => void;
  onDeauthorize: () => void;
  onStartBot: () => void;
  onStopBot: () => void;
  botState: BotState;
  logs: LogMessage[];
  onClearLogs: () => void;
  authorizedWsStatus?: 'idle' | 'connecting' | 'connected' | 'error';
  sessionUptime?: number;
  autoTriggerScan?: boolean;
  onScanReset?: () => void;
  autoTriggerResume?: boolean;
  onResumeReset?: () => void;
  onResumeWithSymbol?: (symbolId: string) => void;
  isAdvancedMode?: boolean;
  onToggleAdvancedMode?: (val: boolean) => void;
  onResetDemoBalance?: () => void;
}

export function BotTrader({
  activeSymbol, symbolsState, onSelectSymbolForTrading,
  account, demoAccount, realAccount,
  botConfig, onUpdateConfig, onAuthorize, onDeauthorize,
  onStartBot, onStopBot, botState, logs, onClearLogs,
  authorizedWsStatus = 'idle', sessionUptime = 300,
  autoTriggerScan = false, onScanReset = () => {},
  autoTriggerResume = false, onResumeReset = () => {},
  onResumeWithSymbol = () => {},
  isAdvancedMode = false, onToggleAdvancedMode = () => {},
  onResetDemoBalance = () => {},
}: BotTraderProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isResumeModeRef = useRef(false);

  const [searchLoadCountdown, setSearchLoadCountdown] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);

  const [stakeInput, setStakeInput] = useState(botConfig.stake.toString());
  const [martingaleInput, setMartingaleInput] = useState(botConfig.martingaleMultiplier.toString());
  const [maxWinsInput, setMaxWinsInput] = useState(botConfig.maxWins.toString());
  const [maxLossesInput, setMaxLossesInput] = useState(botConfig.maxLosses.toString());

  useEffect(() => { if (autoTriggerScan) { onScanReset(); handleSearchAndLoad(); } }, [autoTriggerScan]);
  useEffect(() => { if (autoTriggerResume) { isResumeModeRef.current = true; onResumeReset(); handleSearchAndLoad(); } }, [autoTriggerResume]);

  const lastBotStatusRef = useRef(botState.status);
  useEffect(() => {
    if ((botState.status === 'won_limit' || botState.status === 'lost_limit') && lastBotStatusRef.current !== botState.status) {
      setSearchLoadCountdown(10);
    }
    lastBotStatusRef.current = botState.status;
  }, [botState.status]);

  useEffect(() => { if (botState.isRunning) setSearchLoadCountdown(null); }, [botState.isRunning]);

  useEffect(() => {
    if (searchLoadCountdown === null) return;
    if (searchLoadCountdown <= 0) { setSearchLoadCountdown(null); handleSearchAndLoad(); return; }
    const t = setTimeout(() => setSearchLoadCountdown(p => p !== null ? p - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [searchLoadCountdown]);

  useEffect(() => { setStakeInput(botConfig.stake.toString()); }, [botConfig.stake]);
  useEffect(() => { setMartingaleInput(botConfig.martingaleMultiplier.toString()); }, [botConfig.martingaleMultiplier]);
  useEffect(() => { setMaxWinsInput(botConfig.maxWins.toString()); }, [botConfig.maxWins]);
  useEffect(() => { setMaxLossesInput(botConfig.maxLosses.toString()); }, [botConfig.maxLosses]);
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const getBestSymbolId = () => {
    const inResume = isResumeModeRef.current;
    const ranked = Object.values(symbolsState)
      .filter(s => !inResume || s.info.id !== botState.symbol)
      .map(s => {
        const total = s.wins + s.losses;
        const winRate = total >= 3 ? (s.wins / total) * 100 : null;
        const freq = s.ticks > 10 ? (s.signals / s.ticks) * 100 : 0;
        const score = winRate !== null ? winRate * 0.65 + Math.min(freq * 5, 100) * 0.35 : -1;
        return { id: s.info.id, score, winRate };
      }).sort((a, b) => b.score - a.score);
    if (inResume) { const q = ranked.find(s => s.winRate !== null && s.winRate >= 55); if (q) return q.id; }
    return ranked[0]?.id || 'R_100';
  };

  const handleSearchAndLoad = () => {
    setSearchLoadCountdown(null);
    setIsScanning(true);
    let idx = 0;
    const symbols = Object.values(symbolsState).map(s => s.info);
    if (!symbols.length) { setIsScanning(false); return; }
    const iv = setInterval(() => {
      if (idx < symbols.length * 2) { setScanIndex(idx % symbols.length); idx++; }
      else {
        clearInterval(iv);
        setIsScanning(false);
        const best = getBestSymbolId();
        if (isResumeModeRef.current) { isResumeModeRef.current = false; onResumeWithSymbol(best); }
        else { onSelectSymbolForTrading(best, false); }
      }
    }, 100);
  };

  const handleAuthorizeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) onAuthorize(tokenInput.trim());
  };

  // Derived state
  const activeState = symbolsState[activeSymbol.id];
  const activeTotalSim = activeState ? (activeState.wins + activeState.losses) : 0;
  const activeWinRate = activeTotalSim >= 3 ? (activeState.wins / activeTotalSim) * 100 : null;
  const activeSignals = activeState?.signals ?? 0;
  const isCalibrating = typeof sessionUptime === 'number' && sessionUptime < 300;
  const meetsConditions = !isCalibrating && activeWinRate !== null && activeWinRate >= 55 && activeSignals >= 5;
  const totalTrades = botState.wins + botState.losses;
  const sessionWinRate = totalTrades > 0 ? (botState.wins / totalTrades) * 100 : 0;
  const isOnDemo = botConfig.isDemo;

  // Balance — strictly from the active side only
  const demoBalance = demoAccount?.balance ?? 1000;
  const realBalance = realAccount?.balance ?? 0;
  const activeBalance = isOnDemo ? demoBalance : realBalance;
  const activeCurrency = isOnDemo ? 'USD' : (realAccount?.currency ?? 'USD');

  const canTrade = isOnDemo || !!realAccount;

  const getLogColor = (type: LogMessage['type'], msg?: string) => {
    if (type === 'success') return 'text-emerald-400';
    if (type === 'error') return 'text-red-400';
    if (type === 'warning') return 'text-amber-400';
    if (type === 'trade') {
      if (msg?.includes('WON')) return 'text-emerald-400 font-semibold';
      if (msg?.includes('LOST')) return 'text-red-400 font-semibold';
      return 'text-indigo-400';
    }
    return 'text-slate-400';
  };

  return (
    <div className="space-y-4 pb-24">

      {/* ══════════════════════════════════════════
          ACCOUNT SECTION
          ══════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">

        {/* ── Toggle: Demo / Real ── */}
        <div className="grid grid-cols-2 p-1.5 gap-1.5 bg-slate-950/60">
          <button
            onClick={() => { if (!botState.isRunning) onUpdateConfig({ isDemo: true }); }}
            disabled={botState.isRunning}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              isOnDemo
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            } disabled:cursor-not-allowed`}
          >
            <FlaskConical className={`w-4 h-4 ${isOnDemo ? 'text-cyan-400' : 'text-slate-600'}`} />
            Demo
          </button>
          <button
            onClick={() => { if (!botState.isRunning) onUpdateConfig({ isDemo: false }); }}
            disabled={botState.isRunning}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              !isOnDemo
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            } disabled:cursor-not-allowed`}
          >
            <Shield className={`w-4 h-4 ${!isOnDemo ? 'text-emerald-400' : 'text-slate-600'}`} />
            Real
          </button>
        </div>

        {/* ── DEMO VIEW ── */}
        {isOnDemo && (
          <div className="p-5 space-y-4">
            {/* Icon + label */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-950/40 border border-cyan-900/40 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Demo Account</p>
                <p className="text-xs text-slate-500">Practice trading with virtual funds</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Balance */}
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Demo Balance</p>
              <p className="text-4xl font-black font-mono text-white tracking-tight">
                ${demoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-base font-normal text-slate-500 ml-2">USD</span>
              </p>
              {demoBalance !== 1000 && (
                <p className={`text-sm font-mono mt-1 ${demoBalance >= 1000 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {demoBalance >= 1000 ? '+' : ''}${(demoBalance - 1000).toFixed(2)} from start
                </p>
              )}
            </div>

            {/* Info box */}
            <div className="flex gap-2.5 p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/30">
              <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-cyan-400 text-[9px] font-black">i</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your demo balance starts at $1,000.00 and changes based on your trading performance. No real money involved.
              </p>
            </div>

            {/* Reset button — only when below $1000 */}
            {demoBalance < 1000 && (
              <button onClick={onResetDemoBalance} disabled={botState.isRunning}
                className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs font-mono font-bold hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Reset to $1,000.00
              </button>
            )}
          </div>
        )}

        {/* ── REAL VIEW ── */}
        {!isOnDemo && (
          <div className="p-5 space-y-4">
            {/* Icon + label */}
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                realAccount
                  ? 'bg-emerald-950/40 border border-emerald-900/40'
                  : 'bg-slate-800 border border-slate-700'
              }`}>
                <Shield className={`w-5 h-5 ${realAccount ? 'text-emerald-400' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Real Account</p>
                <p className={`text-xs font-mono ${realAccount ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {realAccount ? `Connected · ${realAccount.loginid}` : 'Connect your Deriv account'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800" />

            {/* NOT connected — token form */}
            {!realAccount && (
              <form onSubmit={handleAuthorizeSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">
                    Enter your Deriv Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Enter Deriv token..."
                      value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-600 rounded-xl py-3.5 pl-4 pr-12 text-sm font-mono text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                    <button type="button" onClick={() => setShowToken(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authorizedWsStatus === 'connecting' && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    Connecting to Deriv...
                  </div>
                )}
                {authorizedWsStatus === 'error' && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Token rejected — ensure it has Read &amp; Trade scopes.
                  </div>
                )}

                <button type="submit" disabled={!tokenInput.trim() || authorizedWsStatus === 'connecting'}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {authorizedWsStatus === 'connecting' ? 'Connecting...' : 'Connect Account'}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 transition-colors">
                    <Key className="w-3 h-3" /> Get API token
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href="https://deriv.partners/rx?sidc=C6D4FA86-827B-4AAF-844B-344F9FE57A0F&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU334564"
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 transition-colors">
                    No account? Sign up free <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </form>
            )}

            {/* CONNECTED — balance display */}
            {realAccount && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Real Balance</p>
                  <p className="text-4xl font-black font-mono text-white tracking-tight">
                    ${realBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-base font-normal text-slate-500 ml-2">{activeCurrency}</span>
                  </p>
                </div>

                <div className="flex gap-2 p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This is your actual Deriv account balance. Trades execute with real funds on your account.
                  </p>
                </div>

                <button onClick={onDeauthorize} disabled={botState.isRunning}
                  className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-500 text-xs font-mono font-bold hover:text-red-400 hover:border-red-900/50 disabled:opacity-40 transition-colors">
                  Disconnect Account
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          ACTIVE PAIR + TRADE BUTTON
          ══════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Active Pair</span>
            <span className="text-base font-bold text-slate-100 mt-0.5 block">{activeSymbol.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Contract</span>
            <span className="text-[11px] font-mono text-indigo-400 font-bold mt-0.5 block">DIGIT OVER 4</span>
          </div>
        </div>

        {/* Win rate bar */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-mono text-slate-500">Scanner Win Rate</span>
            <span className={`text-[11px] font-mono font-bold ${
              activeWinRate === null ? 'text-slate-600'
              : activeWinRate >= 55 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {activeWinRate !== null ? `${activeWinRate.toFixed(1)}%`
                : activeTotalSim < 3 ? `${activeTotalSim}/3 samples` : '—'}
            </span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              activeWinRate === null ? 'bg-slate-700'
              : activeWinRate >= 55 ? 'bg-emerald-500' : 'bg-red-500'
            }`} style={{ width: activeWinRate !== null ? `${Math.min(activeWinRate, 100)}%` : '0%' }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-mono text-slate-600">Signals: {activeSignals}</span>
            <span className="text-[9px] font-mono text-slate-600">Requires ≥55% · ≥5 signals</span>
          </div>
        </div>

        {/* Find best pair */}
        {!botState.isRunning && (
          <div className="px-4 py-3 border-b border-slate-800">
            <button onClick={handleSearchAndLoad}
              disabled={isScanning || botState.isRunning || isCalibrating}
              className="w-full py-2.5 rounded-xl border border-indigo-800/50 bg-indigo-950/20 text-indigo-400 text-xs font-mono font-bold hover:bg-indigo-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {isScanning ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning {Object.values(symbolsState)[scanIndex]?.info.short}...</>
              ) : searchLoadCountdown !== null ? (
                <><RefreshCw className="w-4 h-4 animate-pulse" /> Auto-loading best pair in {searchLoadCountdown}s</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Find &amp; Load Best Pair</>
              )}
            </button>
          </div>
        )}

        {/* State warnings */}
        {!botState.isRunning && isCalibrating && (
          <div className="mx-4 my-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300 flex gap-2">
            <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Calibrating — {Math.floor((300 - sessionUptime) / 60)}:{String((300 - sessionUptime) % 60).padStart(2, '0')} before trading unlocks.</span>
          </div>
        )}
        {!botState.isRunning && !isCalibrating && !meetsConditions && (
          <div className="mx-4 my-3 p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-300 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Pair conditions not met. Click "Find Best Pair" or wait for more ticks.</span>
          </div>
        )}
        {isAdvancedMode && botState.status === 'paused_low_winrate' && (
          <div className="mx-4 my-3 p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-300 flex gap-2">
            <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
            <span>Pair credibility dropped. Scanning for a better pair...</span>
          </div>
        )}

        {/* Trade button */}
        <div className="p-4">
          {canTrade ? (
            botState.isRunning ? (
              <button onClick={onStopBot}
                className="w-full py-4 rounded-2xl bg-red-600/10 border border-red-500/50 text-red-400 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-600/20 transition-colors">
                <Square className="w-5 h-5 fill-current" /> Stop Trading
              </button>
            ) : (
              <button onClick={onStartBot}
                disabled={isCalibrating || !meetsConditions || (isAdvancedMode && botState.status === 'paused_low_winrate')}
                className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  meetsConditions && !isCalibrating
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30 active:scale-[0.99]'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}>
                <Play className="w-5 h-5 fill-current" />
                {isCalibrating ? 'Calibrating...' : meetsConditions ? 'Start Trading' : 'Waiting for Signal'}
              </button>
            )
          ) : (
            <button onClick={() => onUpdateConfig({ isDemo: false })}
              className="w-full py-4 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:border-emerald-700 hover:text-emerald-400 transition-colors">
              <Key className="w-5 h-5" /> Connect Real Account to Trade
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SESSION PERFORMANCE
          ══════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">Session Performance</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            botState.isRunning
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50 animate-pulse'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}>
            {botState.isRunning ? '● Live' : '○ Idle'}
          </span>
        </div>

        {/* P&L */}
        <div className="px-4 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Net P&amp;L</span>
            <div className={`text-4xl font-black font-mono tracking-tight ${botState.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider mb-1">Wins</span>
              <span className="text-2xl font-black font-mono text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />{botState.wins}
              </span>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="text-center">
              <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider mb-1">Losses</span>
              <span className="text-2xl font-black font-mono text-red-400 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />{botState.losses}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
          {[
            { label: 'Win Rate', value: totalTrades > 0 ? `${sessionWinRate.toFixed(0)}%` : '—', color: sessionWinRate >= 55 ? 'text-emerald-400' : totalTrades > 0 ? 'text-amber-400' : 'text-slate-600' },
            { label: 'Trades', value: String(botState.tradesCount), color: 'text-slate-200' },
            { label: 'Stake', value: `$${botState.currentStake.toFixed(2)}`, color: 'text-indigo-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-3 text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">{label}</span>
              <span className={`text-sm font-black font-mono mt-1 block ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="px-4 py-4 space-y-3">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] font-mono text-slate-500">Wins toward limit</span>
              <span className="text-[10px] font-mono text-emerald-500">{botState.wins} / {botConfig.maxWins}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (botState.wins / botConfig.maxWins) * 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] font-mono text-slate-500">Consecutive losses</span>
              <span className="text-[10px] font-mono text-red-500">{botState.consecutiveLosses} / {botConfig.maxLosses}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (botState.consecutiveLosses / botConfig.maxLosses) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TRADE PARAMETERS
          ══════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">Parameters</span>
          <button onClick={() => onToggleAdvancedMode(!isAdvancedMode)} disabled={botState.isRunning}
            className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all disabled:opacity-40 ${
              isAdvancedMode ? 'bg-violet-950/40 text-violet-300 border-violet-800/60' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}>
            <Zap className="w-3 h-3" /> {isAdvancedMode ? 'Advanced ON' : 'Advanced'}
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Stake (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">$</span>
              <input type="number" step="0.05" disabled={botState.isRunning} value={stakeInput}
                onChange={e => { setStakeInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ stake: v }); }}
                onBlur={() => { const v = parseFloat(stakeInput); const c = isNaN(v) || v < 0.35 ? 0.35 : v; setStakeInput(c.toString()); onUpdateConfig({ stake: c }); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-7 pr-3 text-sm font-mono text-slate-200 focus:border-indigo-500 outline-none transition-colors disabled:opacity-50" />
            </div>
            <p className="text-[9px] font-mono text-slate-600 mt-1">Min $0.35</p>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Martingale ×</label>
            <input type="number" step="0.1" disabled={botState.isRunning} value={martingaleInput}
              onChange={e => { setMartingaleInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ martingaleMultiplier: v }); }}
              onBlur={() => { const v = parseFloat(martingaleInput); const c = isNaN(v) || v < 1 ? 1 : v; setMartingaleInput(c.toString()); onUpdateConfig({ martingaleMultiplier: c }); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm font-mono text-slate-200 focus:border-indigo-500 outline-none transition-colors disabled:opacity-50" />
            <p className="text-[9px] font-mono text-slate-600 mt-1">On loss</p>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Max Wins</label>
            <input type="number" step="1" disabled={botState.isRunning} value={maxWinsInput}
              onChange={e => { setMaxWinsInput(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ maxWins: v }); }}
              onBlur={() => { const v = parseInt(maxWinsInput); const c = isNaN(v) || v < 1 ? 2 : v; setMaxWinsInput(c.toString()); onUpdateConfig({ maxWins: c }); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm font-mono text-slate-200 focus:border-indigo-500 outline-none transition-colors disabled:opacity-50" />
            <p className="text-[9px] font-mono text-slate-600 mt-1">Stop after N wins</p>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1.5">Max Losses</label>
            <input type="number" step="1" disabled={botState.isRunning} value={maxLossesInput}
              onChange={e => { setMaxLossesInput(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ maxLosses: v }); }}
              onBlur={() => { const v = parseInt(maxLossesInput); const c = isNaN(v) || v < 1 ? 5 : v; setMaxLossesInput(c.toString()); onUpdateConfig({ maxLosses: c }); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm font-mono text-slate-200 focus:border-indigo-500 outline-none transition-colors disabled:opacity-50" />
            <p className="text-[9px] font-mono text-slate-600 mt-1">Consecutive</p>
          </div>
        </div>

        {/* Presets */}
        <div className="px-4 pb-4">
          <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Quick Presets</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Conservative', stake: 0.35, mult: 2.0, cls: 'text-amber-400 border-amber-900/40 bg-amber-950/20 hover:bg-amber-950/40' },
              { label: 'Balanced', stake: Math.max(0.35, parseFloat((activeBalance * 0.01).toFixed(2))), mult: 2.0, cls: 'text-indigo-400 border-indigo-900/40 bg-indigo-950/20 hover:bg-indigo-950/40' },
              { label: 'Aggressive', stake: Math.max(0.35, parseFloat((activeBalance * 0.02).toFixed(2))), mult: 2.1, cls: 'text-violet-400 border-violet-900/40 bg-violet-950/20 hover:bg-violet-950/40' },
            ].map(p => (
              <button key={p.label} onClick={() => onUpdateConfig({ stake: p.stake, martingaleMultiplier: p.mult })}
                disabled={botState.isRunning}
                className={`py-2.5 px-1 rounded-xl border text-center text-[10px] font-mono font-bold disabled:opacity-40 transition-colors ${p.cls}`}>
                {p.label}
                <span className="block text-[9px] font-normal opacity-70 mt-0.5">${p.stake.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Activity Log ── */}
      <button onClick={() => setShowConsole(true)}
        className="w-full py-3 rounded-2xl border border-slate-800 bg-slate-900 text-slate-500 hover:text-indigo-400 hover:border-indigo-900/50 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors">
        <Terminal className="w-4 h-4" />
        View Activity Log
        {logs.length > 0 && <span className="ml-1 bg-indigo-900/60 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded-full">{logs.length}</span>}
      </button>

      {/* ── Log Console Drawer ── */}
      {showConsole && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="font-mono text-sm font-bold text-slate-200">Activity Log</span>
              <span className={`w-2 h-2 rounded-full ${botState.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClearLogs} className="text-slate-500 hover:text-slate-300 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setShowConsole(false)} className="text-slate-400 hover:text-white font-mono text-sm font-bold px-2">✕</button>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800 bg-slate-900/60">
            <div className="py-2 text-center">
              <span className="text-[9px] font-mono text-slate-500 block">NET P&L</span>
              <span className={`text-sm font-black font-mono ${botState.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
              </span>
            </div>
            <div className="py-2 text-center">
              <span className="text-[9px] font-mono text-slate-500 block">W / L</span>
              <span className="text-sm font-black font-mono text-slate-200">{botState.wins} / {botState.losses}</span>
            </div>
            <div className="py-2 text-center">
              <span className="text-[9px] font-mono text-slate-500 block">STAKE</span>
              <span className="text-sm font-black font-mono text-indigo-400">${botState.currentStake.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 font-mono text-[11px]">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="flex gap-2 border-l-2 border-slate-800 pl-2 py-0.5">
                <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                <span className={getLogColor(log.type, log.message)}>{log.message}</span>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                <CheckSquare className="w-6 h-6" />
                <span>No activity yet. Start trading to see logs.</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
          <div className="px-4 py-2 border-t border-slate-800 text-center text-[9px] font-mono text-slate-700">
            Signal: RISE direction + last digit 4 or 5 → DIGIT OVER 4 contract
          </div>
        </div>
      )}
    </div>
  );
}
