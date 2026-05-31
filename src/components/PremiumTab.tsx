import React, { useState, useEffect, useRef } from 'react';
import { SymbolState, AccountInfo, BotConfig, BotState, LogMessage, PastTrade } from '../types';
import { SYMBOLS, getVolColor, digitColor } from '../constants';
import { 
  Crown, Play, Square, Shield, Activity, Compass, Zap, Flame, 
  Sparkles, CheckCircle2, AlertTriangle, Key, Loader2, RefreshCw, Smartphone, BarChart3, Terminal,
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
  const [autopilotTrades, setAutopilotTrades] = useState<PastTrade[]>(() => {
    const saved = localStorage.getItem('mamba_premium_autopilot_trades');
    return saved ? JSON.parse(saved) : [];
  });

  // Autopilot configurable parameters (The requested defaults are: 1% of balance, 2 wins, 5 consecutive losses, martingale 2 unless they change it)
  const [activePremiumSubTab, setActivePremiumSubTab] = useState<'dashboard' | 'config'>('dashboard');
  const [autopilotStakeMode, setAutopilotStakeMode] = useState<'percent' | 'fixed'>(() => {
    return (localStorage.getItem('mamba_prem_state_mode') as 'percent' | 'fixed') || 'percent';
  });
  const [customStakePercent, setCustomStakePercent] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_stake_percent');
    return val ? parseInt(val, 10) : 1;
  });
  const [customFixedStake, setCustomFixedStake] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_fixed_stake');
    return val ? parseFloat(val) : 5.00;
  });
  const [customMaxWins, setCustomMaxWins] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_max_wins');
    return val ? parseInt(val, 10) : 2;
  });
  const [customMaxLosses, setCustomMaxLosses] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_max_losses');
    return val ? parseInt(val, 10) : 5;
  });
  const [customMartingale, setCustomMartingale] = useState<number>(() => {
    const val = localStorage.getItem('mamba_prem_martingale');
    return val ? parseFloat(val) : 2.0;
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
  const rankedCandidates = Object.values(symbolsState).map((state) => {
    const info = state.info;
    const totalSim = state.wins + state.losses;
    const winRate = totalSim >= 3 ? (state.wins / totalSim) * 100 : null;
    const signalFreq = state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0;
    
    // Balanced Score = (65% Win-Rate Weight) + (35% Volume Weight)
    const score = winRate !== null 
      ? winRate * 0.65 + Math.min(signalFreq * 5.0, 100) * 0.35 
      : -1;

    return {
      ...state,
      winRate,
      score,
      totalSim,
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

    if (!submittedDerivToken.trim()) {
      setCheckoutError('A valid Deriv API Token is required so we can link it to your premium VIP activation profile.');
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
        setPremiumLoginError(data.error || 'Access denied: Invalid credentials.');
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
        const res = await fetch('/api/premium/autopilot-state');
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

  // Sync state initially when authorized account becomes available
  useEffect(() => {
    if (isAuthenticatedPremium && account && pendingAutoStartRef.current) {
      pendingAutoStartRef.current = false;
      startAutopilotSurvey();
    }
  }, [account, isAuthenticatedPremium]);

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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono text-center"
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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono text-center"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1 border-t border-slate-805/85 pt-3">
                  <div className="flex items-center justify-between">
                    <label className={`text-[11px] uppercase font-bold ${activeTheme.textAccent} tracking-wider`}>Your Deriv API Token (Saved Safely)</label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Paste your Deriv Secure API Token here..."
                      value={submittedDerivToken}
                      onChange={(e) => setSubmittedDerivToken(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
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
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400 mt-0.5" />
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
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
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto font-mono text-left">
      
      {/* Configuration sub-tabs bar */}
      <div className="flex border-b border-slate-800/80 overflow-x-auto select-none gap-2 font-mono scrollbar-none mb-2">
        <button
          id="tab-autopilot-hub"
          type="button"
          onClick={() => setActivePremiumSubTab('dashboard')}
          className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5 ${
            activePremiumSubTab === 'dashboard'
              ? `${activeTheme.activeBorder} ${activeTheme.textAccent} font-extrabold bg-slate-550/5`
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crown className="w-4 h-4" /> VIP Autopilot Systems Hub
        </button>
        <button
          id="tab-autopilot-params"
          type="button"
          onClick={() => setActivePremiumSubTab('config')}
          className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer uppercase tracking-wider flex items-center gap-1.5 ${
            activePremiumSubTab === 'config'
              ? `${activeTheme.activeBorder} ${activeTheme.textAccent} font-extrabold bg-slate-550/5`
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" /> Fine-Tune Autopilot Settings
        </button>
      </div>

      {activePremiumSubTab === 'config' ? (
        <div id="autopilot-config-panel" className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-xl p-4 md:p-5 space-y-4 animate-fade-in text-left">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${activeTheme.iconContainer} flex items-center justify-center shrink-0`}>
              <Zap className="w-4.5 h-4.5 fill-current animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-widest font-sans">Fine-Tune Autopilot Settings</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Customize risk filters, stake calculations, and martingale escalations.</p>
            </div>
          </div>

          <form onSubmit={handleSaveParameters} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Order Sizing Block */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <h3 className="text-[11px] font-bold font-mono text-amber-450 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-500" /> Capital & Order Sizing
                </h3>

                <div className="space-y-1.5 font-mono text-left">
                  <label className="text-[8.5px] uppercase font-extrabold text-slate-400">Automated Order Stake Volume</label>
                  <select
                    id="autopilot-stake-mode"
                    value={autopilotStakeMode}
                    onChange={(e) => setAutopilotStakeMode(e.target.value as 'percent' | 'fixed')}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-slate-105 font-mono cursor-pointer"
                  >
                    <option value="percent">1% to 10% of Balance Weight (Safe Preset)</option>
                    <option value="fixed">Custom Fixed Trading Stake</option>
                  </select>
                </div>

                {autopilotStakeMode === 'percent' ? (
                  <div className="space-y-1.5 font-mono text-left">
                    <label className="text-[8.5px] uppercase font-extrabold text-slate-400">Total Account Weight Allocation (%)</label>
                    <div className="flex gap-1.5">
                      <input
                        id="autopilot-stake-percent"
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        value={customStakePercent}
                        onChange={(e) => setCustomStakePercent(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-slate-150 font-mono"
                      />
                      <span className="flex items-center justify-center bg-slate-900 px-2.5 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono">%</span>
                    </div>
                    <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-md p-2 text-[11px] text-emerald-400 leading-tight flex items-start gap-1">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                      <div>
                        Initial Stake Lock: <span className="font-extrabold underline">${(getComputedStake()).toFixed(2)} USD</span> based on synced broker balance.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 font-mono text-left">
                    <label className="text-[8.5px] uppercase font-extrabold text-slate-400">Fixed Session Stake ($ USD)</label>
                    <div className="flex gap-1.5">
                      <input
                        id="autopilot-fixed-stake"
                        type="number"
                        min="0.35"
                        max="500"
                        step="0.05"
                        value={customFixedStake}
                        onChange={(e) => setCustomFixedStake(parseFloat(e.target.value) || 0.35)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-slate-150 font-mono"
                      />
                      <span className="flex items-center justify-center bg-slate-900 px-3 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono">$</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bot Safety Boundaries Block */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono">
                <h3 className="text-[11px] font-bold font-mono text-amber-450 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                  <Shield className="w-3.5 h-3.5 text-amber-500" /> Autonomic Safety Thresholds
                </h3>

                <div className="space-y-1 text-left">
                  <label className="text-[8.5px] uppercase font-extrabold text-slate-400">Session Wins Exit Objective (Target: 2)</label>
                  <input
                    id="autopilot-max-wins"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={customMaxWins}
                    onChange={(e) => setCustomMaxWins(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-slate-150 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Stops and resets scanning when reaching this number of successful wins in a single loop run.</p>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[8.5px] uppercase font-extrabold text-slate-400">Consecutive Losses Halting Streak (Target: 5)</label>
                  <input
                    id="autopilot-max-losses"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={customMaxLosses}
                    onChange={(e) => setCustomMaxLosses(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-slate-150 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Capital Protection: Forces 30-minute cooldown protection lockdown if this consecutive losses limit is hit.</p>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[8.5px] uppercase font-extrabold text-slate-400">Martingale Recovery Weight Factor (Target: 2.0)</label>
                  <input
                    id="autopilot-martingale"
                    type="number"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={customMartingale}
                    onChange={(e) => setCustomMartingale(parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-slate-150 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Martingale factor to recover former spot loss exposures automatically.</p>
                </div>
              </div>

            </div>

            {saveSuccess && (
              <div className="p-2 bg-emerald-955/20 border border-emerald-900/40 text-[11px] text-emerald-400 rounded-lg text-center font-bold">
                ✓ {saveSuccess}
              </div>
            )}

            {saveError && (
              <div className="p-2 bg-rose-950/30 border border-rose-900/60 text-[11px] text-rose-400 rounded-lg text-center font-bold">
                ⚠ {saveError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActivePremiumSubTab('dashboard')}
                className="w-1/3 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all rounded-lg font-mono text-[10.5px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`w-2/3 py-2 ${activeTheme.btnAccent} active:scale-[0.98] transition-all rounded-lg font-mono text-[10.5px] font-black uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5`}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> SAVE PARAMETERS & LOCK
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Autopilot Hero Dashboard Banner details */}
          <div className={`relative rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-black border ${activeTheme.borderMain} shadow-2xl p-4 md:p-5`}>
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(${premiumTheme === 'obsidian-gold' ? '245,158,11' : premiumTheme === 'cyber-pulse' ? '16,185,129' : premiumTheme === 'corporate-platinum' ? '148,163,184' : '139,92,246'},0.05),transparent)] pointer-events-none`} />
            <div className={`absolute top-0 right-0 w-48 h-48 ${premiumTheme === 'obsidian-gold' ? 'bg-amber-500/5' : premiumTheme === 'cyber-pulse' ? 'bg-emerald-500/5' : premiumTheme === 'corporate-platinum' ? 'bg-slate-400/5' : 'bg-violet-500/5'} rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none`} />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${activeTheme.badgeText} text-[10px] font-mono font-bold uppercase tracking-wider mb-2 leading-none select-none`}>
                  <Crown className="w-3 h-3 fill-current animate-pulse" /> Premium VIP Copilot Running
                </span>
                <h2 className="text-base md:text-lg font-black font-sans text-slate-100 uppercase tracking-wide">
                  NexScan IQ <span className={`text-transparent bg-clip-text bg-gradient-to-r ${activeTheme.headingAccent}`}>Premium Autopilot</span>
                </h2>
                <p className="text-[10px] text-slate-400 max-w-xl font-mono mt-1 leading-relaxed">
                  Autopilot scans global feeds concurrently. When key targets match your set parameters (Win Rate &gt;= 60.0% & Score &gt;= 55.0%), the system loads that asset pool instantly.
                </p>

                <div className="mt-3 flex items-center flex-wrap gap-2 text-[10.5px] font-mono">
                  <span className="text-slate-500 uppercase text-[7.5px] tracking-widest font-extrabold font-sans">Session:</span>
                  <span className={`font-extrabold ${activeTheme.textAccent} ${activeTheme.borderColor} bg-slate-950 px-2 py-0.5 rounded leading-none text-[11px]`}>
                    {premiumUsername}
                  </span>
                  <button
                    type="button"
                    onClick={handlePremiumLogout}
                    className="text-[7.5px] font-bold text-rose-450 hover:text-rose-350 bg-rose-955/15 border border-rose-900/40 px-1.5 py-0.5 rounded-md leading-none transition-all hover:scale-102 cursor-pointer uppercase tracking-wider"
                  >
                    Logout Key
                  </button>

                  <div className="ml-2 sm:ml-3 flex gap-1 items-center bg-slate-950/80 p-1 rounded-md border border-slate-855 leading-none shrink-0" title="Quick change style option">
                    <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-widest mr-1 hidden sm:inline-block font-sans">Theme:</span>
                    {[
                      { id: 'obsidian-gold', color: 'bg-amber-500', title: 'Obsidian Gold' },
                      { id: 'cyber-pulse', color: 'bg-emerald-500', title: 'Cyber Pulse' },
                      { id: 'corporate-platinum', color: 'bg-slate-350', title: 'Corporate Platinum' },
                      { id: 'royal-amethyst', color: 'bg-violet-500', title: 'Royal Amethyst' }
                    ].map((themeOpt) => (
                      <button
                        key={themeOpt.id}
                        type="button"
                        onClick={() => applyPremiumTheme(themeOpt.id as any)}
                        title={themeOpt.title}
                        className={`w-3 h-3 rounded-full ${themeOpt.color} transition-all cursor-pointer ${
                          premiumTheme === themeOpt.id ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-950 scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                {autopilotState === 'idle' && (
                  <button
                    type="button"
                    onClick={startAutopilotSurvey}
                    disabled={!account}
                    className={`w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-mono text-[10.5px] font-black uppercase tracking-widest ${activeTheme.btnAccent} active:scale-97 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Launch VIP Autopilot
                  </button>
                )}

                {autopilotState === 'scanning' && (
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
                    {/* Scanning radar indicator */}
                    <div className="bg-slate-955/90 border border-emerald-500/30 px-3.5 py-2 rounded-lg flex items-center justify-center gap-3 min-w-[180px] relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent)] animate-ping" />
                      <Loader2 className="w-4.5 h-4.5 text-emerald-400 animate-spin" />
                      <div className="text-left font-mono">
                        <span className="text-[7.5px] text-slate-505 uppercase block tracking-widest">REAL-TIME SURVEY</span>
                        <span className="text-[11px] font-black text-emerald-400 leading-none uppercase tracking-wide">SCANNING ALL PAIRS</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopAutopilot}
                      className="px-3 py-2 bg-rose-950/15 hover:bg-rose-900/35 border border-rose-905/45 text-rose-450 rounded-lg font-mono text-[8.5px] font-bold uppercase tracking-wider cursor-pointer active:scale-97 transition-all flex items-center justify-center gap-1.5 select-none"
                    >
                      <Square className="w-3 h-3 fill-current" /> Terminate
                    </button>
                  </div>
                )}

                {autopilotState === 'cooldown' && (
                   <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
                    <div className="bg-slate-955/95 border border-rose-500/40 px-3.5 py-2 rounded-lg flex items-center justify-center gap-3 min-w-[180px] shadow-red-500/5 shadow-lg relative">
                      <Flame className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                      <div className="text-left font-mono">
                        <span className="text-[7.5px] text-rose-450 font-extrabold uppercase block tracking-widest">Loss Protection Cooldown</span>
                        <span className="text-xs font-black text-rose-450 leading-none">{formatCountdown(countdown)} Remaining</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopAutopilot}
                      className="px-3 py-2 bg-rose-955/25 hover:bg-rose-900/35 border border-rose-905/45 text-rose-450 rounded-lg font-mono text-[8.5px] font-bold uppercase tracking-wider cursor-pointer active:scale-97 transition-all flex items-center justify-center gap-1.5 select-none"
                    >
                      <Square className="w-3 h-3 fill-current" /> Deactivate
                    </button>
                  </div>
                )}

                {autopilotState === 'countdown_next' && (
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
                    <div className="bg-slate-955/95 border border-amber-500/40 px-3.5 py-2 rounded-lg flex items-center justify-center gap-3 min-w-[180px] shadow-amber-500/10 shadow-lg relative animate-pulse">
                      <Zap className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                      <div className="text-left font-mono">
                        <span className="text-[7.5px] text-amber-450 font-extrabold uppercase block tracking-widest">LOOP COUNTDOWN</span>
                        <span className="text-xs font-black text-amber-400 leading-none">Re-Scanning in {countdown}s</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopAutopilot}
                      className="px-3 py-2 bg-rose-955/25 hover:bg-rose-900/35 border border-rose-905/45 text-rose-450 rounded-lg font-mono text-[8.5px] font-bold uppercase tracking-wider cursor-pointer active:scale-97 transition-all flex items-center justify-center gap-1.5 select-none"
                    >
                      <Square className="w-3 h-3 fill-current" /> Terminate
                    </button>
                  </div>
                )}

                {autopilotState === 'warmup' && (
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
                    <div className="bg-slate-955/95 border border-indigo-500/40 px-3.5 py-2 rounded-lg flex items-center justify-center gap-3 min-w-[180px] shadow-indigo-500/10 shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent)] animate-ping" />
                      <Loader2 className="w-4.5 h-4.5 text-indigo-400 animate-spin" />
                      <div className="text-left font-mono">
                        <span className="text-[7.5px] text-indigo-400 font-extrabold uppercase block tracking-widest">PRE-SCAN WARMUP</span>
                        <span className="text-[11px] font-black text-indigo-300 leading-none">BEGINS IN {formatCountdown(countdown)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopAutopilot}
                      className="px-3 py-2 bg-rose-950/15 hover:bg-rose-900/35 border border-rose-905/45 text-rose-450 rounded-lg font-mono text-[8.5px] font-bold uppercase tracking-wider cursor-pointer active:scale-97 transition-all flex items-center justify-center gap-1.5 select-none"
                    >
                      <Square className="w-3 h-3 fill-current" /> Terminate
                    </button>
                  </div>
                )}

                {autopilotState === 'trading' && (
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
                    <div className="bg-amber-955/20 border border-amber-500/40 px-3.5 py-2 rounded-lg flex items-center justify-center gap-3 min-w-[180px] shadow-amber-500/10 shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent)] animate-ping" />
                      <Activity className="w-4.5 h-4.5 text-amber-400 animate-pulse shrink-0" />
                      <div className="text-left font-mono">
                        <span className="text-[7.5px] text-amber-400 font-extrabold uppercase block tracking-widest text-left">🔥 TRADING IN SESSION</span>
                        <span className="text-[11px] font-black text-slate-100 leading-none block mt-0.5">LOCKED: {targetCandidate || botState.symbol.toUpperCase()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopAutopilot}
                      className="px-3 py-2 bg-rose-950/15 hover:bg-rose-900/35 border border-rose-905/45 text-rose-455 rounded-lg font-mono text-[8.5px] font-bold uppercase tracking-wider cursor-pointer active:scale-97 transition-all flex items-center justify-center gap-1.5 select-none"
                    >
                      <Square className="w-3 h-3 fill-current" /> Terminate
                    </button>
                  </div>
                )}

                {autopilotState === 'no_match' && (
                  <button
                    type="button"
                    onClick={stopAutopilot}
                    className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-955/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/50 hover:border-rose-800 shadow-inner active:scale-97 transition-all cursor-pointer select-none rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> Deactivate Autopilot
                  </button>
                )}
              </div>
            </div>

            {/* Micro Checkpoints Indicator Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-900/90 pt-4 mt-4">
              
              {/* Win Rate Requirement */}
              <div className="bg-slate-950/45 border border-slate-800/60 rounded-lg p-2.5 flex gap-2.5 items-start">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                  (currentBest?.winRate || 0) >= 60.0
                    ? 'bg-emerald-955/20 border-emerald-900/40 text-emerald-400'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                }`}>
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="font-mono">
                  <span className="text-[7.5px] text-slate-505 uppercase block tracking-wider font-extrabold">A: WIN RATE THRESHOLD</span>
                  <span className="text-slate-205 text-[11px] font-bold leading-none mt-0.5 block">
                    {(currentBest?.winRate || 0).toFixed(1)}% / <span className="text-amber-400 font-extrabold">&gt;= 60.0%</span>
                  </span>
                  <span className="text-[7.5px] text-slate-550 block mt-0.5 uppercase font-bold tracking-tight">
                    {(currentBest?.winRate || 0) >= 60.0 ? '✓ MATCHED' : '⏳ SEEKING TARGETS'}
                  </span>
                </div>
              </div>

              {/* Performance Score Requirement */}
              <div className="bg-slate-950/45 border border-slate-800/60 rounded-lg p-2.5 flex gap-2.5 items-start">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                  (currentBest?.score || 0) >= 55.0
                    ? 'bg-emerald-955/20 border-emerald-900/40 text-indigo-400'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                }`}>
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="font-mono">
                  <span className="text-[7.5px] text-slate-505 uppercase block tracking-wider font-extrabold">B: PERF. SCORE TARGET</span>
                  <span className="text-slate-205 text-[11px] font-bold leading-none mt-0.5 block">
                    {(currentBest?.score || 0).toFixed(1)} / <span className="text-amber-400 font-extrabold">&gt;= 55.0</span>
                  </span>
                  <span className="text-[7.5px] text-slate-550 block mt-0.5 uppercase font-bold tracking-tight">
                    {(currentBest?.score || 0) >= 55.0 ? '✓ MATCHED' : '⏳ SEEKING TARGETS'}
                  </span>
                </div>
              </div>

              {/* Status of Sync Broker Account */}
              <div className="bg-slate-950/45 border border-slate-800/60 rounded-lg p-2.5 flex gap-2.5 items-start">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                  account
                    ? 'bg-amber-950/15 border-amber-800/40 text-amber-400'
                    : 'bg-slate-900/40 border-slate-800/80 text-rose-500 font-bold animate-pulse'
                }`}>
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="font-mono">
                  <span className="text-[7.5px] text-slate-505 uppercase block tracking-wider font-extrabold">C: SECURE LINK GATEWAY</span>
                  <span className="text-slate-205 text-[11px] font-bold leading-none mt-0.5 block truncate max-w-[120px]">
                    {account ? account.fullname : 'NOT DETECTED'}
                  </span>
                  <span className="text-[7.5px] text-slate-550 block mt-0.5 uppercase font-bold tracking-tight">
                    {account ? `✓ ID: ${account.loginid}` : '🚨 RESTRICTED'}
                  </span>
                </div>
              </div>

              {/* Status of Automatic Watchdog */}
              <div className="bg-slate-950/45 border border-slate-800/60 rounded-lg p-2.5 flex gap-2.5 items-start">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                  autopilotState === 'trading'
                    ? 'bg-emerald-955/20 border-emerald-900/40 text-emerald-450 animate-pulse'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-550'
                }`}>
                  <Shield className={`w-3.5 h-3.5 ${autopilotState === 'trading' ? 'text-emerald-400 animate-[pulse_1.5s_infinite]' : 'text-slate-500'}`} />
                </div>
                <div className="font-mono">
                  <span className="text-[7.5px] text-slate-505 uppercase block tracking-wider font-extrabold">D: HEALTH WATCHDOG</span>
                  <span className="text-slate-205 text-[11px] font-bold leading-none mt-0.5 block">
                    {watchdogSwapsCount > 0 ? (
                      <span className="text-emerald-400 font-extrabold">{watchdogSwapsCount} HOT-SWAPS</span>
                    ) : (
                      <span>0 SWAPS</span>
                    )} / <span className="text-emerald-400 font-bold">100% AUTO</span>
                  </span>
                  <span className="text-[7.5px] text-slate-550 block mt-0.5 uppercase font-bold tracking-tight">
                    {autopilotState === 'trading' ? '🛡️ GUARDING (<55% WR)' : '⏳ STANDBY'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Autopilot Real-time Active Telemetry & Trades Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 1: Balance & Account Details */}
            <div className="bg-slate-900/60 border border-slate-850 backdrop-blur-md rounded-xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-md bg-emerald-955/20 border border-emerald-900/30 flex items-center justify-center text-emerald-450 font-bold text-xs">
                      $
                    </div>
                    <div className="font-mono text-left leading-none">
                      <h4 className="text-[11px] uppercase font-extrabold text-slate-400 tracking-wider">Broker Capital</h4>
                      <p className="text-[7.5px] text-slate-505 mt-0.5">Live wallet database sync</p>
                    </div>
                  </div>
                  
                  {account ? (
                    <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold font-mono border uppercase tracking-wider ${
                      account.is_virtual 
                        ? 'bg-amber-955/20 text-amber-450 border-amber-800/40' 
                        : 'bg-emerald-955/20 text-emerald-455 border-emerald-800/40'
                    }`}>
                      {account.is_virtual ? 'Virtual' : 'VIP Real'}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[7.5px] font-bold font-mono bg-slate-950 text-slate-600 border border-slate-850">
                      Unlinked
                    </span>
                  )}
                </div>

                <div className="py-1 text-left">
                  {account ? (
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-xl font-black text-slate-100 tracking-tight">
                        {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{account.currency}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-950 border border-dashed border-slate-800 rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <p className="text-[11px] font-mono leading-tight text-slate-400">
                        Please link your Deriv authorization key under credentials controller.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-2 mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Account ID:</span>
                <span className="text-slate-300 font-bold truncate max-w-[125px]">
                  {account ? account.loginid : 'Not Authorized'}
                </span>
              </div>
            </div>

            {/* Card 2 & 3: Active Trade Stream Monitoring */}
            <div className="bg-slate-900/60 border border-slate-850 backdrop-blur-md rounded-xl p-3.5 lg:col-span-2 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                      botState.isRunning 
                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-400 font-bold animate-pulse'
                        : 'bg-slate-955 border border-slate-850 text-slate-500'
                    }`}>
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left font-mono">
                      <h4 className="text-[11px] uppercase font-bold text-slate-300 tracking-wider">Automated Execution Monitor</h4>
                      <p className="text-[7.5px] text-slate-505 mt-0.5">
                        {botState.isRunning ? `Managing active trade on ${botState.symbol.toUpperCase()}` : 'System scanner in idle standby'}
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase border tracking-wider leading-none select-none ${
                    botState.isRunning
                      ? 'bg-amber-955/20 text-amber-400 border-amber-500/30 animate-pulse'
                      : 'bg-slate-950 text-slate-550 border-slate-850'
                  }`}>
                    {botState.isRunning && <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />}
                    STATUS: {botState.isRunning ? 'Trading' : 'Standby'}
                  </span>
                </div>

                {/* Sub stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/50 rounded-lg p-2 border border-slate-800/60">
                  <div className="font-mono text-left">
                    <span className="text-[7.5px] text-slate-505 uppercase tracking-wide block font-extrabold">Active Stake</span>
                    <span className="text-[11px] font-bold text-slate-200 mt-0.5 block font-sans">
                      ${botState.currentStake.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="font-mono text-left">
                    <span className="text-[7.5px] text-slate-505 uppercase tracking-wide block font-extrabold">Win / Loss</span>
                    <span className="text-[11px] font-bold text-slate-205 mt-0.5 block flex items-center gap-0.5">
                      <span className="text-emerald-400 font-extrabold">{botState.wins}W</span> 
                      <span className="text-slate-655">/</span> 
                      <span className="text-rose-400 font-extrabold">{botState.losses}L</span>
                    </span>
                  </div>

                  <div className="font-mono text-left">
                    <span className="text-[7.5px] text-slate-505 uppercase tracking-wide block font-extrabold">Net Profit</span>
                    <span className={`text-[11px] font-black mt-0.5 block ${
                      botState.profit > 0 ? 'text-emerald-400' : botState.profit < 0 ? 'text-rose-455' : 'text-slate-400'
                    }`}>
                      {botState.profit >= 0 ? '+' : ''}${botState.profit.toFixed(2)}
                    </span>
                  </div>

                  <div className="font-mono text-left">
                    <span className="text-[7.5px] text-slate-505 uppercase tracking-wide block font-extrabold">Streak Cap</span>
                    <span className={`text-[11px] font-bold mt-0.5 block ${
                      botState.consecutiveLosses > 0 ? 'text-amber-500' : 'text-slate-500'
                    }`}>
                      {botState.consecutiveLosses} / {botConfig.maxLosses}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick trade event output */}
              <div className="border-t border-slate-805/50 pt-2 mt-2 text-left">
                <div className="flex justify-between items-center text-[7.5px] tracking-wider text-slate-505 uppercase font-extrabold mb-0.5 font-mono">
                  <span>Stream Activity Tracer</span>
                  <button
                    type="button"
                    onClick={() => setShowPremiumConsole(true)}
                    className="text-amber-550 hover:text-amber-450 font-extrabold uppercase tracking-wider text-[7.5px] cursor-pointer flex items-center gap-0.5 transition-all bg-transparent border-0 outline-none p-0 select-none animate-pulse"
                  >
                    <Terminal className="w-2 h-2 text-amber-500" /> Maximize Console
                  </button>
                </div>
                <div className="h-4.5 overflow-hidden font-mono text-[8.5px]">
                  {logs.filter(l => l.type === 'trade' || l.type === 'success' || l.type === 'error').slice(0, 1).map((log) => (
                    <div key={log.id} className="flex gap-1.5 items-center text-slate-350">
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                        log.type === 'success' ? 'bg-emerald-400' : log.type === 'error' ? 'bg-rose-500' : 'bg-amber-400'
                      }`} />
                      <span className="text-slate-500 text-[7.5px]">[{log.timestamp}]</span>
                      <span className="text-slate-300 truncate font-semibold">{log.message}</span>
                    </div>
                  )).length > 0 ? (
                    logs.filter(l => l.type === 'trade' || l.type === 'success' || l.type === 'error').slice(0, 1).map((log) => (
                      <div key={log.id} className="flex gap-1.5 items-center text-slate-350">
                        <span className={`shrink-0 w-1 h-1 rounded-full ${
                          log.type === 'success' ? 'bg-emerald-500' : log.type === 'error' ? 'bg-rose-550' : 'bg-amber-400'
                        }`} />
                        <span className="text-slate-550 text-[7.5px] shrink-0">[{log.timestamp}]</span>
                        <span className="text-slate-305 truncate font-semibold leading-none">{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-600 italic">Autopilot waiting for trade trigger events on selected pair...</span>
                  )}
                </div>
              </div>
            </div>
            
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            <div className="lg:col-span-1 space-y-4">
              {/* Credentials Section */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <h3 className="text-[11px] font-black text-slate-205 uppercase tracking-widest font-sans leading-none">Broker Verification</h3>
                </div>

                {account ? (
                  <div className="space-y-3 font-mono text-[11px] text-slate-400">
                    <p className="text-[10px] leading-relaxed">Your Deriv brokerage account is mapped securely into the NexScan premium server cloud context.</p>
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-850 text-left">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-extrabold tracking-wider leading-none">Authorized Profile</span>
                      <span className="text-slate-200 font-extrabold block text-[11px] truncate mt-1 leading-none">{account.fullname}</span>
                      <span className="text-[10px] text-slate-500 block mt-1 leading-none">ID: {account.loginid} • Currency: {account.currency}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePremiumDisconnect}
                      className="w-full text-center py-2 bg-slate-950 hover:bg-slate-900/60 text-slate-400 hover:text-rose-450 border border-slate-850 hover:border-rose-950/40 rounded-lg cursor-pointer text-[11px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Disconnect Ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePremiumAuth} className="space-y-2.5 font-mono">
                    <p className="text-[11px] text-slate-505 leading-normal">
                      Authorize your live account using an active Deriv Trading API token with Read and Trade rights.
                    </p>
                    <input
                      type="password"
                      placeholder="Paste Auth Token Key..."
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 focus:outline-none px-2.5 py-1.5 rounded-lg font-mono text-xs text-slate-200 placeholder:text-slate-705 transition-colors"
                      required
                    />

                    {error && (
                      <p className="text-[11px] text-rose-455 font-mono flex items-start gap-1 leading-tight">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-slate-805 hover:bg-slate-755 text-slate-300 hover:text-white rounded-lg text-[11px] uppercase tracking-widest font-extrabold cursor-pointer border border-transparent hover:border-amber-500/30 transition-all flex items-center justify-center gap-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Link Loading...
                        </>
                      ) : (
                        'LINK BROKER API KEY'
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Recent Autopilot Trades History */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3 font-mono text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-500" />
                    <h3 className="text-[11px] font-black text-slate-200 uppercase tracking-widest font-sans leading-none">Autopilot History</h3>
                  </div>
                  {autopilotTrades.length > 0 && (
                    <span className="text-[7.5px] font-black tracking-widest bg-emerald-955/20 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded leading-none select-none">
                      {autopilotTrades.length} TRADES
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto divide-y divide-slate-900/60 scrollbar-none pr-0.5">
                  {autopilotTrades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 select-none">
                      <History className="w-6 h-6 mb-1.5 opacity-30 animate-pulse text-slate-500" />
                      <p className="text-[11px] leading-relaxed max-w-[150px]">
                        No premium autopilot trades logged on this profile yet.
                      </p>
                    </div>
                  ) : (
                    autopilotTrades.map((trade) => {
                      const originalSym = SYMBOLS.find(s => s.id === trade.symbol);
                      const isWin = trade.outcome === 'win';
                      const displaySym = originalSym ? originalSym.short : trade.symbol.split('_').pop();
                      const formattedTime = new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return (
                        <div key={trade.id} className="pt-2 first:pt-0 pb-1.5 flex items-center justify-between text-[11px] text-slate-300">
                          <div className="flex items-center gap-1.5 text-left min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWin ? 'bg-emerald-400' : 'bg-rose-550'}`} />
                            <div className="leading-none text-left min-w-0">
                              <span className="font-extrabold text-slate-200 block truncate">{displaySym}</span>
                              <span className="text-[7.5px] text-slate-500 block mt-0.5">{formattedTime}</span>
                            </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-1.5 shrink-0">
                            <span className="text-[7.5px] text-slate-550">Stk: ${trade.stake.toFixed(2)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${
                              isWin ? 'bg-emerald-950/40 text-emerald-450 border-emerald-900/30' : 'bg-rose-950/40 text-rose-455 border-rose-900/30'
                            }`}>
                              {isWin ? `+$${trade.profit.toFixed(2)}` : `-$${Math.abs(trade.profit).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {autopilotTrades.length > 0 && (
                  <div className="border-t border-slate-900 pt-2 mt-2 flex justify-between items-center text-[8.5px] font-black tracking-wider text-slate-505 uppercase">
                    <span>Session PL:</span>
                    <span className={`font-black text-[10px] ${
                      autopilotTrades.reduce((acc, t) => acc + t.profit, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ${autopilotTrades.reduce((acc, t) => acc + t.profit, 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* Candidate Pipeline list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900/60 border border-slate-800/85 backdrop-blur-md rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-sans">
                      Autopilot Leaderboard Grid
                    </h3>
                  </div>
                  <span className="inline-block text-[10px] font-mono font-bold text-slate-500 border border-slate-800/60 px-2 py-0.5 rounded bg-slate-950 tracking-widest uppercase">
                    WIN RATE &gt;= 60% • SCORE &gt;= 55%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {rankedCandidates.slice(0, 6).map((item, index) => {
                    const colorAccent = getVolColor(item.info.vol);
                    const meetsCriteria = item.winRate !== null && item.winRate >= 60.0 && item.score >= 55.0;

                    return (
                      <div
                        key={item.info.id}
                        className={`rounded-lg bg-slate-955 border p-2.5 font-mono transition-all duration-300 relative overflow-hidden flex flex-col justify-between group ${
                          meetsCriteria 
                            ? 'border-amber-500/20 bg-amber-955/10 shadow shadow-amber-500/5 hover:border-amber-500/40' 
                            : 'border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{ backgroundColor: colorAccent }} />
                        
                        <div className="flex justify-between items-start pl-1">
                          <div className="leading-none text-left">
                            <div className="flex items-baseline gap-1">
                              <span className="font-extrabold text-[11px] text-slate-205">{item.info.short}</span>
                              <span className="text-[7px] text-slate-500 font-medium truncate max-w-[110px]" title={item.info.name}>({item.info.name})</span>
                            </div>
                            <span className="text-[7.5px] text-slate-505 uppercase tracking-wide block mt-1 font-bold">
                              RANKED POSITION: {index + 1}
                            </span>
                          </div>

                          {meetsCriteria ? (
                            <span className="text-[7px] font-black px-1 py-0.5 rounded bg-emerald-955/40 text-emerald-400 border border-emerald-900/45 tracking-wider leading-none select-none">
                              QUALIFIED
                            </span>
                          ) : (
                            <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-850 tracking-wider leading-none select-none">
                              MONITOR
                            </span>
                          )}
                        </div>

                        {/* Stats indicator row */}
                        <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-slate-900/50 pl-1">
                          <div>
                            <span className="text-[7px] text-slate-655 font-extrabold block uppercase tracking-wider">Win Rate</span>
                            <span className={`text-[10.5px] font-extrabold block mt-0.5 ${item.winRate !== null && item.winRate >= 60.0 ? 'text-emerald-450 font-black' : 'text-slate-400'}`}>
                              {item.winRate !== null ? `${item.winRate.toFixed(1)}%` : '—'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[7px] text-slate-655 font-extrabold block uppercase tracking-wider">Score</span>
                            <span className={`text-[10.5px] font-extrabold block mt-0.5 ${item.score >= 55.0 ? 'text-indigo-400 font-black' : 'text-slate-400'}`}>
                              {item.score > -1 ? item.score.toFixed(1) : '—'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[7px] text-slate-655 font-extrabold block uppercase tracking-wider">Sigs/Ticks</span>
                            <span className="text-[10px] font-semibold text-slate-300 block mt-0.5">
                              {item.signals} <span className="text-slate-600 text-[7.5px]">({item.ticks})</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-850 flex gap-2.5 text-[10px] leading-relaxed text-slate-400 font-mono text-left">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold text-slate-200">Continuous Assessment Logic Matrix:</span>
                    <p className="mt-0.5 font-normal">
                      Candidates must pass strict criteria thresholds dynamically. If no pair passes the target criteria metrics, the autopilot keeps scanning the live markets indefinitely.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </>
      )}

      {/* Floating Action/Console Button for Premium Autopilot (Sticky at the bottom right corner of page) */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <button
          onClick={() => setShowPremiumConsole(true)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-500 border border-slate-800 hover:border-amber-500 hover:text-amber-450 transition-all shadow-2xl active:scale-95 cursor-pointer group relative"
          title="Open Autopilot Radar & Trades Console"
        >
          <Terminal className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {autopilotState !== 'idle' && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Slide-in Premium Terminal Drawer Overlay */}
      {showPremiumConsole && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          {/* Backdrop trigger click close */}
          <div className="absolute inset-0 cursor-default" onClick={() => setShowPremiumConsole(false)} />
          
          {/* Floating Drawer Container */}
          <div className="relative w-full max-w-lg bg-slate-950 border-l border-slate-850 h-full flex flex-col p-6 shadow-2xl z-10 transition-all">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                <h3 className="font-mono text-xs font-black text-slate-205">AUTOPILOT CONTROL CONSOLE</h3>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded leading-none border border-slate-850">
                  <span className={`w-1.5 h-1.5 rounded-full ${autopilotState !== 'idle' ? 'bg-amber-400 animate-pulse' : 'bg-slate-705'}`} />
                  {autopilotState !== 'idle' ? 'AUTOPILOT ON' : 'STANDBY'}
                </span>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowPremiumConsole(false)}
                  title="Close activity terminal"
                  className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-slate-100 rounded-lg cursor-pointer font-bold font-mono text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Dev Terminal logs/history view in drawer */}
            <div className="flex-1 flex flex-col justify-between space-y-4 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2 shrink-0">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTerminalTab('logs')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                      terminalTab === 'logs'
                        ? 'bg-amber-550/15 text-amber-450 border border-amber-550/35'
                        : 'text-slate-505 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 shrink-0" /> Radar Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerminalTab('history')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer flex items-center gap-2 select-none relative ${
                      terminalTab === 'history'
                        ? 'bg-amber-550/15 text-amber-450 border border-amber-550/35'
                        : 'text-slate-505 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    Auto Trades
                    {autopilotTrades.length > 0 && (
                      <span className="bg-amber-550 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 leading-none">
                        {autopilotTrades.length}
                      </span>
                    )}
                  </button>
                </div>
                {terminalTab === 'history' && autopilotTrades.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAutopilotTrades([]);
                      localStorage.removeItem('mamba_premium_autopilot_trades');
                      addPremiumLog('🗑️ RESET: Autopilot trade history tracker cleared.');
                    }}
                    className="text-[11px] font-black uppercase text-slate-500 hover:text-rose-455 transition-colors cursor-pointer tracking-wider"
                  >
                    Clear History
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                {terminalTab === 'logs' ? (
                  <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-850 overflow-y-auto font-mono text-[10px] text-amber-450/90 divide-y divide-slate-900/50 leading-relaxed scrollbar-none text-left">
                    {premiumLogs.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-slate-600 italic">
                        <span>Waiting to receive scanner feedback updates...</span>
                      </div>
                    ) : (
                      premiumLogs.map((item, idx) => (
                        <div key={idx} className="py-2 first:pt-0 last:pb-0 break-all leading-normal text-left">
                          {item}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-850 overflow-y-auto font-mono leading-relaxed scrollbar-none flex flex-col justify-between text-left">
                    <div className="space-y-2.5 divide-y divide-slate-900/60 overflow-y-auto grow pr-0.5">
                      {autopilotTrades.length === 0 ? (
                        <div className="flex h-full min-h-[250px] items-center justify-center text-slate-600 italic text-[10px] text-center w-full">
                          <span>No trades during current scans.</span>
                        </div>
                      ) : (
                        autopilotTrades.map((trade) => {
                          const originalSym = SYMBOLS.find(s => s.id === trade.symbol);
                          const isWin = trade.outcome === 'win';
                          const displaySym = originalSym ? originalSym.short : trade.symbol.split('_').pop();
                          const formattedTime = new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                          return (
                            <div key={trade.id} className="pt-2.5 first:pt-0 pb-2 flex items-center justify-between text-[10px] text-slate-300">
                              <div className="flex items-center gap-2.5 text-left shrink-0">
                                <span className={`w-2 h-2 rounded-full ${isWin ? 'bg-emerald-400' : 'bg-rose-550'}`} />
                                <div className="leading-none text-left">
                                  <span className="font-extrabold text-slate-200 block text-left">{displaySym}</span>
                                  <span className="text-[10px] text-slate-500 block mt-1 text-left">{formattedTime}</span>
                                </div>
                              </div>
                              
                              <div className="text-right flex items-center gap-2.5 shrink-0">
                                <span className="text-[10px] text-slate-500">Stk: ${trade.stake.toFixed(2)}</span>
                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-black tracking-wider uppercase ${
                                  isWin ? 'bg-emerald-950/45 text-emerald-455 border border-emerald-900/40' : 'bg-rose-950/45 text-rose-455 border border-rose-900/40'
                                }`}>
                                  {isWin ? `+$${trade.profit.toFixed(2)}` : `-$${Math.abs(trade.profit).toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {autopilotTrades.length > 0 && (
                      <div className="border-t border-slate-900 pt-3 shrink-0 text-left mt-3">
                        <div className="flex justify-between text-[11px] font-black tracking-wider text-slate-500 uppercase">
                          <span>Session Total Profit / Loss</span>
                          <span className={`font-black text-xs ${
                            autopilotTrades.reduce((acc, t) => acc + t.profit, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            P/L: ${autopilotTrades.reduce((acc, t) => acc + t.profit, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 mt-4 text-center text-[11px] font-mono text-slate-650 select-none shrink-0">
              Autopilot Tracker • Verified safe token co-routing
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
