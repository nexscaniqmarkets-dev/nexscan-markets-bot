import React, { useState, useEffect, useRef } from 'react';
import { SymbolState, AccountInfo, BotConfig, BotState, LogMessage, PastTrade } from '../types';
import { SYMBOLS, getVolColor, digitColor } from '../constants';
import { 
  Crown, Play, Square, Shield, Activity, Compass, Zap, Flame, 
  Sparkles, CircleCheck, AlertTriangle, Key, Loader2, RefreshCw, Smartphone, BarChart3, Terminal,
  CreditCard, Lock, History
} from 'lucide-react';

interface PremiumTabProps {
  symbolsState: Record<string, SymbolState>;
  account: AccountInfo | null;
  botConfig: BotConfig;
  onUpdateConfig: (updates: Partial<BotConfig>) => Promise<void>;
  onAuthorize: (token: string) => Promise<void>;
  onDeauthorize: () => Promise<void>;
  onStartBot: () => Promise<void>;
  onStopBot: () => Promise<void>;
  botState: BotState;
  logs: LogMessage[];
  sessionUptime: number;
  pastTrades: PastTrade[];
  autopilotPastTrades?: PastTrade[];
  premiumLocked?: boolean;
}

function getBarrierDigit(mode: string, explicitBarrier: number): number {
  return explicitBarrier;
}

function getSymbolMetrics(state: SymbolState, barrier: number) {
  // Cumulative wins/losses — single source of truth, no rolling window cap.
  let wins = 0;
  let losses = 0;

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
    }
  }

  const totalSim = wins + losses;
  const winRate = totalSim >= 3 ? (wins / totalSim) * 100 : null;
  const signalFreq = state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0;

  let score = -1;
  let edge = 0;
  if (winRate !== null) {
    const winDigitsCount = 9 - barrier;
    const payout = (10 / winDigitsCount) * 0.95 - 1;
    const wrFrac = winRate / 100;
    edge = wrFrac * (payout + 1) - 1;

    const edgeMultiplier = edge >= 0 ? 150 : 120;
    let baseScore = 50 + edge * edgeMultiplier;

    const recentDigits = state.recentDigits || [];
    const highCount = recentDigits.filter((d: number) => d > barrier).length;
    const microDensity = recentDigits.length > 0 ? (highCount / recentDigits.length) * 100 : 50;
    const momentumBonus = (microDensity - 50) * 0.20;

    // consistencyBonus replaces freqBonus — rewards reliability, not tick speed
    const consistencyBonus = Math.min(totalSim / 100, 1.0) * 10;
    let rawScore = baseScore + momentumBonus + consistencyBonus;

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

export function PremiumTab({
  symbolsState,
  account,
  botConfig,
  onUpdateConfig,
  onAuthorize,
  onDeauthorize,
  onStartBot,
  onStopBot,
  botState,
  logs,
  sessionUptime,
  pastTrades,
  autopilotPastTrades: autopilotPastTradesProp = [],
  premiumLocked = true,
}: PremiumTabProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Premium Login and Session Protection States
  const [premiumTheme, setPremiumTheme] = useState<'obsidian-gold' | 'cyber-pulse' | 'corporate-platinum' | 'royal-amethyst'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mamba_premium_theme');
      if (saved === 'obsidian-gold' || saved === 'cyber-pulse' || saved === 'corporate-platinum' || saved === 'royal-amethyst') {
        return saved;
      }
    }
    return 'obsidian-gold';
  });

  const applyPremiumTheme = (theme: 'obsidian-gold' | 'cyber-pulse' | 'corporate-platinum' | 'royal-amethyst') => {
    setPremiumTheme(theme);
    localStorage.setItem('mamba_premium_theme', theme);
    const time = new Date().toLocaleTimeString();
    setPremiumLogs((prev) => [`[${time}] 🎨 VISUAL INTERFACE: Switched style preset to "${theme.replace('-', ' ').toUpperCase()}".`, ...prev].slice(0, 50));
  };

  const themeStyles = {
    'obsidian-gold': {
      bgGlow: 'from-amber-600/10 via-yellow-600/5 to-amber-950/20',
      activeBorder: 'border-amber-400',
      cardBorder: 'border-amber-500/20 hover:border-amber-500/40',
      badgeBg: 'bg-gradient-to-br from-amber-500 via-yellow-450 to-amber-600 text-slate-100 shadow-md shadow-amber-500/10',
      textAccent: 'text-amber-400',
      textLight: 'text-yellow-100',
      accentGlow: 'shadow-lg shadow-amber-500/10',
      btnAccent: 'bg-gradient-to-r from-amber-500 via-yellow-450 to-amber-600 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/15',
      btnAccentText: 'text-slate-950',
      btnSecondary: 'border-amber-550/25 hover:border-amber-500/45 text-amber-400 hover:text-amber-200',
      btnActiveTab: 'border-amber-500 text-amber-400 bg-amber-500/5',
      borderColor: 'border-amber-500/10',
      borderMain: 'border-amber-500/20',
      bgCard: 'bg-gradient-to-br from-slate-900/85 via-slate-950/85 to-amber-950/5',
      iconContainer: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      badgeText: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
      bulletIcon: 'text-amber-550',
      headingAccent: 'from-amber-400 via-amber-200 to-yellow-500',
      consoleLogo: 'text-amber-550 hover:text-amber-400',
      tabActive: 'bg-amber-500 text-slate-950 font-black',
      pillActive: 'bg-amber-500 text-slate-950 font-black',
      gIndicator: 'text-amber-450 bg-amber-955/20 border-amber-500/25',
      qualifiedBadge: 'bg-amber-550/20 text-amber-400 border-amber-500/30 font-bold',
      hoverHighlight: 'hover:border-amber-500/40'
    },
    'cyber-pulse': {
      bgGlow: 'from-emerald-500/10 via-teal-500/5 to-emerald-950/20',
      activeBorder: 'border-emerald-400',
      cardBorder: 'border-emerald-500/20 hover:border-emerald-500/40',
      badgeBg: 'bg-gradient-to-br from-emerald-500 via-teal-400 to-emerald-600 text-slate-100 shadow-md shadow-emerald-500/15',
      textAccent: 'text-emerald-400',
      textLight: 'text-emerald-100',
      accentGlow: 'shadow-lg shadow-emerald-500/10',
      btnAccent: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/15',
      btnAccentText: 'text-slate-950',
      btnSecondary: 'border-emerald-550/25 hover:border-emerald-500/45 text-emerald-400 hover:text-emerald-202',
      btnActiveTab: 'border-emerald-550 text-emerald-400 bg-emerald-500/5',
      borderColor: 'border-emerald-500/10',
      borderMain: 'border-emerald-500/20',
      bgCard: 'bg-gradient-to-br from-slate-900/85 via-slate-950/85 to-emerald-950/5',
      iconContainer: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      badgeText: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
      bulletIcon: 'text-emerald-500',
      headingAccent: 'from-emerald-400 via-teal-200 to-emerald-450',
      consoleLogo: 'text-emerald-550 hover:text-emerald-400',
      tabActive: 'bg-emerald-500 text-slate-950 font-black',
      pillActive: 'bg-emerald-500 text-slate-950 font-black',
      gIndicator: 'text-emerald-450 bg-emerald-955/20 border-emerald-500/25',
      qualifiedBadge: 'bg-emerald-550/20 text-emerald-400 border-emerald-500/30 font-bold',
      hoverHighlight: 'hover:border-emerald-500/40'
    },
    'corporate-platinum': {
      bgGlow: 'from-slate-400/10 via-zinc-400/5 to-zinc-950/20',
      activeBorder: 'border-slate-300',
      cardBorder: 'border-slate-550/20 hover:border-slate-400/45',
      badgeBg: 'bg-gradient-to-br from-slate-200 via-zinc-300 to-slate-400 text-slate-950 shadow-md shadow-slate-350/15',
      textAccent: 'text-slate-200',
      textLight: 'text-zinc-100',
      accentGlow: 'shadow-lg shadow-slate-400/10',
      btnAccent: 'bg-gradient-to-r from-slate-200 via-zinc-300 to-slate-400 text-slate-950 hover:brightness-110 shadow-lg shadow-slate-300/15',
      btnAccentText: 'text-slate-950',
      btnSecondary: 'border-slate-500/25 hover:border-slate-300/45 text-slate-300 hover:text-slate-100',
      btnActiveTab: 'border-slate-400 text-slate-200 bg-slate-500/5',
      borderColor: 'border-slate-800',
      borderMain: 'border-slate-700/80',
      bgCard: 'bg-gradient-to-br from-slate-900/85 via-slate-950/85 to-zinc-900/10',
      iconContainer: 'bg-slate-400/10 border-slate-500/20 text-slate-300',
      badgeText: 'text-slate-300 bg-slate-500/10 border-slate-550/25',
      bulletIcon: 'text-slate-405',
      headingAccent: 'from-slate-300 via-slate-100 to-zinc-350',
      consoleLogo: 'text-slate-400 hover:text-slate-300',
      tabActive: 'bg-slate-200 text-slate-950 font-black',
      pillActive: 'bg-slate-200 text-slate-950 font-black',
      gIndicator: 'text-slate-300 bg-slate-900/20 border-slate-500/25',
      qualifiedBadge: 'bg-slate-500/20 text-slate-200 border-slate-500/30 font-bold',
      hoverHighlight: 'hover:border-slate-400/40'
    },
    'royal-amethyst': {
      bgGlow: 'from-violet-500/10 via-fuchsia-500/5 to-violet-950/20',
      activeBorder: 'border-violet-400',
      cardBorder: 'border-violet-500/20 hover:border-violet-500/40',
      badgeBg: 'bg-gradient-to-br from-violet-500 via-fuchsia-400 to-violet-600 text-slate-100 shadow-md shadow-violet-500/15',
      textAccent: 'text-violet-400',
      textLight: 'text-fuchsia-100',
      accentGlow: 'shadow-lg shadow-violet-500/10',
      btnAccent: 'bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-605 text-slate-100 hover:brightness-110 shadow-lg shadow-violet-500/15',
      btnAccentText: 'text-slate-100',
      btnSecondary: 'border-violet-550/25 hover:border-violet-500/45 text-violet-405 hover:text-violet-200',
      btnActiveTab: 'border-violet-500 text-violet-400 bg-violet-500/5',
      borderColor: 'border-violet-500/10',
      borderMain: 'border-violet-500/20',
      bgCard: 'bg-gradient-to-br from-slate-900/85 via-slate-950/85 to-violet-950/5',
      iconContainer: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
      badgeText: 'text-violet-400 bg-violet-500/10 border-violet-500/25',
      bulletIcon: 'text-violet-455',
      headingAccent: 'from-violet-400 via-fuchsia-200 to-violet-350',
      consoleLogo: 'text-violet-550 hover:text-violet-400',
      tabActive: 'bg-violet-500 text-white font-black',
      pillActive: 'bg-violet-500 text-white font-black',
      gIndicator: 'text-violet-405 bg-violet-955/20 border-violet-500/25',
      qualifiedBadge: 'bg-violet-550/20 text-violet-400 border-violet-500/30 font-bold',
      hoverHighlight: 'hover:border-violet-500/40'
    }
  };

  const activeTheme = themeStyles[premiumTheme] || themeStyles['obsidian-gold'];

  const [isAuthenticatedPremium, setIsAuthenticatedPremium] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('mamba_premium_user');
      const savedSess = localStorage.getItem('mamba_premium_sess');
      return !!(savedUser && savedSess);
    }
    return false;
  });
  const [premiumUsername, setPremiumUsername] = useState<string>('');
  const [premiumPasswordInput, setPremiumPasswordInput] = useState<string>('');
  const [premiumLoginError, setPremiumLoginError] = useState<string>('');
  const [premiumLoggingIn, setPremiumLoggingIn] = useState<boolean>(false);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [loginLockedUntil, setLoginLockedUntil] = useState<number | null>(null);

  // Subscription Paywall and Checkout States
  const [premiumSubscriptionPrice, setPremiumSubscriptionPrice] = useState<number>(29.99);
  const [checkoutSubTab, setCheckoutSubTab] = useState<'checkout' | 'login'>('checkout');
  const [cardName, setCardName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [submittedDerivToken, setSubmittedDerivToken] = useState<string>('');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Premium Autopilot States
  const [autopilotState, setAutopilotState] = useState<'idle' | 'warmup' | 'scanning' | 'trading' | 'no_match' | 'cooldown' | 'countdown_next'>('idle');
  const [countdown, setCountdown] = useState<number>(10);
  const [premiumLogs, setPremiumLogs] = useState<string[]>([]);
  const [targetCandidate, setTargetCandidate] = useState<string | null>(null);
  const [terminalTab, setTerminalTab] = useState<'logs' | 'history'>('logs');
  const [showPremiumConsole, setShowPremiumConsole] = useState<boolean>(false);
  const [watchdogSwapsCount, setWatchdogSwapsCount] = useState<number>(0);
  const [lastWatchdogSwapAt, setLastWatchdogSwapAt] = useState<number | null>(null);
  // autopilotTrades comes from server via props — always in sync with server state
  const autopilotTrades = autopilotPastTradesProp;
  const setAutopilotTrades = (_: any) => {}; // no-op — server is source of truth

  // Autopilot configurable parameters (The requested defaults are: 1% of balance, 2 wins, 5 consecutive losses, martingale 2 unless they change it)
  const [activePremiumSubTab, setActivePremiumSubTab] = useState<'dashboard' | 'config'>('dashboard');
  const [autopilotStakeMode, setAutopilotStakeMode] = useState<'percent' | 'fixed'>(() => {
    const val = localStorage.getItem('mamba_prem_state_mode');
    return val === 'fixed' ? 'fixed' : 'percent';
  });
  const [customStakePercent, setCustomStakePercent] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_stake_percent');
    const parsed = val ? parseInt(val, 10) : NaN;
    return !isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 1;
  });
  const [customFixedStake, setCustomFixedStake] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_fixed_stake');
    const parsed = val ? parseFloat(val) : NaN;
    return !isNaN(parsed) && parsed >= 0.35 && parsed <= 500 ? parsed : 5.00;
  });
  const [customMaxWins, setCustomMaxWins] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_max_wins');
    const parsed = val ? parseInt(val, 10) : NaN;
    return !isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 2;
  });
  const [customMaxLosses, setCustomMaxLosses] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_max_losses');
    const parsed = val ? parseInt(val, 10) : NaN;
    return !isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 5;
  });
  const [customMartingale, setCustomMartingale] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_martingale');
    const parsed = val ? parseFloat(val) : NaN;
    return !isNaN(parsed) && parsed >= 1.0 && parsed <= 4.0 ? parsed : 2.0;
  });

  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // Helper: Get active computed stake based on current configurations
  const getComputedStake = (forcedBalance?: number) => {
    if (autopilotStakeMode === 'percent') {
      const balance = forcedBalance !== undefined ? forcedBalance : (account?.balance || 1000); // fallback to $1000 to display simulated stake when offline
      const calculated = (customStakePercent / 100.0) * balance;
      return parseFloat(Math.max(1.0, calculated).toFixed(2));
    }
    return parseFloat(customFixedStake.toFixed(2));
  };

  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    localStorage.setItem('mamba_prem_state_mode', autopilotStakeMode);
    localStorage.setItem('mamba_prem_stake_percent', customStakePercent.toString());
    localStorage.setItem('mamba_prem_fixed_stake', customFixedStake.toString());
    localStorage.setItem('mamba_prem_max_wins', customMaxWins.toString());
    localStorage.setItem('mamba_prem_max_losses', customMaxLosses.toString());
    localStorage.setItem('mamba_prem_martingale', customMartingale.toString());

    try {
      const targetStake = getComputedStake();
      await onUpdateConfig({
        stake: targetStake,
        maxWins: customMaxWins,
        maxLosses: customMaxLosses,
        martingaleMultiplier: customMartingale
      });
      setSaveSuccess('Premium Autopilot parameters successfully configured and locked!');
      addPremiumLog(`⚙️ PARAMETERS LOCKED: Stake: $${targetStake.toFixed(2)} USD, Wins Goal: ${customMaxWins}, Consecutive Loss Limit: ${customMaxLosses}, Martingale Factor: ${customMartingale}`);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setSaveError('Failed to synchronize parameters with the central trade hub.');
    }
  };

  const pendingAutoStartRef = useRef<boolean>(false);

  // Helper: Append a visual log to the premium audit trailing list
  const addPremiumLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setPremiumLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  // Compute rated scoring list of assets dynamically to list them
  const activeBarrier = getBarrierDigit(botConfig.tradingMode, botConfig.barrierDigit);
  const rankedCandidates = Object.values(symbolsState).map((state) => {
    const info = state.info;
    const metrics = getSymbolMetrics(state, activeBarrier);
    
    return {
      ...state,
      wins: metrics.wins,
      losses: metrics.losses,
      winRate: metrics.winRate,
      score: metrics.score,
      totalSim: metrics.totalSim,
    };
  }).sort((a, b) => b.score - a.score);

  const currentBest = rankedCandidates[0];

  // Check and keep validating session for Only One Device locking live flow
  useEffect(() => {
    const savedUser = localStorage.getItem('mamba_premium_user');
    const savedSess = localStorage.getItem('mamba_premium_sess');

    if (savedUser && savedSess) {
      fetch('/api/premium/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUser, sessionId: savedSess })
      })
      .then(res => res.json())
      .then(async (data) => {
        if (data.success && data.valid) {
          setIsAuthenticatedPremium(true);
          setPremiumUsername(savedUser);
          
          if (data.derivApiToken) {
            try {
              addPremiumLog(`🔄 SESSION RESTORED: Auto-login synchronized linked credentials...`);
              const savedStatus = localStorage.getItem('mamba_premium_status');
              if (!savedStatus || savedStatus === 'idle') {
                pendingAutoStartRef.current = true;
              }
              await onAuthorize(data.derivApiToken);
              addPremiumLog(`✓ Secure broker token authorized.`);
            } catch (authErr) {
              addPremiumLog(`⚠️ Broker auto-login expired. Please link manually.`);
            }
          }
        } else {
          localStorage.removeItem('mamba_premium_user');
          localStorage.removeItem('mamba_premium_sess');
          setPremiumLoginError('Premium subscriber session expired or connected elsewhere.');
        }
        setCheckingSession(false);
      })
      .catch(() => {
        setCheckingSession(false);
      });
    } else {
      setCheckingSession(false);
    }
  }, []);

  // Fetch configured subscription price from state on mount
  useEffect(() => {
    fetch('/api/state')
      .then(res => res.json())
      .then(data => {
        if (data && data.premiumSubscriptionPrice) {
          setPremiumSubscriptionPrice(data.premiumSubscriptionPrice);
        }
      })
      .catch(() => {});
  }, []);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || !cardNumber.trim() || !submittedDerivToken.trim()) {
      setCheckoutError('Please provide Cardholder Name, Card Number and your Deriv API Token.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError('');
    setCheckoutSuccess('');

    try {
      const response = await fetch('/api/premium/submit-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardholderName: cardName.trim(),
          cardNumber: cardNumber.trim(),
          expiry: cardExpiry.trim(),
          cvc: cardCvc.trim(),
          derivApiToken: submittedDerivToken.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setCheckoutSuccess('Subscription order received successfully! Your secure Deriv API Token has been routed and linked to your pending activation profile. Please reach out to the developer with your Cardholder Name to claim your active Subscriber ID and Access Passcode credentials instantly.');
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        setSubmittedDerivToken('');
      } else {
        setCheckoutError(data.error || 'simulated bank gateway declined this checkout authorization.');
      }
    } catch (err) {
      setCheckoutError('Communication error with payment authorization clearinghouse.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Live session check every 10 seconds to enforce Only One Device Login constraint
  useEffect(() => {
    if (!isAuthenticatedPremium) return;

    const intervalId = setInterval(() => {
      const savedUser = localStorage.getItem('mamba_premium_user');
      const savedSess = localStorage.getItem('mamba_premium_sess');

      if (savedUser && savedSess) {
        fetch('/api/premium/validate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: savedUser, sessionId: savedSess })
        })
        .then(res => res.json())
        .then(data => {
          if (!data.success || !data.valid) {
            setIsAuthenticatedPremium(false);
            localStorage.removeItem('mamba_premium_user');
            localStorage.removeItem('mamba_premium_sess');
            setPremiumLoginError('Security Disconnect: Subscriber profile authorized on another terminal device.');
          }
        })
        .catch(() => {});
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isAuthenticatedPremium]);

  const handlePremiumLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Lockout check
    if (loginLockedUntil && Date.now() < loginLockedUntil) {
      const secsLeft = Math.ceil((loginLockedUntil - Date.now()) / 1000);
      setPremiumLoginError(`Too many failed attempts. Try again in ${secsLeft}s.`);
      return;
    }

    if (!premiumUsername.trim() || !premiumPasswordInput.trim()) {
      setPremiumLoginError('Subscriber username and passcode are required.');
      return;
    }

    setPremiumLoggingIn(true);
    setPremiumLoginError('');

    try {
      const response = await fetch('/api/premium/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: premiumUsername.trim(),
          password: premiumPasswordInput.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('mamba_premium_user', data.username);
        localStorage.setItem('mamba_premium_sess', data.sessionId);
        setIsAuthenticatedPremium(true);
        setPremiumPasswordInput('');
        setLoginAttempts(0);
        setLoginLockedUntil(null);
        
        if (data.derivApiToken) {
          try {
            addPremiumLog(`🔑 LOGIN APPROVED: Restoring connected broker tunnel...`);
            pendingAutoStartRef.current = true;
            await onAuthorize(data.derivApiToken);
          } catch (authErr) {
            pendingAutoStartRef.current = false;
            addPremiumLog(`⚠️ Broker token verification failed. Please manually secure token.`);
          }
        } else {
          addPremiumLog(`👑 Welcome back! Unlock autopilot by linking broker API token.`);
        }
      } else {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        if (newAttempts >= 5) {
          const lockUntil = Date.now() + 30000;
          setLoginLockedUntil(lockUntil);
          setPremiumLoginError('Too many failed attempts. Access locked for 30 seconds.');
        } else {
          setPremiumLoginError(`Access denied: Invalid credentials. (${5 - newAttempts} attempts remaining)`);
        }
      }
    } catch (err) {
      setPremiumLoginError('Core gateway connection failed. Verify server.');
    } finally {
      setPremiumLoggingIn(false);
    }
  };

  const handlePremiumLogout = () => {
    localStorage.removeItem('mamba_premium_user');
    localStorage.removeItem('mamba_premium_sess');
    localStorage.removeItem('mamba_premium_status');
    setIsAuthenticatedPremium(false);
    setPremiumUsername('');
  };

  // Poll server-side Premium Autopilot state and logs continuously
  useEffect(() => {
    let active = true;
    const fetchAutopilotState = async () => {
      try {
        const savedUser = localStorage.getItem('mamba_premium_user');
        const savedSess = localStorage.getItem('mamba_premium_sess');
        if (!savedUser || !savedSess) return;
        const params = new URLSearchParams({ username: savedUser, sessionId: savedSess });
        const res = await fetch(`/api/premium/autopilot-state?${params.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data && data.success) {
            setAutopilotState(data.autopilotState.status);
            setCountdown(data.autopilotState.countdown);
            setTargetCandidate(data.autopilotState.targetCandidate);
            setPremiumLogs(data.autopilotLogs || []);
            setWatchdogSwapsCount(data.autopilotState.watchdogSwapsCount || 0);
            setLastWatchdogSwapAt(data.autopilotState.lastWatchdogSwapAt || null);
            
            // Sync form variables ONLY if autopilot is NOT idle so that the current running params are shown
            if (data.autopilotState.status !== 'idle') {
              setCustomMaxWins(data.autopilotState.customMaxWins);
              setCustomMaxLosses(data.autopilotState.customMaxLosses);
              setCustomMartingale(data.autopilotState.customMartingale);
              setAutopilotStakeMode(data.autopilotState.autopilotStakeMode);
              setCustomStakePercent(data.autopilotState.customStakePercent);
              setCustomFixedStake(data.autopilotState.customFixedStake);
            }
          }
        }
      } catch (err) {
        console.error('Error polling premium autopilot state:', err);
      }
    };

    fetchAutopilotState();
    const interval = setInterval(fetchAutopilotState, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // ── KILL-SWITCH: stop autopilot immediately when premium is locked ──────────
  useEffect(() => {
    if (premiumLocked && autopilotState !== 'idle') {
      stopAutopilot();
    }
  }, [premiumLocked, autopilotState]);

  // Sync state initially when authorized account becomes available
  useEffect(() => {
    if (isAuthenticatedPremium && account && pendingAutoStartRef.current && !premiumLocked) {
      pendingAutoStartRef.current = false;
      startAutopilotSurvey();
    }
  }, [account, isAuthenticatedPremium, premiumLocked]);

  // Listen to new trades and record them to autopilot trade history
  useEffect(() => {
    if (pastTrades.length === 0) return;

    // Filter server trades that have isAutopilot flag
    const serverPremiumTrades = pastTrades.filter((t: any) => t.isAutopilot);

    // Only record trades explicitly flagged as autopilot by the server.
    // No fallback — a trade without isAutopilot: true is a manual trade and must not appear here.
    if (serverPremiumTrades.length > 0) {
      setAutopilotTrades((prev) => {
        const merged = [...serverPremiumTrades];
        prev.forEach((p) => {
          if (!merged.some((m) => m.id === p.id)) {
            merged.push(p);
          }
        });
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const trimmed = merged.slice(0, 100);
        localStorage.setItem('mamba_premium_autopilot_trades', JSON.stringify(trimmed));
        return trimmed;
      });
    }
  }, [pastTrades, autopilotState]);

  // Trigger Autopilot Sequence Start
  const startAutopilotSurvey = async () => {
    if (premiumLocked) {
      setError('Premium access is currently locked.');
      return;
    }
    if (!account) {
      setError('An active authorized brokerage session is required to initiate the Autopilot.');
      return;
    }
    setError('');
    
    // Dynamically calculate and lock the stake based on user specifications
    const targetStake = getComputedStake();
    try {
      const response = await fetch('/api/premium/start-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customMaxWins,
          customMaxLosses,
          customMartingale,
          autopilotStakeMode,
          customStakePercent,
          customFixedStake: targetStake,
        })
      });
      const data = await response.json();
      if (data && data.success) {
        setAutopilotState(data.autopilotState.status);
        setCountdown(data.autopilotState.countdown);
      }
    } catch (e: any) {
      console.error('Failed to trigger server start-autopilot:', e);
    }
  };

  // Halt active autopilot scan or trading session
  const stopAutopilot = async () => {
    try {
      const response = await fetch('/api/premium/stop-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data && data.success) {
        setAutopilotState(data.autopilotState.status);
        setCountdown(data.autopilotState.countdown);
      }
    } catch (e: any) {
      console.error('Failed to trigger server stop-autopilot:', e);
    }
  };

  const handlePremiumDisconnect = async () => {
    try {
      const savedUser = localStorage.getItem('mamba_premium_user');
      const savedSess = localStorage.getItem('mamba_premium_sess');
      if (savedUser && savedSess) {
        await fetch('/api/premium/unlink-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: savedUser, sessionId: savedSess })
        });
      }
      await onDeauthorize();
      addPremiumLog(`🔓 UNLINKED: Broker token unlinked from premium subscription context.`);
    } catch (e) {
      console.error('Failed to unlink API token:', e);
      await onDeauthorize();
    }
  };

  const handlePremiumAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please input a valid Deriv Account API Token.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      pendingAutoStartRef.current = true;
      await onAuthorize(tokenInput.trim());
      addPremiumLog(`🔑 TUNNEL VERIFIED: Token authorized and locked dynamically in node.`);

      // Link on the server matched with logged in credentials
      const savedUser = localStorage.getItem('mamba_premium_user');
      const savedSess = localStorage.getItem('mamba_premium_sess');
      if (savedUser && savedSess) {
        const response = await fetch('/api/premium/link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: savedUser,
            sessionId: savedSess,
            token: tokenInput.trim()
          })
        });
        const data = await response.json();
        if (data && data.success) {
          addPremiumLog(`⛓️ LINKED PERMANENTLY: Token securely paired and saved with subscription credentials.`);
        } else {
          addPremiumLog(`⚠️ Token valid in session, but could not link permanently: ${data.error || 'Server error'}`);
        }
      }

      setTokenInput('');
    } catch (e: any) {
      pendingAutoStartRef.current = false;
      setError(e.message || 'Authentication rejected. Verify scopes on Deriv panel.');
    } finally {
      setLoading(false);
    }
  };

  // Format Helper MM:SS
  const formatCountdown = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── WAITLIST STATE & HANDLER ──────────────────────────────────────────────
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistContact, setWaitlistContact] = useState('');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');

  // ── WAITLIST HANDLER ──────────────────────────────────────────────────────
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistName.trim() || !waitlistContact.trim()) return;
    setWaitlistSubmitting(true);
    setWaitlistError('');
    try {
      const res = await fetch('/api/premium-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: waitlistName.trim(), contact: waitlistContact.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setWaitlistDone(true);
      } else {
        setWaitlistError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setWaitlistError('Network error. Please check your connection.');
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  // ── PREMIUM GATE ───────────────────────────────────────────────────────────
  // Non-admin users see the coming-soon overlay when premiumLocked is true
  if (premiumLocked) {
    return (
      <div className="min-h-[520px] flex items-center justify-center p-4 relative overflow-hidden font-mono">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-slate-950 to-indigo-950/20 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-8 shadow-2xl shadow-amber-950/20 text-center space-y-6">

            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-950/30">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Coming Soon</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">NexScan IQ Premium</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                We're putting the finishing touches on something powerful. Our AI-assisted trading engine is currently in final calibration — being trained on real market data to deliver the most accurate pair selection signals possible.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Premium access will open to the public once our models meet our quality standard. Leave your details below and you'll be the <span className="text-amber-400 font-bold">first to know</span> when doors open.
              </p>
            </div>

            {/* Waitlist form */}
            {!waitlistDone ? (
              <form onSubmit={handleWaitlistSubmit} className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={waitlistName}
                    onChange={e => setWaitlistName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 focus:outline-none px-3 py-2.5 rounded-xl text-[11px] text-slate-200 placeholder:text-slate-600 font-mono transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Email or Phone</label>
                  <input
                    type="text"
                    placeholder="you@email.com or +1 234 567 8900"
                    value={waitlistContact}
                    onChange={e => setWaitlistContact(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 focus:outline-none px-3 py-2.5 rounded-xl text-[11px] text-slate-200 placeholder:text-slate-600 font-mono transition-colors"
                  />
                </div>
                {waitlistError && (
                  <p className="text-[10px] text-rose-400 font-medium">{waitlistError}</p>
                )}
                <button
                  type="submit"
                  disabled={waitlistSubmitting || !waitlistName.trim() || !waitlistContact.trim()}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30"
                >
                  {waitlistSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering...</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> Notify Me When It's Live</>
                  )}
                </button>
              </form>
            ) : (
              /* Success state */
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <CircleCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-black text-emerald-400">You're on the list!</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Thanks, <span className="text-slate-200 font-bold">{waitlistName}</span>. We'll reach out to <span className="text-slate-200 font-bold">{waitlistContact}</span> the moment Premium goes live. Stay sharp.
                </p>
              </div>
            )}

            {/* Subtle stats */}
            <div className="flex items-center justify-center gap-1 pt-2">
              <Lock className="w-3 h-3 text-slate-700" />
              <span className="text-[9px] text-slate-700 uppercase tracking-wider font-bold">Secured · Invite-only access</span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center font-mono bg-slate-950/20 rounded-3xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Securing premium session authentication...</p>
      </div>
    );
  }

  if (!isAuthenticatedPremium) {
    return (
      <div className="max-w-lg mx-auto my-8 animate-fade-in relative font-mono">
        {/* Theme customizer options panel */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${activeTheme.textAccent}`} />
            <span className="text-[10px] font-bold text-slate-350 font-sans">Visual Option Preset:</span>
          </div>
          <div className="flex gap-1">
            {[
              { id: 'obsidian-gold', color: 'bg-amber-500', name: 'Obsidian' },
              { id: 'cyber-pulse', color: 'bg-emerald-500', name: 'Cyber' },
              { id: 'corporate-platinum', color: 'bg-slate-350', name: 'Platinum' },
              { id: 'royal-amethyst', color: 'bg-violet-500', name: 'Royal' }
            ].map((themeOpt) => (
              <button
                key={themeOpt.id}
                type="button"
                onClick={() => applyPremiumTheme(themeOpt.id as any)}
                className={`px-2 py-1.5 rounded-xl text-[8.5px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer border ${
                  premiumTheme === themeOpt.id
                    ? 'bg-slate-900 border-indigo-500/40 text-slate-100'
                    : 'bg-slate-955/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-950'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${themeOpt.color}`} />
                {themeOpt.name}
              </button>
            ))}
          </div>
        </div>

        <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.bgGlow} rounded-3xl blur-2xl pointer-events-none`} />
        <div className={`relative bg-slate-900/60 border ${activeTheme.cardBorder} rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-5 transition-all duration-300`}>
          
          <div className="text-center space-y-4">
            <div className={`w-12 h-12 rounded-2xl ${activeTheme.badgeBg} flex items-center justify-center mx-auto shadow-lg ${activeTheme.accentGlow} border ${activeTheme.borderColor}`}>
              <Crown className="w-6 h-6 text-slate-950 fill-current" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold font-sans text-slate-100 tracking-tight text-center">
                NexScan IQ <span className={`text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.headingAccent}`}>Premium Autopilot</span>
              </h2>
              <p className="text-[11px] text-slate-405 leading-relaxed max-w-sm mx-auto text-center font-mono">
                Access advanced high-frequency market analysis algorithms and fully automated execution systems.
              </p>
            </div>
          </div>

          {/* Toggle pill bar */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setCheckoutSubTab('checkout')}
              className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                checkoutSubTab === 'checkout'
                  ? activeTheme.pillActive
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💳 Subscribe & Link
            </button>
            <button
              type="button"
              onClick={() => setCheckoutSubTab('login')}
              className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                checkoutSubTab === 'login'
                  ? activeTheme.pillActive
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👑 Enter VIP Hub
            </button>
          </div>

          {checkoutSubTab === 'checkout' ? (
            /* Checkout Form Setup */
            <form onSubmit={handleCheckoutSubmit} className="space-y-4 font-mono text-left">
              <div className={`bg-slate-955/70 border ${activeTheme.borderColor} p-4 rounded-xl text-center space-y-1 animate-fade-in shadow-inner`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Premium Autopilot License</span>
                <span className={`text-2xl font-black font-sans ${activeTheme.textAccent} tracking-tight`}>${premiumSubscriptionPrice.toFixed(2)} USD</span>
                <span className="text-[11px] text-slate-400 block font-mono">Billed monthly • SECURED SIMULATION PROCESS</span>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-slate-450 tracking-wider">Cardholder Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-slate-450 tracking-wider">Credit Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                        const matches = v.match(/\d{4,16}/g);
                        const match = (matches && matches[0]) || '';
                        const parts = [];
                        for (let i = 0, len = match.length; i < len; i += 4) {
                          parts.push(match.substring(i, i + 4));
                        }
                        if (parts.length > 0) {
                          setCardNumber(parts.join(' '));
                        } else {
                          setCardNumber(v);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                      required
                    />
                    <CreditCard className="w-4 h-4 text-slate-650 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-slate-450 tracking-wider">Expiration Date</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 2) {
                          val = val.substring(0, 2) + '/' + val.substring(2, 4);
                        }
                        setCardExpiry(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono text-center"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-slate-450 tracking-wider">CVC security code</label>
                    <input
                      type="password"
                      maxLength={3}
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1 border-t border-slate-850/85 pt-3">
                  <div className="flex items-center justify-between">
                    <label className={`text-[11px] uppercase font-bold ${activeTheme.textAccent} tracking-wider`}>Your Deriv API Token (Saved Safely)</label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Paste your Deriv Secure API Token here..."
                      value={submittedDerivToken}
                      onChange={(e) => setSubmittedDerivToken(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                      required
                    />
                    <Key className={`w-4 h-4 ${activeTheme.textAccent} absolute left-3 top-1/2 -translate-y-1/2`} />
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-normal pt-1 bg-slate-950/40 p-2 rounded border border-slate-900">
                    💡 **To get your token:** Log into Deriv.com, navigate to **Account Settings &gt; API Token**, generate a token named "NexScan Autopilot" with **Read** and **Trade** scopes, copy it and paste it here!
                  </span>
                </div>
              </div>

              {checkoutError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-955/30 border border-rose-900/40 text-[10px] text-rose-400 rounded-lg animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-350 mt-0.5" />
                  <span className="leading-tight">{checkoutError}</span>
                </div>
              )}

              {checkoutSuccess && (
                <div className="flex items-start gap-2.5 px-3 py-3 bg-emerald-955/30 border border-emerald-900/40 text-[10px] text-emerald-400 rounded-lg animate-fade-in leading-relaxed">
                  <CircleCheck className="w-4.5 h-4.5 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{checkoutSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={checkoutLoading || checkoutSuccess !== ''}
                className={`w-full py-3.5 ${activeTheme.btnAccent} active:scale-[0.98] transition-all rounded-xl font-mono text-xs font-black uppercase tracking-widest cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5`}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> AUTHORIZING CHECKOUT TRANSACTIONS...
                  </>
                ) : (
                  `ACTIVATE LICENSE ($${premiumSubscriptionPrice.toFixed(2)} / MO)`
                )}
              </button>
            </form>
          ) : (
            /* Traditional VIP User Access Portal form */
            <form onSubmit={handlePremiumLoginSubmit} className="space-y-4 text-left font-mono">
              <div className="space-y-1">
                <label className={`text-[11px] uppercase font-bold ${activeTheme.textAccent} tracking-wider`}>VIP Subscriber ID</label>
                <input
                  type="text"
                  placeholder="Enter subscriber username..."
                  value={premiumUsername}
                  onChange={(e) => setPremiumUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] uppercase font-bold ${activeTheme.textAccent} tracking-wider`}>Access Passcode</label>
                <input
                  type="password"
                  placeholder="Enter account passcode..."
                  value={premiumPasswordInput}
                  onChange={(e) => setPremiumPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                  required
                />
              </div>

              {premiumLoginError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-955/30 border border-rose-900/40 text-[10px] text-rose-450 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-350 mt-0.5" />
                  <span className="leading-tight font-mono">{premiumLoginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={premiumLoggingIn}
                className={`w-full py-3.5 ${activeTheme.btnAccent} active:scale-[0.98] transition-all rounded-xl font-mono text-xs font-black uppercase tracking-widest cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5`}
              >
                {premiumLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> DECRYPTING ENTRANCE CODE...
                  </>
                ) : (
                  'SECURE ACCESS PROFILE'
                )}
              </button>

              <div className="p-3.5 bg-slate-950/40 border border-slate-855 rounded-xl space-y-3 font-mono text-[11px] leading-relaxed text-slate-400 mt-2">
                <div className="space-y-1">
                  <div className={`flex items-center gap-1.5 ${activeTheme.textAccent} font-bold uppercase text-[11px]`}>
                    <Shield className="w-3.5 h-3.5 font-extrabold" /> Restricted Premium Access
                  </div>
                  <p className="text-slate-300">
                    Logging in with a standard API Token on the main platform <span className="text-indigo-400 font-bold underline">does not</span> grant access to the Premium tab. Only authorized subscriber keys verified by the developer allow VIP login.
                  </p>
                </div>

                <div className="space-y-1 pt-1.5 border-t border-slate-900">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[11px]">
                    <Smartphone className="w-3.5 h-3.5 font-extrabold" /> Enforced Device Safety Lock
                  </div>
                  <p>
                    Active trading sessions dictate a strict single-device lock to stop overlap interference. Authorizing on another tablet or browser instantly terminates active sessions here.
                  </p>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-mono bg-slate-950 text-slate-100 animate-fade-in">

      {/* ── STATUS HEADER ─────────────────────────────────────────── */}
      <div className={`relative overflow-hidden border-b border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${activeTheme.bgGlow} pointer-events-none`} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:p-5">

          {/* Left: Identity */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${activeTheme.badgeBg} flex items-center justify-center shrink-0 shadow-lg`}>
              <Crown className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-100 tracking-tight">NexScan IQ Premium</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${activeTheme.badgeText} border uppercase tracking-widest`}>VIP</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500">{premiumUsername}</span>
                <span className="text-slate-700">•</span>
                <button onClick={handlePremiumLogout} className="text-[9px] text-rose-500 hover:text-rose-400 transition-colors cursor-pointer uppercase tracking-wider font-bold">Logout</button>
                {/* Theme dots */}
                <div className="flex gap-1 ml-1">
                  {[
                    { id: 'obsidian-gold', color: 'bg-amber-500' },
                    { id: 'cyber-pulse', color: 'bg-emerald-500' },
                    { id: 'corporate-platinum', color: 'bg-slate-350' },
                    { id: 'royal-amethyst', color: 'bg-violet-500' },
                  ].map(t => (
                    <button key={t.id} onClick={() => applyPremiumTheme(t.id as any)}
                      className={`w-2.5 h-2.5 rounded-full ${t.color} cursor-pointer transition-all ${premiumTheme === t.id ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-slate-950 scale-110' : 'opacity-40 hover:opacity-80'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Center: State badge */}
          <div className="flex items-center gap-3">
            {autopilotState === 'idle' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> System Idle
              </span>
            )}
            {autopilotState === 'warmup' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-indigo-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Warmup — {formatCountdown(countdown)}
              </span>
            )}
            {autopilotState === 'scanning' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Scanning All Pairs
              </span>
            )}
            {autopilotState === 'trading' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-700/40 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                <Activity className="w-3 h-3 animate-pulse" /> Trading — {targetCandidate || botState.symbol}
              </span>
            )}
            {autopilotState === 'cooldown' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <Flame className="w-3 h-3" /> Cooldown — {formatCountdown(countdown)}
              </span>
            )}
            {autopilotState === 'countdown_next' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/20 border border-amber-800/30 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                <Zap className="w-3 h-3 animate-bounce" /> Next scan in {countdown}s
              </span>
            )}
          </div>

          {/* Right: Primary action */}
          <div className="flex items-center gap-2 shrink-0">
            {(autopilotState !== 'idle') && (
              <button onClick={stopAutopilot}
                className="px-3 py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/50 text-rose-400 rounded-lg font-mono text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5">
                <Square className="w-3 h-3 fill-current" /> Stop
              </button>
            )}
            {autopilotState === 'idle' && (
              <button onClick={startAutopilotSurvey} disabled={!account}
                className={`px-4 py-2 ${activeTheme.btnAccent} rounded-lg font-mono text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all disabled:opacity-30 flex items-center gap-1.5`}>
                <Play className="w-3 h-3 fill-current" /> Launch Autopilot
              </button>
            )}
            <button onClick={() => setShowPremiumConsole(true)}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition-all cursor-pointer relative">
              <Terminal className="w-4 h-4" />
              {autopilotState !== 'idle' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-5 max-w-7xl mx-auto">

        {/* ── METRICS ROW ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Balance */}
          <div className="col-span-2 sm:col-span-1 bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Broker Balance</span>
              {account && (
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${account.is_virtual ? 'text-amber-400 border-amber-800/40 bg-amber-950/20' : 'text-emerald-400 border-emerald-800/40 bg-emerald-950/20'}`}>
                  {account.is_virtual ? 'Demo' : 'Real'}
                </span>
              )}
            </div>
            {account ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-100 tracking-tight tabular-nums">
                    {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{account.currency}</span>
                </div>
                <span className="text-[9px] text-slate-600 mt-1">{account.loginid}</span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
                <AlertTriangle className="w-3 h-3 shrink-0" /> No broker linked
              </div>
            )}
          </div>

          {/* Session P&L */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Session P&L</span>
            <div className={`text-2xl font-black tracking-tight tabular-nums ${botState.profit > 0 ? 'text-emerald-400' : botState.profit < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[9px] font-bold">
              <span className="text-emerald-500">{botState.wins}W</span>
              <span className="text-slate-700">/</span>
              <span className="text-rose-500">{botState.losses}L</span>
              {botState.consecutiveLosses > 0 && (
                <span className="text-amber-500 ml-1">{botState.consecutiveLosses} streak</span>
              )}
            </div>
          </div>

          {/* Active Pair */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Active Pair</span>
            {autopilotState === 'trading' ? (
              <>
                <span className={`text-xl font-black ${activeTheme.textAccent}`}>{botState.symbol.replace('_', ' ').replace('1HZ', 'V').replace('R', 'V')}</span>
                <span className="text-[9px] text-slate-500 mt-1">Stake: ${botState.currentStake.toFixed(2)}</span>
              </>
            ) : (
              <>
                <span className="text-xl font-black text-slate-600">—</span>
                <span className="text-[9px] text-slate-600 mt-1">
                  {autopilotState === 'scanning' ? 'Scanning...' : autopilotState === 'warmup' ? 'Warming up...' : 'Not trading'}
                </span>
              </>
            )}
          </div>

          {/* Watchdog */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Watchdog</span>
            <div className={`text-xl font-black ${watchdogSwapsCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
              {watchdogSwapsCount} <span className="text-sm font-bold">swaps</span>
            </div>
            <span className={`text-[9px] mt-1 font-bold uppercase ${autopilotState === 'trading' ? 'text-emerald-500' : 'text-slate-600'}`}>
              {autopilotState === 'trading' ? '🛡 Active — &lt;55.5% WR' : 'Standby'}
            </span>
          </div>
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT: Controls ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Sub-tabs */}
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800/60 gap-1">
              {[
                { id: 'dashboard', label: 'Status', iconType: 'activity' },
                { id: 'config', label: 'Settings', iconType: 'zap' },
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActivePremiumSubTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activePremiumSubTab === tab.id ? activeTheme.tabActive : 'text-slate-500 hover:text-slate-300'
                    }`}>
                    {tab.iconType === 'activity' ? <Activity className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                    {tab.label}
                  </button>
              ))}
            </div>

            {activePremiumSubTab === 'dashboard' ? (
              <div className="space-y-3">

                {/* Entry Gates */}
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 space-y-3">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Entry Gates</span>
                  {[
                    { label: 'Win Rate', current: (currentBest?.winRate || 0).toFixed(1) + '%', target: '≥ 60.0%', met: (currentBest?.winRate || 0) >= 60.0 },
                    { label: 'Perf Score', current: (currentBest?.score || 0).toFixed(1), target: '≥ 60.0', met: (currentBest?.score || 0) >= 60.0 },
                    { label: 'Broker Link', current: account ? account.loginid : 'None', target: 'Required', met: !!account },
                    { label: 'Calibration', current: 'Scanner', target: '> 5 min', met: autopilotState !== 'idle' },
                  ].map(gate => (
                    <div key={gate.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${gate.met ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                        <span className="text-[10px] text-slate-400 font-medium">{gate.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{gate.current}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${gate.met ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/40' : 'text-slate-600 bg-slate-900 border border-slate-800'}`}>
                          {gate.met ? '✓' : gate.target}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Broker */}
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 space-y-3">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Broker Link</span>
                  {account ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-slate-200 truncate max-w-[160px]">{account.fullname}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{account.loginid} · {account.currency}</p>
                        </div>
                        <button onClick={handlePremiumDisconnect}
                          className="text-[9px] font-bold text-rose-500 hover:text-rose-400 cursor-pointer uppercase tracking-wider transition-colors">
                          Unlink
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handlePremiumAuth} className="space-y-2">
                      <input type="password" placeholder="Paste Deriv API token..."
                        value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 focus:outline-none px-3 py-2 rounded-lg text-[11px] text-slate-200 placeholder:text-slate-600 font-mono" required />
                      {error && <p className="text-[10px] text-rose-400">{error}</p>}
                      <button type="submit" disabled={loading}
                        className={`w-full py-2 ${activeTheme.btnAccent} rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50`}>
                        {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Linking...</> : 'Link API Token'}
                      </button>
                    </form>
                  )}
                </div>

              </div>
            ) : (
              /* SETTINGS PANEL */
              <form onSubmit={handleSaveParameters} className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 space-y-4">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Autopilot Parameters</span>

                {/* Stake */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stake Mode</label>
                  <select value={autopilotStakeMode} onChange={e => setAutopilotStakeMode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-3 py-2 text-[11px] text-slate-200 font-mono cursor-pointer">
                    <option value="percent">% of Balance</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                  {autopilotStakeMode === 'percent' ? (
                    <div className="flex gap-2 items-center">
                      <input type="number" min="1" max="10" step="1" value={customStakePercent}
                        onChange={e => setCustomStakePercent(parseInt(e.target.value, 10) || 1)}
                        className="w-20 bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-3 py-2 text-[11px] text-slate-200 font-mono" />
                      <span className="text-[10px] text-slate-500">% → <strong className="text-emerald-400">${getComputedStake().toFixed(2)}</strong></span>
                    </div>
                  ) : (
                    <input type="number" min="0.35" max="500" step="0.05" value={customFixedStake}
                      onChange={e => setCustomFixedStake(parseFloat(e.target.value) || 0.35)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-3 py-2 text-[11px] text-slate-200 font-mono" />
                  )}
                </div>

                {/* Safety grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Max Wins', value: customMaxWins, setter: setCustomMaxWins, min: 1, max: 10, step: 1, hint: 'Target wins/session' },
                    { label: 'Max Losses', value: customMaxLosses, setter: setCustomMaxLosses, min: 1, max: 10, step: 1, hint: 'Stops bot' },
                    { label: 'Martingale', value: customMartingale, setter: setCustomMartingale, min: 1, max: 4, step: 0.1, hint: 'Loss multiplier' },
                  ].map(field => (
                    <div key={field.label} className="space-y-1">
                      <label className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                      <input type="number" min={field.min} max={field.max} step={field.step} value={field.value}
                        onChange={e => field.setter(parseFloat(e.target.value) || field.min as any)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono text-center" />
                      <p className="text-[8px] text-slate-600">{field.hint}</p>
                    </div>
                  ))}
                </div>

                {saveSuccess && <p className="text-[10px] text-emerald-400 font-bold">✓ {saveSuccess}</p>}
                {saveError && <p className="text-[10px] text-rose-400">⚠ {saveError}</p>}

                <button type="submit"
                  className={`w-full py-2.5 ${activeTheme.btnAccent} rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5`}>
                  <RefreshCw className="w-3 h-3" /> Save & Lock Parameters
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: Pair Pipeline ────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Compass className={`w-4 h-4 ${activeTheme.textAccent}`} />
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Live Pair Pipeline</span>
                </div>
                <span className={`text-[8.5px] font-bold px-2 py-1 rounded-lg border ${activeTheme.badgeText} uppercase tracking-wider`}>
                  WR ≥ 60% · Score ≥ 60
                </span>
              </div>

              {/* Pair rows */}
              <div className="divide-y divide-slate-800/40">
                {rankedCandidates.slice(0, 8).map((item, idx) => {
                  const qualified = item.winRate !== null && item.winRate >= 60.0 && item.score >= 60.0;
                  const isActive = botState.symbol === item.info.id && autopilotState === 'trading';
                  return (
                    <div key={item.info.id} className={`flex items-center gap-3 px-4 py-3 transition-all ${isActive ? `${activeTheme.bgCard} border-l-2 ${activeTheme.activeBorder}` : qualified ? 'bg-emerald-950/5' : ''}`}>
                      {/* Rank */}
                      <span className="text-[9px] font-black text-slate-600 w-4 shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>

                      {/* Symbol */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-slate-200">{item.info.short}</span>
                          {item.info.is1s && <span className="text-[7px] font-bold px-1 py-0.5 bg-slate-800 text-slate-400 rounded uppercase">1s</span>}
                          {isActive && <span className={`text-[7px] font-bold px-1 py-0.5 rounded uppercase ${activeTheme.badgeText} border`}>Live</span>}
                        </div>
                        <span className="text-[8.5px] text-slate-600 truncate block">{item.info.name}</span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-[8px] text-slate-600 uppercase font-bold">Signals</p>
                          <p className="text-[11px] font-bold text-slate-300 tabular-nums">{item.signals}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-600 uppercase font-bold">Win Rate</p>
                          <p className={`text-[11px] font-bold tabular-nums ${item.winRate !== null && item.winRate >= 60 ? 'text-emerald-400' : item.winRate !== null && item.winRate >= 53 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {item.winRate !== null ? item.winRate.toFixed(1) + '%' : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-600 uppercase font-bold">Score</p>
                          <p className={`text-[11px] font-bold tabular-nums ${item.score >= 60 ? 'text-indigo-400' : 'text-slate-500'}`}>
                            {item.score > -1 ? item.score.toFixed(1) : '—'}
                          </p>
                        </div>
                        <div className="w-16">
                          {qualified ? (
                            <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 uppercase block text-center">Ready</span>
                          ) : item.winRate !== null && item.winRate < 45 ? (
                            <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-rose-950/30 text-rose-500 border border-rose-900/30 uppercase block text-center">Avoid</span>
                          ) : (
                            <span className="text-[8px] font-bold px-2 py-1 rounded-lg bg-slate-900 text-slate-600 border border-slate-800 uppercase block text-center">Watch</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trade History */}
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Autopilot Trades</span>
                  {autopilotTrades.length > 0 && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md">{autopilotTrades.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {autopilotTrades.length > 0 && (
                    <>
                      <span className={`text-[10px] font-black ${autopilotTrades.reduce((a, t) => a + t.profit, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        P&L: ${autopilotTrades.reduce((a, t) => a + t.profit, 0).toFixed(2)}
                      </span>
                      <button onClick={() => { setAutopilotTrades([]); localStorage.removeItem('mamba_premium_autopilot_trades'); }}
                        className="text-[9px] text-slate-600 hover:text-rose-500 cursor-pointer transition-colors uppercase font-bold">
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              {autopilotTrades.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-slate-600">
                  <div className="text-center">
                    <History className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-[10px]">No autopilot trades yet</p>
                  </div>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/30 scrollbar-none">
                  {autopilotTrades.map(trade => {
                    const sym = SYMBOLS.find(s => s.id === trade.symbol);
                    const isWin = trade.outcome === 'win';
                    return (
                      <div key={trade.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWin ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                          <div>
                            <p className="text-[10px] font-bold text-slate-200">{sym ? sym.short : trade.symbol}</p>
                            <p className="text-[8.5px] text-slate-600">{new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-slate-600">Stake ${trade.stake.toFixed(2)}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${isWin ? 'text-emerald-400 border-emerald-900/40 bg-emerald-950/30' : 'text-rose-400 border-rose-900/40 bg-rose-950/30'}`}>
                            {isWin ? '+' : '-'}${Math.abs(trade.profit).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONSOLE DRAWER ────────────────────────────────────────── */}
      {showPremiumConsole && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="absolute inset-0" onClick={() => setShowPremiumConsole(false)} />
          <div className="relative w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className={`w-4 h-4 ${activeTheme.textAccent} animate-pulse`} />
                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Autopilot Console</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-bold px-2 py-1 rounded border ${autopilotState !== 'idle' ? 'text-amber-400 border-amber-800/40 bg-amber-950/20' : 'text-slate-600 border-slate-800 bg-slate-900'}`}>
                  {autopilotState !== 'idle' ? 'ACTIVE' : 'STANDBY'}
                </span>
                <button onClick={() => setShowPremiumConsole(false)} className="text-slate-500 hover:text-slate-200 cursor-pointer transition-colors">✕</button>
              </div>
            </div>

            <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-slate-900">
              {['logs', 'history'].map(tab => (
                <button key={tab} onClick={() => setTerminalTab(tab as any)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all ${terminalTab === tab ? `${activeTheme.pillActive}` : 'text-slate-500 hover:text-slate-300'}`}>
                  {tab === 'logs' ? 'Radar Logs' : `Trades ${autopilotTrades.length > 0 ? `(${autopilotTrades.length})` : ''}`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed scrollbar-none">
              {terminalTab === 'logs' ? (
                premiumLogs.length === 0 ? (
                  <p className="text-slate-600 italic text-center mt-8">Waiting for autopilot activity...</p>
                ) : (
                  <div className="space-y-2">
                    {premiumLogs.map((log, i) => (
                      <p key={i} className={`${activeTheme.textAccent} opacity-90 break-all`}>{log}</p>
                    ))}
                  </div>
                )
              ) : (
                autopilotTrades.length === 0 ? (
                  <p className="text-slate-600 italic text-center mt-8">No trades yet</p>
                ) : (
                  <div className="space-y-2.5 divide-y divide-slate-900">
                    {autopilotTrades.map(trade => {
                      const sym = SYMBOLS.find(s => s.id === trade.symbol);
                      const isWin = trade.outcome === 'win';
                      return (
                        <div key={trade.id} className="flex items-center justify-between pt-2.5 first:pt-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isWin ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                            <div>
                              <p className="font-bold text-slate-200">{sym ? sym.short : trade.symbol}</p>
                              <p className="text-slate-600 text-[8.5px]">{new Date(trade.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <span className={`font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : '-'}${Math.abs(trade.profit).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {autopilotTrades.length > 0 && (
              <div className="border-t border-slate-900 px-5 py-3 flex items-center justify-between">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Total P&L</span>
                <span className={`text-[11px] font-black ${autopilotTrades.reduce((a, t) => a + t.profit, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${autopilotTrades.reduce((a, t) => a + t.profit, 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
