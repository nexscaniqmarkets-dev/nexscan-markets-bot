import { useState, useEffect, useRef } from 'react';
import { 
  SymbolState, BotConfig, BotState, AccountInfo, LogMessage, SymbolInfo,
  MembershipState, MembershipType, PastTrade
} from './types';
import { SYMBOLS, getLastDigit, formatPrice } from './constants';
import { Header } from './components/Header';
import { AdminHubModal } from './components/AdminHubModal';
import { ScannerTab } from './components/ScannerTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { BotTrader } from './components/BotTrader';
import { HistoryTab } from './components/HistoryTab';
import { OnboardingGuide } from './components/OnboardingGuide';
import { AdContainer } from './components/AdContainer';
import { TermsAgreementModal } from './components/TermsAgreementModal';
import { CashierTab } from './components/CashierTab';
import { SessionCompleteModal } from './components/SessionCompleteModal';
import { SessionLostModal } from './components/SessionLostModal';
import { PremiumTab } from './components/PremiumTab';
import { 
  playWinChime, playLossChime, playTargetReachedChime 
} from './utils/audio';
import { 
  Brain, TrendingUp, Cpu, Crown, History, Wallet, Trophy, Compass,
  Zap, ShieldAlert, Sparkles, AlertCircle, RefreshCw, Coins, X,
  ChevronUp, Activity
} from 'lucide-react';

const STORAGE_KEY_TOKEN = 'mamba_deriv_token';
const STORAGE_KEY_CONFIG = 'mamba_bot_config';
const STORAGE_KEY_ONBOARDING = 'mamba_onboarding_completed';
const STORAGE_KEY_MEMBERSHIP = 'mamba_membership';
const STORAGE_KEY_TERMS_ACCEPTED = 'mamba_terms_accepted';

// Generate or retrieve a persistent browser session ID for non-Telegram web users
function getOrCreateWebSessionId(): string {
  let id = localStorage.getItem('mamba_web_session_id');
  if (!id) {
    id = 'web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('mamba_web_session_id', id);
  }
  return id;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'trader' | 'history' | 'wallet' | 'premium'>('intelligence');
  const [intelligenceSubTab, setIntelligenceSubTab] = useState<'leaderboard' | 'scanner'>('leaderboard');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [pastTrades, setPastTrades] = useState<PastTrade[]>([]);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_TERMS_ACCEPTED) === 'true';
  });
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_ONBOARDING) !== 'true';
  });
  const [membership, setMembership] = useState<MembershipState>(() => {
    return {
      type: 'unselected',
      tradesTracker: 0,
      isActive: true,
    };
  });
  const [adOpen, setAdOpen] = useState(false);
  const [adminHubOpen, setAdminHubOpen] = useState(false);
  const [clickCount, setClickCount] = useState<number>(0);
  const [sequenceCompleted, setSequenceCompleted] = useState<boolean>(false);
  const [sessionCompleteOpen, setSessionCompleteOpen] = useState(false);
  const [sessionLostOpen, setSessionLostOpen] = useState(false);
  const [globalTicks, setGlobalTicks] = useState(0);
  const [globalSignals, setGlobalSignals] = useState(0);
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle');
  const [authorizedWsStatus, setAuthorizedWsStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [adminAlert, setAdminAlert] = useState<string>('');
  
  // Real-time symbol states
  const [symbolsState, setSymbolsState] = useState<Record<string, SymbolState>>(() => {
    const initial: Record<string, SymbolState> = {};
    SYMBOLS.forEach((s) => {
      initial[s.id] = {
        info: s,
        price: null,
        prevPrice: null,
        lastDigit: null,
        direction: null,
        recentDigits: [],
        ticks: 0,
        signals: 0,
        wins: 0,
        losses: 0,
        lastSignalTick: -99,
        connected: false,
        pendingSignal: null,
      };
    });
    return initial;
  });

  // User credentials & authorized account data
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [demoAccount, setDemoAccount] = useState<AccountInfo | null>(null);
  const [realAccount, setRealAccount] = useState<AccountInfo | null>(null);

  // Bot risk configs
  const [botConfig, setBotConfig] = useState<BotConfig>({
    apiToken: '',
    isDemo: true,
    stake: 0.35,
    martingaleMultiplier: 2.0,
    maxWins: 2,
    maxLosses: 5,
    targetProfit: 0,
    tradingMode: 'normal',
  });

  // Active bot execution state
  const [botState, setBotState] = useState<BotState>({
    isRunning: false,
    symbol: 'R_100', // default symbol Volatility 100 Index
    currentStake: 0.35,
    consecutiveLosses: 0,
    wins: 0,
    losses: 0,
    profit: 0,
    tradesCount: 0,
    status: 'idle',
    lastTradeResult: null,
  });

  const [sessionUptime, setSessionUptime] = useState<number>(0);
  const [autoTriggerScan, setAutoTriggerScan] = useState<boolean>(false);
  const [autoTriggerResume, setAutoTriggerResume] = useState<boolean>(false);
  const pausedForResumeRef = useRef<boolean>(false);

  // Bot activity logs
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Keep tracking refs for background notification state comparisons
  const lastTradesCountRef = useRef<number>(0);
  const lastGlobalSignalsRef = useRef<number>(0);
  const sessionCompleteShownRef = useRef<boolean>(false);
  const sessionLostShownRef = useRef<boolean>(false);
  const closingSessionCompleteRef = useRef<boolean>(false);
  const closingSessionLostRef = useRef<boolean>(false);

  // Telegram WebApp detection state
  const [isTelegram, setIsTelegram] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);

  // Resolved session user ID — initialized synchronously so it's ready before any button click
  const [sessionUserId] = useState<string>(() => {
    // Try Telegram first (synchronous access)
    try {
      if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
      }
    } catch(e) {}
    // Fall back to persistent browser ID
    return getOrCreateWebSessionId();
  });

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      try {
        const webapp = window.Telegram.WebApp;
        webapp.ready();
        webapp.expand();
        setIsTelegram(true);
        if (webapp.initDataUnsafe?.user) {
          setTgUser(webapp.initDataUnsafe.user);
        }
      } catch (err) {
        console.error('Failed to trigger Telegram WebApp initialization:', err);
      }
    }
  }, []);

  // Auto-close session complete popup if Premium Autopilot is active
  useEffect(() => {
    if (sessionCompleteOpen) {
      const premStatus = localStorage.getItem('mamba_premium_status');
      if (premStatus && premStatus !== 'idle') {
        const autoCloseTimeout = setTimeout(() => {
          setSessionCompleteOpen(false);
          sessionCompleteShownRef.current = false;
        }, 3000); // Wait 3 seconds to let user see success, then auto close to allow scanner to load new session
        return () => clearTimeout(autoCloseTimeout);
      }
    }
  }, [sessionCompleteOpen]);

  // Local storage restore credentials flow on mount — keyed by sessionUserId so each user's data is isolated
  useEffect(() => {
    const userId = sessionUserId;
    const TOKEN_KEY = `mamba_deriv_token_${userId}`;
    const CONFIG_KEY = `mamba_bot_config_${userId}`;

    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      fetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: savedToken, tgUserId: userId }),
      }).catch(err => console.error('Failed token auto-sync:', err));
    }

    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed && (parsed.maxLosses === 2 || !parsed.maxLosses)) {
          parsed.maxLosses = 5;
          localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
        }
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...parsed, tgUserId: userId }),
        }).catch(err => console.error('Failed config auto-sync:', err));
      } catch(e) {}
    }
  }, [sessionUserId]);

  // Poll state loop from Backend Server context to achieve persistent execution tracking
  useEffect(() => {
    const handlePoll = async () => {
      try {
        const userId = sessionUserId;
        const res = await fetch(`/api/state?tgUserId=${userId}`);
        if (!res.ok) return;
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return;
        }
        const data = await res.json();

        // Update React State
        setSymbolsState(data.symbolsState);
        setBotState(data.botState);
        setBotConfig(data.botConfig);
        setLogs(data.logs);
        setAccount(data.account);
        if (data.demoAccount) setDemoAccount(data.demoAccount);
        if (data.realAccount !== undefined) setRealAccount(data.realAccount);
        setGlobalTicks(data.globalTicks);
        setGlobalSignals(data.globalSignals);
        setPastTrades(data.pastTrades || []);
        setSessionTime(data.sessionTime);
        setConnectionStatus(data.connectionStatus);
        setAuthorizedWsStatus(data.authorizedWsStatus || 'idle');
        setSessionUptime(data.sessionUptime || 0);
        setMaintenanceMode(data.maintenanceMode === true);
        setAdminAlert(data.adminAlert || '');

        // Clear rejected/invalid token so it doesn't trigger automated cyclic errors on reboot
        if (data.authorizedWsStatus === 'error' && !data.botConfig?.apiToken) {
          localStorage.removeItem(STORAGE_KEY_TOKEN);
        }

        // 1. Monitor Signal sound chimes
        if (data.globalSignals > lastGlobalSignalsRef.current) {
          if (lastGlobalSignalsRef.current > 0) {
            triggerPushNotification('🎯 Setup Identified!', 'A high-probabilistic Rise-direction signal was sourced!');
          }
          lastGlobalSignalsRef.current = data.globalSignals;
        }

        // 2. Monitor Live result chimes
        if (data.botState.tradesCount > lastTradesCountRef.current) {
          if (lastTradesCountRef.current > 0) {
            const isWin = data.botState.lastTradeResult === 'win';
            if (isWin) {
              playWinChime();
            } else {
              playLossChime();
            }
          }
          lastTradesCountRef.current = data.botState.tradesCount;
        }

        // 3. Session complete popup
        if (data.botState.status === 'won_limit' && !sessionCompleteShownRef.current && !closingSessionCompleteRef.current) {
          console.log('🏆 WON LIMIT DETECTED — showing popup');
          sessionCompleteShownRef.current = true;
          playTargetReachedChime();
          triggerPushNotification('🏆 Session Completed!', `Target profit of +$${data.botState.profit.toFixed(2)} met.`);
          setTimeout(() => setSessionCompleteOpen(true), 100);
        }

        // 4. Session lost popup — 5 consecutive losses
        if (data.botState.status === 'lost_limit' && !sessionLostShownRef.current && !closingSessionLostRef.current) {
          console.log('🛡️ LOST LIMIT DETECTED — showing loss popup');
          sessionLostShownRef.current = true;
          playLossChime();
          triggerPushNotification('🛡️ Session Stopped', '5 consecutive losses. Bot stopped to protect your capital.');
          setTimeout(() => setSessionLostOpen(true), 100);
        }

        // 5. Pair credibility lost — auto-trigger resume scan to find a better pair
        if (data.botState.status === 'paused_low_winrate' && !pausedForResumeRef.current) {
          pausedForResumeRef.current = true;
          triggerPushNotification('🔄 Pair Swap Triggered', 'Active pair dropped below 55% win rate. Scanning for best replacement...');
          setTimeout(() => setAutoTriggerResume(true), 500);
        }

        // Reset the resume ref once the bot is running again on the new pair
        if (data.botState.isRunning && pausedForResumeRef.current) {
          pausedForResumeRef.current = false;
        }
      } catch (err) {
        // Handle network connection drops gracefully without spamming error consoles with raw TypeError: "Failed to fetch"
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (
          errorMsg.includes('Failed to fetch') || 
          errorMsg.includes('fetch') || 
          errorMsg.includes('NetworkError') || 
          errorMsg.includes('Load failed') ||
          errorMsg.includes('network')
        ) {
          console.warn('State polling temporary network interruption (retrying gracefully...):', errorMsg);
        } else {
          console.error('State polling failure:', err);
        }
      }
    };

    // Immediate invocation then interval
    handlePoll();
    const interval = setInterval(handlePoll, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Updates
  const handleUpdateConfig = async (updates: Partial<BotConfig>) => {
    setBotConfig((prev) => ({ ...prev, ...updates }));
    const userId = sessionUserId;
    const saved = { ...botConfig, ...updates };
    localStorage.setItem(`mamba_bot_config_${userId}`, JSON.stringify(saved));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, tgUserId: userId }),
      });
    } catch (e) {
      console.error('Failed config upload:', e);
    }
  };

  const handleUpdateMembership = (updates: Partial<MembershipState>) => {
    setMembership((prev) => {
      const merged = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY_MEMBERSHIP, JSON.stringify(merged));
      if (prev.type === 'unselected' && merged.type !== 'unselected') {
        setTimeout(() => {
          setActiveTab('trader');
        }, 1200);
      }
      return merged;
    });
  };

  const addLog = (type: LogMessage['type'], message: string) => {
    // Visual terminal overlay fallback
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs((prev) => [...prev, newLog].slice(-150));
  };

  const handleClearLogs = async () => {
    setLogs([]);
    const userId = sessionUserId;
    try {
      await fetch('/api/clear-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId }),
      });
    } catch(e){}
  };

  const handleClearTrades = async () => {
    setPastTrades([]);
    const userId = sessionUserId;
    try {
      await fetch('/api/clear-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId }),
      });
    } catch(e){}
  };

  const triggerPushNotification = (title: string, body: string) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch (e) {
      console.warn('Push notification failed:', e);
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleAuthorize = async (token: string) => {
    const userId = sessionUserId;
    localStorage.setItem(`mamba_deriv_token_${userId}`, token.trim());
    try {
      await fetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), tgUserId: userId }),
      });
    } catch(e) {
      addLog('error', 'Authentication command failed to reach local network server.');
    }
  };

  const handleDeauthorize = async () => {
    const userId = sessionUserId;
    localStorage.removeItem(`mamba_deriv_token_${userId}`);
    setAccount(null);
    try {
      await fetch('/api/deauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId }),
      });
    } catch(e){}
  };

  const handleStartBot = async () => {
    if (!account) return;
    sessionCompleteShownRef.current = false;
    sessionLostShownRef.current = false;
    const userId = sessionUserId;
    try {
      await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId }),
      });
    } catch(e) {
      addLog('error', 'Start command failed to register with local server.');
    }
  };

  const handleStopBot = async () => {
    const userId = sessionUserId;
    try {
      await fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId }),
      });
    } catch(e){
      addLog('error', 'Stop command failed to register with local server.');
    }
  };

  const handleResumeWithSymbol = async (symbolId: string) => {
    const userId = sessionUserId;
    try {
      await fetch('/api/resume-with-symbol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbolId, tgUserId: userId }),
      });
    } catch(e) {
      addLog('error', 'Resume command failed to reach local server.');
    }
  };

  const handleSelectSymbolForTrading = async (symbolId: string, autoStartAfterLoad = false) => {
    if (botState.isRunning) {
      addLog('error', '⚠️ SWITCH BLOCKED: Cannot switch active asset pairs while the trading session is running. Stop the bot first.');
      return;
    }
    const userId = sessionUserId;
    try {
      await fetch('/api/select-symbol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbolId, tgUserId: userId }),
      });
      setActiveTab('trader');
      addLog('success', `📥 LOADED: Scanned pair "${symbolId.toUpperCase()}" loaded into trade terminal. Ready for manual execution!`);
    } catch(e){
      addLog('error', 'Symbol loader failed to register with local server.');
    }
  };

  const handleRestartScanning = async () => {
    const userId = sessionUserId;
    try {
      await fetch('/api/restart-scanning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId }),
      });
      addLog('success', '♻️ Scanner statistics, global metrics, and calibration timers successfully restarted.');
    } catch(e) {
      addLog('error', 'Restart scanning command failed to reach local network server.');
    }
  };

  const handleResetDemoBalance = async () => {
    const userId = sessionUserId;
    try {
      await fetch('/api/reset-demo-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgUserId: userId }),
      });
      addLog('success', '🔄 Demo balance reset to $1,000.00 USD.');
    } catch(e) {
      addLog('error', 'Failed to reset demo balance.');
    }
  };

  const handleCloseOnboarding = () => {
    setOnboardingOpen(false);
    localStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
  };

  // 5-tap admin sequence unlock
  const handleAdminTriggerClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount >= 5) {
      setSequenceCompleted(true);
      setAdminHubOpen(true);
      addLog('success', '🔑 SECURITY NODE UNLOCKED: 5-tap administrator sequence completed. Access keys decrypted!');
      setClickCount(0);
    } else {
      addLog('warning', `🔒 SECURE INTERCEPT: Administrator access requested. Handshake pattern mismatch. (${nextCount}/5)...`);
    }
  };

  const handleAcceptTerms = (signatureName: string) => {
    localStorage.setItem(STORAGE_KEY_TERMS_ACCEPTED, 'true');
    setTermsAccepted(true);
    addLog('success', `✒️ Digital Legal Charter signed/accepted by: ${signatureName.toUpperCase()}. Automated trading interface unlocked successfully.`);
  };

  const activeTradingSymbol = SYMBOLS.find((s) => s.id === botState.symbol) || SYMBOLS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white selection:font-bold">
      
      {/* Dynamic News Broadcast Marquee Banner */}
      {adminAlert && (
        <div className="bg-gradient-to-r from-amber-600/95 via-indigo-955/95 to-amber-600/95 text-[10px] text-white py-2 px-4 shadow-md font-mono font-bold tracking-wider relative overflow-hidden shrink-0 select-none border-b border-amber-500/20">
          <div className="marquee flex gap-6 items-center whitespace-nowrap animate-marquee">
            <span>📢 ANNOUNCEMENT: {adminAlert}</span>
            <span className="opacity-55">•</span>
            <span>📢 ANNOUNCEMENT: {adminAlert}</span>
            <span className="opacity-55">•</span>
            <span>📢 ANNOUNCEMENT: {adminAlert}</span>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes marquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-33.33%); }
            }
            .animate-marquee {
              display: inline-flex;
              animation: marquee 20s linear infinite;
            }
          `}} />
        </div>
      )}

      {/* Top Header Panel */}
      <Header
        ticksCount={globalTicks}
        signalsCount={globalSignals}
        sessionTime={sessionTime}
        connectionStatus={connectionStatus}
        account={account}
        botRunning={botState.isRunning}
        onStopAll={handleStopBot}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onOpenAdminHub={handleAdminTriggerClick}
        isTelegram={isTelegram}
        tgUser={tgUser}
      />

      {maintenanceMode ? (
        /* High-contrast Lockout Calibration Screen layout */
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center space-y-6 max-w-md mx-auto animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-900/60 flex items-center justify-center text-amber-500">
            <Cpu className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-sm font-bold text-slate-100 font-mono tracking-wider uppercase">System Calibration Active</h1>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              ⚠️ NexScan IQ automated servers are offline. Active system-wide calibrations are currently being deployed by the site administrator. Please check back shortly.
            </p>
          </div>
          <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-1.5 w-full text-left font-mono text-[10px] text-slate-500">
            <p className="text-slate-350 font-semibold mb-1 uppercase text-amber-500">Diagnostics Pipeline State:</p>
            <p>• Interface Router: Hot-Sealed</p>
            <p>• Database Ledger: Synced &amp; Persistent</p>
            <p>• Broker Websocket Connection: Active Proxy</p>
            <p className="text-indigo-400 font-semibold mt-1 animate-pulse">• Administrator update sequence active on port 3000...</p>
          </div>
          <p className="text-[9px] text-slate-600 font-mono">Normal trading services will resume automatically as soon as changes are saved.</p>
        </div>
      ) : (
        /* Main Container Layout */
        <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col">

          {/* Tab Content — padded bottom to clear HUD + bottom nav */}
          <div className="flex-1 px-4 pt-4 pb-40 md:px-8 space-y-4">

            {/* Intelligence Tab */}
            {activeTab === 'intelligence' && (
              <div className="space-y-4">
                {/* Sub-tab pills */}
                <div className="flex bg-slate-900/60 border border-slate-800/80 rounded-2xl p-1 gap-1">
                  <button
                    onClick={() => setIntelligenceSubTab('leaderboard')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      intelligenceSubTab === 'leaderboard'
                        ? 'bg-slate-950 text-indigo-400 border border-slate-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" /> Leaderboard
                  </button>
                  <button
                    onClick={() => setIntelligenceSubTab('scanner')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      intelligenceSubTab === 'scanner'
                        ? 'bg-slate-950 text-indigo-400 border border-slate-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" /> Global Grid
                  </button>
                </div>

                {intelligenceSubTab === 'leaderboard' && (
                  <LeaderboardTab
                    symbolsState={symbolsState}
                    onSelectSymbolForTrading={handleSelectSymbolForTrading}
                    activeTradingSymbolId={botState.symbol}
                    botRunning={botState.isRunning}
                    sessionUptime={sessionUptime}
                  />
                )}
                {intelligenceSubTab === 'scanner' && (
                  <ScannerTab
                    symbolsState={symbolsState}
                    onSelectSymbolForTrading={handleSelectSymbolForTrading}
                    activeTradingSymbolId={botState.symbol}
                    botRunning={botState.isRunning}
                    sessionUptime={sessionUptime}
                    onRestartScanning={handleRestartScanning}
                  />
                )}
              </div>
            )}

            {/* Trader Tab */}
            {activeTab === 'trader' && (
              <>
                <BotTrader
                  activeSymbol={activeTradingSymbol}
                  symbolsState={symbolsState}
                  onSelectSymbolForTrading={handleSelectSymbolForTrading}
                  account={account}
                  demoAccount={demoAccount}
                  realAccount={realAccount}
                  botConfig={botConfig}
                  onUpdateConfig={handleUpdateConfig}
                  onAuthorize={handleAuthorize}
                  onDeauthorize={handleDeauthorize}
                  onStartBot={handleStartBot}
                  onStopBot={handleStopBot}
                  botState={botState}
                  logs={logs}
                  onClearLogs={handleClearLogs}
                  authorizedWsStatus={authorizedWsStatus}
                  sessionUptime={sessionUptime}
                  autoTriggerScan={autoTriggerScan}
                  onScanReset={() => setAutoTriggerScan(false)}
                  autoTriggerResume={autoTriggerResume}
                  onResumeReset={() => setAutoTriggerResume(false)}
                  onResumeWithSymbol={handleResumeWithSymbol}
                  isAdvancedMode={isAdvancedMode}
                  onToggleAdvancedMode={(val) => {
                    setIsAdvancedMode(val);
                    handleUpdateConfig({ tradingMode: val ? 'advanced' : 'normal' });
                  }}
                  onResetDemoBalance={handleResetDemoBalance}
                />
                <TermsAgreementModal
                  isOpen={!termsAccepted}
                  onAccept={handleAcceptTerms}
                />
              </>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <HistoryTab
                pastTrades={pastTrades}
                onClearHistory={handleClearTrades}
                sessionUptime={sessionUptime}
              />
            )}

            {/* Wallet Tab — account management + cashier */}
            {activeTab === 'wallet' && (
              <CashierTab
                account={account}
                pastTrades={pastTrades}
                onAuthorize={handleAuthorize}
                authorizedWsStatus={authorizedWsStatus}
                apiToken={botConfig.apiToken}
              />
            )}

            {/* Premium Tab */}
            {activeTab === 'premium' && (
              <PremiumTab
                symbolsState={symbolsState}
                account={account}
                botConfig={botConfig}
                onUpdateConfig={handleUpdateConfig}
                onAuthorize={handleAuthorize}
                onDeauthorize={handleDeauthorize}
                onStartBot={handleStartBot}
                onStopBot={handleStopBot}
                botState={botState}
                logs={logs}
                sessionUptime={sessionUptime}
                pastTrades={pastTrades}
              />
            )}
          </div>

          {/* ── Live Performance HUD ── fixed above bottom nav, visible on all tabs */}
          {(botState.isRunning || botState.tradesCount > 0) && (
            <div
              className="fixed bottom-[68px] left-0 right-0 z-40 px-3 pb-1 cursor-pointer"
              onClick={() => setActiveTab('trader')}
            >
              <div className={`mx-auto max-w-lg rounded-2xl border px-4 py-2.5 flex items-center gap-3 shadow-2xl backdrop-blur-sm transition-all ${
                botState.isRunning
                  ? 'bg-slate-900/95 border-indigo-800/50 shadow-indigo-950/60'
                  : 'bg-slate-900/90 border-slate-800/60'
              }`}>
                {/* Status dot */}
                <div className="shrink-0">
                  {botState.isRunning ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest">Live</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                      <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">Idle</span>
                    </span>
                  )}
                </div>

                <div className="h-3 w-px bg-slate-700 shrink-0" />

                {/* P&L */}
                <div className="shrink-0 text-center">
                  <span className="text-[8px] font-mono text-slate-500 block leading-none">P&L</span>
                  <span className={`text-xs font-mono font-black leading-none mt-0.5 block ${botState.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
                  </span>
                </div>

                <div className="h-3 w-px bg-slate-700 shrink-0" />

                {/* Next Payout */}
                <div className="shrink-0 text-center">
                  <span className="text-[8px] font-mono text-slate-500 block leading-none">Payout</span>
                  <span className="text-xs font-mono font-black text-indigo-400 leading-none mt-0.5 block">
                    ~${(botState.currentStake * 0.95).toFixed(2)}
                  </span>
                </div>

                <div className="h-3 w-px bg-slate-700 shrink-0" />

                {/* W/L */}
                <div className="shrink-0 text-center">
                  <span className="text-[8px] font-mono text-slate-500 block leading-none">W / L</span>
                  <span className="text-xs font-mono font-black text-slate-200 leading-none mt-0.5 block">
                    <span className="text-emerald-400">{botState.wins}</span>
                    <span className="text-slate-600 mx-0.5">/</span>
                    <span className="text-rose-400">{botState.losses}</span>
                  </span>
                </div>

                <div className="h-3 w-px bg-slate-700 shrink-0" />

                {/* Stake */}
                <div className="shrink-0 text-center">
                  <span className="text-[8px] font-mono text-slate-500 block leading-none">Stake</span>
                  <span className="text-xs font-mono font-black text-slate-300 leading-none mt-0.5 block">
                    ${botState.currentStake.toFixed(2)}
                  </span>
                </div>

                {/* Tap hint */}
                <ChevronUp className="w-3.5 h-3.5 text-slate-600 ml-auto shrink-0" />
              </div>
            </div>
          )}

          {/* ── Fixed Bottom Navigation ── */}
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <div className="bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 pb-safe">
              <div className="max-w-lg mx-auto flex items-end justify-around">

                {/* Intelligence */}
                <button
                  onClick={() => setActiveTab('intelligence')}
                  className={`flex flex-col items-center gap-1 py-3 px-3 min-w-0 flex-1 transition-all cursor-pointer ${
                    activeTab === 'intelligence' ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <Brain className={`w-5 h-5 transition-all ${activeTab === 'intelligence' ? 'scale-110' : ''}`} />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wide leading-none">Intel</span>
                  {activeTab === 'intelligence' && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
                </button>

                {/* History */}
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex flex-col items-center gap-1 py-3 px-3 min-w-0 flex-1 transition-all cursor-pointer relative ${
                    activeTab === 'history' ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <div className="relative">
                    <History className={`w-5 h-5 transition-all ${activeTab === 'history' ? 'scale-110' : ''}`} />
                    {pastTrades.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[7px] font-black text-white flex items-center justify-center">
                        {pastTrades.length > 9 ? '9+' : pastTrades.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wide leading-none">History</span>
                  {activeTab === 'history' && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
                </button>

                {/* Trader — raised center button */}
                <button
                  onClick={() => setActiveTab('trader')}
                  className="flex flex-col items-center gap-1 -mt-5 px-2 min-w-0 flex-1 cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all relative ${
                    activeTab === 'trader'
                      ? 'bg-indigo-600 shadow-indigo-900/60 scale-105'
                      : 'bg-slate-800 hover:bg-slate-700 shadow-slate-950/60'
                  }`}>
                    <Cpu className="w-6 h-6 text-white" />
                    {botState.isRunning && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wide leading-none mt-1 ${
                    activeTab === 'trader' ? 'text-indigo-400' : 'text-slate-500'
                  }`}>Trader</span>
                  {activeTab === 'trader' && <span className="w-1 h-1 rounded-full bg-indigo-400" />}
                </button>

                {/* Wallet */}
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`flex flex-col items-center gap-1 py-3 px-3 min-w-0 flex-1 transition-all cursor-pointer ${
                    activeTab === 'wallet' ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <Wallet className={`w-5 h-5 transition-all ${activeTab === 'wallet' ? 'scale-110' : ''}`} />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wide leading-none">Wallet</span>
                  {activeTab === 'wallet' && <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />}
                </button>

                {/* Premium */}
                <button
                  onClick={() => setActiveTab('premium')}
                  className={`flex flex-col items-center gap-1 py-3 px-3 min-w-0 flex-1 transition-all cursor-pointer ${
                    activeTab === 'premium' ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <Crown className={`w-5 h-5 transition-all ${activeTab === 'premium' ? 'scale-110 fill-amber-400/20' : ''}`} />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wide leading-none">Premium</span>
                  {activeTab === 'premium' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />}
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interstitial Ad Display block */}
      <AdContainer
        isOpen={adOpen}
        onClose={() => setAdOpen(false)}
      />

      {/* Onboarding Interactive Stepper Guide */}
      <OnboardingGuide 
        isOpen={onboardingOpen} 
        onClose={handleCloseOnboarding} 
      />

      {/* Creator & Broker Markup Console Admin Hub */}
      <AdminHubModal
        isOpen={adminHubOpen}
        onClose={() => {
          setAdminHubOpen(false);
          setSequenceCompleted(false);
        }}
        sequenceCompleted={sequenceCompleted}
        onLockConsole={() => {
          setSequenceCompleted(false);
        }}
      />

      {/* Session Complete Popup */}
      <SessionCompleteModal
        isOpen={sessionCompleteOpen}
        profit={botState.profit}
        wins={botState.wins}
        losses={botState.losses}
        stake={botConfig.stake}
        currency={account?.currency || 'USD'}
        onClose={async () => {
          closingSessionCompleteRef.current = true;
          sessionCompleteShownRef.current = true;
          setSessionCompleteOpen(false);
          const userId = sessionUserId;
          try { await fetch('/api/new-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tgUserId: userId }) }); } catch(e) {}
          // Allow re-triggering only after server has reset status
          setTimeout(() => {
            sessionCompleteShownRef.current = false;
            closingSessionCompleteRef.current = false;
          }, 3000);
        }}
      />

      {/* Session Lost Popup */}
      <SessionLostModal
        isOpen={sessionLostOpen}
        profit={botState.profit}
        wins={botState.wins}
        losses={botState.losses}
        stake={botConfig.stake}
        currency={account?.currency || 'USD'}
        onClose={async () => {
          closingSessionLostRef.current = true;
          sessionLostShownRef.current = true;
          setSessionLostOpen(false);
          const userId = sessionUserId;
          try { await fetch('/api/new-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tgUserId: userId }) }); } catch(e) {}
          // Allow re-triggering only after server has reset status
          setTimeout(() => {
            sessionLostShownRef.current = false;
            closingSessionLostRef.current = false;
          }, 3000);
        }}
      />
    </div>
  );
}
