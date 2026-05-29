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
}

export function ScannerTab({
  symbolsState,
  onSelectSymbolForTrading,
  activeTradingSymbolId,
  botRunning = false,
  sessionUptime = 300,
  onRestartScanning,
}: ScannerTabProps) {
  const symbolList = Object.values(symbolsState);

  const isCalibrationActive = typeof sessionUptime === 'number' && sessionUptime < 300;
  const timeLeft = typeof sessionUptime === 'number' ? Math.max(0, 300 - sessionUptime) : 0;
  const formatRemaining = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 md:px-5">
        <div>
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" /> Web-Socket Market Scanner
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Scanning all assets concurrently. Ticks and signal outcomes calibrate dynamically to build real-time accuracy percentages.
          </p>
        </div>
        <div className="shrink-0">
          <button
            id="restartScanningBtn"
            onClick={onRestartScanning}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 transition-all duration-200 cursor-pointer active:scale-97 select-none"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restart Scanning
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-1">
      {symbolList.map((state) => {
        const info = state.info;
        const colorAccent = getVolColor(info.vol);
        const isSignalActive = state.ticks > 0 && state.ticks - state.lastSignalTick <= 2;
        const totalSimTrades = state.wins + state.losses;
        const winRate = totalSimTrades >= 3 ? (state.wins / totalSimTrades) * 100 : null;
        const isActiveTrading = activeTradingSymbolId === info.id;

        return (
          <div
            key={info.id}
            id={`scanner-card-${info.id}`}
            className={`relative rounded-2xl bg-slate-900 border overflow-hidden p-5 transition-all duration-300 hover:scale-[1.015] hover:shadow-xl hover:shadow-indigo-950/5 group/card ${
              isSignalActive
                ? 'border-indigo-500 bg-indigo-950/10 shadow-lg shadow-indigo-500/5'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Top accent highlight */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300"
              style={{
                backgroundColor: isSignalActive ? '#818cf8' : colorAccent,
                opacity: isSignalActive ? 1 : 0.6,
              }}
            />

            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-base font-black tracking-tight"
                    style={{ color: colorAccent }}
                  >
                    {info.short}
                  </span>
                  <span
                    className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                      info.tier === 'STD'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                        : 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40'
                    }`}
                  >
                    {info.tier === 'STD' ? 'STD Ticks' : '1-Sec Ticks'}
                  </span>
                </div>
                <h3 className="text-xs text-slate-500 font-medium tracking-tight mt-1">
                  {info.name}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {isSignalActive && (
                  <span className="font-mono text-[8px] font-extrabold bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce">
                    SIGNAL!
                  </span>
                )}
                <div
                  className={`w-2 h-2 rounded-full ${
                    state.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'
                  }`}
                  title={state.connected ? 'Subscribed Realtime' : 'Disconnected'}
                />
              </div>
            </div>

            {/* Realtime Price Detail */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-mono text-2xl font-black text-slate-200 tracking-tight">
                {formatPrice(state.price, info.pip)}
              </span>
              {state.direction && (
                <span
                  className={`font-bold text-xs flex items-center ${
                    state.direction === 'rise' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {state.direction === 'rise' ? (
                    <TrendingUp className="w-4.5 h-4.5 animate-pulse" />
                  ) : (
                    <TrendingDown className="w-4.5 h-4.5" />
                  )}
                </span>
              )}
            </div>

            {/* Ticks Grid & Last Digit Visual */}
            <div className="grid grid-cols-12 gap-2 mb-4 items-center">
              <div className="col-span-4 flex flex-col">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Last Digit
                </span>
                <span
                  title="Last decimal place tick digit"
                  className="font-mono text-3xl font-extrabold leading-none transition-colors duration-200"
                  style={{
                    color: digitColor(state.lastDigit),
                    textShadow:
                      state.lastDigit === 4 || state.lastDigit === 5
                        ? `0 0 16px ${digitColor(state.lastDigit)}80`
                        : 'none',
                  }}
                >
                  {state.lastDigit !== null ? state.lastDigit : '—'}
                </span>
              </div>

              <div className="col-span-8 flex flex-col">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Trail History (Last 10 Ticks)
                </span>
                <div className="flex flex-wrap gap-1">
                  {state.recentDigits.length > 0 ? (
                    state.recentDigits.map((dg, idx) => {
                      const c = digitColor(dg);
                      return (
                        <div
                          key={idx}
                          className="w-5.5 h-5.5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold border"
                          style={{
                            backgroundColor: `${c}10`,
                            borderColor: `${c}40`,
                            color: c,
                          }}
                        >
                          {dg}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[10px] font-mono text-slate-600">Waiting for data...</span>
                  )}
                </div>
              </div>
            </div>            {/* Backtester Win Rate & Performance Score Indicators */}
            <div className="border-t border-slate-800/80 pt-3 mt-3">
              <div className="grid grid-cols-2 gap-4 mb-3">
                {/* Win Rate */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">
                      Win Rate
                    </span>
                    <span
                      className="font-mono text-[11px] font-black"
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
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
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
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">
                      Perf. Score
                    </span>
                    <span
                      className="font-mono text-[11px] font-black"
                      style={{
                        color:
                          winRate === null
                            ? '#64748b'
                            : (winRate * 0.65 + Math.min((state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0) * 5.0, 100) * 0.35) >= 55.0
                            ? '#6366f1'
                            : (winRate * 0.65 + Math.min((state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0) * 5.0, 100) * 0.35) >= 45.0
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {winRate !== null 
                        ? (winRate * 0.65 + Math.min((state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0) * 5.0, 100) * 0.35).toFixed(1)
                        : 'Calibrating...'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${winRate !== null ? Math.min(100, winRate * 0.65 + Math.min((state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0) * 5.0, 100) * 0.35) : 0}%`,
                        backgroundColor:
                          winRate === null
                            ? '#334155'
                            : (winRate * 0.65 + Math.min((state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0) * 5.0, 100) * 0.35) >= 55.0
                            ? '#6366f1'
                            : (winRate * 0.65 + Math.min((state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0) * 5.0, 100) * 0.35) >= 45.0
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 mt-3">
                <div className="bg-slate-950/40 rounded px-2 py-1 text-center font-mono">
                  <div className="text-[7.5px] text-slate-600 leading-none">TICKS</div>
                  <div className="text-xs font-bold text-slate-300 mt-0.5">{state.ticks}</div>
                </div>
                <div className="bg-slate-950/40 rounded px-2 py-1 text-center font-mono">
                  <div className="text-[7.5px] text-amber-500/80 leading-none">SIGS</div>
                  <div className="text-xs font-bold text-amber-400 mt-0.5">{state.signals}</div>
                </div>
                <div className="bg-slate-950/40 rounded px-2 py-1 text-center font-mono">
                  <div className="text-[7.5px] text-emerald-500/80 leading-none">WINS</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">{state.wins}</div>
                </div>
                <div className="bg-slate-950/40 rounded px-2 py-1 text-center font-mono">
                  <div className="text-[7.5px] text-rose-500/80 leading-none">LOSS</div>
                  <div className="text-xs font-bold text-rose-400 mt-0.5">{state.losses}</div>
                </div>
              </div>
            </div>

            {/* Click to Trade Overlay button */}
            <div className="mt-4">
              <button
                onClick={() => {
                  if (!isActiveTrading && !botRunning && !isCalibrationActive) {
                    onSelectSymbolForTrading(info.id);
                  }
                }}
                disabled={isCalibrationActive || (botRunning && !isActiveTrading)}
                className={`w-full py-2 px-4 rounded-xl font-mono text-xs font-bold tracking-wider border transition-all duration-200 uppercase ${
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
                  ? '🔒 LOCKED DURING SESSION'
                  : '🎯 CHOOSE PAIR TO AUTOMATE'}
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
