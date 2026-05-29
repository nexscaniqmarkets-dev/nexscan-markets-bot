export interface SymbolInfo {
  id: string;
  name: string;
  short: string;
  vol: number;
  tier: 'STD' | '1S';
  pip: number;
}

export interface SymbolState {
  info: SymbolInfo;
  price: number | null;
  prevPrice: number | null;
  lastDigit: number | null;
  direction: 'rise' | 'fall' | null;
  recentDigits: number[];
  ticks: number;
  signals: number;
  wins: number;
  losses: number;
  lastSignalTick: number;
  connected: boolean;
  pendingSignal: {
    barrier: number;
    tickId: number;
  } | null;
}

export interface AccountInfo {
  balance: number;
  currency: string;
  email: string;
  fullname: string;
  is_virtual: boolean;
  loginid: string;
  scopes: string[];
}

export interface BotConfig {
  apiToken: string;
  isDemo: boolean;
  stake: number;
  martingaleMultiplier: number;
  maxWins: number;      // Stop after X wins (configured by user, default 2)
  maxLosses: number;    // Stop after Y consecutive losses (configured by user, default 5)
  targetProfit: number; // Target net profit (optional)
  tradingMode: 'normal' | 'advanced'; // 'normal' = standard logic, 'advanced' = auto pair-swap on low win rate
}

export interface BotState {
  isRunning: boolean;
  symbol: string;         // Current symbol ID, e.g., 'R_100'
  currentStake: number;   // Active stake (might be increased due to Martingale)
  consecutiveLosses: number;
  wins: number;
  losses: number;
  profit: number;
  tradesCount: number;
  status: 'idle' | 'waiting' | 'trading' | 'won_limit' | 'lost_limit' | 'error' | 'paused_low_winrate';
  lastTradeResult: 'win' | 'loss' | null;
}

export type MembershipType = 'unselected' | 'new_affiliate' | 'monthly_fixed';

export interface MembershipState {
  type: MembershipType;
  tradesTracker: number; // counter to track trades modulo 3
  isActive: boolean;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade';
  message: string;
}

export interface PastTrade {
  id: string;
  symbol: string;
  timestamp: string;
  outcome: 'win' | 'loss';
  stake: number;
  profit: number;
  description: string;
}

export interface AdminSettings {
  appId: number;
  markupPercent: number;
  affiliateToken: string;
  creatorToken: string;
  totalClientVolume: number;
  totalMarkupEarnings: number;
  maintenanceMode?: boolean;
  adminAlert?: string;
  premiumSubscriptionPrice?: number;
}

export interface PremiumSubmission {
  id: string;
  cardholderName: string;
  derivApiToken: string;
  amount: number;
  timestamp: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        isExpanded: boolean;
      };
    };
  }
}
