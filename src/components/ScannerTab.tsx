import { SymbolState } from '../types';
import { getVolColor, digitColor, formatPrice } from '../constants';
import { Sparkles, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface ScannerTabProps {
  symbolsState: Record<string, SymbolState>;
  onSelectSymbolForTrading: (symbolId: string) => void;
  activeTradingSymbolId: string;
  botRunning?: boolean;
  sessionUptime?: number;
  onRestartScanning: () => void;
  botConfig?: any;
}

function getBarrierDigit(mode: string, explicitBarrier: number): number {
  return explicitBarrier;
}

function getSymbolMetrics(state: SymbolState, barrier: number) {
  let wins = 0;
  let losses = 0;

  if (state.recentSignalExitDigits && state.recentSignalExitDigits.length > 0) {
    state.recentSignalExitDigits.forEach((digit) => {
      if (digit > barrier) {
        wins++;
      } else {
        losses++;
      }
    });
  } else {
    if (barrier === 4) {
      wins = state.wins;
      losses = state.losses;
    } else {
      const total = state.wins + state.losses;
      if (total > 0) {
        const baseRate = state.wins / total;
        const diff = 4 - barrier;
        const adjustedRate = Math.max(0, Math.min(1.0, baseRate + diff * 0.10));
        wins = Math.round(total * adjustedRate);
        losses = total - wins;
      } else {
        wins = 0;
        losses = 0;
      }
    }
  }

  const totalSim = wins + losses;
  const winRate = totalSim >= 3 ? (wins / totalSim) * 100 : null;
  const signalFreq = state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0;

  let score = -1;
  let edge = 0;
  if (winRate !== null) {
    const winDigitsCount = 9 - barrier;
    const payout = (10 / winDigitsCount) * 0.95 - 1; // Correct inverted payoff math
    const wrFrac = winRate / 100;
    
    edge = wrFrac * (payout + 1) - 1; // Expected percentage of stake as edge (EV)

    // Baseline score starts at 50 at breakeven point (edge = 0, which is winRate = 52.63% for barrier 4).
    // Let's amplify positive edge and penalize negative edge clearly
    const edgeMultiplier = edge >= 0 ? 150 : 120;
    let baseScore = 50 + edge * edgeMultiplier;

    // Short-term micro-momentum (from recent digits trend in the last 10 ticks)
    // Centered around 50% expectation (5 out of 10 digits > 4).
    const recentDigits = state.recentDigits || [];
    const highCount = recentDigits.filter(d => d > barrier).length;
    const microDensity = recentDigits.length > 0 ? (highCount / recentDigits.length) * 100 : 50;
    const momentumBonus = (microDensity - 50) * 0.20; // Adds up to +10 or -10 points

    // Pacing/Activity bonus to favor active, highly reliable setups
    const freqBonus = Math.min(signalFreq * 2.0, 5.0);

    let rawScore = baseScore + momentumBonus + freqBonus;

    // Smooth confidence blending instead of severe flat reduction
    // Ensures we don't display extremely low score anomalies below 20 trades.
    // Scales to full weight at 10 simulated trades.
    const confidence = Math.min(totalSim / 10, 1.0);
    score = rawScore * confidence + 40 * (1 - confidence);

    score = Math.max(0, Math.min(100, score));
  }

  return {
    wins,
    losses,
    totalSim,
    winRate,
    signalFreq,
    edge,
    score,
  };
}

export function ScannerTab({
  symbolsState,
  onSelectSymbolForTrading,
  activeTradingSymbolId,
  botRunning = false,
  sessionUptime = 300,
  onRestartScanning,
  botConfig,
}: ScannerTabProps) {
  const symbolList = Object.values(symbolsState);

  const isCalibrationActive = typeof sessionUptime === 'number' && sessionUptime < 300;
  const timeLeft = typeof sessionUptime === 'number' ? Math.max(0, 300 - sessionUptime) : 0;
  const formatRemaining = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const activeBarrier = botConfig 
    ? getBarrierDigit(botConfig.tradingMode, botConfig.barrierDigit)
    : 4;

  return (
    <div className="space-y-3">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 md:px-4">
        <div>
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-1.5 leading-none">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Web-Socket Market Scanner
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
            Scanning all assets concurrently. Ticks and signal outcomes calibrate dynamically to build real-time accuracy percentages.
          </p>
        </div>
        <div className="shrink-0">
          <button
            id="restartScanningBtn"
            onClick={onRestartScanning}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 transition-all duration-200 cursor-pointer active:scale-97 select-none"
          >
            <RefreshCw className="w-3" /> Restart Scanning
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-1">
      {symbolList.map((state) => {
        const info = state.info;
        const colorAccent = getVolColor(info.vol);
        const isSignalActive = state.ticks > 0 && state.ticks - state.lastSignalTick <= 2;
        
        const metrics = getSymbolMetrics(state, activeBarrier);
        const { wins, losses, totalSim: totalSimTrades, winRate, score } = metrics;
        const isActiveTrading = activeTradingSymbolId === info.id;

        return (
          <div
            key={info.id}
            id={`scanner-card-${info.id}`}
            className={`relative rounded-xl bg-slate-900 border overflow-hidden p-3.5 transition-all duration-300 hover:scale-[1.012] hover:shadow-lg hover:shadow-indigo-950/5 group/card ${
              isSignalActive
                ? 'border-indigo-500 bg-indigo-950/10 shadow shadow-indigo-500/5'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Top accent highlight */}
            <div
              className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
              style={{
                backgroundColor: isSignalActive ? '#818cf8' : colorAccent,
                opacity: isSignalActive ? 1 : 0.6,
              }}
            />

            {/* Card Header */}
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span
                    className="font-mono text-sm font-black tracking-tight"
                    style={{ color: colorAccent }}
                  >
                    {info.short}
                  </span>
                  <span
                    className={`font-mono text-[7px] font-bold px-1.5 py-0.5 rounded border leading-none ${
                      info.tier === 'STD'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                        : 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40'
                    }`}
                  >
                    {info.tier === 'STD' ? 'STD Ticks' : '1-Sec' }
                  </span>
                </div>
                <h3 className="text-[10.5px] text-slate-500 font-medium tracking-tight mt-0.5 leading-none">
                  {info.name}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                {isSignalActive && (
                  <span className="font-mono text-[7px] font-extrabold bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider animate-bounce lider-none">
                    SIGNAL!
                  </span>
                )}
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    state.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'
                  }`}
                  title={state.connected ? 'Subscribed Realtime' : 'Disconnected'}
                />
              </div>
            </div>

            {/* Realtime Price Detail */}
            <div className="flex items-baseline gap-1.5 mb-2.5 leading-none">
              <span className="font-mono text-xl font-black text-slate-200 tracking-tight leading-none">
                {formatPrice(state.price, info.pip)}
              </span>
              {state.direction && (
                <span
                  className={`font-bold text-[10px] flex items-center leading-none ${
                    state.direction === 'rise' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {state.direction === 'rise' ? (
                    <TrendingUp className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                </span>
              )}
            </div>

            {/* Ticks Grid & Last Digit Visual */}
            <div className="grid grid-cols-12 gap-1.5 mb-2.5 items-center">
              <div className="col-span-4 flex flex-col items-start">
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider mb-0.5 leading-none">
                  Last Digit
                </span>
                <span
                  title="Last decimal place tick digit"
                  className="font-mono text-2xl font-extrabold leading-none transition-colors duration-200"
                  style={{
                    color: digitColor(state.lastDigit),
                    textShadow:
                      state.lastDigit === 4 || state.lastDigit === 5
                        ? `0 0 12px ${digitColor(state.lastDigit)}80`
                        : 'none',
                  }}
                >
                  {state.lastDigit !== null ? state.lastDigit : '—'}
                </span>
              </div>

              <div className="col-span-8 flex flex-col items-start">
                <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider mb-1 leading-none">
                  Trail (Last 10 Ticks)
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {state.recentDigits.length > 0 ? (
                    state.recentDigits.map((dg, idx) => {
                      const c = digitColor(dg);
                      return (
                        <div
                          key={idx}
                          className="w-[18px] h-[18px] rounded-md flex items-center justify-center font-mono text-[11px] font-bold border leading-none"
                          style={{
                            backgroundColor: `${c}10`,
                            borderColor: `${c}35`,
                            color: c,
                          }}
                        >
                          {dg}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[11px] font-mono text-slate-600">Waiting for data...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Backtester Win Rate & Performance Score Indicators */}
            <div className="border-t border-slate-800/85 pt-2.5 mt-2.5">
              <div className="grid grid-cols-2 gap-3 mb-2.5">
                {/* Win Rate */}
                <div>
                  <div className="flex justify-between items-center mb-0.5 leading-none">
                    <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider">
                      Win Rate
                    </span>
                    <span
                      className="font-mono text-[10px] font-black"
                      style={{
                        color:
                          winRate === null
                            ? '#64748b'
                            : winRate >= 60.0
                            ? '#10b981'
                            : winRate >= 50.0
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {winRate !== null ? `${winRate.toFixed(1)}%` : 'Scanning...'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${winRate !== null ? winRate : 0}%`,
                        backgroundColor:
                          winRate === null
                            ? '#334155'
                            : winRate >= 60.0
                            ? '#10b981'
                            : winRate >= 50.0
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  </div>
                </div>

                {/* Performance Score */}
                <div>
                  <div className="flex justify-between items-center mb-0.5 leading-none">
                    <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider">
                      Perf. Score
                    </span>
                    <span
                      className="font-mono text-[10px] font-black"
                      style={{
                        color:
                          winRate === null
                            ? '#64748b'
                            : score >= 55.0
                            ? '#6366f1'
                            : score >= 45.0
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {winRate !== null 
                        ? score.toFixed(1)
                        : 'Calibrating...'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${winRate !== null ? score : 0}%`,
                        backgroundColor:
                          winRate === null
                            ? '#334155'
                            : score >= 55.0
                            ? '#6366f1'
                            : score >= 45.0
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 mt-2.5">
                <div className="bg-slate-950/40 rounded px-1.5 py-0.5 text-center font-mono">
                  <div className="text-[7px] text-slate-600 leading-none">TICKS</div>
                  <div className="text-[10.5px] font-bold text-slate-300 mt-0.5 leading-none">{state.ticks}</div>
                </div>
                <div className="bg-slate-950/40 rounded px-1.5 py-0.5 text-center font-mono">
                  <div className="text-[7px] text-amber-500/80 leading-none">SIGS</div>
                  <div className="text-[10.5px] font-bold text-amber-400 mt-0.5 leading-none">{state.signals}</div>
                </div>
                <div className="bg-slate-950/40 rounded px-1.5 py-0.5 text-center font-mono">
                  <div className="text-[7px] text-emerald-500/80 leading-none">WINS</div>
                  <div className="text-[10.5px] font-bold text-emerald-400 mt-0.5 leading-none">{state.wins}</div>
                </div>
                <div className="bg-slate-950/40 rounded px-1.5 py-0.5 text-center font-mono">
                  <div className="text-[7px] text-rose-500/80 leading-none">LOSS</div>
                  <div className="text-[10.5px] font-bold text-rose-400 mt-0.5 leading-none">{state.losses}</div>
                </div>
              </div>
            </div>

            {/* Click to Trade Overlay button */}
            <div className="mt-3">
              <button
                onClick={() => {
                  if (!isActiveTrading && !botRunning && !isCalibrationActive) {
                    onSelectSymbolForTrading(info.id);
                  }
                }}
                disabled={isCalibrationActive || (botRunning && !isActiveTrading)}
                className={`w-full py-1.5 px-3 rounded-lg font-mono text-[10.5px] font-bold tracking-wider border transition-all duration-200 uppercase leading-none ${
                  isCalibrationActive
                    ? 'bg-slate-950 text-slate-600 border-slate-900/60 cursor-not-allowed opacity-[0.55]'
                    : isActiveTrading
                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/50 hover:bg-indigo-900/40 cursor-default'
                    : botRunning
                    ? 'bg-slate-900 text-slate-600 border-slate-950/40 cursor-not-allowed opacity-40'
                    : 'bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border-transparent cursor-pointer active:scale-[0.98]'
                }`}
              >
                {isCalibrationActive
                  ? `🔒 CALIBRATING (${formatRemaining(timeLeft)})`
                  : isActiveTrading
                  ? '✓ CONNECTED TO ACTIVE BOT'
                  : botRunning
                  ? '🔒 LOCKED'
                  : '🎯 CHOOSE PAIR'}
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
