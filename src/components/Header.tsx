import { Shield, Sparkles, Activity, Clock, Wifi, User, HelpCircle, Send } from 'lucide-react';
import { AccountInfo } from '../types';

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
}: HeaderProps) {
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
    disconnected: 'WS DISCONNECTED',
  };

  return (
    <header className="bg-slate-950/70 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 px-4 py-3 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src="/src/assets/images/nexscan_iq_logo_1779881138833.png"
            alt="NexScan IQ Markets Logo"
            className="w-10 h-10 rounded-xl shadow-lg border border-slate-800/80 object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 border-2 border-slate-950 rounded-full animate-ping" />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 border-2 border-slate-950 rounded-full" />
        </div>
        
        <div>
          <h1 className="font-sans font-extrabold text-lg text-slate-100 tracking-tight leading-none flex flex-wrap items-center gap-2">
            NEXSCAN <span className="text-cyan-400">IQ</span>
            <span className="text-xs font-mono font-bold tracking-widest bg-emerald-950/60 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/60">
              MARKETS
            </span>
            {isTelegram && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-450 font-mono text-[9px] font-bold rounded-lg animate-pulse tracking-wide uppercase">
                <Send className="w-2.5 h-2.5 rotate-45 text-sky-400" /> WebApp {tgUser?.first_name ? `(${tgUser.first_name})` : ''}
              </span>
            )}
          </h1>
          <p className="text-[10px] font-mono text-slate-500 tracking-tight mt-1">
            DIGIT OVER (PRED: 4) • TARGET: LAST DIGIT 4 | 5 & RISE • MARTINGALE RECOVERY
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 md:gap-5 w-full sm:w-auto">
        <div className="flex items-center gap-3 bg-slate-900/65 px-4 py-2 rounded-xl border border-slate-800/80 text-xs text-slate-400">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Global Ticks</span>
            <span className="font-mono text-sm font-bold text-slate-200 mt-0.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              {ticksCount.toLocaleString()}
            </span>
          </div>
          
          <div className="w-px h-7 bg-slate-800" />
          
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Scanner Signals</span>
            <span className="font-mono text-sm font-bold text-amber-400 mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {signalsCount}
            </span>
          </div>
          
          <div className="w-px h-7 bg-slate-800" />
          
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Active Time</span>
            <span className="font-mono text-sm font-bold text-slate-200 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {sessionTime}
            </span>
          </div>
        </div>

        {/* Account Details Panel */}
        {account && (
          <div className="flex items-center gap-2.5 bg-slate-900/40 border border-slate-800/80 px-3 py-1.5 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-indigo-950/40 border border-indigo-800/50 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-mono font-medium text-slate-200 leading-none">
                {account.fullname}
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${account.is_virtual ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {account.loginid} ({account.is_virtual ? 'Demo' : 'Real'})
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Creator Hub Settings Button */}
          <button
            onClick={onOpenAdminHub}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/65 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 hover:border-slate-705 text-slate-300 rounded-xl font-mono text-[11px] font-bold tracking-wider cursor-pointer transition-colors active:scale-97"
            title="Configure Custom App ID, Affiliate Token, and Broker Fees"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>CREATOR HUB</span>
          </button>

          {/* Onboarding Guide Button */}
          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/65 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800 hover:border-slate-705 text-slate-300 rounded-xl font-mono text-[11px] font-bold tracking-wider cursor-pointer transition-colors active:scale-97"
            title="Open Interactive Onboarding & Guide"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>HOW TO USE</span>
          </button>

          {/* Signal Indicator Dot */}
          <div className="flex items-center gap-2 bg-slate-900/65 border border-slate-800/80 px-3 py-2 rounded-xl text-xs">
            <span className={`w-2 h-2 rounded-full ${statusColorMap[connectionStatus].split(' ')[0]}`} />
            <span className="font-mono font-bold tracking-wider text-[11px] text-slate-300">
              {statusLabelMap[connectionStatus]}
            </span>
          </div>

          {/* Master Stop Button */}
          {botRunning && (
            <button
              id="headerStopBtn"
              onClick={onStopAll}
              className="px-4 py-2 border border-rose-500/40 hover:border-rose-500 text-rose-400 hover:text-rose-100 bg-rose-955/20 hover:bg-rose-900/50 rounded-xl font-mono text-xs font-bold tracking-widest cursor-pointer transition-all duration-150 shadow-md shadow-rose-950/10 active:scale-95"
            >
              STOP BOT
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
