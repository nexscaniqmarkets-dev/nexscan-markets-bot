import { useState, useEffect } from 'react';
import { SymbolState } from '../types';
import { getVolColor, digitColor } from '../constants';
import { Trophy, RefreshCw, Zap, Flame, ShieldAlert, Sparkles, AlertCircle, Radar, Activity } from 'lucide-react';

interface LeaderboardTabProps {
  symbolsState: Record<string, SymbolState>;
  onSelectSymbolForTrading: (symbolId: string) => void;
  activeTradingSymbolId: string;
  botRunning?: boolean;
  sessionUptime?: number;
}

export function LeaderboardTab({
  symbolsState,
  onSelectSymbolForTrading,
  activeTradingSymbolId,
  botRunning = false,
  sessionUptime = 300,
}: LeaderboardTabProps) {
  const [countdown, setCountdown] = useState(180); // 3 minutes Countdown
  const [lockDisabled, setLockDisabled] = useState(false);
  const [refreshedToast, setRefreshedToast] = useState(false);

  const isCalibrationActive = typeof sessionUptime === 'number' && sessionUptime < 300;
  const timeLeft = typeof sessionUptime === 'number' ? Math.max(0, 300 - sessionUptime) : 0;

  // Compute stats and performance scores
  const rankedSymbols = Object.values(symbolsState)
    .map((state) => {
      const info = state.info;
      const totalSim = state.wins + state.losses;
      const winRate = totalSim >= 3 ? (state.wins / totalSim) * 100 : null;
      const signalFreq = state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0;
      
      // Score represents a balance of high win-rate + adequate signal volume
      const score = winRate !== null 
        ? winRate * 0.65 + Math.min(signalFreq * 5.0, 100) * 0.35 
        : -1;

      return {
        ...state,
        winRate,
        signalFreq,
        score,
        totalSim,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Auto Timer Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 180; // auto-refresh cycle
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const topPair = rankedSymbols[0];
  const meetsCriteria = !isCalibrationActive && topPair && topPair.winRate !== null && topPair.winRate >= 55.0 && topPair.signals >= 5;

  const handleManualRefresh = () => {
    setCountdown(180);
    setLockDisabled(true);
    setRefreshedToast(true);
    setTimeout(() => {
      setRefreshedToast(false);
    }, 2000);
    setTimeout(() => setLockDisabled(false), 800);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-1">
      {/* Target Trade Banner - Locked when Top Symbol hits high probability */}
      {meetsCriteria ? (
        <div id="locked-pair-banner" className="relative rounded-2xl bg-gradient-to-br from-indigo-950/25 to-slate-900 border border-indigo-500 p-6 shadow-2xl shadow-indigo-500/10 animate-fade-in overflow-hidden">
          {/* Subtle radar glowing line */}
          <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/40 text-[10px] font-mono font-bold uppercase tracking-wider mb-3 leading-none animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-current animate-bounce" /> Recommended Golden Pair Signal
              </span>

              <h2 className="text-3xl font-black font-sans text-slate-100 flex items-center gap-3 tracking-tight">
                <span style={{ color: getVolColor(topPair.info.vol) }}>{topPair.info.short}</span>
                <span className="text-lg text-slate-400 font-medium">({topPair.info.name})</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1.5">
                Golden Ratio win-rate detected. Highly optimal probability for 1-tick DigitOver trading!
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-center">
                  <div className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">Win Rate</div>
                  <div className="text-xl font-mono font-black text-emerald-400 mt-1">
                    {topPair.winRate?.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-center">
                  <div className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">Performance Score</div>
                  <div className="text-xl font-mono font-black text-indigo-400 mt-1">
                    {topPair.score.toFixed(1)}
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-center">
                  <div className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">Wins / losses</div>
                  <div className="text-base font-mono font-black mt-2">
                    <span className="text-emerald-400">{topPair.wins}</span>
                    <span className="text-slate-600 px-1">/</span>
                    <span className="text-rose-400">{topPair.losses}</span>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-center">
                  <div className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">Signals Count</div>
                  <div className="text-xl font-mono font-black text-amber-400 mt-1">
                    {topPair.signals}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
              {/* Countdown panel */}
              <div className="text-center md:text-right bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-850 w-full sm:w-auto">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-0.5">
                  Opportunity Expiry
                </span>
                <span className={`font-mono text-2xl font-black ${countdown <= 30 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                  {formatTime(countdown)}
                </span>
                <span className="text-[8px] font-mono text-slate-600 block mt-0.5">
                  Will auto-assess on tick expiry
                </span>
              </div>

              {/* Instant Load to Trader button */}
              <button
                onClick={() => {
                  const isTopPairSelected = activeTradingSymbolId === topPair.info.id;
                  if (!isTopPairSelected && !botRunning) {
                    onSelectSymbolForTrading(topPair.info.id);
                  }
                }}
                disabled={botRunning && activeTradingSymbolId !== topPair.info.id}
                className={`w-full sm:w-auto py-3 px-6 font-mono text-xs font-black tracking-widest rounded-xl transition-all duration-100 uppercase border ${
                  activeTradingSymbolId === topPair.info.id
                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/50 cursor-default'
                    : botRunning
                    ? 'bg-slate-900 text-slate-600 border-slate-950/45 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-450 hover:to-indigo-550 text-white border-transparent shadow-lg hover:shadow-indigo-500/20 active:scale-95 cursor-pointer'
                }`}
              >
                {activeTradingSymbolId === topPair.info.id 
                  ? '✓ CURRENTLY ACTIVE TRADER' 
                  : botRunning 
                  ? '🔒 LOCKED DURING SESSION' 
                  : '🎯 LOAD & AUTOMATE TRADES NOW'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 shadow-2xl relative overflow-hidden select-none">
          {/* Ambient grid background overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            
            {/* Visual Radar Unit + Details */}
            <div className="flex flex-col sm:flex-row items-center gap-5 flex-1">
              
              {/* Tactical Radar Display */}
              <div className="w-20 h-20 bg-slate-950 border border-slate-850 rounded-full flex items-center justify-center relative overflow-hidden shadow-inner shrink-0 scale-105">
                {/* Endless conic gradient rotating light block */}
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_55%,rgba(99,102,241,0.25))] rounded-full animate-spin [animation-duration:2.8s]" />
                
                {/* Target radial grids */}
                <div className="absolute w-14 h-14 rounded-full border border-slate-900" />
                <div className="absolute w-8 h-8 rounded-full border border-slate-900/60" />
                
                {/* Horizontal & Vertical Crosshairs */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-900/80" />
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-slate-900/80" />
                
                {/* Live glowing synthetic targets simulation */}
                <div className="absolute top-6 left-5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                <div className="absolute bottom-5 right-6 w-1 h-1 bg-indigo-400 rounded-full animate-pulse [animation-duration:1.2s]" />
                
                {/* Core Antenna Center Hub */}
                <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-950 z-10 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
              </div>

              {/* Ticker text information */}
              <div className="text-center sm:text-left">
                {isCalibrationActive ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[8.5px] font-mono text-indigo-400 font-extrabold uppercase tracking-widest bg-indigo-950/50 border border-indigo-900/40 px-2.5 py-0.5 rounded-full mb-2 leading-none animate-pulse">
                      <Activity className="w-3 h-3 text-indigo-400 animate-spin" />
                      Scanner Calibrating • {formatTime(timeLeft)} Remaining
                    </span>
                    
                    <h4 className="text-base font-sans font-black text-slate-100 tracking-tight">
                      Collecting Live Market Feed...
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-1.5 max-w-md leading-relaxed">
                      Continuous 5-minute initial scanner feed calibration is active to run and evaluate statistical indicators safely.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[8.5px] font-mono text-indigo-400 font-extrabold uppercase tracking-widest bg-indigo-950/50 border border-indigo-900/40 px-2.5 py-0.5 rounded-full mb-2 leading-none">
                      <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
                      Scanner Active • Live API Feed
                    </span>
                    
                    <h4 className="text-base font-sans font-black text-slate-100 tracking-tight">
                      Searching for high-probability setups...
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-1.5 max-w-md leading-relaxed">
                      Scanning Volatility and Jump index pools to source a recommended 1-tick <span className="text-indigo-400 font-bold">DigitOver (4)</span> opportunity.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Live Threshold Alignment Center widget */}
            {topPair && (
              <div className="bg-slate-950/70 border border-slate-850 rounded-xl p-4 min-w-[280px]">
                {/* Lead Candidate Label */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold">Top Match Candidate:</span>
                  <span className="font-mono text-xs font-black text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800" style={{ color: getVolColor(topPair.info.vol) }}>
                    {topPair.info.short}
                  </span>
                </div>

                {/* Requirements checkmarks comparing top to minimum guidelines */}
                <div className="space-y-2">
                  {/* Win Rate Progress */}
                  <div>
                    <div className="flex justify-between text-[9px] font-mono mb-1">
                      <span className="text-slate-500">Win Rate Goal (≥ 55%):</span>
                      <span className={`font-bold ${topPair.winRate && topPair.winRate >= 55 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {topPair.winRate !== null ? `${topPair.winRate.toFixed(1)}%` : '0.0%'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${topPair.winRate && topPair.winRate >= 55 ? 'bg-emerald-500' : 'bg-slate-700'}`} 
                        style={{ width: `${Math.min(100, topPair.winRate || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Signals volume */}
                  <div>
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-slate-500">Min Signals (≥ 5 req):</span>
                      <span className={`font-bold ${topPair.signals >= 5 ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}>
                        {topPair.signals} / 5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trigger refresh button component */}
            <div className="flex items-center justify-center shrink-0">
              <button
                onClick={handleManualRefresh}
                disabled={lockDisabled || isCalibrationActive}
                className="w-full lg:w-auto h-full flex items-center justify-center gap-2 py-3 px-5 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-indigo-400 active:text-indigo-300 rounded-xl border border-slate-850 text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${lockDisabled ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isCalibrationActive ? 'CALIBRATING' : 'SWEEP FEEDS'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Leaderboard Rankings List */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" /> PERFORMANCE LEADERBOARD (RANKED BY SCORING ENGINE)
          </h3>
          
          <div className="flex items-center gap-2">
            {refreshedToast && (
              <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40 animate-in fade-in duration-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Rankings Updated
              </span>
            )}
            <button
              id="refreshLeaderboardBtn"
              onClick={handleManualRefresh}
              disabled={lockDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 text-[10px] font-mono font-bold text-slate-400 hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${lockDisabled ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{lockDisabled ? 'SCANNING...' : 'REFRESH RANKINGS'}</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-2.5">
          {rankedSymbols.map((sym, idx) => {
            const hasData = sym.winRate !== null;
            const colorAccent = getVolColor(sym.info.vol);
            const scoreBarWidth = hasData ? Math.min(Math.max(sym.score, 0), 100) : 0;
            const isCurrentlySelected = activeTradingSymbolId === sym.info.id;
            
            const stateColor = !hasData 
              ? 'text-slate-600' 
              : sym.winRate && sym.winRate >= 55 
              ? 'text-emerald-400' 
              : sym.winRate && sym.winRate >= 45 
              ? 'text-amber-400' 
              : 'text-rose-500';

            return (
              <div
                key={sym.info.id}
                className={`group flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900 border rounded-2xl transition-all ${
                  isCurrentlySelected 
                    ? 'border-indigo-500 bg-indigo-950/5' 
                    : 'border-slate-800/80 hover:border-slate-700/80'
                } ${idx === 0 && hasData ? 'shadow-lg shadow-indigo-500/5' : ''}`}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto mb-3 sm:mb-0">
                  {/* Rank badge */}
                  <div className="w-8 text-center font-mono text-base">
                    {hasData ? (medals[idx] || `#${idx + 1}`) : '—'}
                  </div>

                  {/* Asset Details info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black tracking-tight" style={{ color: colorAccent }}>
                        {sym.info.short}
                      </span>
                      <span className="font-mono text-[8px] text-slate-500 bg-slate-950 border border-slate-850 px-1 py-0.5 rounded leading-none">
                        {sym.info.tier}
                      </span>
                      {isCurrentlySelected && (
                        <span className="font-mono text-[8px] text-indigo-400 bg-indigo-950 border border-indigo-900 px-1.5 py-0.5 rounded leading-none font-bold">
                          ACTIVE BOT ASSET
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{sym.info.name}</div>
                  </div>
                </div>

                {/* Performance Metrics items */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-6 w-full sm:w-auto bg-slate-950/40 p-3 sm:p-0 rounded-xl border border-slate-850 sm:border-transparent sm:bg-transparent">
                  <div className="text-center min-w-[50px]">
                    <span className="text-[7.5px] font-mono text-slate-600 uppercase tracking-widest block leading-none">Signals</span>
                    <span className="font-mono text-sm font-bold text-amber-500 block mt-1">{sym.signals}</span>
                  </div>

                  <div className="text-center min-w-[60px]">
                    <span className="text-[7.5px] font-mono text-slate-600 uppercase tracking-widest block leading-none">W / L</span>
                    <span className="font-mono text-xs font-bold block mt-1">
                      <span className="text-emerald-400">{sym.wins}</span>
                      <span className="text-slate-700 px-0.5">/</span>
                      <span className="text-rose-400">{sym.losses}</span>
                    </span>
                  </div>

                  <div className="text-center min-w-[70px]">
                    <span className="text-[7.5px] font-mono text-slate-600 uppercase tracking-widest block leading-none">Win rate</span>
                    <span className={`font-mono text-sm font-black block mt-1 ${stateColor}`}>
                      {hasData ? `${sym.winRate?.toFixed(1)}%` : '—'}
                    </span>
                  </div>

                  {/* Rating Score bar progress */}
                  <div className="w-full sm:w-[130px] flex flex-col justify-center">
                    <div className="flex justify-between items-center text-[8px] font-mono mb-1 leading-none">
                      <span className="text-slate-600 uppercase tracking-widest">Score</span>
                      <span className="text-indigo-400 font-bold">{hasData ? sym.score.toFixed(1) : '—'}</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-650 transition-all duration-300"
                        style={{ width: `${scoreBarWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Connect quick load button */}
                  <div className="w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                      onClick={() => {
                        if (!isCurrentlySelected && !botRunning && !isCalibrationActive) {
                          onSelectSymbolForTrading(sym.info.id);
                        }
                      }}
                      disabled={isCalibrationActive || (botRunning && !isCurrentlySelected)}
                      className={`w-full sm:w-auto py-1.5 px-3 rounded-lg font-mono text-[10px] font-bold transition-all duration-150 border ${
                        isCalibrationActive
                          ? 'bg-slate-950 border-slate-900/40 text-slate-600 cursor-not-allowed opacity-50'
                          : isCurrentlySelected
                          ? 'bg-indigo-950 text-indigo-400 border-indigo-800 cursor-default'
                          : botRunning
                          ? 'bg-slate-900 border-slate-950/40 text-slate-650 cursor-not-allowed opacity-40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent hover:text-white cursor-pointer active:scale-95'
                      }`}
                    >
                      {isCalibrationActive ? 'Calibrating' : isCurrentlySelected ? 'Selected' : botRunning ? 'Locked' : 'Load Pair'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded documentation card to reinforce trust and knowledge */}
      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80">
        <h4 className="font-sans font-bold text-slate-300 text-xs mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-500" /> Scanner Algorithmic Blueprint & Scoring
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <div className="text-slate-600 font-bold uppercase tracking-widest text-[8px] mb-1">Target Threshold</div>
            <p className="text-slate-400 leading-snug">
              Auto-locks and highlights the first asset that achieves a simulated win-rate of <span className="text-emerald-400">55% and higher</span> after a minimum of <span className="text-amber-400">5 triggers</span>.
            </p>
          </div>
          <div>
            <div className="text-slate-600 font-bold uppercase tracking-widest text-[8px] mb-1">Scoring Metric</div>
            <p className="text-slate-400 leading-snug">
              Calculates index indexability using a weighted formula: <span className="text-slate-300">65% weight on Win Rate %</span> and <span className="text-slate-300">35% weight on frequency pacing</span>.
            </p>
          </div>
          <div>
            <div className="text-slate-600 font-bold uppercase tracking-widest text-[8px] mb-1">Opportunity Timer</div>
            <p className="text-slate-400 leading-snug">
              Alert configurations lock for <span className="text-slate-300">3 minutes</span>. This allows ample window period for manual trade parameters execution before the tracker re-appraises index ratings.
            </p>
          </div>
          <div>
            <div className="text-slate-600 font-bold uppercase tracking-widest text-[8px] mb-1">Continuous Scan</div>
            <p className="text-slate-400 leading-snug">
              The socket subscription continues to record background price ticks. New metrics are added endlessly to capture trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
