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
import { 
  playWinChime, playLossChime, playTargetReachedChime 
} from './utils/audio';
import { 
  Compass, Trophy, Cpu, ShieldAlert, Sparkles, AlertCircle, RefreshCw, Crown, Coins, X, History, Wallet
} from 'lucide-react';

const STORAGE_KEY_TOKEN = 'mamba_deriv_token';
const STORAGE_KEY_CONFIG = 'mamba_bot_config';
const STORAGE_KEY_ONBOARDING = 'mamba_onboarding_completed';
const STORAGE_KEY_MEMBERSHIP = 'mamba_membership';
const STORAGE_KEY_TERMS_ACCEPTED = 'mamba_terms_accepted';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'leaderboard' | 'trader' | 'history' | 'cashier'>('leaderboard');
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
  const [globalTicks, setGlobalTicks] = useState(0);
  const [globalSignals, setGlobalSignals] = useState(0);
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle');
  const [authorizedWsStatus, setAuthorizedWsStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  
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

  // Bot risk configs
  const [botConfig, setBotConfig] = useState<BotConfig>({
    apiToken: '',
    isDemo: true,
    stake: 0.35,
    martingaleMultiplier: 2.0,
    maxWins: 2,
    maxLosses: 5,
    targetProfit: 0,
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

  // Bot activity logs
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Keep tracking refs for background notification state comparisons
  const lastTradesCountRef = useRef<number>(0);
  const lastGlobalSignalsRef = useRef<number>(0);

  // Telegram WebApp detection state
  const [isTelegram, setIsTelegram] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      try {
        const webapp = window.Telegram.WebApp;
        webapp.ready();
        webapp.expand();
        setIsTelegram(true);
        if (webapp.initDataUnsafe?.user) {
          setTgUser(webapp.initDataUnsafe.user);
          console.log('Telegram App User linked:', webapp.initDataUnsafe.user);
        }
      } catch (err) {
        console.error('Failed to trigger Telegram WebApp initialization:', err);
      }
    }
  }, []);

  // Local storage restore credentials flow on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedToken) {
      fetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: savedToken }),
      }).catch(err => console.error('Failed token auto-sync:', err));
    }

    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Upgrade legacy default maxLosses (2) to 5 consecutive losses
        if (parsed && (parsed.maxLosses === 2 || !parsed.maxLosses)) {
          parsed.maxLosses = 5;
          localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(parsed));
        }
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        }).catch(err => console.error('Failed config auto-sync:', err));
      } catch(e) {}
    }
  }, []);

  // Poll state loop from Backend Server context to achieve persistent execution tracking
  useEffect(() => {
    const handlePoll = async () => {
      try {
        const res = await fetch('/api/state');
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
        setGlobalTicks(data.globalTicks);
        setGlobalSignals(data.globalSignals);
        setPastTrades(data.pastTrades || []);
        setSessionTime(data.sessionTime);
        setConnectionStatus(data.connectionStatus);
        setAuthorizedWsStatus(data.authorizedWsStatus || 'idle');
        setSessionUptime(data.sessionUptime || 0);

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

        // 2. Monitor Live result chimes and Monetization / licensing blocks
        if (data.botState.tradesCount > lastTradesCountRef.current) {
          if (lastTradesCountRef.current > 0) {
            const isWin = data.botState.lastTradeResult === 'win';
            if (isWin) {
              playWinChime();
            } else {
              playLossChime();
            }

            // Target realized triggers
            if (data.botState.status === 'won_limit') {
              playTargetReachedChime();
              triggerPushNotification('🏆 Session Completed!', `Target profit of +$${data.botState.profit.toFixed(2)} met.`);
            }
          }
          lastTradesCountRef.current = data.botState.tradesCount;
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
    // Snappy client feedback
    setBotConfig((prev) => ({ ...prev, ...updates }));
    const saved = { ...botConfig, ...updates };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(saved));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
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
    try {
      await fetch('/api/clear-logs', { method: 'POST' });
    } catch(e){}
  };

  const handleClearTrades = async () => {
    setPastTrades([]);
    try {
      await fetch('/api/clear-trades', { method: 'POST' });
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
    localStorage.setItem(STORAGE_KEY_TOKEN, token.trim());
    try {
      await fetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
    } catch(e) {
      addLog('error', 'Authentication command failed to reach local network server.');
    }
  };

  const handleDeauthorize = async () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    setAccount(null);
    try {
      await fetch('/api/deauthorize', { method: 'POST' });
    } catch(e){}
  };

  const handleStartBot = async () => {
    if (!account) return;

    try {
      await fetch('/api/start', { method: 'POST' });
    } catch(e) {
      addLog('error', 'Start command failed to register with local server.');
    }
  };

  const handleStopBot = async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
    } catch(e){
      addLog('error', 'Stop command failed to register with local server.');
    }
  };

  const handleSelectSymbolForTrading = async (symbolId: string, autoStartAfterLoad = false) => {
    if (botState.isRunning) {
      addLog('error', '⚠️ SWITCH BLOCKED: Cannot switch active asset pairs while the trading session is running. Stop the bot first.');
      return;
    }
    try {
      await fetch('/api/select-symbol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbolId }),
      });
      setActiveTab('trader');
      addLog('success', `📥 LOADED: Scanned pair "${symbolId.toUpperCase()}" loaded into trade terminal. Ready for manual execution!`);
    } catch(e){
      addLog('error', 'Symbol loader failed to register with local server.');
    }
  };

  const handleRestartScanning = async () => {
    try {
      await fetch('/api/restart-scanning', { method: 'POST' });
      addLog('success', '♻️ Scanner statistics, global metrics, and calibration timers successfully restarted.');
    } catch(e) {
      addLog('error', 'Restart scanning command failed to reach local network server.');
    }
  };

  const handleCloseOnboarding = () => {
    setOnboardingOpen(false);
    localStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
  };

  const handleAcceptTerms = (signatureName: string) => {
    localStorage.setItem(STORAGE_KEY_TERMS_ACCEPTED, 'true');
    setTermsAccepted(true);
    addLog('success', `✒️ Digital Legal Charter signed/accepted by: ${signatureName.toUpperCase()}. Automated trading interface unlocked successfully.`);
  };

  const activeTradingSymbol = SYMBOLS.find((s) => s.id === botState.symbol) || SYMBOLS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white selection:font-bold">
      
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
        onOpenAdminHub={() => setAdminHubOpen(true)}
        isTelegram={isTelegram}
        tgUser={tgUser}
      />

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:px-8 space-y-6">
        
        {/* Navigation Tabs bar */}
        <div className="flex justify-between items-center bg-slate-900/50 rounded-2xl p-1.5 border border-slate-800/80">
          <div className="flex gap-1.5 w-full sm:w-auto">
            <button
              id="tabScannerBtn"
              onClick={() => setActiveTab('scanner')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-150 active:scale-97 ${
                activeTab === 'scanner'
                  ? 'bg-slate-950 text-indigo-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <Compass className="w-4 h-4" /> Global Grid
            </button>
            
            <button
              id="tabLeaderboardBtn"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-150 active:scale-97 ${
                activeTab === 'leaderboard'
                  ? 'bg-slate-950 text-indigo-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <Trophy className="w-4 h-4" /> Leaderboard
            </button>
            
            <button
              id="tabTraderBtn"
              onClick={() => setActiveTab('trader')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer relative transition-all duration-150 active:scale-97 ${
                activeTab === 'trader'
                  ? 'bg-slate-950 text-indigo-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <Cpu className="w-4 h-4" /> Automated Trader
              {botState.isRunning && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </button>

            <button
              id="tabHistoryBtn"
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer relative transition-all duration-150 active:scale-97 ${
                activeTab === 'history'
                  ? 'bg-slate-950 text-indigo-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <History className="w-4 h-4 text-indigo-400" /> History
              {pastTrades.length > 0 && (
                <span className="bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 text-[9px] rounded-full border border-indigo-500/25 font-bold ml-1 font-mono">
                  {pastTrades.length}
                </span>
              )}
            </button>

            <button
              id="tabCashierBtn"
              onClick={() => setActiveTab('cashier')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer relative transition-all duration-150 active:scale-97 ${
                activeTab === 'cashier'
                  ? 'bg-slate-950 text-indigo-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400" /> Cashier
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono pr-2 select-none">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            LIVE MARKET RADAR
          </div>
        </div>

        {/* Dynamic Inner Tab Router Screen */}
        <div className="relative">
          {activeTab === 'scanner' && (
            <ScannerTab
              symbolsState={symbolsState}
              onSelectSymbolForTrading={handleSelectSymbolForTrading}
              activeTradingSymbolId={botState.symbol}
              botRunning={botState.isRunning}
              sessionUptime={sessionUptime}
              onRestartScanning={handleRestartScanning}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardTab
              symbolsState={symbolsState}
              onSelectSymbolForTrading={handleSelectSymbolForTrading}
              activeTradingSymbolId={botState.symbol}
              botRunning={botState.isRunning}
              sessionUptime={sessionUptime}
            />
          )}

          {activeTab === 'trader' && (
            <>
              <BotTrader
                activeSymbol={activeTradingSymbol}
                symbolsState={symbolsState}
                onSelectSymbolForTrading={handleSelectSymbolForTrading}
                account={account}
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
              />
              <TermsAgreementModal
                isOpen={!termsAccepted}
                onAccept={handleAcceptTerms}
              />
            </>
          )}

          {activeTab === 'history' && (
            <HistoryTab
              pastTrades={pastTrades}
              onClearHistory={handleClearTrades}
              sessionUptime={sessionUptime}
            />
          )}

          {activeTab === 'cashier' && (
            <CashierTab
              account={account}
              pastTrades={pastTrades}
              onAuthorize={handleAuthorize}
              authorizedWsStatus={authorizedWsStatus}
              apiToken={botConfig.apiToken}
            />
          )}
        </div>
      </div>

      {/* Global Bottom footer border credits */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-slate-600 text-[10px] font-mono select-none mt-12">
        NEXSCAN IQ MARKETS • INTEGRATES SECURE DERIV TICKET ENDPOINT • PERSISTENT BACKGROUND BROKER CO-PASS
      </footer>

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
        onClose={() => setAdminHubOpen(false)}
      />
    </div>
  );
}
