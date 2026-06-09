import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, AlertTriangle, Key, Terminal, Wifi, Check, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequenceCompleted: boolean;
  onLockConsole: () => void;
  premiumLocked?: boolean;
  adminPin?: string;
}

export function AdminHubModal({
  isOpen,
  onClose,
  sequenceCompleted,
  onLockConsole,
  premiumLocked: premiumLockedProp = true,
  adminPin = '',
}: AdminHubModalProps) {
  const [maintenance, setMaintenance] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [markupMultiplier, setMarkupMultiplier] = useState(1.0);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [wsStreams, setWsStreams] = useState<number>(1);
  const [isSaved, setIsSaved] = useState(false);
  const [premiumLocked, setPremiumLocked] = useState(premiumLockedProp);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [togglingPremium, setTogglingPremium] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Sync premiumLocked from parent prop when modal opens
  useEffect(() => {
    setPremiumLocked(premiumLockedProp);
  }, [premiumLockedProp, isOpen]);

  // Fetch waitlist count when modal opens
  useEffect(() => {
    if (!isOpen || !adminPin) return;
    fetch('/api/admin/get-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput || adminPin }),
    })
      .then(r => r.json())
      .then(data => { if (data.success) setWaitlistCount(data.count); })
      .catch(() => {});
  }, [isOpen, adminPin]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Setup some simulated real-time administrator telemetry logs
    const seedLogs = [
      `[NEXSCAN-CONSOLE] Handshake acknowledged.`,
      `[BROKER-FEED] Connected streams: 12 active volatility indices.`,
      `[SECURITY] TLS v1.3 handshake verification passed.`,
      `[SYSTEM] Gating factors calibrated: normal=55% SafeMode=65% EV.`,
    ];
    setSystemLogs(seedLogs);

    const interval = setInterval(() => {
      const liveEvents = [
        `[TELEMETRY] Ping latency: ${Math.floor(Math.random() * 40) + 10}ms`,
        `[NEURAL-PARSER] Asset scan batch complete. High variance detected on R_50S.`,
        `[WEBSOCKET] Active heartbeat frame received.`,
        `[AUTONOMOUS] Current EV model weights optimized.`,
      ];
      setSystemLogs(prev => [...prev.slice(-6), liveEvents[Math.floor(Math.random() * liveEvents.length)]]);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePremiumLock = async () => {
    if (!pinInput.trim()) { setPinError('Enter your admin PIN to continue.'); return; }
    setPinError('');
    setTogglingPremium(true);
    try {
      const res = await fetch('/api/admin/toggle-premium-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim(), locked: !premiumLocked }),
      });
      const data = await res.json();
      if (data.success) {
        setPremiumLocked(data.premiumLocked);
        setPinInput('');
        setPinError('');
      } else {
        setPinError('Incorrect PIN. Access denied.');
      }
    } catch { setPinError('Network error. Try again.'); }
    setTogglingPremium(false);
  };

  const handleSaveConfig = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    // Send configuration update to backend/parent if necessary
    fetch('/api/admin-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maintenance,
        alertText,
        markupMultiplier,
        wsStreams
      })
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-950 border border-indigo-500/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[525px]"
      >
        {/* Terminal Header */}
        <div className="bg-slate-955 px-5 py-4 border-b border-slate-900/60 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="font-mono text-xs font-black tracking-widest text-slate-100 uppercase">
              NEXSCAN IQ SYS/OP CONSOLE
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500 font-extrabold uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>Root-Level Access</span>
          </div>
        </div>

        {/* Console view splits */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto font-sans">
          
          {/* Simulated Telemetry Streams */}
          <div className="bg-slate-980/40 border border-slate-950 rounded-xl p-4 font-mono select-none space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-black leading-none pb-1 border-b border-slate-900/50">
              <span>Telemetry Matrix State</span>
              <span className="text-indigo-400 flex items-center gap-1 leading-none">
                <Wifi className="w-3 h-3" /> {wsStreams * 10} STREAMS INGESTING
              </span>
            </div>
            <div className="space-y-1 text-[9px] text-slate-400 custom-scrollbar leading-relaxed">
              {systemLogs.map((log, idx) => (
                <div key={idx} className="truncate">
                  <span className="text-indigo-500/80 mr-1.5">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* System Controls */}
            <div className="space-y-3.5">
              <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Parameters calibration</h4>
              
              <div className="space-y-1">
                <label className="text-[9.5px] uppercase font-bold text-slate-450 block tracking-wide">Markup multiplier</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={markupMultiplier}
                    onChange={(e) => setMarkupMultiplier(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="font-mono text-xs text-indigo-400 font-bold w-10 text-right">{markupMultiplier.toFixed(1)}x</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] uppercase font-bold text-slate-450 block tracking-wide">Websocket Subscriptions</label>
                <select
                  value={wsStreams}
                  onChange={(e) => setWsStreams(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value={1}>10 Active Pairs (Standard)</option>
                  <option value={2}>20 Active Pairs (Premium Hub)</option>
                  <option value={35}>35 Ultra-Parallel Assets</option>
                </select>
              </div>
            </div>

            {/* Simulated Live Alerts */}
            <div className="space-y-3.5">
              <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Administrative alerts</h4>

              <div className="space-y-1">
                <label className="text-[9.5px] uppercase font-bold text-slate-450 block tracking-wide font-sans">Dispatch Banner Alert</label>
                <textarea
                  placeholder="e.g. System under temporary maintenance. Safe mode metrics optimized..."
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  className="w-full h-20 bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:outline-none rounded-lg p-2 text-xs text-slate-100 placeholder:text-slate-700 font-mono resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-900/35 border border-slate-900 rounded-lg">
            <input
              type="checkbox"
              id="maintenance"
              checked={maintenance}
              onChange={(e) => setMaintenance(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
            />
            <label htmlFor="maintenance" className="text-[10px] font-bold uppercase text-slate-300 tracking-wide cursor-pointer select-none font-sans">
              🔒 Flag Maintenance Intercept Mode (Freeze user trades)
            </label>
          </div>

          {/* Premium Lock Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-amber-300 tracking-wide font-sans">
                  👑 Premium Access Gate
                </span>
                {waitlistCount !== null && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-900/40 text-amber-400 border border-amber-700/30 rounded-md">
                    {waitlistCount} on waitlist
                  </span>
                )}
              </div>
              <button
                onClick={handleTogglePremiumLock}
                disabled={togglingPremium}
                className={`px-3 py-1.5 rounded-lg font-mono text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all border ${
                  premiumLocked
                    ? 'bg-amber-500/10 border-amber-600/40 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 border-emerald-600/40 text-emerald-400 hover:bg-emerald-500/20'
                } disabled:opacity-50`}
              >
                {togglingPremium ? '...' : premiumLocked ? 'LOCKED — Click to Open' : 'OPEN — Click to Lock'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Admin PIN to confirm"
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:outline-none px-2.5 py-1.5 rounded-lg text-[10px] text-slate-200 font-mono"
              />
            </div>
            {pinError && <p className="text-[9px] text-rose-400 font-bold px-1">{pinError}</p>}
            <p className="text-[9px] text-slate-600 font-mono px-1">
              {premiumLocked
                ? 'Non-admin users see the coming-soon waitlist page.'
                : 'Premium is LIVE — all users can access the premium tab.'}
            </p>
          </div>

        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-900/60 p-5 shrink-0 flex items-center justify-between bg-slate-955">
          <button
            onClick={() => {
              onLockConsole();
              onClose();
            }}
            className="py-2.5 px-4 rounded-lg font-mono text-[10px] uppercase font-extrabold tracking-widest border border-slate-800 hover:border-slate-705 text-slate-400 hover:text-white cursor-pointer transition-all"
          >
            Lock console
          </button>

          <button
            onClick={handleSaveConfig}
            className="py-2.5 px-5 rounded-lg font-mono text-[10px] uppercase font-bold bg-indigo-500 text-white hover:bg-indigo-400 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow shadow-indigo-500/10 hover:shadow-indigo-500/20"
          >
            {isSaved ? (
              <>
                APPLIED SUCCESS <Check className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                APPLY SYS CONFIG <Save className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
