import { Shield, Sparkles, Activity, Clock, Wifi, User, HelpCircle, Send, QrCode, X, ExternalLink, Copy, Check, Sun, Moon } from 'lucide-react';
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
}: HeaderProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=240-185-11&bgcolor=11-14-17&data=${encodeURIComponent(currentUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-slate-950/70 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 px-4 py-2 md:py-2.5 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-2.5">
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
            <span className="text-[9.5px] font-mono font-bold tracking-widest bg-emerald-950/60 text-emerald-400 px-1 py-0.5 rounded border border-emerald-800/60">
              MARKETS
            </span>
            {isTelegram && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-450 font-mono text-[8px] font-bold rounded-lg animate-pulse tracking-wide uppercase">
                <Send className="w-2 h-2 rotate-45 text-sky-450" /> WebApp {tgUser?.first_name ? `(${tgUser.first_name})` : ''}
              </span>
            )}
          </h1>
          <p className="text-[9px] font-mono text-slate-500 tracking-tight mt-0.5">
            DIGIT OVER (PRED: 4) • TARGET: LAST DIGIT 4 | 5 & RISE • MARTINGALE RECOVERY
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 md:gap-3.5 w-full sm:w-auto font-sans">
        <div className="flex items-center gap-2.5 bg-slate-900/65 px-3 py-1.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Global Ticks</span>
            <span className="font-mono text-xs font-bold text-slate-200 mt-0 flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-500" />
              {ticksCount.toLocaleString()}
            </span>
          </div>
          
          <div className="w-px h-5.5 bg-slate-800" />
          
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Scanner Signals</span>
            <span className="font-mono text-xs font-bold text-amber-400 mt-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {signalsCount}
            </span>
          </div>
          
          <div className="w-px h-5.5 bg-slate-800" />
          
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Active Time</span>
            <span className="font-mono text-xs font-bold text-slate-200 mt-0 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {sessionTime}
            </span>
          </div>
        </div>

        {/* Account Details Panel */}
        {account && (
          <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/80 px-2.5 py-1 rounded-xl text-[11px]">
            <div className="w-6 h-6 rounded-lg bg-indigo-950/40 border border-indigo-800/50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-[9px] font-mono font-medium text-slate-200 leading-none">
                {account.fullname}
              </div>
              <div className="flex items-center gap-1 text-[8px] font-mono text-slate-500 mt-0.5">
                <span className={`w-1 h-1 rounded-full ${account.is_virtual ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {account.loginid} ({account.is_virtual ? 'Demo' : 'Real'})
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* QR Code Trigger Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center justify-center p-1.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 rounded-lg cursor-pointer transition-all active:scale-97"
            title="Scan QR Code to open on mobile"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>

          {/* Theme Dynamic Toggler (Classic Gold / Cyber Neon-Cyan) */}
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center p-1.5 bg-slate-900/65 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-300 hover:text-indigo-400 rounded-lg cursor-pointer transition-all active:scale-97"
            title={theme === 'dark' ? "Switch to Cyber Neon-Cyan Theme" : "Switch to Classic Gold Theme"}
          >
            {theme === 'dark' ? (
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            )}
          </button>

          {/* Administrator Settings Button */}
          <button
            onClick={onOpenAdminHub}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/65 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 hover:border-slate-705 text-slate-300 rounded-lg font-mono text-[10px] font-bold tracking-wider cursor-pointer transition-colors active:scale-97"
            title="Configure Custom App ID, Affiliate Token, and Broker Fees"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>ADMINISTRATOR</span>
          </button>

          {/* Onboarding Guide Button */}
          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/65 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800 hover:border-slate-705 text-slate-300 rounded-lg font-mono text-[10px] font-bold tracking-wider cursor-pointer transition-colors active:scale-97"
            title="Open Interactive Onboarding & Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>HOW TO USE</span>
          </button>

          {/* Signal Indicator Dot */}
          <div className="flex items-center gap-1.5 bg-slate-900/65 border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColorMap[connectionStatus].split(' ')[0]}`} />
            <span className="font-mono font-bold tracking-wider text-[10px] text-slate-300">
              {statusLabelMap[connectionStatus]}
            </span>
          </div>

          {/* Master Stop Button */}
          {botRunning && (
            <button
              id="headerStopBtn"
              onClick={onStopAll}
              className="px-3 py-1.5 border border-rose-500/40 hover:border-rose-500 text-rose-400 hover:text-rose-100 bg-rose-955/20 hover:bg-rose-900/50 rounded-lg font-mono text-[10px] font-bold tracking-widest cursor-pointer transition-all duration-150 shadow-md shadow-rose-950/10 active:scale-95"
            >
              STOP BOT
            </button>
          )}
        </div>
      </div>

      {/* QR MODAL DIALOG */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-5 relative shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-950/60 border border-slate-800/60 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                Scan to Open App
              </h3>
              <p className="text-[11px] text-slate-400">
                Scan this QR code with your mobile camera to launch the real-time application directly on your phone.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-center mx-auto w-48 h-48">
              <img
                src={qrImageSrc}
                alt="Scan to Open Mobile"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* URL Display Box */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">CURRENT MOBILE PATH</span>
              <div className="flex bg-slate-950 border border-slate-850 rounded-xl p-2.5 items-center justify-between gap-2 overflow-hidden">
                <span className="text-[10px] font-mono text-slate-400 truncate text-left select-all">
                  {currentUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="p-1 px-2 shrink-0 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[10px] font-mono font-bold text-slate-300 hover:text-slate-100 flex items-center gap-1 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/50 leading-relaxed text-left flex gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Both the Development preview and the Shared sandbox are fully responsive, touch-optimized, and built to reflect instantaneous ticker feeds.
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
