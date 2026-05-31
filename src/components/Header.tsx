import { Shield, Sparkles, Activity, Clock, User, HelpCircle, Send, Sun, Moon, MoreVertical, X } from 'lucide-react';
import { AccountInfo } from '../types';
import nexscanLogo from '../assets/images/nexscan_iq_logo_main.png';
import React, { useState } from 'react';

interface HeaderProps {
  ticksCount: number;
  signalsCount: number;
  sessionTime: string;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
  account: AccountInfo | null;
  botRunning: boolean;
  onStopAll: () => void;
  onOpenOnboarding: () => void;
  onOpenAdminHub: () => void;
  isTelegram?: boolean;
  tgUser?: any;
  theme?: 'dark' | 'cyber';
  onToggleTheme?: () => void;
  onboardingCompleted?: boolean;
}

export function Header({
  ticksCount,
  signalsCount,
  sessionTime,
  connectionStatus,
  account,
  botRunning,
  onStopAll,
  onOpenOnboarding,
  onOpenAdminHub,
  isTelegram = false,
  tgUser = null,
  theme = 'dark',
  onToggleTheme = () => {},
  onboardingCompleted = false,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const statusColorMap = {
    idle: 'bg-slate-500 border-slate-400 text-slate-400',
    connecting: 'bg-amber-500 border-amber-400 text-amber-500 animate-pulse',
    connected: 'bg-emerald-500 border-emerald-400 text-emerald-400',
    error: 'bg-rose-500 border-rose-400 text-rose-500 animate-bounce',
    disconnected: 'bg-slate-600 border-slate-500 text-slate-500',
  };

  const statusLabelMap = {
    idle: 'IDLE',
    connecting: 'CONNECTING...',
    connected: 'LIVE SCANNING',
    error: 'WS ERROR',
    disconnected: 'DISCONNECTED',
  };

  return (
    <header className="bg-slate-950/70 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 px-4 py-2 md:py-2.5 md:px-6 flex items-center justify-between gap-3 animate-fade-in">

      {/* ── Left: Logo + Title ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative">
          <img
            src={nexscanLogo}
            alt="NexScan IQ Markets Logo"
            className="w-10 h-10 rounded-lg shadow-lg border border-slate-800/80 object-contain bg-slate-900/60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 border-2 border-slate-950 rounded-full animate-ping" />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 border-2 border-slate-950 rounded-full" />
        </div>

        <div className="text-left">
          <h1 className="font-sans font-extrabold text-[15px] text-slate-100 tracking-tight leading-none flex flex-wrap items-center gap-1.5">
            NEXSCAN <span className="text-indigo-400">IQ</span>
            <span className="text-[10px] font-mono font-bold tracking-widest bg-emerald-950/60 text-emerald-400 px-1 py-0.5 rounded border border-emerald-800/60">
              MARKETS
            </span>
            {isTelegram && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-450 font-mono text-[10px] font-bold rounded-lg animate-pulse tracking-wide uppercase">
                <Send className="w-2 h-2 rotate-45 text-sky-450" /> WebApp {tgUser?.first_name ? `(${tgUser.first_name})` : ''}
              </span>
            )}
          </h1>
          <p className="text-[10px] font-mono text-slate-500 tracking-tight mt-0.5 hidden sm:block">
            Digit Over (Pred: 4) · Last Digit 4 | 5 & Rise · Martingale Recovery
          </p>
        </div>
      </div>

      {/* ── Centre: Stats Pill ── */}
      <div className="hidden md:flex items-center gap-2.5 bg-slate-900/65 px-3 py-1.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Ticks</span>
          <span className="font-mono text-xs font-bold text-slate-200 mt-0 flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-500" />
            {ticksCount.toLocaleString()}
          </span>
        </div>

        <div className="w-px h-5.5 bg-slate-800" />

        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Signals</span>
          <span className="font-mono text-xs font-bold text-amber-400 mt-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {signalsCount}
          </span>
        </div>

        <div className="w-px h-5.5 bg-slate-800" />

        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Uptime</span>
          <span className="font-mono text-xs font-bold text-slate-200 mt-0 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {sessionTime}
          </span>
        </div>
      </div>

      {/* ── Right: Account + Status + Actions ── */}
      <div className="flex items-center gap-2">

        {/* Account Panel */}
        {account && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/40 border border-slate-800/80 px-2.5 py-1 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-indigo-950/40 border border-indigo-800/50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-[11px] font-mono font-medium text-slate-200 leading-none">
                {account.fullname}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${account.is_virtual ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {account.loginid} · {account.is_virtual ? 'Demo' : 'Real'}
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center gap-1.5 bg-slate-900/65 border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColorMap[connectionStatus].split(' ')[0]}`} />
          <span className="font-mono font-bold tracking-wider text-[10px] text-slate-300 hidden sm:block">
            {statusLabelMap[connectionStatus]}
          </span>
        </div>

        {/* Master Stop Button — only when bot is running */}
        {botRunning && (
          <button
            id="headerStopBtn"
            onClick={onStopAll}
            className="px-3 py-1.5 border border-rose-500/40 hover:border-rose-500 text-rose-400 hover:text-rose-100 bg-rose-955/20 hover:bg-rose-900/50 rounded-lg font-mono text-[11px] font-bold tracking-widest cursor-pointer transition-all duration-150 shadow-md shadow-rose-950/10 active:scale-95"
          >
            STOP BOT
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center justify-center p-1.5 bg-slate-900/65 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-indigo-400 rounded-lg cursor-pointer transition-all active:scale-97"
          title={theme === 'dark' ? 'Switch to Cyber Neon-Cyan Theme' : 'Switch to Classic Gold Theme'}
        >
          {theme === 'dark' ? (
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-indigo-400" />
          )}
        </button>

        {/* Overflow Menu — Admin + How To Use */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center p-1.5 bg-slate-900/65 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-100 rounded-lg cursor-pointer transition-all active:scale-97"
            title="More options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Options</span>
                <button onClick={() => setMenuOpen(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => { onOpenAdminHub(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 text-slate-300 hover:text-emerald-400 transition-colors text-left"
              >
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[12px] font-mono font-bold text-slate-200">Administrator</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">App ID, token & broker fees</div>
                </div>
              </button>

              <button
                onClick={() => { onOpenOnboarding(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 text-slate-300 hover:text-indigo-400 transition-colors text-left"
              >
                <HelpCircle className={`w-4 h-4 text-indigo-400 shrink-0 ${!onboardingCompleted ? 'animate-pulse' : ''}`} />
                <div>
                  <div className="text-[12px] font-mono font-bold text-slate-200">How To Use</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">Interactive onboarding guide</div>
                </div>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
