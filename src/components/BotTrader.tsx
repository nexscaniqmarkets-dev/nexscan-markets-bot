import { useState, useRef, useEffect, FormEvent } from 'react';
import { BotConfig, BotState, AccountInfo, LogMessage, SymbolInfo, SymbolState } from '../types';
import { getVolColor, formatPrice } from '../constants';
import { 
  Lock, Key, Play, Square, CircleCheck, Info, RefreshCw, AlertTriangle, 
  HelpCircle, Trash2, Wallet, Layers, ShieldCheck, CheckSquare, Terminal, ExternalLink,
  ShieldAlert, Zap
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
  activeSymbol,
  symbolsState,
  onSelectSymbolForTrading,
  account,
  demoAccount,
  realAccount,
  botConfig,
  onUpdateConfig,
  onAuthorize,
  onDeauthorize,
  onStartBot,
  onStopBot,
  botState,
  logs,
  onClearLogs,
  authorizedWsStatus = 'idle',
  sessionUptime = 300,
  autoTriggerScan = false,
  onScanReset = () => {},
  autoTriggerResume = false,
  onResumeReset = () => {},
  onResumeWithSymbol = () => {},
  isAdvancedMode = false,
  onToggleAdvancedMode = () => {},
  onResetDemoBalance = () => {},
}: BotTraderProps) {
  const [tokenInput, setTokenInput] = useState(botConfig.apiToken);
  const [showToken, setShowToken] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const isAutoTransitionRef = useRef(false);
  const isResumeModeRef = useRef(false);

  // Search and Load countdown states
  const [searchLoadCountdown, setSearchLoadCountdown] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);

  // Monitor automated scanning trigger on win
  useEffect(() => {
    if (autoTriggerScan) {
      isAutoTransitionRef.current = false;
      isResumeModeRef.current = false;
      onScanReset();
      handleSearchAndLoad();
    }
  }, [autoTriggerScan]);

  // Monitor resume trigger — fires when pair credibility drops below 55%
  useEffect(() => {
    if (autoTriggerResume) {
      isResumeModeRef.current = true;
      isAutoTransitionRef.current = false;
      onResumeReset();
      handleSearchAndLoad();
    }
  }, [autoTriggerResume]);

  // Monitor trade state to trigger the 10s countdown ONLY on completed trade cycle (won_limit or lost_limit)
  const lastBotStatusRef = useRef(botState.status);
  useEffect(() => {
    if (
      (botState.status === 'won_limit' || botState.status === 'lost_limit') &&
      lastBotStatusRef.current !== botState.status
    ) {
      if (botState.status === 'won_limit') {
        isAutoTransitionRef.current = false;
      }
      setSearchLoadCountdown(10);
    }
    lastBotStatusRef.current = botState.status;
  }, [botState.status]);

  // Cancel any running countdown if trading starts manually or is currently running
  useEffect(() => {
    if (botState.isRunning) {
      setSearchLoadCountdown(null);
    }
  }, [botState.isRunning]);

  // Handle countdown interval
  useEffect(() => {
    if (searchLoadCountdown === null) return;
    if (searchLoadCountdown <= 0) {
      setSearchLoadCountdown(null);
      handleSearchAndLoad();
      return;
    }

    const timer = setTimeout(() => {
      setSearchLoadCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchLoadCountdown]);

  // Compute best symbol based on the leaderboard logic
  // In resume mode: excludes the current failing symbol and prefers pairs with >= 55% win rate
  const getBestSymbolId = () => {
    const currentSymbol = botState.symbol;
    const inResumeMode = isResumeModeRef.current;

    const ranked = Object.values(symbolsState)
      .filter((state) => {
        // In resume mode, skip the symbol that just lost credibility
        if (inResumeMode && state.info.id === currentSymbol) return false;
        return true;
      })
      .map((state) => {
        const totalSim = state.wins + state.losses;
        const winRate = totalSim >= 3 ? (state.wins / totalSim) * 100 : null;
        const signalFreq = state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0;
        const score = winRate !== null
          ? winRate * 0.65 + Math.min(signalFreq * 5.0, 100) * 0.35
          : -1;
        return { id: state.info.id, score, winRate };
      })
      .sort((a, b) => b.score - a.score);

    // In resume mode, prefer a pair that already meets the 55% threshold
    if (inResumeMode) {
      const qualifying = ranked.find((s) => s.winRate !== null && s.winRate >= 55.0);
      if (qualifying) return qualifying.id;
    }

    return ranked[0]?.id || 'R_100';
  };

  // Run the visual sweep going through symbols and then loading the best one
  const handleSearchAndLoad = () => {
    setSearchLoadCountdown(null);
    setIsScanning(true);
    let currentIdx = 0;
    const symbolsList = Object.values(symbolsState).map(s => s.info);
    
    if (symbolsList.length === 0) {
      setIsScanning(false);
      return;
    }

    const intervalId = setInterval(() => {
      if (currentIdx < symbolsList.length * 2) {
        setScanIndex(currentIdx % symbolsList.length);
        currentIdx++;
      } else {
        clearInterval(intervalId);
        setIsScanning(false);
        const bestSymbolId = getBestSymbolId();

        if (isResumeModeRef.current) {
          // Resume mode: switch pair and continue session without resetting stats
          isResumeModeRef.current = false;
          onResumeWithSymbol(bestSymbolId);
        } else {
          // Normal mode: load the pair and optionally auto-start
          const shouldAutoStart = isAutoTransitionRef.current;
          isAutoTransitionRef.current = false;
          onSelectSymbolForTrading(bestSymbolId, shouldAutoStart);
        }
      }
    }, 100);
  };

  // Local inputs for fully fluid entry and deletion
  const [stakeInput, setStakeInput] = useState(botConfig.stake.toString());
  const [martingaleInput, setMartingaleInput] = useState(botConfig.martingaleMultiplier.toString());
  const [maxWinsInput, setMaxWinsInput] = useState(botConfig.maxWins.toString());
  const [maxLossesInput, setMaxLossesInput] = useState(botConfig.maxLosses.toString());

  // Sync local inputs if parent config changes (e.g., via presets)
  useEffect(() => {
    setStakeInput(botConfig.stake.toString());
  }, [botConfig.stake]);

  useEffect(() => {
    setMartingaleInput(botConfig.martingaleMultiplier.toString());
  }, [botConfig.martingaleMultiplier]);

  useEffect(() => {
    setMaxWinsInput(botConfig.maxWins.toString());
  }, [botConfig.maxWins]);

  useEffect(() => {
    setMaxLossesInput(botConfig.maxLosses.toString());
  }, [botConfig.maxLosses]);

  const handleStakeChange = (val: string) => {
    setStakeInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateConfig({ stake: parsed });
    }
  };

  const handleStakeBlur = () => {
    const parsed = parseFloat(stakeInput);
    const clamped = isNaN(parsed) || parsed < 0.35 ? 0.35 : parsed;
    setStakeInput(clamped.toString());
    onUpdateConfig({ stake: clamped });
  };

  const handleMartingaleChange = (val: string) => {
    setMartingaleInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateConfig({ martingaleMultiplier: parsed });
    }
  };

  const handleMartingaleBlur = () => {
    const parsed = parseFloat(martingaleInput);
    const clamped = isNaN(parsed) || parsed < 1.0 ? 1.0 : parsed;
    setMartingaleInput(clamped.toString());
    onUpdateConfig({ martingaleMultiplier: clamped });
  };

  const handleMaxWinsChange = (val: string) => {
    setMaxWinsInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateConfig({ maxWins: parsed });
    }
  };

  const handleMaxWinsBlur = () => {
    const parsed = parseInt(maxWinsInput, 10);
    const clamped = isNaN(parsed) || parsed < 1 ? 2 : parsed;
    setMaxWinsInput(clamped.toString());
    onUpdateConfig({ maxWins: clamped });
  };

  const handleMaxLossesChange = (val: string) => {
    setMaxLossesInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateConfig({ maxLosses: parsed });
    }
  };

  const handleMaxLossesBlur = () => {
    const parsed = parseInt(maxLossesInput, 10);
    const clamped = isNaN(parsed) || parsed < 1 ? 5 : parsed;
    setMaxLossesInput(clamped.toString());
    onUpdateConfig({ maxLosses: clamped });
  };

  // Sync token input if config changes
  useEffect(() => {
    setTokenInput(botConfig.apiToken);
  }, [botConfig.apiToken]);

  // Keep terminal scrolled to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleAuthorizeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      onAuthorize(tokenInput.trim());
    }
  };

  // Re-calculate smart parameters based on active balance
  const applyPresetParams = (tier: 'low' | 'balanced' | 'pro') => {
    const balance = account ? account.balance : 0;
    
    if (tier === 'low') {
      onUpdateConfig({
        stake: 0.35,
        martingaleMultiplier: 2.0,
      });
    } else if (tier === 'balanced') {
      onUpdateConfig({
        stake: Math.max(0.35, Math.round((balance * 0.01) * 100) / 100) || 1.0,
        martingaleMultiplier: 2.0,
      });
    } else if (tier === 'pro') {
      onUpdateConfig({
        stake: Math.max(0.35, Math.round((balance * 0.02) * 100) / 100) || 5.0,
        martingaleMultiplier: 2.1,
      });
    }
  };

  const getLogTypeColor = (type: LogMessage['type'], message?: string) => {
    switch (type) {
      case 'success': return 'text-emerald-400 font-bold';
      case 'error': return 'text-rose-400 font-bold';
      case 'warning': return 'text-amber-400';
      case 'trade': {
        if (message && message.includes('LOST')) return 'text-rose-400 font-semibold';
        if (message && message.includes('WON')) return 'text-emerald-400 font-semibold';
        return 'text-indigo-400 font-semibold';
      }
      default: return 'text-slate-300';
    }
  };

  const activeColor = getVolColor(activeSymbol.vol);

  const activeSymbolState = symbolsState[activeSymbol.id];
  const activeTotalSim = activeSymbolState ? (activeSymbolState.wins + activeSymbolState.losses) : 0;
  const activeWinRate = activeTotalSim >= 3 ? (activeSymbolState.wins / activeTotalSim) * 100 : null;
  const activeSignals = activeSymbolState ? activeSymbolState.signals : 0;

  const isCalibrationActive = typeof sessionUptime === 'number' && sessionUptime < 300;

  // Scanner requirements and conditions: Win Rate >= 55% AND Signals >= 5 (and initial 5-min calibration elapsed)
  const activeMeetsConditions = !isCalibrationActive && !!(activeSymbolState && activeWinRate !== null && activeWinRate >= 55.0 && activeSignals >= 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1">

      {/* Mode Toggle — Normal vs Advanced */}
      <div className="lg:col-span-12 flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-3">
          <Zap className={`w-5 h-5 shrink-0 transition-colors ${isAdvancedMode ? 'text-violet-400' : 'text-slate-500'}`} />
          <div>
            <span className={`text-[11px] font-mono font-black uppercase tracking-wider block leading-none transition-colors ${isAdvancedMode ? 'text-violet-300' : 'text-slate-400'}`}>
              {isAdvancedMode ? '⚡ Advanced Mode — Auto Pair-Swap Enabled' : 'Normal Mode'}
            </span>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans mt-1">
              {isAdvancedMode
                ? "Bot monitors the active pair's live win rate. If it drops below 55%, trading pauses and the scanner finds the next best pair automatically."
                : 'Bot trades on the selected pair with fixed Martingale logic until win/loss limits are reached.'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => onToggleAdvancedMode(!isAdvancedMode)}
          disabled={botState.isRunning}
          title={botState.isRunning ? 'Stop the bot before switching modes' : ''}
          className={`relative inline-flex items-center shrink-0 w-14 h-7 rounded-full border transition-all duration-300 cursor-pointer ml-4
            ${botState.isRunning ? 'opacity-50 cursor-not-allowed' : ''}
            ${isAdvancedMode
              ? 'bg-violet-600 border-violet-500 shadow-lg shadow-violet-900/40'
              : 'bg-slate-700 border-slate-600'
            }`}
        >
          <span className={`inline-block w-5 h-5 rounded-full shadow-md transform transition-transform duration-300
            ${isAdvancedMode ? 'translate-x-7 bg-white' : 'translate-x-1 bg-slate-400'}`}
          />
        </button>
      </div>
      <div className="lg:col-span-7 space-y-6">
        
        {/* Connection & Auth Block */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm space-y-4">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-slate-200 text-sm tracking-tight flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" /> Deriv Secure Integration
            </h3>
            {/* Live status pill */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[9px] font-black uppercase tracking-wider ${
              !botConfig.isDemo
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                : 'bg-amber-950/40 border-amber-800/50 text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${!botConfig.isDemo ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {!botConfig.isDemo ? 'Real' : 'Demo'}
            </div>
          </div>

          {/* ── Mode Toggle Card ── */}
          <div className={`rounded-xl border p-3.5 transition-colors ${
            !botConfig.isDemo
              ? 'bg-emerald-950/10 border-emerald-900/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  !botConfig.isDemo
                    ? 'bg-emerald-950/50 border-emerald-800/60'
                    : 'bg-slate-900 border-slate-800'
                }`}>
                  {!botConfig.isDemo
                    ? <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                    : <ShieldAlert className="w-4.5 h-4.5 text-slate-500" />
                  }
                </div>
                <div>
                  <p className={`text-[11px] font-mono font-black uppercase tracking-wider ${!botConfig.isDemo ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {!botConfig.isDemo ? 'Real Mode' : 'Demo Mode'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-sans leading-tight mt-0.5">
                    {!botConfig.isDemo
                      ? 'Live trades on your Deriv account.'
                      : 'Simulated funds — no real money at risk.'}
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono font-bold ${botConfig.isDemo ? 'text-amber-400' : 'text-slate-600'}`}>DEMO</span>
                  <button
                    type="button"
                    onClick={() => { if (!botState.isRunning) onUpdateConfig({ isDemo: !botConfig.isDemo }); }}
                    disabled={botState.isRunning}
                    title={botState.isRunning ? 'Stop bot before switching' : `Switch to ${botConfig.isDemo ? 'Real' : 'Demo'}`}
                    className={`relative inline-flex shrink-0 w-11 h-6 rounded-full border-2 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      !botConfig.isDemo
                        ? 'bg-emerald-500 border-emerald-400/60 shadow-lg shadow-emerald-900/40'
                        : 'bg-slate-700 border-slate-600/60'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${!botConfig.isDemo ? 'left-[calc(100%-18px)]' : 'left-0.5'}`} />
                  </button>
                  <span className={`text-[9px] font-mono font-bold ${!botConfig.isDemo ? 'text-emerald-400' : 'text-slate-600'}`}>REAL</span>
                </div>
                {!botConfig.isDemo && (
                  <span className="text-[8px] font-mono text-rose-400 font-bold">⚠ LIVE FUNDS</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Account Cards ── */}
          <div className="space-y-2.5">

            {/* Demo Account Card */}
            <div className={`rounded-xl border p-3.5 transition-all ${
              botConfig.isDemo
                ? 'bg-amber-950/15 border-amber-800/40 ring-1 ring-amber-800/20'
                : 'bg-slate-950/40 border-slate-800/60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                    botConfig.isDemo
                      ? 'bg-amber-950/50 border-amber-800/60'
                      : 'bg-slate-900 border-slate-800'
                  }`}>
                    <Wallet className={`w-5 h-5 ${botConfig.isDemo ? 'text-amber-400' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <span className={`text-[9px] font-mono uppercase tracking-widest font-bold block ${botConfig.isDemo ? 'text-amber-500/70' : 'text-slate-600'}`}>
                      Demo Account
                    </span>
                    <span className={`text-xl font-mono font-black block mt-0.5 transition-colors ${botConfig.isDemo ? 'text-slate-100' : 'text-slate-500'}`}>
                      ${((demoAccount ?? account)?.balance ?? 1000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <span className="text-xs font-normal text-slate-500 ml-1">USD</span>
                    </span>
                    <span className={`text-[9px] font-mono block mt-0.5 ${botConfig.isDemo ? 'text-amber-600' : 'text-slate-700'}`}>
                      Sandbox — no real money
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Reset button when balance low */}
                  {botConfig.isDemo && ((demoAccount ?? account)?.balance ?? 0) < 1000 && (
                    <button
                      type="button"
                      onClick={onResetDemoBalance}
                      disabled={botState.isRunning}
                      className="py-1.5 px-2.5 bg-amber-950/40 hover:bg-amber-900/40 text-amber-400 border border-amber-900/50 rounded-lg font-mono text-[8px] font-bold cursor-pointer transition-colors disabled:opacity-40"
                    >
                      ↺ Reset
                    </button>
                  )}
                  {/* Switch to demo button (when on real) */}
                  {!botConfig.isDemo && (
                    <button
                      type="button"
                      onClick={() => { if (!botState.isRunning) onUpdateConfig({ isDemo: true }); }}
                      disabled={botState.isRunning}
                      className="py-1.5 px-3 bg-amber-700/80 hover:bg-amber-600 text-white border border-amber-600/60 rounded-lg font-mono text-[9px] font-black cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      SWITCH →
                    </button>
                  )}
                  {botConfig.isDemo && (
                    <span className="text-[8px] font-mono text-amber-700 font-bold px-2 py-0.5 bg-amber-950/30 rounded-full border border-amber-900/30">ACTIVE</span>
                  )}
                </div>
              </div>
            </div>

            {/* Real / Deriv Account Card */}
            <div className={`rounded-xl border transition-all ${
              !botConfig.isDemo
                ? 'bg-emerald-950/15 border-emerald-800/40 ring-1 ring-emerald-800/20'
                : 'bg-slate-950/40 border-slate-800/60'
            }`}>
              {realAccount ? (
                /* Connected — show balance */
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                      !botConfig.isDemo
                        ? 'bg-emerald-950/50 border-emerald-800/60'
                        : 'bg-slate-900 border-slate-800'
                    }`}>
                      <Wallet className={`w-5 h-5 ${!botConfig.isDemo ? 'text-emerald-400' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <span className={`text-[9px] font-mono uppercase tracking-widest font-bold block ${!botConfig.isDemo ? 'text-emerald-500/70' : 'text-slate-600'}`}>
                        {realAccount.is_virtual ? 'Deriv Demo Account' : 'Live Account'}
                      </span>
                      <span className={`text-xl font-mono font-black block mt-0.5 ${!botConfig.isDemo ? 'text-slate-100' : 'text-slate-500'}`}>
                        ${realAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-slate-500 ml-1">{realAccount.currency}</span>
                      </span>
                      <span className={`text-[9px] font-mono block mt-0.5 ${!botConfig.isDemo ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {realAccount.loginid}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {botConfig.isDemo ? (
                      <button
                        type="button"
                        onClick={() => { if (!botState.isRunning) onUpdateConfig({ isDemo: false }); }}
                        disabled={botState.isRunning}
                        className="py-1.5 px-3 bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-600/60 rounded-lg font-mono text-[9px] font-black cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        SWITCH →
                      </button>
                    ) : (
                      <span className="text-[8px] font-mono text-emerald-700 font-bold px-2 py-0.5 bg-emerald-950/30 rounded-full border border-emerald-900/30">ACTIVE</span>
                    )}
                    <button
                      type="button"
                      onClick={onDeauthorize}
                      disabled={botState.isRunning}
                      className="py-1 px-2.5 bg-slate-900 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 rounded-lg font-mono text-[8px] font-bold cursor-pointer transition-colors disabled:opacity-40"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                /* Not connected — show compact token form */
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <Key className="w-4.5 h-4.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Deriv Account</p>
                      <p className="text-[10px] text-slate-600 font-sans">Not connected — paste your API token to link</p>
                    </div>
                  </div>

                  {authorizedWsStatus === 'error' && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <p className="text-[10px] text-rose-300 font-sans">Token rejected — check scopes (Read + Trade).</p>
                    </div>
                  )}

                  <form onSubmit={handleAuthorizeSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showToken ? 'text' : 'password'}
                        placeholder="Paste API token..."
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-200 placeholder-slate-700 outline-none transition-colors pr-14"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-600 hover:text-slate-400 cursor-pointer"
                      >
                        {showToken ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!tokenInput.trim()}
                      className="shrink-0 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-[10px] font-black rounded-xl cursor-pointer transition-all active:scale-97"
                    >
                      LINK
                    </button>
                  </form>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-600 font-mono">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" /> Encrypted • Never stored
                    </div>
                    <a
                      href="https://deriv.partners/rx?sidc=C6D4FA86-827B-4AAF-844B-344F9FE57A0F&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU334564"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                    >
                      No account? Create free <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* API token how-to — collapsible hint */}
                  <details className="group">
                    <summary className="text-[9px] font-mono text-slate-600 hover:text-slate-400 cursor-pointer list-none flex items-center gap-1 select-none">
                      <span className="group-open:hidden">▶</span>
                      <span className="hidden group-open:inline">▼</span>
                      How to get your API token
                    </summary>
                    <ol className="mt-2 space-y-1 list-decimal list-inside text-[10px] text-slate-500 font-sans leading-relaxed pl-1">
                      <li>Log in to <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">app.deriv.com → API Token</a></li>
                      <li>Enable <span className="text-slate-300">"Read"</span> and <span className="text-slate-300">"Trade"</span> scopes</li>
                      <li>Name it (e.g. <code className="text-indigo-300 bg-slate-900 px-1 rounded">NexScan IQ</code>) → Create</li>
                      <li>Copy and paste it above</li>
                    </ol>
                  </details>
                </div>
              )}
            </div>
          </div>

          {/* Smart Presets — always visible at bottom */}
          <div>
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-2 block">🛡️ Smart Presets</span>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => applyPresetParams('low')} className="py-2.5 px-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-xl text-center cursor-pointer transition-all active:scale-97">
                <div className="text-[9px] font-mono font-bold text-amber-400">Low Risk</div>
                <div className="text-[8px] font-mono text-slate-500 mt-0.5">Stake $0.35</div>
              </button>
              <button onClick={() => applyPresetParams('balanced')} className="py-2.5 px-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-xl text-center cursor-pointer transition-all active:scale-97">
                <div className="text-[9px] font-mono font-bold text-indigo-400">Balanced</div>
                <div className="text-[8px] font-mono text-slate-500 mt-0.5">Stake 1%</div>
              </button>
              <button onClick={() => applyPresetParams('pro')} className="py-2.5 px-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-xl text-center cursor-pointer transition-all active:scale-97">
                <div className="text-[9px] font-mono font-bold text-purple-400">Pro Power</div>
                <div className="text-[8px] font-mono text-slate-500 mt-0.5">Stake 2%</div>
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Mode — Live Win Rate Monitor Panel */}
        {isAdvancedMode && (
          <div className="rounded-2xl bg-violet-950/20 border border-violet-800/50 p-5 shadow-sm space-y-4">
            <h3 className="font-sans font-bold text-violet-200 text-sm tracking-tight flex items-center gap-2 border-b border-violet-800/40 pb-3">
              <Zap className="w-4 h-4 text-violet-400" /> Auto Pair-Swap Monitor
            </h3>

            {(() => {
              const activeState = symbolsState[activeSymbol.id];
              const totalSim = activeState ? activeState.wins + activeState.losses : 0;
              const liveWinRate = totalSim >= 3 ? (activeState.wins / totalSim) * 100 : null;
              const THRESHOLD = 55;
              const isCritical = liveWinRate !== null && liveWinRate < THRESHOLD;
              const isHealthy = liveWinRate !== null && liveWinRate >= THRESHOLD;

              return (
                <div className="space-y-4">
                  {/* Win rate gauge */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                        Live Win Rate — {activeSymbol.short}
                      </span>
                      <span className={`text-[11px] font-mono font-black ${isCritical ? 'text-rose-400' : isHealthy ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {liveWinRate !== null ? `${liveWinRate.toFixed(1)}%` : totalSim < 3 ? `Warming up (${totalSim}/3 trades)` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
                      {/* Threshold line */}
                      <div className="absolute top-0 bottom-0 w-px bg-violet-500/70 z-10" style={{ left: `${THRESHOLD}%` }} />
                      {/* Fill */}
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isCritical ? 'bg-rose-500' : isHealthy ? 'bg-emerald-500' : 'bg-slate-600'}`}
                        style={{ width: liveWinRate !== null ? `${Math.min(liveWinRate, 100)}%` : '0%' }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] font-mono text-slate-600">0%</span>
                      <span className="text-[9px] font-mono text-violet-400">55% threshold</span>
                      <span className="text-[9px] font-mono text-slate-600">100%</span>
                    </div>
                  </div>

                  {/* Status chips */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Wins</div>
                      <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">{activeState?.wins ?? 0}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Losses</div>
                      <div className="text-sm font-mono font-black text-rose-400 mt-0.5">{activeState?.losses ?? 0}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Trades</div>
                      <div className="text-sm font-mono font-black text-slate-300 mt-0.5">{totalSim}</div>
                    </div>
                  </div>

                  {/* Status message */}
                  <div className={`flex items-start gap-2.5 p-3 rounded-xl text-[10px] font-sans leading-relaxed border ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                      : isHealthy
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}>
                    <span className="shrink-0 mt-0.5">{isCritical ? '⚠️' : isHealthy ? '✅' : '⏳'}</span>
                    <span>
                      {isCritical
                        ? `Win rate is below 55%. If bot is running, it will pause and auto-scan for a better performing pair.`
                        : isHealthy
                          ? `Pair credibility is healthy. Bot will continue trading on ${activeSymbol.short}.`
                          : `Collecting baseline data. Auto-swap monitoring activates after 3 or more trades.`}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Risk Param Customizers */}
        <div className={`rounded-2xl p-5 shadow-sm space-y-4 ${isAdvancedMode ? 'bg-violet-950/10 border border-violet-800/40' : 'bg-slate-900 border border-slate-800'}`}>
          <h3 className={`font-sans font-bold text-slate-200 text-sm tracking-tight flex items-center gap-2 border-b pb-3 ${isAdvancedMode ? 'border-violet-800/40' : 'border-slate-800/80'}`}>
            <Layers className={`w-4 h-4 ${isAdvancedMode ? 'text-violet-400' : 'text-amber-500'}`} /> Active Trade Parameters
            {isAdvancedMode && <span className="ml-auto text-[9px] font-mono text-violet-500 tracking-widest uppercase font-bold">⚡ Advanced</span>}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Stake Input */}
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest block mb-1.5">
                Stake Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.05"
                  disabled={botState.isRunning}
                  value={stakeInput}
                  onChange={(e) => handleStakeChange(e.target.value)}
                  onBlur={handleStakeBlur}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                />
              </div>
              <p className="text-[9px] font-mono text-slate-600 mt-1">Minimum stake: $0.35 USD</p>
            </div>

            {/* Martingale Multiplier Input */}
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest block mb-1.5">
                Martingale Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                disabled={botState.isRunning}
                value={martingaleInput}
                onChange={(e) => handleMartingaleChange(e.target.value)}
                onBlur={handleMartingaleBlur}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
              />
              <p className="text-[9px] font-mono text-slate-600 mt-1">Multiplier on loss (Default: 2.0)</p>
            </div>
          </div>
        </div>

        {/* Selected Asset Information */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center font-mono font-black"
                style={{ color: activeColor }}
              >
                {activeSymbol.short}
              </div>
              <div>
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none block">
                  Loaded Asset for Trading
                </span>
                <span className="text-sm font-sans font-bold text-slate-100 mt-1 block">
                  {activeSymbol.name}
                </span>
              </div>
            </div>

            <div className="w-full sm:w-auto flex gap-2">
              <button
                disabled={true}
                className="flex-1 sm:flex-initial py-2 px-3 bg-slate-950/40 text-[10px] font-mono text-slate-500 rounded-lg border border-slate-850"
              >
                DIGITOVER • barrier: 4
              </button>
            </div>
          </div>
        </div>

        {/* Execute Auto-Trader Action Container */}
        <div>
          {account ? (
            !botState.isRunning ? (
              <div className="space-y-4">
                {/* Paused due to low win rate — advanced mode only */}
                {isAdvancedMode && botState.status === 'paused_low_winrate' && (
                  <div className="flex gap-2.5 p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/40 text-[11px] text-amber-200">
                    <RefreshCw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-spin" />
                    <div className="space-y-1">
                      <div className="font-bold font-sans text-amber-300">⚠️ Pair Credibility Lost — Session Paused</div>
                      <p className="text-slate-300 font-sans leading-relaxed">
                        The active pair <span className="font-bold text-amber-300">"{activeSymbol.name}"</span> dropped below the <span className="font-bold text-emerald-400">55% win rate</span> threshold. The scanner is searching for the next best qualifying pair to resume your session. All session stats are preserved.
                      </p>
                    </div>
                  </div>
                )}
                {isCalibrationActive ? (
                  <div className="flex gap-2.5 p-3.5 rounded-xl bg-indigo-950/25 border border-indigo-500/30 text-[11px] text-indigo-200">
                    <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '3.0s' }} />
                    <div className="space-y-1">
                      <div className="font-bold font-sans text-indigo-300">Continuous Scan Calibration Active</div>
                      <p className="text-slate-300 font-sans leading-relaxed">
                        The bot is executing its initial 5-minute calibration scan to gather baseline market metrics safely before the trading feed is unlocked.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        <div className="px-2 py-0.5 rounded bg-slate-950/60 font-mono text-[9px] text-slate-400 border border-slate-805">
                          Calibration Countdown: <span className="text-indigo-400 font-bold font-mono">
                            {Math.floor((300 - sessionUptime) / 60)}:{(300 - sessionUptime) % 60 < 10 ? '0' : ''}{(300 - sessionUptime) % 60}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : !activeMeetsConditions ? (
                  <div className="flex gap-2.5 p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-200">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold font-sans">Scanner Conditions Not Met</div>
                      <p className="text-slate-300 font-sans leading-relaxed">
                        The loaded pair <span className="font-bold text-amber-300">"{activeSymbol.name}"</span> does not meet the scanner's risk & win-rate conditions yet. 
                        Live auto-trading is locked until a pair with <span className="font-bold text-emerald-400">≥ 55.0% Win Rate</span> and <span className="font-bold text-emerald-400">≥ 5 Signals</span> is found and loaded.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        <div className="px-2 py-0.5 rounded bg-slate-950/60 font-mono text-[9px] text-slate-400 border border-slate-800">
                          Current Win Rate: <span className={activeWinRate && activeWinRate >= 55.0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {activeWinRate !== null ? `${activeWinRate.toFixed(1)}%` : 'Calculating (need ≥3 sim)...'}
                          </span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-slate-950/60 font-mono text-[9px] text-slate-400 border border-slate-800">
                          Current Signals: <span className={activeSignals >= 5 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {activeSignals} / 5
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 pt-1 font-sans">
                        💡 <span className="text-indigo-300 font-medium">Tip:</span> Let the scanner build up tick data, click <span className="font-semibold text-indigo-300">"Search & Load Best Pair"</span> below, or select a high win-rate pair from the <span className="font-semibold text-indigo-300">Market Leaderboard</span>.
                      </p>
                    </div>
                  </div>
                ) : null}
                <button
                  id="mainStartBotBtn"
                  onClick={onStartBot}
                  disabled={isCalibrationActive || !activeMeetsConditions || (isAdvancedMode && botState.status === 'paused_low_winrate')}
                  className={`w-full py-4 font-mono text-sm font-black tracking-widest uppercase transition-all duration-150 flex items-center justify-center gap-2 border rounded-2xl ${
                    isAdvancedMode && botState.status === 'paused_low_winrate'
                      ? 'bg-amber-950/30 text-amber-400 border-amber-700/50 cursor-not-allowed animate-pulse'
                      : activeMeetsConditions
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 cursor-pointer shadow-xl shadow-amber-950/20 active:scale-[0.99] border-transparent'
                      : 'bg-slate-800 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isAdvancedMode && botState.status === 'paused_low_winrate' ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> SCANNING FOR REPLACEMENT PAIR...
                    </>
                  ) : isCalibrationActive ? (
                    <>
                      <Lock className="w-5 h-5 animate-pulse text-indigo-400" /> STAGES LOCKED DURING CALIBRATION
                    </>
                  ) : activeMeetsConditions ? (
                    <>
                      <Play className="w-5 h-5 fill-current" /> TRADE
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" /> AWAITING OPTIMAL SCANNER REQUIREMENTS
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                id="mainStopBotBtn"
                onClick={onStopBot}
                className="w-full py-4 bg-slate-950 border border-rose-500/80 hover:bg-rose-950/20 text-rose-400 hover:text-white font-mono text-sm font-black tracking-widest uppercase cursor-pointer rounded-2xl transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2 animate-pulse"
              >
                <Square className="w-5 h-5 fill-current" /> ABORT AUTOMATED TRADING
              </button>
            )
          ) : (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center">
              <span className="text-xs font-mono text-slate-500 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> API Authentication required to enable trader execution
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Performance Stats Panel - Replacing Terminal Console */}
      <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm min-h-[380px]">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <CircleCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-sans font-bold text-slate-200 text-sm tracking-tight">LIVE PERFORMANCE HUD</h3>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mode badge */}
              <span className={`font-mono text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                isAdvancedMode
                  ? 'bg-violet-950/40 text-violet-300 border-violet-700/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {isAdvancedMode ? '⚡ ADVANCED' : 'NORMAL'}
              </span>
              <span className="font-mono text-[8px] text-slate-500 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-850">
                <span className={`w-1.5 h-1.5 rounded-full ${botState.isRunning ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`} />
                {botState.isRunning ? 'BOT ACTIVE' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* NET PROFIT CARD - Massive Display */}
          <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-5 text-center mb-5 relative overflow-hidden">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block mb-2 leading-none">
              NET PROFIT / LOSS
            </span>
            <div className={`text-4xl lg:text-5xl font-black font-mono tracking-tight transition-all duration-300 ${
              botState.profit >= 0 
                ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.30)]' 
                : 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.30)]'
            }`}>
              {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
            </div>
            {/* Soft decorative background pulse */}
            {botState.isRunning && (
              <div className={`absolute inset-0 opacity-[0.03] pointer-events-none animate-pulse ${
                botState.profit >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
              }`} />
            )}
          </div>

          {/* Wins & Losses Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Wins Box */}
            <div className="bg-emerald-950/15 border border-emerald-900/30 rounded-xl p-4 text-center select-none">
              <span className="text-[8px] font-mono text-emerald-500 tracking-widest block leading-none mb-1.5 uppercase font-bold">WINS</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {botState.wins} <span className="text-emerald-700 text-xs font-normal">/ {botConfig.maxWins}</span>
              </span>
              <div className="w-full bg-slate-950 h-1 rounded-full mt-3.5 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (botState.wins / botConfig.maxWins) * 100)}%` }}
                />
              </div>
            </div>

            {/* Losses Box */}
            <div className="bg-rose-950/15 border border-rose-900/30 rounded-xl p-4 text-center select-none">
              <span className="text-[8px] font-mono text-rose-500 tracking-widest block leading-none mb-1.5 uppercase font-bold">CONSECUTIVE LOSSES</span>
              <span className="text-2xl font-black text-rose-400 font-mono">
                {botState.consecutiveLosses} <span className="text-rose-700 text-xs font-normal">/ {botConfig.maxLosses}</span>
              </span>
              <div className="w-full bg-slate-950 h-1 rounded-full mt-3.5 overflow-hidden">
                <div 
                  className="bg-rose-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (botState.consecutiveLosses / botConfig.maxLosses) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Extended Stats Panel ── */}
          {(() => {
            const totalTrades = botState.wins + botState.losses;
            const winRate = totalTrades > 0 ? ((botState.wins / totalTrades) * 100) : 0;
            const totalStaked = parseFloat((botState.tradesCount * botConfig.stake).toFixed(2));
            const potentialPayout = parseFloat((botState.currentStake * 1.95).toFixed(2));
            const grossWinnings = parseFloat((botState.wins * botConfig.stake * 1.95).toFixed(2));
            const avgProfit = totalTrades > 0 ? parseFloat((botState.profit / totalTrades).toFixed(2)) : 0;

            return (
              <div className="mt-4 rounded-xl border border-slate-800/80 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">Session Analytics</span>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-800/60">
                  {/* Total Stake */}
                  <div className="p-3 text-center bg-slate-950/40 select-none">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block leading-none mb-1.5">Total Staked</span>
                    <span className="text-sm font-black font-mono text-slate-200">${totalStaked.toFixed(2)}</span>
                    <span className="text-[8px] font-mono text-slate-600 block mt-0.5">USD</span>
                  </div>

                  {/* Potential Payout */}
                  <div className="p-3 text-center bg-slate-950/40 select-none relative overflow-hidden">
                    {botState.isRunning && (
                      <div className="absolute inset-0 bg-indigo-400/[0.03] animate-pulse pointer-events-none" />
                    )}
                    <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-wider block leading-none mb-1.5 font-bold">Next Payout</span>
                    <span className="text-sm font-black font-mono text-indigo-300">+${potentialPayout.toFixed(2)}</span>
                    <span className="text-[8px] font-mono text-slate-600 block mt-0.5">if win</span>
                  </div>

                  {/* Total Runs */}
                  <div className="p-3 text-center bg-slate-950/40 select-none">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block leading-none mb-1.5">Runs</span>
                    <span className="text-sm font-black font-mono text-slate-200">{botState.tradesCount}</span>
                    <span className="text-[8px] font-mono text-slate-600 block mt-0.5">contracts</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-800/60 border-t border-slate-800/60">
                  {/* Win Rate */}
                  <div className="p-3 text-center bg-slate-950/30 select-none">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block leading-none mb-1.5">Win Rate</span>
                    <span className={`text-sm font-black font-mono ${winRate >= 55 ? 'text-emerald-400' : winRate > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {totalTrades > 0 ? `${winRate.toFixed(0)}%` : '—'}
                    </span>
                    <span className="text-[8px] font-mono text-slate-600 block mt-0.5">this session</span>
                  </div>

                  {/* Total gross winnings */}
                  <div className="p-3 text-center bg-slate-950/30 select-none">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block leading-none mb-1.5">Gross Winnings</span>
                    <span className={`text-sm font-black font-mono ${grossWinnings > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {grossWinnings > 0 ? `$${grossWinnings.toFixed(2)}` : '—'}
                    </span>
                    <span className="text-[8px] font-mono text-slate-600 block mt-0.5">from wins</span>
                  </div>

                  {/* Avg per trade */}
                  <div className="p-3 text-center bg-slate-950/30 select-none">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block leading-none mb-1.5">Avg / Trade</span>
                    <span className={`text-sm font-black font-mono ${avgProfit >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>
                      {totalTrades > 0 ? `${avgProfit >= 0 ? '+' : ''}$${avgProfit.toFixed(2)}` : '—'}
                    </span>
                    <span className="text-[8px] font-mono text-slate-600 block mt-0.5">per run</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Search & Load Smart Assistant block */}
          {(!botState.isRunning || searchLoadCountdown !== null || isScanning) && (
            <div className="mt-4 bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 animate-fade-in relative overflow-hidden select-none">
              {/* Subtle pulsing scanner laser line */}
              {isScanning && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-400 opacity-60 animate-bounce" />
              )}
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-[8px] font-mono text-indigo-400 tracking-wider uppercase font-extrabold flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full bg-indigo-400 ${isScanning ? 'animate-ping' : 'animate-pulse'}`} />
                  {isScanning ? 'SCANNERS RUNNING' : 'BEST PAIR AUTO-LOADER'}
                </span>
                
                {searchLoadCountdown !== null && (
                  <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                    Auto-load in <span className="text-amber-400 font-black px-0.5 text-xs font-mono">{searchLoadCountdown}s</span>
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSearchAndLoad}
                disabled={isScanning || botState.isRunning || isCalibrationActive}
                className={`w-full py-2 px-3 rounded-lg font-mono text-[10px] font-black uppercase transition-all duration-150 active:scale-97 border relative overflow-hidden flex items-center justify-center gap-1.5 ${
                  isCalibrationActive
                    ? 'bg-slate-950 text-slate-600 border-slate-900/60 cursor-not-allowed opacity-[0.55]'
                    : isScanning 
                    ? 'bg-slate-950 text-indigo-400 border-indigo-900/50 cursor-wait' 
                    : botState.isRunning
                    ? 'bg-slate-850 text-slate-500 border-slate-800/60 cursor-not-allowed opacity-50'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-md hover:shadow-indigo-500/20 cursor-pointer'
                }`}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Sweeping: <span className="text-slate-100 font-black underline">{Object.values(symbolsState)[scanIndex]?.info.short || '...'}</span></span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-pulse text-indigo-200" />
                    <span>{isCalibrationActive ? 'LOCKED DURING INITIAL CALIBRATION' : botState.isRunning ? 'LOCKED DURING ACTIVE TRADE' : 'SEARCH & LOAD BEST PAIR'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer info & Terminal log launch icon */}
        <div className="border-t border-slate-800/80 pt-4 mt-6 flex justify-between items-center text-[9px] font-mono text-slate-500 select-none">
          <span>Rule Guard: Active 5 consecutive loss protection</span>
          
          <button
            onClick={() => setShowConsole(true)}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-950 hover:bg-slate-850 hover:text-indigo-400 text-slate-400 border border-slate-850 hover:border-indigo-900/50 transition-all font-sans text-[9px] uppercase font-bold cursor-pointer active:scale-95"
            title="Open bot text log terminal"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Show Logs</span>
          </button>
        </div>
      </div>

      {/* Floating Action/Console Button (Sticky at the bottom right corner of page) */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <button
          onClick={() => setShowConsole(true)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 hover:border-indigo-500 hover:text-indigo-300 transition-all shadow-2xl active:scale-95 cursor-pointer group relative"
          title="Open Activity Terminal Console"
        >
          <Terminal className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {botState.isRunning && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Slide-in Terminal Console Overlay Modal */}
      {showConsole && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          {/* Backdrop trigger click close */}
          <div className="absolute inset-0 cursor-default" onClick={() => setShowConsole(false)} />
          
          {/* Floating Drawer Container */}
          <div className="relative w-full max-w-lg bg-slate-950 border-l border-slate-850 h-full flex flex-col p-6 shadow-2xl z-10 transition-all">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                <h3 className="font-mono text-xs font-black text-slate-200">BOT ACTIVITY CONSOLE</h3>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="font-mono text-[8px] text-slate-500 flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded leading-none border border-slate-850">
                  <span className={`w-1.5 h-1.5 rounded-full ${botState.isRunning ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`} />
                  {botState.isRunning ? 'BOT ACTIVE' : 'STANDBY'}
                </span>
                
                {/* Clear Button */}
                <button
                  onClick={onClearLogs}
                  title="Clear terminal text screen"
                  className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-slate-300 rounded cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setShowConsole(false)}
                  title="Close activity terminal"
                  className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-slate-100 rounded-lg cursor-pointer font-bold font-mono text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Realtime Performance Copy */}
            <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-900/60 p-3 rounded-xl border border-slate-900 select-none">
              <div className="text-center font-mono">
                <span className="text-[7.5px] text-slate-500 tracking-wider block leading-none">WINS</span>
                <span className="text-sm font-black text-emerald-400 block mt-1">{botState.wins} / {botConfig.maxWins}</span>
              </div>
              <div className="text-center font-mono border-x border-slate-950">
                <span className="text-[7.5px] text-slate-500 tracking-wider block leading-none">CONSECUTIVE LOSSES</span>
                <span className="text-sm font-black text-rose-400 block mt-1">{botState.consecutiveLosses} / {botConfig.maxLosses}</span>
              </div>
              <div className="text-center font-mono">
                <span className="text-[7.5px] text-slate-500 tracking-wider block leading-none">NET PROFIT</span>
                <span className={`text-sm font-black block mt-1 ${botState.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Scroll area for text logs */}
            <div className="flex-1 bg-slate-950 font-mono text-[10.5px] leading-relaxed overflow-y-auto space-y-2.5 pr-1.5">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="entry border-l border-slate-800/60 pl-2.5 py-0.5">
                    <span className="text-slate-600 font-light pr-1.5">[{log.timestamp}]</span>
                    <span className={getLogTypeColor(log.type, log.message)}>{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                  <CheckSquare className="w-5 h-5 text-slate-700 animate-bounce" />
                  <span>Standby state. Ready to record auto-trader actions.</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Info footer */}
            <div className="border-t border-slate-800/80 pt-3 mt-3 text-center text-[9px] font-mono text-slate-600 select-none">
              Triggers logic: Rise-direction tick + Last digit is 4 or 5 • prediction 4 DIGITOVER
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
