/**
 * BotTrader.tsx — NexScan IQ Markets
 * Redesigned: clean, Deriv-inspired professional layout
 * Dark navy/slate palette · Card-based sections · Minimal chrome
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { BotConfig, BotState, AccountInfo, LogMessage, SymbolInfo, SymbolState } from '../types';
import { getVolColor, formatPrice } from '../constants';
import {
  Lock, Key, Play, Square, CircleCheck, RefreshCw, AlertTriangle,
  Trash2, ShieldCheck, Terminal, Zap, TrendingUp, TrendingDown,
  Wifi, WifiOff, ChevronDown, ChevronUp, Eye, EyeOff,
  BarChart2, Activity, DollarSign, Target
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

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
      minWidth: 0,
      flex: 1,
    }}>
      <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: accent || '#e2e8f0', lineHeight: 1.2 }}>{value}</span>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '18px 16px',
      ...style
    }}>
      {children}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ color: '#6366f1', display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>{label}</span>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: checked ? '#6366f1' : '#1e293b',
          border: `1px solid ${checked ? '#818cf8' : '#334155'}`,
          position: 'relative', transition: 'background 0.2s, border-color 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: 8,
          background: checked ? '#fff' : '#475569',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: '#cbd5e1' }}>{label}</span>
    </label>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function NumInput({ label, value, onChange, onBlur, suffix }: {
  label: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void; suffix?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', background: '#020617', borderRadius: 9, border: '1px solid #1e293b', overflow: 'hidden' }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '9px 11px', fontSize: 14, fontFamily: 'monospace', fontWeight: 600,
            color: '#e2e8f0', width: '100%'
          }}
        />
        {suffix && <span style={{ paddingRight: 10, fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
  const [showConfig, setShowConfig] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isAutoTransitionRef = useRef(false);
  const isResumeModeRef = useRef(false);
  const [searchLoadCountdown, setSearchLoadCountdown] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);

  // Local config inputs
  const [stakeInput, setStakeInput] = useState(botConfig.stake.toString());
  const [martingaleInput, setMartingaleInput] = useState(botConfig.martingaleMultiplier.toString());
  const [maxWinsInput, setMaxWinsInput] = useState(botConfig.maxWins.toString());
  const [maxLossesInput, setMaxLossesInput] = useState(botConfig.maxLosses.toString());

  useEffect(() => { setStakeInput(botConfig.stake.toString()); }, [botConfig.stake]);
  useEffect(() => { setMartingaleInput(botConfig.martingaleMultiplier.toString()); }, [botConfig.martingaleMultiplier]);
  useEffect(() => { setMaxWinsInput(botConfig.maxWins.toString()); }, [botConfig.maxWins]);
  useEffect(() => { setMaxLossesInput(botConfig.maxLosses.toString()); }, [botConfig.maxLosses]);
  useEffect(() => { setTokenInput(botConfig.apiToken); }, [botConfig.apiToken]);
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  useEffect(() => { if (autoTriggerScan) { isAutoTransitionRef.current = false; isResumeModeRef.current = false; onScanReset(); handleSearchAndLoad(); } }, [autoTriggerScan]);
  useEffect(() => { if (autoTriggerResume) { isResumeModeRef.current = true; isAutoTransitionRef.current = false; onResumeReset(); handleSearchAndLoad(); } }, [autoTriggerResume]);

  const lastBotStatusRef = useRef(botState.status);
  useEffect(() => {
    if ((botState.status === 'won_limit' || botState.status === 'lost_limit') && lastBotStatusRef.current !== botState.status) {
      if (botState.status === 'won_limit') isAutoTransitionRef.current = false;
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

  const getBestSymbolId = () => {
    const current = botState.symbol;
    const inResume = isResumeModeRef.current;
    const ranked = Object.values(symbolsState)
      .filter(s => !(inResume && s.info.id === current))
      .map(s => {
        const total = s.wins + s.losses;
        const wr = total >= 3 ? (s.wins / total) * 100 : null;
        const freq = s.ticks > 10 ? (s.signals / s.ticks) * 100 : 0;
        const score = wr !== null ? wr * 0.65 + Math.min(freq * 5, 100) * 0.35 : -1;
        return { id: s.info.id, score, winRate: wr };
      })
      .sort((a, b) => b.score - a.score);
    if (inResume) { const q = ranked.find(s => s.winRate !== null && s.winRate >= 55); if (q) return q.id; }
    return ranked[0]?.id || 'R_100';
  };

  const handleSearchAndLoad = () => {
    setSearchLoadCountdown(null);
    setIsScanning(true);
    let idx = 0;
    const list = Object.values(symbolsState).map(s => s.info);
    if (!list.length) { setIsScanning(false); return; }
    const iv = setInterval(() => {
      if (idx < list.length * 2) { setScanIndex(idx % list.length); idx++; }
      else {
        clearInterval(iv);
        setIsScanning(false);
        const best = getBestSymbolId();
        if (isResumeModeRef.current) { isResumeModeRef.current = false; onResumeWithSymbol(best); }
        else { const auto = isAutoTransitionRef.current; isAutoTransitionRef.current = false; onSelectSymbolForTrading(best, auto); }
      }
    }, 100);
  };

  const handleAuthorize = (e: FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) onAuthorize(tokenInput.trim());
  };

  // Computed
  const activeState = symbolsState[activeSymbol.id];
  const totalSim = activeState ? activeState.wins + activeState.losses : 0;
  const activeWinRate = totalSim >= 3 ? (activeState!.wins / totalSim) * 100 : null;
  const activeSignals = activeState?.signals ?? 0;
  const activeMeetsConditions = activeWinRate !== null && activeWinRate >= 55 && activeSignals >= 5;

  const totalTrades = botState.wins + botState.losses;
  const sessionWinRate = totalTrades > 0 ? ((botState.wins / totalTrades) * 100).toFixed(1) : '—';
  const profitColor = botState.profit > 0 ? '#10b981' : botState.profit < 0 ? '#f43f5e' : '#94a3b8';

  // Account state
  const isConnected = !!account;
  const isDemo = botConfig.isDemo;
  const displayAccount = isDemo ? demoAccount : realAccount;
  const balance = displayAccount?.balance ?? 0;
  const loginId = displayAccount?.loginid ?? '—';

  // Connection badge
  const connBadge = {
    idle: { color: '#475569', label: 'Not connected' },
    connecting: { color: '#f59e0b', label: 'Connecting…' },
    connected: { color: '#10b981', label: 'Connected' },
    error: { color: '#f43f5e', label: 'Auth error' },
  }[authorizedWsStatus];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      padding: '12px 10px 24px',
      background: '#080f1a',
      minHeight: '100vh',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>

      {/* ── Account Card ──────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel icon={<Wifi size={14} />} label="Deriv Account" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: connBadge.color, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: connBadge.color }}>{connBadge.label}</span>
          </div>
        </div>

        {!isConnected ? (
          <form onSubmit={handleAuthorize} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Paste your Deriv API token"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#020617', border: '1px solid #1e293b',
                  borderRadius: 10, padding: '11px 40px 11px 13px',
                  fontSize: 13, fontFamily: 'monospace', color: '#e2e8f0', outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowToken(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex' }}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button type="submit" style={{
              width: '100%', padding: '12px 0',
              background: '#312e81', border: '1px solid #4338ca',
              borderRadius: 10, color: '#a5b4fc', fontSize: 13,
              fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Key size={14} /> CONNECT ACCOUNT
            </button>
            <p style={{ margin: 0, fontSize: 11, color: '#475569', textAlign: 'center', lineHeight: 1.5 }}>
              Your token is stored locally. <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>Get a token →</a>
            </p>
          </form>
        ) : (
          <>
            {/* Balance row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#020617', borderRadius: 12, padding: '14px 15px',
              border: '1px solid #1e293b', marginBottom: 12,
            }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  {isDemo ? 'Demo Balance' : 'Live Balance'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: '#f1f5f9' }}>
                  ${balance.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: '#475569' }}>USD</span>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b', marginTop: 2 }}>{loginId}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end' }}>
                {/* Demo/Real Toggle */}
                <div style={{
                  display: 'flex', borderRadius: 8, overflow: 'hidden',
                  border: '1px solid #1e293b', fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                }}>
                  {['Demo', 'Real'].map(mode => {
                    const active = mode === 'Demo' ? isDemo : !isDemo;
                    return (
                      <button key={mode} onClick={() => onUpdateConfig({ isDemo: mode === 'Demo' })}
                        style={{
                          padding: '6px 12px', background: active ? '#312e81' : 'transparent',
                          color: active ? '#a5b4fc' : '#475569', border: 'none', cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}>
                        {mode}
                      </button>
                    );
                  })}
                </div>
                <button onClick={onDeauthorize} style={{
                  background: 'transparent', border: '1px solid #1e293b',
                  borderRadius: 7, padding: '5px 11px', fontSize: 11, fontFamily: 'monospace',
                  color: '#64748b', cursor: 'pointer',
                }}>
                  Disconnect
                </button>
              </div>
            </div>

            {/* Smart presets */}
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', display: 'block', marginBottom: 8 }}>
                Smart Presets
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
                {[
                  { label: 'Low Risk', stake: 0.35, m: 2, wins: 2, losses: 3, color: '#10b981' },
                  { label: 'Balanced', stake: Math.max(0.35, balance * 0.01), m: 2, wins: 3, losses: 5, color: '#6366f1' },
                  { label: 'Pro Power', stake: Math.max(0.35, balance * 0.02), m: 2.5, wins: 5, losses: 7, color: '#f59e0b' },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => onUpdateConfig({ stake: parseFloat(p.stake.toFixed(2)), martingaleMultiplier: p.m, maxWins: p.wins, maxLosses: p.losses })}
                    style={{
                      background: '#0a0f1e', border: `1px solid ${p.color}33`,
                      borderRadius: 9, padding: '9px 5px', cursor: 'pointer', textAlign: 'center',
                    }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: p.color, fontFamily: 'monospace' }}>{p.label}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>
                      ${parseFloat(p.stake.toFixed(2))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Active Pair Card ─────────────────────────────────────── */}
      <Card>
        <SectionLabel icon={<Activity size={14} />} label="Active Market" />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#020617', borderRadius: 12, padding: '13px 14px',
          border: '1px solid #1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: `${getVolColor(activeSymbol.vol)}18`,
              border: `1px solid ${getVolColor(activeSymbol.vol)}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontFamily: 'monospace', fontWeight: 800,
              color: getVolColor(activeSymbol.vol),
            }}>
              {activeSymbol.short}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{activeSymbol.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                <span style={{
                  fontSize: 10, fontFamily: 'monospace', padding: '2px 7px',
                  borderRadius: 5, background: '#1e293b', color: '#64748b',
                }}>
                  {activeSymbol.tier === '1S' ? '1-sec' : 'Standard'}
                </span>
                {activeState?.connected && (
                  <span style={{ fontSize: 10, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 5, background: '#052e16', color: '#10b981' }}>
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Live price + last digit */}
          {activeState?.price !== null && activeState?.price !== undefined && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f9' }}>
                {formatPrice(activeState.price, activeSymbol.pip)}
              </div>
              <div style={{
                fontSize: 11, fontFamily: 'monospace', fontWeight: 800,
                color: activeState.lastDigit === 4 ? '#fbbf24' : activeState.lastDigit === 5 ? '#f97316' : '#64748b',
                marginTop: 2,
              }}>
                Digit: {activeState.lastDigit ?? '—'}
              </div>
            </div>
          )}
        </div>

        {/* Scanner condition badges */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <div style={{
            flex: 1, borderRadius: 9, padding: '9px 11px',
            background: activeWinRate !== null && activeWinRate >= 55 ? '#052e16' : '#1a0a00',
            border: `1px solid ${activeWinRate !== null && activeWinRate >= 55 ? '#10b981' : '#78350f'}44`,
          }}>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginBottom: 3 }}>Win Rate</div>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: activeWinRate !== null && activeWinRate >= 55 ? '#10b981' : '#f59e0b' }}>
              {activeWinRate !== null ? `${activeWinRate.toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', marginTop: 1 }}>target ≥ 55%</div>
          </div>
          <div style={{
            flex: 1, borderRadius: 9, padding: '9px 11px',
            background: activeSignals >= 5 ? '#052e16' : '#1a0a00',
            border: `1px solid ${activeSignals >= 5 ? '#10b981' : '#78350f'}44`,
          }}>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginBottom: 3 }}>Signals</div>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: activeSignals >= 5 ? '#10b981' : '#f59e0b' }}>
              {activeSignals}
            </div>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', marginTop: 1 }}>target ≥ 5</div>
          </div>
          <div style={{
            flex: 1, borderRadius: 9, padding: '9px 11px',
            background: '#0a0f1e', border: '1px solid #1e293b44',
          }}>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginBottom: 3 }}>Ticks</div>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: '#94a3b8' }}>
              {activeState?.ticks ?? 0}
            </div>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', marginTop: 1 }}>scanned</div>
          </div>
        </div>

        {/* Search & Load button */}
        <button
          onClick={handleSearchAndLoad}
          disabled={isScanning || botState.isRunning}
          style={{
            width: '100%', marginTop: 11, padding: '11px 0',
            background: isScanning ? '#1e293b' : '#0f172a',
            border: '1px solid #334155', borderRadius: 10,
            color: isScanning ? '#6366f1' : '#64748b',
            fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em',
            cursor: isScanning || botState.isRunning ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'color 0.15s',
          }}
        >
          {isScanning ? (
            <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Scanning markets…</>
          ) : (
            <><Zap size={13} /> Find Best Market</>
          )}
        </button>
      </Card>

      {/* ── Trade Configuration ───────────────────────────────────── */}
      <Card>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showConfig ? 14 : 0, cursor: 'pointer' }}
          onClick={() => setShowConfig(p => !p)}
        >
          <SectionLabel icon={<Target size={14} />} label="Trade Parameters" />
          <span style={{ color: '#475569', display: 'flex' }}>
            {showConfig ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>

        {showConfig && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <NumInput label="Stake" value={stakeInput} onChange={v => { setStakeInput(v); const p = parseFloat(v); if (!isNaN(p) && p > 0) onUpdateConfig({ stake: p }); }}
                onBlur={() => { const p = parseFloat(stakeInput); const c = isNaN(p) || p < 0.35 ? 0.35 : p; setStakeInput(c.toString()); onUpdateConfig({ stake: c }); }} suffix="USD" />
              <NumInput label="Martingale ×" value={martingaleInput} onChange={v => { setMartingaleInput(v); const p = parseFloat(v); if (!isNaN(p) && p > 0) onUpdateConfig({ martingaleMultiplier: p }); }}
                onBlur={() => { const p = parseFloat(martingaleInput); const c = isNaN(p) || p < 1 ? 1 : p; setMartingaleInput(c.toString()); onUpdateConfig({ martingaleMultiplier: c }); }} />
              <NumInput label="Max Wins" value={maxWinsInput} onChange={v => { setMaxWinsInput(v); const p = parseInt(v); if (!isNaN(p) && p > 0) onUpdateConfig({ maxWins: p }); }}
                onBlur={() => { const p = parseInt(maxWinsInput); const c = isNaN(p) || p < 1 ? 2 : p; setMaxWinsInput(c.toString()); onUpdateConfig({ maxWins: c }); }} suffix="trades" />
              <NumInput label="Max Losses" value={maxLossesInput} onChange={v => { setMaxLossesInput(v); const p = parseInt(v); if (!isNaN(p) && p > 0) onUpdateConfig({ maxLosses: p }); }}
                onBlur={() => { const p = parseInt(maxLossesInput); const c = isNaN(p) || p < 1 ? 5 : p; setMaxLossesInput(c.toString()); onUpdateConfig({ maxLosses: c }); }} suffix="trades" />
            </div>
            <Toggle
              checked={isAdvancedMode}
              onChange={onToggleAdvancedMode}
              label="Auto pair-swap on low win rate"
            />
          </>
        )}
      </Card>

      {/* ── Trade Button ─────────────────────────────────────────── */}
      {isConnected && (
        <>
          {searchLoadCountdown !== null && (
            <div style={{
              textAlign: 'center', padding: '10px 0', fontSize: 12,
              fontFamily: 'monospace', color: '#6366f1',
            }}>
              Auto-scan starts in {searchLoadCountdown}s…
            </div>
          )}

          {!botState.isRunning ? (
            <button
              onClick={onStartBot}
              disabled={!activeMeetsConditions}
              style={{
                width: '100%', padding: '16px 0',
                background: activeMeetsConditions ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#0f172a',
                border: activeMeetsConditions ? '1px solid #818cf8' : '1px solid #1e293b',
                borderRadius: 14, cursor: activeMeetsConditions ? 'pointer' : 'not-allowed',
                color: activeMeetsConditions ? '#fff' : '#334155',
                fontSize: 15, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                transition: 'opacity 0.15s',
                boxShadow: activeMeetsConditions ? '0 8px 24px rgba(99,102,241,0.25)' : 'none',
              }}
            >
              {activeMeetsConditions ? (
                <><Play size={16} fill="white" /> START TRADING</>
              ) : (
                <><Lock size={16} /> AWAITING CONDITIONS</>
              )}
            </button>
          ) : (
            <button
              onClick={onStopBot}
              style={{
                width: '100%', padding: '16px 0',
                background: '#1a0000', border: '1px solid #f43f5e66',
                borderRadius: 14, cursor: 'pointer',
                color: '#f43f5e', fontSize: 15, fontFamily: 'monospace',
                fontWeight: 800, letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                animation: 'pulse 2s infinite',
              }}
            >
              <Square size={16} fill="#f43f5e" /> STOP TRADING
            </button>
          )}
        </>
      )}

      {/* ── Performance HUD ───────────────────────────────────────── */}
      <Card>
        <SectionLabel icon={<BarChart2 size={14} />} label="Session Performance" />

        {/* Net P&L — hero number */}
        <div style={{
          background: '#020617', borderRadius: 12, padding: '16px 14px',
          border: `1px solid ${profitColor}22`, marginBottom: 12, textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Net P&amp;L</div>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'monospace', color: profitColor, lineHeight: 1 }}>
            {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
          </div>
          {botState.isRunning && (
            <div style={{ position: 'absolute', inset: 0, background: profitColor, opacity: 0.025, pointerEvents: 'none', animation: 'pulse 2s infinite' }} />
          )}
        </div>

        {/* Wins / Losses */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
          <div style={{ background: '#021a0e', border: '1px solid #10b98122', borderRadius: 11, padding: '12px 13px' }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Wins</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: '#10b981' }}>
              {botState.wins} <span style={{ fontSize: 11, fontWeight: 400, color: '#065f46' }}>/ {botConfig.maxWins}</span>
            </div>
            <div style={{ height: 3, background: '#0d2a1c', borderRadius: 2, marginTop: 9, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (botState.wins / botConfig.maxWins) * 100)}%`, background: '#10b981', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ background: '#1a0008', border: '1px solid #f43f5e22', borderRadius: 11, padding: '12px 13px' }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Losses</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: '#f43f5e' }}>
              {botState.consecutiveLosses} <span style={{ fontSize: 11, fontWeight: 400, color: '#4c0519' }}>/ {botConfig.maxLosses}</span>
            </div>
            <div style={{ height: 3, background: '#2d0015', borderRadius: 2, marginTop: 9, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (botState.consecutiveLosses / botConfig.maxLosses) * 100)}%`, background: '#f43f5e', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          <StatPill label="Win Rate" value={totalTrades > 0 ? `${sessionWinRate}%` : '—'} accent="#6366f1" />
          <StatPill label="Trades" value={botState.tradesCount.toString()} />
          <StatPill label="Next Payout" value={`$${(botState.currentStake * 1.95).toFixed(2)}`} accent="#f59e0b" />
        </div>

        {/* Status badge */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: botState.isRunning ? '#10b981' : '#334155',
              display: 'inline-block',
              boxShadow: botState.isRunning ? '0 0 6px #10b981' : 'none',
            }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: botState.isRunning ? '#10b981' : '#475569' }}>
              {botState.isRunning ? 'Bot active' : 'Standby'}
            </span>
          </div>
          <span style={{
            fontSize: 10, fontFamily: 'monospace', padding: '3px 9px',
            borderRadius: 6, background: isAdvancedMode ? '#1e1b4b' : '#0f172a',
            border: `1px solid ${isAdvancedMode ? '#4338ca' : '#1e293b'}`,
            color: isAdvancedMode ? '#818cf8' : '#475569',
          }}>
            {isAdvancedMode ? '⚡ Advanced' : 'Normal'}
          </span>
        </div>
      </Card>

      {/* ── Activity Log ──────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionLabel icon={<Terminal size={14} />} label="Activity Log" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setShowConsole(p => !p)} style={{
              background: 'none', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px',
              fontSize: 11, fontFamily: 'monospace', color: '#475569', cursor: 'pointer',
            }}>
              {showConsole ? 'Hide' : 'Show'}
            </button>
            {showConsole && logs.length > 0 && (
              <button onClick={onClearLogs} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: 4,
              }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {showConsole && (
          <div style={{
            background: '#020617', borderRadius: 10, border: '1px solid #0f172a',
            maxHeight: 200, overflowY: 'auto', padding: '10px 12px',
          }}>
            {logs.length === 0 ? (
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', margin: 0 }}>No activity yet.</p>
            ) : (
              logs.slice(-50).map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#334155', flexShrink: 0, paddingTop: 1 }}>{log.timestamp}</span>
                  <span style={{
                    fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5,
                    color: log.type === 'success' ? '#10b981' : log.type === 'error' ? '#f43f5e' : log.type === 'warning' ? '#f59e0b' : log.type === 'trade' ? '#6366f1' : '#64748b',
                  }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        )}
      </Card>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
      `}</style>
    </div>
  );
}
