import { useState, useRef, useEffect, FormEvent } from 'react';
import { BotConfig, BotState, AccountInfo, LogMessage, SymbolInfo, SymbolState } from '../types';
import {
  Play, Square, RefreshCw, AlertTriangle, Key, ExternalLink,
  ShieldCheck, Terminal, Trash2, CheckSquare, TrendingUp,
  TrendingDown, Eye, EyeOff, RotateCcw, Zap, FlaskConical, Shield,
  Wallet, ChevronDown, ChevronUp, BarChart4, Cpu
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
  onNavigateToWallet: () => void;
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
  onNavigateToWallet,
}: BotTraderProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (isConsoleExpanded && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, isConsoleExpanded]);

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

  // Derived state
  const activeState = symbolsState[activeSymbol.id];
  const activeTotalSim = activeState ? (activeState.wins + activeState.losses) : 0;
  const activeWinRate = activeTotalSim >= 3 ? (activeState.wins / activeTotalSim) * 100 : null;
  const activeSignals = activeState?.signals ?? 0;
  const isCalibrating = typeof sessionUptime === 'number' && sessionUptime < 300;
  // Requires: ≥5 sim trades, ≥55% win rate, ≥5 signals — matches server scoring gate
  const meetsConditions = !isCalibrating &&
    activeWinRate !== null &&
    activeWinRate >= 55 &&
    activeSignals >= 5 &&
    activeTotalSim >= 5;
  const totalTrades = botState.wins + botState.losses;
  const sessionWinRate = totalTrades > 0 ? (botState.wins / totalTrades) * 100 : 0;
  const isOnDemo = botConfig.isDemo;

  // Balance
  const demoBalance = demoAccount?.balance ?? 1000;
  const realBalance = realAccount?.balance ?? 0;
  const activeBalance = isOnDemo ? demoBalance : realBalance;
  const activeCurrency = isOnDemo ? 'USD' : (realAccount?.currency ?? 'USD');

  const canTrade = isOnDemo || !!realAccount;

  const getLogColor = (type: LogMessage['type'], msg?: string) => {
    if (type === 'success') return 'text-emerald-500';
    if (type === 'error') return 'text-rose-500 font-bold';
    if (type === 'warning') return 'text-amber-500';
    if (type === 'trade') {
      if (msg?.includes('WON')) return 'text-emerald-500 font-black';
      if (msg?.includes('LOST')) return 'text-rose-500 font-black';
      return 'text-indigo-500';
    }
    return 'text-slate-400';
  };

  return (
    <div className="space-y-4 pb-20 font-sans">

      {/* ══════════════════════════════════════════
          SLICK INTEGRATED LEDGER / BALANCE STRIP
          ══════════════════════════════════════════ */}
      <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl flex flex-row items-center justify-between gap-3 text-left transition-colors">
        <div className="flex items-center gap-2">
          {isOnDemo ? (
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <FlaskConical className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1 leading-none">
              <span className="text-[8.5px] font-mono tracking-wider text-slate-500 uppercase">WALLET LEDGER</span>
              <span className={`px-1 py-0.5 rounded text-[7.5px] font-mono font-bold tracking-wider ${isOnDemo ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {isOnDemo ? 'DEMO' : 'LIVE'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-mono font-extrabold text-slate-100">
                ${activeBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[7.5px] font-mono text-slate-450 uppercase font-bold">{activeCurrency}</span>
            </div>
          </div>
        </div>

        <button 
          type="button"
          onClick={onNavigateToWallet}
          className="px-2 py-1 bg-slate-950 hover:bg-slate-850 active:scale-97 text-slate-350 hover:text-white font-mono text-[8.5px] font-black rounded-lg border border-slate-805 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Wallet className="w-3 h-3 text-indigo-400" />
          MANAGE
        </button>
      </div>

      {/* ══════════════════════════════════════════
          THE PROFESSIONAL WORKSTATION CONSOLE
          ══════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 overflow-hidden shadow-lg select-none">
        
        {/* Workstation Header / Asset Ticker */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block leading-none">ORDER DESK CONTRACT</span>
              <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                <span className="text-[12.5px] font-extrabold text-slate-100 leading-none">{activeSymbol.name}</span>
                <span className="bg-indigo-950 text-indigo-400 px-1 py-0.5 rounded text-[7.5px] font-mono font-bold border border-indigo-900/40 leading-none">DIGIT OVER 4</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:text-right">
            {!botState.isRunning && (
              <button 
                onClick={handleSearchAndLoad}
                disabled={isScanning || botState.isRunning || isCalibrating}
                className="px-2.5 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 text-[9px] font-mono font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>SCANNING {Object.values(symbolsState)[scanIndex]?.info.short ?? 'PAIRS'}...</span>
                  </>
                ) : searchLoadCountdown !== null ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-pulse" />
                    <span>AUTO-LOAD ({searchLoadCountdown}s)</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>LOAD BEST PAIR</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Warning Alerts Container */}
        <div>
          {!botState.isRunning && isCalibrating && (
            <div className="mx-3 mt-2.5 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/25 text-[10px] text-slate-300 flex items-start gap-1.5 animate-fade-in text-left">
              <RefreshCw className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '3s' }} />
              <div>
                <span className="font-bold text-slate-100 block leading-tight">Trading Engine Calibrating</span>
                Remaining duration: <span className="font-mono font-bold text-indigo-400">{Math.floor((300 - sessionUptime) / 60)}m {String((300 - sessionUptime) % 60).padStart(2, '0')}s</span>. The algorithmic matrices are buffering tick arrays.
              </div>
            </div>
          )}
          {!botState.isRunning && !isCalibrating && !meetsConditions && (
            <div className="mx-3 mt-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/25 text-[10px] text-slate-300 flex items-start gap-1.5 animate-fade-in font-sans text-left">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-slate-100 block leading-tight">Favorable Signal Required</span>
                Current pair credibility is low. Click <button onClick={handleSearchAndLoad} className="text-indigo-400 underline font-semibold hover:text-indigo-300">Load Best Pair</button> or expect further automatic scanner audits.
              </div>
            </div>
          )}
          {isAdvancedMode && botState.status === 'paused_low_winrate' && (
            <div className="mx-3 mt-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/25 text-[10px] text-slate-300 flex items-start gap-1.5 animate-pulse text-left">
              <RefreshCw className="w-3 h-3 text-amber-400 shrink-0 mt-0.5 animate-spin" />
              <div>
                <span className="font-bold text-slate-100 block leading-tight">Adaptive Auto-Swap Initiated</span>
                Win rate threshold broken. Systematically swapping out currency pairs for optimal parameters.
              </div>
            </div>
          )}

          {/* Insufficient demo balance warning */}
          {isOnDemo && !botState.isRunning && demoBalance < (botConfig.stake ?? 0.35) && (
            <div className="mx-3 mt-2.5 p-3 rounded-lg bg-red-950/30 border border-red-700/50 text-[10px] text-slate-200 flex items-start gap-2 text-left">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <span className="font-bold text-red-300 block text-xs">Insufficient Demo Balance</span>
                <p className="text-slate-400 leading-relaxed">
                  Your demo balance of <span className="text-white font-mono font-bold">${demoBalance.toFixed(2)}</span> is not enough to cover the <span className="text-white font-mono font-bold">${(botConfig.stake ?? 0.35).toFixed(2)}</span> stake. Reset your demo balance to continue practising.
                </p>
                <button
                  onClick={onResetDemoBalance}
                  className="mt-1 flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Demo to $1,000
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Master Double-Panel Desktop/Mobile Grid */}
        <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          
          {/* Panel 1: Order Ticket Parameters & Actions */}
          <div className="bg-slate-950/20 border border-slate-800/50 p-3 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">ORDER DECK PARAMETERS</span>
              <button 
                onClick={() => onToggleAdvancedMode(!isAdvancedMode)} 
                disabled={botState.isRunning}
                className={`flex items-center gap-1 text-[8px] font-mono font-black px-1.5 py-0.5 rounded border transition-all disabled:opacity-40 cursor-pointer ${
                  isAdvancedMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                <Zap className="w-2 h-2" />
                <span>{isAdvancedMode ? 'ADVANCED AUTO-SWAP' : 'STANDARD'}</span>
              </button>
            </div>

            {/* Parameter Inputs Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-0.5 text-left">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">STAKE AMOUNT</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">$</span>
                  <input 
                    type="number" 
                    step="0.05" 
                    disabled={botState.isRunning} 
                    value={stakeInput}
                    onChange={e => { setStakeInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ stake: v }); }}
                    onBlur={() => { const v = parseFloat(stakeInput); const c = isNaN(v) || v < 0.35 ? 0.35 : v; setStakeInput(c.toString()); onUpdateConfig({ stake: c }); }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 pl-6 pr-2 text-xs font-mono text-slate-100 focus:border-indigo-500 outline-none transition-colors disabled:opacity-45" 
                  />
                </div>
              </div>

              <div className="space-y-0.5 text-left">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">MARTINGALE MULT ×</span>
                <input 
                  type="number" 
                  step="0.1" 
                  disabled={botState.isRunning} 
                  value={martingaleInput}
                  onChange={e => { setMartingaleInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ martingaleMultiplier: v }); }}
                  onBlur={() => { const v = parseFloat(martingaleInput); const c = isNaN(v) || v < 1 ? 1 : v; setMartingaleInput(c.toString()); onUpdateConfig({ martingaleMultiplier: c }); }}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2.5 text-xs font-mono text-slate-100 focus:border-indigo-500 outline-none transition-colors disabled:opacity-45" 
                />
              </div>

              <div className="space-y-0.5 text-left">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">MAX WINS (TARGET)</span>
                <input 
                  type="number" 
                  step="1" 
                  disabled={botState.isRunning} 
                  value={maxWinsInput}
                  onChange={e => { setMaxWinsInput(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ maxWins: v }); }}
                  onBlur={() => { const v = parseInt(maxWinsInput); const c = isNaN(v) || v < 1 ? 2 : v; setMaxWinsInput(c.toString()); onUpdateConfig({ maxWins: c }); }}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2.5 text-xs font-mono text-slate-100 focus:border-indigo-500 outline-none transition-colors disabled:opacity-45" 
                />
              </div>

              <div className="space-y-0.5 text-left">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">MAX CONSEC LOSSES</span>
                <input 
                  type="number" 
                  step="1" 
                  disabled={botState.isRunning} 
                  value={maxLossesInput}
                  onChange={e => { setMaxLossesInput(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onUpdateConfig({ maxLosses: v }); }}
                  onBlur={() => { const v = parseInt(maxLossesInput); const c = isNaN(v) || v < 1 ? 5 : v; setMaxLossesInput(c.toString()); onUpdateConfig({ maxLosses: c }); }}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2.5 text-xs font-mono text-slate-100 focus:border-indigo-500 outline-none transition-colors disabled:opacity-45" 
                />
              </div>
            </div>

            {/* Quick Strategic Presets */}
            <div className="space-y-1 text-left">
              <span className="text-[8px] font-mono text-slate-650 uppercase tracking-widest block font-bold">STRATEGY PRESETS</span>
              <div className="grid grid-cols-3 gap-1.55">
                {[
                  { label: 'CONSERVATIVE', stake: 0.35, mult: 2.0, cls: 'text-amber-400 border-amber-955 bg-amber-500/5 hover:bg-amber-500/10' },
                  { label: 'BALANCED', stake: Math.max(0.35, parseFloat((activeBalance * 0.01).toFixed(2))), mult: 2.0, cls: 'text-indigo-400 border-indigo-950 bg-indigo-500/5 hover:bg-indigo-500/10' },
                  { label: 'AGGRESSIVE', stake: Math.max(0.35, parseFloat((activeBalance * 0.02).toFixed(2))), mult: 2.1, cls: 'text-rose-450 border-rose-955 bg-rose-500/5 hover:bg-rose-500/10' },
                ].map(p => (
                  <button 
                    key={p.label} 
                    onClick={() => onUpdateConfig({ stake: p.stake, martingaleMultiplier: p.mult })}
                    disabled={botState.isRunning}
                    title={`${p.label}: $${p.stake.toFixed(2)} / ${p.mult}x`}
                    className={`py-1.5 px-0.5 rounded-lg border text-center text-[8.5px] font-mono font-extrabold disabled:opacity-30 transition-all cursor-pointer leading-tight ${p.cls}`}
                  >
                    <span>{p.label}</span>
                    <span className="block text-[7.5px] font-normal opacity-70 mt-0.5">${p.stake.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Execute Button Tray */}
            <div className="pt-1">
              {canTrade ? (
                botState.isRunning ? (
                  <button 
                    onClick={onStopBot}
                    className="w-full py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-extrabold text-[10.5px] uppercase tracking-wider border border-rose-500/30 active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-1 leading-none h-[36px]"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>TERMINATE INSTANT SESSION</span>
                  </button>
                ) : (
                  <button 
                    onClick={onStartBot}
                    disabled={isCalibrating || !meetsConditions || (isAdvancedMode && botState.status === 'paused_low_winrate')}
                    className={`w-full py-2 rounded-lg font-extrabold text-[10.5px] uppercase tracking-wider active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-1 leading-none h-[36px] ${
                      meetsConditions && !isCalibrating
                        ? 'bg-indigo-505 text-slate-950 hover:bg-indigo-400 shadow shadow-indigo-500/10'
                        : 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isCalibrating ? 'CALIBRATING SYSTEM' : meetsConditions ? 'INITIATE AUTO-EXECUTION' : 'AWAITING FAV SIGNAL'}</span>
                  </button>
                )
              ) : (
                <button 
                  onClick={() => onUpdateConfig({ isDemo: false })}
                  className="w-full py-2 rounded-lg border border-dashed border-slate-805 hover:border-indigo-500 hover:text-indigo-400 text-slate-500 text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 leading-none h-[36px]"
                >
                  <Key className="w-3 h-3" />
                  <span>AUTHORIZE REAL BOT ACCOUNT</span>
                </button>
              )}
            </div>
          </div>

          {/* Panel 2: Live Analytics & Performance telemetry */}
          <div className="bg-slate-950/20 border border-slate-800/40 p-3 rounded-xl flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">LIVE ANALYTICS ENGINE</span>
              <span className={`text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                botState.isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-slate-900 text-slate-400 border-slate-805'
              }`}>
                {botState.isRunning ? '● ACTIVE MATRIX' : '○ ENGINE INACTIVE'}
              </span>
            </div>

            {/* Financial Gross Ledger Box */}
            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 flex items-center justify-between text-left">
              <div>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest block leading-none">CUMULATIVE SESSION NET P&L</span>
                <span className={`text-xl font-mono font-black tracking-tight mt-1 ml-0.5 block ${botState.profit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                  {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-3">
                <div className="text-right">
                  <span className="text-[7.5px] font-mono text-slate-500 block">WINS</span>
                  <span className="text-sm font-extrabold font-mono text-emerald-450 flex items-center justify-end gap-0.5 mt-0.5 leading-none">
                    <TrendingUp className="w-3 h-3 text-emerald-450" />
                    <span>{botState.wins}</span>
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-800 self-center" />
                <div className="text-right text-rose-450">
                  <span className="text-[7.5px] font-mono text-slate-500 block">LOSSES</span>
                  <span className="text-sm font-extrabold font-mono text-rose-450 flex items-center justify-end gap-0.5 mt-0.5 leading-none">
                    <TrendingDown className="w-3 h-3 text-rose-450" />
                    <span>{botState.losses}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Custom KPI grid */}
            <div className="grid grid-cols-3 divide-x divide-slate-800/80 bg-slate-950/20 p-1.5 rounded-lg border border-slate-850/60">
              {[
                { label: 'WIN RATE', value: totalTrades > 0 ? `${sessionWinRate.toFixed(0)}%` : '—', color: sessionWinRate >= 55 ? 'text-emerald-450 text-emerald-400 font-bold' : totalTrades > 0 ? 'text-amber-450 font-bold' : 'text-slate-500' },
                { label: 'TRADES', value: String(botState.tradesCount), color: 'text-slate-200' },
                { label: 'TARGET STAKE', value: `$${botState.currentStake.toFixed(2)}`, color: 'text-indigo-400 font-mono' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center py-1">
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider block">{label}</span>
                  <span className={`text-[11px] font-black mt-0.5 block ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Matrix Progress bars / Threshold bounds */}
            <div className="space-y-2 pt-1 text-left">
              <div>
                <div className="flex justify-between items-center text-[8px] font-mono mb-0.5 leading-none">
                  <span className="text-slate-500 uppercase">PROFIT LEVEL</span>
                  <span className="font-extrabold text-emerald-450 text-emerald-400">{botState.wins} / {botConfig.maxWins} W</span>
                </div>
                <div className="h-0.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (botState.wins / botConfig.maxWins) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-[8px] font-mono mb-0.5 leading-none">
                  <span className="text-slate-500 uppercase font-bold">MAX LOSS LIMIT</span>
                  <span className="font-extrabold text-rose-450 text-rose-500">{botState.consecutiveLosses} / {botConfig.maxLosses} L</span>
                </div>
                <div className="h-0.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (botState.consecutiveLosses / botConfig.maxLosses) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Console Block inside the Trading workstation */}
        <div className="border-t border-slate-800/60 bg-slate-950/30">
          <button 
            type="button"
            onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-400 hover:text-slate-100 transition-colors font-mono text-[9px] font-bold cursor-pointer leading-none"
          >
            <div className="flex items-center gap-1.5 leading-none">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>ALGORITHMIC SIGNAL FEED STREAM</span>
              {logs.length > 0 && <span className="bg-indigo-500/15 text-indigo-400 text-[7.5px] px-1 py-0.5 rounded-full border border-indigo-500/10 font-bold leading-none">{logs.length} EVENTS</span>}
            </div>
            {isConsoleExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {isConsoleExpanded && (
            <div className="border-t border-slate-800/40 bg-slate-950/95 p-3 space-y-2 font-mono text-[9px] leading-relaxed select-all text-left">
              <div ref={terminalContainerRef} className="h-28 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent text-left">
                {logs.length > 0 ? logs.map(log => (
                  <div key={log.id} className="flex gap-2 border-l border-slate-900 pl-1.5 py-0.5">
                    <span className="text-slate-600 shrink-0 font-light select-none">{log.timestamp}</span>
                    <span className={getLogColor(log.type, log.message)}>{log.message}</span>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-1.5 select-none py-4">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-700 animate-pulse" />
                    <span className="text-[8.5px]">Awaiting telemetry signals. Activate auto execution to start stream.</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[7.5px] text-slate-500 border-t border-slate-900/40 pt-1.5 shrink-0 leading-none">
                <span className="flex items-center gap-1 leading-none">
                  <Zap className="w-2.5 h-2.5 text-indigo-505" />
                  <span>MATRIX: LAST DIGIT EVENT OVER 4 DETECTOR MATCH</span>
                </span>
                <button 
                  type="button"
                  onClick={onClearLogs} 
                  className="px-1.5 py-0.5 hover:bg-slate-900 border border-slate-900/50 hover:border-slate-800 rounded text-slate-500 hover:text-slate-350 transition-all flex items-center gap-1 cursor-pointer leading-tight font-black uppercase text-[7.5px]"
                >
                  <Trash2 className="w-2 h-2" />
                  <span>CLEAR EVENTS</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
