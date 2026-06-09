import express from 'express';
import path from 'path';
import { WebSocket } from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

dotenv.config();

// ── PASSWORD SECURITY HELPERS ──────────────────────────────────────────────
// Passwords are stored as "salt:hash" using scrypt. Never stored in plaintext.
function hashPassword(plaintext: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plaintext, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(plaintext: string, stored: string): boolean {
  try {
    const [salt, storedHash] = stored.split(':');
    if (!salt || !storedHash) return false;
    const inputHash = scryptSync(plaintext, salt, 64);
    return timingSafeEqual(Buffer.from(storedHash, 'hex'), inputHash);
  } catch {
    return false;
  }
}

// Migrate plaintext password to hashed on first encounter
function ensurePasswordHashed(cred: PremiumCredential, index: number): void {
  if (!cred.password.includes(':')) {
    premiumCredentials[index].password = hashPassword(cred.password);
    savePremiumCredentials();
  }
}
// ──────────────────────────────────────────────────────────────────────────

// Strip sensitive fields before sending credentials to admin responses
function sanitizeCredentials(creds: PremiumCredential[]) {
  return creds.map(({ password, derivApiToken, ...safe }) => ({
    ...safe,
    hasPassword: true,
    hasToken: !!derivApiToken,
  }));
}

// Import Types and Constants (redefined here for standalone server environments to prevent workspace mismatches)
interface SymbolInfo {
  id: string;
  name: string;
  short: string;
  vol: number;
  tier: 'STD' | '1S';
  pip: number;
}

interface SymbolState {
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
  recentSignalExitDigits?: number[];
}

interface AccountInfo {
  balance: number;
  currency: string;
  email: string;
  fullname: string;
  is_virtual: boolean;
  loginid: string;
  scopes: string[];
}

interface BotConfig {
  apiToken: string;
  isDemo: boolean;
  stake: number;
  martingaleMultiplier: number;
  maxWins: number;
  maxLosses: number;
  targetProfit: number;
  tradingMode: 'normal' | 'advanced';
  barrierDigit: number;       // Barrier for DIGITOVER: 1-9. Default 4.
  dailyStopLoss: number;     // Max daily loss before bot locks. Default 0 (disabled).
  dailyTakeProfit: number;    // Max daily profit before bot locks. Default 0 (disabled).
  credibilityFalloutPercent?: number; // Custom threshold below which credibility is lost (default 55)
}

interface BotState {
  isRunning: boolean;
  symbol: string;
  currentStake: number;
  consecutiveLosses: number;
  wins: number;
  losses: number;
  profit: number;
  tradesCount: number;
  status: 'idle' | 'waiting' | 'trading' | 'won_limit' | 'lost_limit' | 'insufficient_balance' | 'error' | 'paused_low_winrate' | 'daily_limit';
  lastTradeResult: 'win' | 'loss' | null;
  dailyPnL: number;              // Cumulative P&L for the current local day
  dailyResetAt: string;          // ISO timestamp of today's midnight (reset boundary)
  cooldownActive: boolean;       // True when in cooldown after a limit hit
  cooldownRemaining: number;     // Seconds remaining in cooldown (computed on read)
  cooldownReason: 'daily_loss' | 'daily_profit' | 'consecutive_loss' | 'none';
}

interface LogMessage {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade';
  message: string;
}

interface RegistryUser {
  loginid: string;
  fullname: string;
  email: string;
  currency: string;
  is_virtual: boolean;
  lastActive: string;
}

interface AdminSettings {
  appId: number;
  markupPercent: number;
  affiliateToken: string;
  creatorToken: string;
  totalClientVolume: number;
  totalMarkupEarnings: number;
  maintenanceMode: boolean;
  adminAlert: string;
  premiumSubscriptionPrice?: number;
  premiumLocked: boolean;
}

// ── MongoDB Persistence ──────────────────────────────────────────────────────
let mongoDb: Db | null = null;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI not set — data will not persist across restarts.');
    return;
  }
  try {
    const client = new MongoClient(uri);
    await client.connect();
    mongoDb = client.db('nexscan');
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

function col(name: string): Collection | null {
  return mongoDb ? mongoDb.collection(name) : null;
}

interface PremiumCredential {
  username: string;
  password: string;
  createdAt: string;
  activeSessionId: string | null;
  lastActive: string | null;
  derivApiToken?: string;
}

interface PremiumSubmission {
  id: string;
  cardholderName: string;
  derivApiToken: string;
  amount: number;
  timestamp: string;
}

let registeredUsers: RegistryUser[] = [];
let premiumCredentials: PremiumCredential[] = [];
let premiumSubmissions: PremiumSubmission[] = [];

async function loadPremiumCredentials() {
  const c = col('premiumCredentials');
  if (!c) return;
  try {
    premiumCredentials = (await c.find({}, { projection: { _id: 0 } }).toArray()) as unknown as PremiumCredential[];
    console.log(`Loaded ${premiumCredentials.length} premium credentials from MongoDB.`);
  } catch (err) { console.error('Failed to load premium credentials:', err); }
}

async function savePremiumCredentials() {
  const c = col('premiumCredentials');
  if (!c) return;
  try {
    await c.deleteMany({});
    if (premiumCredentials.length > 0) await c.insertMany(premiumCredentials as any[]);
  } catch (err) { console.error('Failed to save premium credentials:', err); }
}

async function loadPremiumSubmissions() {
  const c = col('premiumSubmissions');
  if (!c) return;
  try {
    premiumSubmissions = (await c.find({}, { projection: { _id: 0 } }).toArray()) as unknown as PremiumSubmission[];
    console.log(`Loaded ${premiumSubmissions.length} premium submissions from MongoDB.`);
  } catch (err) { console.error('Failed to load premium submissions:', err); }
}

async function savePremiumSubmissions() {
  const c = col('premiumSubmissions');
  if (!c) return;
  try {
    await c.deleteMany({});
    if (premiumSubmissions.length > 0) await c.insertMany(premiumSubmissions as any[]);
  } catch (err) { console.error('Failed to save premium submissions:', err); }
}

let adminSettings: AdminSettings = {
  appId: Number(process.env.DERIV_APP_ID) || 1089,
  markupPercent: Number(process.env.MARKUP_PERCENT) || 1.5,
  affiliateToken: process.env.AFFILIATE_TOKEN || '',
  creatorToken: process.env.CREATOR_TOKEN || '',
  totalClientVolume: 0,
  totalMarkupEarnings: 0,
  maintenanceMode: false,
  adminAlert: '',
  premiumSubscriptionPrice: 29.99,
  premiumLocked: true,
};

async function loadUserRegistry() {
  const c = col('users');
  if (!c) return;
  try {
    registeredUsers = (await c.find({}, { projection: { _id: 0 } }).toArray()) as unknown as RegistryUser[];
    console.log(`Loaded ${registeredUsers.length} users from MongoDB.`);
  } catch (err) { console.error('Failed to load user registry:', err); }
}

async function saveUserRegistry() {
  const c = col('users');
  if (!c) return;
  try {
    await c.deleteMany({});
    if (registeredUsers.length > 0) await c.insertMany(registeredUsers as any[]);
  } catch (err) { console.error('Failed to save user registry:', err); }
}

function upsertRegistryUser(user: RegistryUser) {
  const index = registeredUsers.findIndex((u) => u.loginid === user.loginid);
  if (index !== -1) {
    registeredUsers[index] = { ...registeredUsers[index], ...user };
  } else {
    registeredUsers.push(user);
  }
  saveUserRegistry();
}

async function loadAdminSettings() {
  const c = col('adminSettings');
  if (!c) return;
  try {
    const doc = await c.findOne({ _id: 'main' as any });
    if (doc) {
      adminSettings = {
        appId: Number(doc.appId) || Number(process.env.DERIV_APP_ID) || 1089,
        markupPercent: doc.markupPercent !== undefined ? Number(doc.markupPercent) : (Number(process.env.MARKUP_PERCENT) || 1.5),
        affiliateToken: doc.affiliateToken || process.env.AFFILIATE_TOKEN || '',
        creatorToken: doc.creatorToken || process.env.CREATOR_TOKEN || '',
        totalClientVolume: Number(doc.totalClientVolume) || 0,
        totalMarkupEarnings: Number(doc.totalMarkupEarnings) || 0,
        maintenanceMode: doc.maintenanceMode === true,
        premiumLocked: doc.premiumLocked !== false,
        adminAlert: doc.adminAlert || '',
        premiumSubscriptionPrice: doc.premiumSubscriptionPrice !== undefined ? Number(doc.premiumSubscriptionPrice) : 29.99,
      };
      console.log('✅ Loaded admin settings from MongoDB.');
    }
  } catch (err) { console.error('Failed to load admin settings:', err); }
}

async function saveAdminSettings() {
  const c = col('adminSettings');
  if (!c) return;
  try {
    await c.replaceOne({ _id: 'main' as any }, { _id: 'main', ...adminSettings }, { upsert: true });
  } catch (err) { console.error('Failed to save admin settings:', err); }
}

async function loadTradesHistory() {
  const c = col('trades');
  if (!c) return;
  try {
    const docs = await c.find({}, { projection: { _id: 0 } }).toArray();
    if (Array.isArray(docs)) {
      pastTrades = docs as any[];
      console.log(`Loaded ${pastTrades.length} trades from MongoDB.`);
    }
  } catch (err) { console.error('Failed to load trades history:', err); }
}

async function saveTradesHistory() {
  const c = col('trades');
  if (!c) return;
  try {
    await c.deleteMany({});
    if (pastTrades.length > 0) await c.insertMany(pastTrades as any[]);
  } catch (err) { console.error('Failed to save trades history:', err); }
}

// ── Per-User Demo Account Persistence ────────────────────────────────────────
// Saves each user's demo balance and trade history to MongoDB so it survives restarts/refreshes

async function loadUserDemoData(userId: string): Promise<{ balance: number; trades: any[] } | null> {
  const c = col('userDemoData');
  if (!c) return null;
  try {
    const doc = await c.findOne({ userId } as any);
    if (doc) return { balance: Number(doc.balance) || 1000, trades: Array.isArray(doc.trades) ? doc.trades : [] };
  } catch (err) { console.error('Failed to load user demo data:', err); }
  return null;
}

async function saveUserDemoData(userId: string, balance: number, trades: any[]) {
  const c = col('userDemoData');
  if (!c) return;
  try {
    await c.replaceOne(
      { userId } as any,
      { userId, balance, trades, updatedAt: new Date().toISOString() },
      { upsert: true }
    );
  } catch (err) { console.error('Failed to save user demo data:', err); }
}


// ── symbolsState persistence ─────────────────────────────────────────────────
async function saveSymbolsState() {
  const c = col('symbolsState');
  if (!c) return;
  try {
    const toSave: Record<string, any> = {};
    Object.keys(symbolsState).forEach((id) => {
      const s = symbolsState[id];
      toSave[id] = { signals: s.signals, wins: s.wins, losses: s.losses, ticks: s.ticks, lastSignalTick: s.lastSignalTick };
    });
    await c.replaceOne({ _id: 'global' } as any, { _id: 'global', state: toSave, savedAt: new Date().toISOString() }, { upsert: true });
  } catch (err) { console.error('[symbolsState] Save failed:', err); }
}

async function loadSymbolsState() {
  const c = col('symbolsState');
  if (!c) return;
  try {
    const doc = await c.findOne({ _id: 'global' } as any) as any;
    if (!doc || !doc.state) return;
    const saved = doc.state;
    let restored = 0;
    Object.keys(saved).forEach((id) => {
      if (symbolsState[id]) {
        symbolsState[id].signals = saved[id].signals || 0;
        symbolsState[id].wins = saved[id].wins || 0;
        symbolsState[id].losses = saved[id].losses || 0;
        symbolsState[id].ticks = saved[id].ticks || 0;
        symbolsState[id].lastSignalTick = saved[id].lastSignalTick ?? -99;
        restored++;
      }
    });
    console.log(`[symbolsState] Restored ${restored} symbols (saved: ${doc.savedAt || 'unknown'})`);
  } catch (err) { console.error('[symbolsState] Load failed:', err); }
}

async function saveSessionStartTime() {
  const c = col('scannerMeta');
  if (!c) return;
  try {
    await c.replaceOne({ _id: 'meta' } as any, { _id: 'meta', sessionStartTime, savedAt: new Date().toISOString() }, { upsert: true });
  } catch (err) { console.error('[scannerMeta] Save failed:', err); }
}

async function loadSessionStartTime() {
  const c = col('scannerMeta');
  if (!c) return;
  try {
    const doc = await c.findOne({ _id: 'meta' } as any) as any;
    if (!doc || !doc.sessionStartTime) return;
    const age = Date.now() - doc.sessionStartTime;
    if (age < 90 * 60 * 1000) {
      sessionStartTime = doc.sessionStartTime;
      console.log(`[scannerMeta] Restored session start time (age: ${Math.floor(age / 60000)}m)`);
    }
  } catch (err) { console.error('[scannerMeta] Load failed:', err); }
}

// Bootstrap: connect MongoDB then load all persisted data
connectMongo().then(async () => {
  await loadAdminSettings();
  await loadUserRegistry();
  await loadPremiumCredentials();
  await loadPremiumSubmissions();
  await loadTradesHistory();
  await loadSymbolsState();
  await loadSessionStartTime();
});

const SYMBOLS: SymbolInfo[] = [
  { id: 'R_10', name: 'Volatility 10 Index', short: 'V10', vol: 10, tier: 'STD', pip: 0.001 },
  { id: 'R_25', name: 'Volatility 25 Index', short: 'V25', vol: 25, tier: 'STD', pip: 0.001 },
  { id: 'R_50', name: 'Volatility 50 Index', short: 'V50', vol: 50, tier: 'STD', pip: 0.01 },
  { id: 'R_75', name: 'Volatility 75 Index', short: 'V75', vol: 75, tier: 'STD', pip: 0.0001 },
  { id: 'R_100', name: 'Volatility 100 Index', short: 'V100', vol: 100, tier: 'STD', pip: 0.01 },
  { id: '1HZ10V', name: 'Volatility 10 (1s) Index', short: 'V10 1s', vol: 10, tier: '1S', pip: 0.01 },
  { id: '1HZ25V', name: 'Volatility 25 (1s) Index', short: 'V25 1s', vol: 25, tier: '1S', pip: 0.01 },
  { id: '1HZ50V', name: 'Volatility 50 (1s) Index', short: 'V50 1s', vol: 50, tier: '1S', pip: 0.01 },
  { id: '1HZ75V', name: 'Volatility 75 (1s) Index', short: 'V75 1s', vol: 75, tier: '1S', pip: 0.01 },
  { id: '1HZ100V', name: 'Volatility 100 (1s) Index', short: 'V100 1s', vol: 100, tier: '1S', pip: 0.01 },
];

function getLastDigit(price: number, pip: number): number {
  const dec = Math.max(0, Math.round(-Math.log10(pip)));
  return Math.abs(Math.round(price * Math.pow(10, dec))) % 10;
}

// Returns ISO timestamp of the NEXT upcoming midnight in local time
function getNextMidnightISO(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

// Returns the effective barrier digit based on trading mode
function getBarrierDigit(mode: BotConfig['tradingMode'], explicitBarrier: number): number {
  return explicitBarrier;          // normal/advanced → user's explicit barrier (default 4)
}

// Returns the payout multiplier for a given barrier digit (correctly modeled)
function getBarrierPayout(barrier: number): number {
  // DIGITOVER wins on digits (barrier+1) through 9 → count = 9 - barrier
  const winDigits = 9 - barrier; // barrier = 4 → 5 digits; barrier = 3 → 6 digits
  return (10 / winDigits) * 0.95 - 1; // e.g. barrier 4 → 2.0 * 0.95 - 1 = 0.90 (90%)
}

// Calculate dynamic strategy-aware stats & scores for any symbol state and barrier.
function getSymbolMetrics(state: SymbolState, barrier: number) {
  let wins = 0;
  let losses = 0;

  if (state.recentSignalExitDigits && state.recentSignalExitDigits.length > 0) {
    state.recentSignalExitDigits.forEach((digit) => {
      if (digit > barrier) {
        wins++;
      } else {
        losses++;
      }
    });
  } else {
    // If no dynamic exit digits are set, fall back to stored simulation stats
    if (barrier === 4) {
      wins = state.wins;
      losses = state.losses;
    } else {
      const total = state.wins + state.losses;
      if (total > 0) {
        // Lower barriers win more often than regular default barrier (B=4) (approx +10% probability step per unit)
        const baseRate = state.wins / total;
        const diff = 4 - barrier;
        const adjustedRate = Math.max(0, Math.min(1.0, baseRate + diff * 0.10));
        wins = Math.round(total * adjustedRate);
        losses = total - wins;
      } else {
        wins = 0;
        losses = 0;
      }
    }
  }

  const totalSim = wins + losses;
  const winRate = totalSim >= 3 ? (wins / totalSim) * 100 : null;
  const signalFreq = state.ticks > 10 ? (state.signals / state.ticks) * 100 : 0;

  let score = -1;
  let edge = 0;
  if (winRate !== null) {
    // Expected payout multiplier:
    const winDigitsCount = 9 - barrier; // B=4 -> 5 digits, B=3 -> 6 digits
    const payout = (10 / winDigitsCount) * 0.95 - 1; // Correct inverted payoff math
    const wrFrac = winRate / 100;
    
    // Mathematical Edge (EV) in terms of percentage of stake
    edge = wrFrac * (payout + 1) - 1;

    // Center score around 50 for pure breakeven (Edge = 0)
    // For barrier 4, breakeven is 52.63%. Scale positive EV more rewardingly.
    const edgeMultiplier = edge >= 0 ? 150 : 120;
    let baseScore = 50 + edge * edgeMultiplier;

    // Short-term micro-momentum (from recent digits trend in the last 10 ticks)
    // Centered around 50% expectation (5 out of 10 digits > 4).
    const recentDigits = state.recentDigits || [];
    const highCount = recentDigits.filter(d => d > barrier).length;
    const microDensity = recentDigits.length > 0 ? (highCount / recentDigits.length) * 100 : 50;
    const momentumBonus = (microDensity - 50) * 0.20; // Adds up to +10 or -10 points

    // consistencyBonus: rewards reliability over tick speed (replaces freqBonus)
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

// In-Memory Persistent States
let symbolsState: Record<string, SymbolState> = {};
SYMBOLS.forEach((sym) => {
  symbolsState[sym.id] = {
    info: sym,
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
    recentSignalExitDigits: [],
  };
});

let botConfig: BotConfig = {
  apiToken: '',
  isDemo: true,
  stake: 0.35,
  martingaleMultiplier: 2.15,
  maxWins: 3,
  maxLosses: 5,
  targetProfit: 0,
  tradingMode: 'advanced',
  barrierDigit: 4,
  dailyStopLoss: 0,
  dailyTakeProfit: 0,
};

let botState: BotState = {
  isRunning: false,
  symbol: 'R_100',
  currentStake: 0.35,
  consecutiveLosses: 0,
  wins: 0,
  losses: 0,
  profit: 0,
  tradesCount: 0,
  status: 'idle',
  lastTradeResult: null,
  dailyPnL: 0,
  dailyResetAt: getNextMidnightISO(),
  cooldownActive: false,
  cooldownRemaining: 0,
  cooldownReason: 'none',
};

let account: AccountInfo | null = null;
let pendingSimulatedTrade: { symbol: string; stake: number; } | null = null;
let logs: LogMessage[] = [];
let pastTrades: any[] = [];
let globalTicks = 0;
let globalSignals = 0;
let connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
const processedContracts = new Set<string>();
let sessionStartTime = Date.now();

// ── Per-User Session Map ─────────────────────────────────────────────────────
// Each Telegram user gets their own isolated session so tokens/state never bleed across users
interface UserSession {
  botConfig: BotConfig;
  botState: BotState;
  // The account currently active for trading (points to either demoAccount or realAccount)
  account: AccountInfo | null;
  // Always-present sandbox account — persists independently of real account
  demoAccount: AccountInfo;
  // The user's real Deriv account once they authorize (null until linked)
  realAccount: AccountInfo | null;
  logs: LogMessage[];
  pastTrades: any[];
  demoPastTrades: any[];
  realPastTrades: any[];
  autopilotPastTrades: any[];
  manualPastTrades: any[];
  authorizedWsStatus: 'idle' | 'connecting' | 'connected' | 'error';
  authorizedWs: WebSocket | null;
  authorizedPingInterval: NodeJS.Timeout | null;
  processedContracts: Set<string>;
  sessionStartTime: number;
  pendingSimulatedTrade: { symbol: string; stake: number } | null;
  cooldownExpiresAt?: number;
}

const userSessions = new Map<string, UserSession>();

function getSession(userId: string): UserSession {
  if (!userSessions.has(userId)) {
    const isAutopilotActive = autopilotState.status === 'trading';
    const initSymbol = isAutopilotActive ? botState.symbol : 'R_100';
    const initIsRunning = isAutopilotActive ? true : false;
    const initStake = isAutopilotActive ? botConfig.stake : 0.35;
    const initMaxWins = isAutopilotActive ? botConfig.maxWins : 3;
    const initMaxLosses = isAutopilotActive ? botConfig.maxLosses : 5;
    const initMartingale = isAutopilotActive ? botConfig.martingaleMultiplier : 2.0;
    const initStatus = isAutopilotActive ? 'waiting' : 'idle';

    userSessions.set(userId, {
      botConfig: {
        apiToken: '',
        isDemo: true,
        stake: initStake,
        martingaleMultiplier: initMartingale,
        maxWins: initMaxWins,
        maxLosses: initMaxLosses,
        targetProfit: 0,
        tradingMode: 'advanced',
        barrierDigit: 4,
        dailyStopLoss: 0,
        dailyTakeProfit: 0,
      },
      botState: {
        isRunning: initIsRunning,
        symbol: initSymbol,
        currentStake: initStake,
        consecutiveLosses: 0,
        wins: 0,
        losses: 0,
        profit: 0,
        tradesCount: 0,
        status: initStatus,
        lastTradeResult: null,
        dailyPnL: 0,
        dailyResetAt: getNextMidnightISO(),
        cooldownActive: false,
        cooldownRemaining: 0,
        cooldownReason: 'none',
      },
      // Auto-assign demo account — balance loaded from MongoDB on first request
      demoAccount: {
        balance: 1000.00,
        currency: 'USD',
        email: '',
        fullname: 'Demo Trader',
        is_virtual: true,
        loginid: `DEMO_${userId}`,
        scopes: ['read', 'trade'],
      },
      realAccount: null,
      // account always points to whichever side is active; updated whenever isDemo or realAccount changes
      account: {
        balance: 1000.00,
        currency: 'USD',
        email: '',
        fullname: 'Demo Trader',
        is_virtual: true,
        loginid: `DEMO_${userId}`,
        scopes: ['read', 'trade'],
      } as AccountInfo | null,
      logs: [],
      pastTrades: [],
      demoPastTrades: [],
      realPastTrades: [],
      autopilotPastTrades: [],
      manualPastTrades: [],
      authorizedWsStatus: 'idle',
      authorizedWs: null,
      authorizedPingInterval: null,
      processedContracts: new Set(),
      sessionStartTime: Date.now(),
      pendingSimulatedTrade: null,
    });

    // Asynchronously load persisted demo balance and trades from MongoDB
    loadUserDemoData(userId).then((saved) => {
      const session = userSessions.get(userId);
      if (!session) return;
      if (saved) {
        session.demoAccount = {
          balance: saved.balance,
          currency: 'USD',
          email: '',
          fullname: 'Demo Trader',
          is_virtual: true,
          loginid: `DEMO_${userId}`,
          scopes: ['read', 'trade'],
        };
        session.demoPastTrades = saved.trades;
        // Sync pastTrades with the current active account
        if (session.botConfig.isDemo) session.pastTrades = session.demoPastTrades;
        syncActiveAccount(session);
        console.log(`✅ Restored demo data for user ${userId}: balance=$${saved.balance}, trades=${saved.trades.length}`);
      } else {
        // First-time user — save their initial $1000 balance to MongoDB
        saveUserDemoData(userId, 1000.00, []);
        console.log(`🆕 New user ${userId} initialized with $1000 demo balance.`);
      }
    });
  }
  return userSessions.get(userId)!;
}

// Helper to get userId from request — falls back to 'default' for non-Telegram web access
function getUserId(req: express.Request): string {
  return (req.body?.tgUserId || req.query?.tgUserId || 'default') as string;
}

// Determines if the session is in demo mode for trading purposes.
// User's explicit mode toggle (botConfig.isDemo) is the primary control.
// The real-account virtual flag does NOT override the user's LIVE mode selection.
function isTradingInDemoMode(session: UserSession): boolean {
  if (session.botConfig.isDemo) return true;
  if (!session.realAccount) return true;
  return false;
}

// Sync session.account to point at the correct side based on isDemo flag
function syncActiveAccount(session: UserSession) {
  if (session.botConfig.isDemo) {
    session.account = session.demoAccount;
    session.pastTrades = session.demoPastTrades;
  } else {
    session.account = session.realAccount ?? session.demoAccount;
    session.pastTrades = session.realPastTrades;
  }
}

// -----------------------------------------------------------------------------
// PREMIUM AUTOPILOT MODULE STATE & ORCHESTRATOR
// -----------------------------------------------------------------------------
let autopilotState = {
  status: 'idle' as 'idle' | 'warmup' | 'scanning' | 'trading' | 'cooldown' | 'countdown_next',
  countdown: 0,
  warmupStart: null as number | null,
  cooldownStartedAt: null as number | null,
  countdownNextStart: null as number | null,
  customMaxWins: 3,
  customMaxLosses: 5,
  customMartingale: 2.0,
  autopilotStakeMode: 'percent' as 'percent' | 'fixed',
  customStakePercent: 1,
  customFixedStake: 0.35,
  targetCandidate: null as string | null,
  lastWatchdogSwapAt: null as number | null,
  watchdogSwapsCount: 0,
  blacklistedPairs: [] as string[],
  cooldownTriggerPair: null as string | null,
};

let autopilotLogs: string[] = [];

function addPremiumLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  const logStr = `[${time}] ${msg}`;
  autopilotLogs.unshift(logStr);
  if (autopilotLogs.length > 200) {
    autopilotLogs.pop();
  }
  console.log(`[PREMIUM-AUTOPILOT] ${msg}`);
}

function getRankedCandidates() {
  return Object.values(symbolsState).map((state) => {
    const metrics = getSymbolMetrics(state, 4);
    return {
      ...state,
      winRate: metrics.winRate,
      score: metrics.score,
      totalSim: metrics.totalSim,
    };
  }).sort((a, b) => b.score - a.score);
}

let autopilotInterval: NodeJS.Timeout | null = null;

function startAutopilotLoop() {
  if (autopilotInterval) return;
  
  autopilotInterval = setInterval(() => {
    if (autopilotState.status === 'idle') return;
    
    // 1. Process countdowns
    if (autopilotState.status === 'warmup') {
      if (autopilotState.warmupStart) {
        const elapsed = Math.floor((Date.now() - autopilotState.warmupStart) / 1000);
        const remaining = 600 - elapsed;
        if (remaining <= 0) {
          autopilotState.status = 'scanning';
          autopilotState.countdown = 0;
          autopilotState.warmupStart = null;
          addPremiumLog('🔥 WARMUP COMPLETED: 10 minutes pre-scan complete. Starting continuous scanner...');
        } else {
          autopilotState.countdown = remaining;
        }
      } else {
        autopilotState.warmupStart = Date.now();
        autopilotState.countdown = 600;
      }
    } 
    
    else if (autopilotState.status === 'cooldown') {
      if (autopilotState.cooldownStartedAt) {
        const elapsed = Math.floor((Date.now() - autopilotState.cooldownStartedAt) / 1000);
        const remaining = 1800 - elapsed;
        if (remaining <= 0) {
          autopilotState.status = 'warmup';
          autopilotState.warmupStart = Date.now();
          autopilotState.countdown = 600;
          autopilotState.cooldownStartedAt = null;
          autopilotState.blacklistedPairs = [];
          autopilotState.cooldownTriggerPair = null;
          addPremiumLog('⏳ COOLDOWN SATISFIED: Blacklist cleared. Re-commencing scanner.');
        } else {
          autopilotState.countdown = remaining;
        }
      } else {
        autopilotState.cooldownStartedAt = Date.now();
        autopilotState.countdown = 1800;
      }
    } 
    
    else if (autopilotState.status === 'countdown_next') {
      if (autopilotState.countdownNextStart) {
        const elapsed = Math.floor((Date.now() - autopilotState.countdownNextStart) / 1000);
        const remaining = 10 - elapsed;
        if (remaining <= 0) {
          autopilotState.status = 'scanning';
          autopilotState.countdown = 0;
          autopilotState.countdownNextStart = null;
          addPremiumLog('⚡ TIMER EXPIRED: 10s countdown complete. Re-initiating continuous scanner...');
        } else {
          autopilotState.countdown = remaining;
        }
      } else {
        autopilotState.countdownNextStart = Date.now();
        autopilotState.countdown = 10;
      }
    } 
    
    else if (autopilotState.status === 'scanning') {
      // Calibration guard
      const scannerUptime = Math.floor((Date.now() - sessionStartTime) / 1000);
      if (scannerUptime < 300) {
        const remaining = 300 - scannerUptime;
        addPremiumLog(`⏳ CALIBRATION GUARD: Scanner calibrating (${remaining}s remaining). Waiting for reliable data.`);
        return;
      }
      const ranked = getRankedCandidates();
      const eligible = ranked.filter(c => 
        c.winRate !== null && 
        c.winRate >= 60.0 && 
        c.score >= 60.0 &&
        (c.wins + c.losses) >= 15  // minimum 8 sim trades for statistical confidence
      );
      
      if (eligible.length > 0) {
        const goldenPair = eligible[0];
        const assetId = goldenPair.info.id;
        const rateString = goldenPair.winRate?.toFixed(1);
        const scoreString = goldenPair.score.toFixed(1);
        
        addPremiumLog(`🎯 GOLDEN PAIR SELECTED: [${goldenPair.info.short}] qualifies! (Win Rate: ${rateString}%, Score: ${scoreString})`);
        addPremiumLog(`🚀 EXECUTING TRADE PIPELINE: Synchronizing configurations and submitting Deriv contract order...`);
        
        // Compute stake
        const bal = account ? account.balance : 1000;
        let targetStake = autopilotState.customFixedStake;
        if (autopilotState.autopilotStakeMode === 'percent') {
          targetStake = parseFloat((bal * (autopilotState.customStakePercent / 100)).toFixed(2));
          if (targetStake < 0.35) targetStake = 0.35;
        }
        
        // Sync config with central botConfig
        botConfig.stake = targetStake;
        botConfig.maxWins = autopilotState.customMaxWins;
        botConfig.maxLosses = autopilotState.customMaxLosses;
        botConfig.martingaleMultiplier = autopilotState.customMartingale;
        
        // Martingale safety check
        const worstCaseStake = targetStake * Math.pow(autopilotState.customMartingale, autopilotState.customMaxLosses - 1);
        const currentBalance = account ? account.balance : 0;
        if (currentBalance > 0 && worstCaseStake > currentBalance * 0.5) {
          addPremiumLog(`⚠️ MARTINGALE SAFETY BLOCK: Worst-case $${worstCaseStake.toFixed(2)} > 50% balance. Reduce stake.`);
          autopilotState.status = 'countdown_next';
          autopilotState.countdownNextStart = Date.now();
          autopilotState.countdown = 30;
          return;
        }
        // Swap active asset
        botState.symbol = assetId;
        
        // Start bot trader
        processedContracts.clear();
        botState = {
          ...botState,
          isRunning: true,
          currentStake: targetStake,
          consecutiveLosses: 0,
          wins: 0,
          losses: 0,
          profit: 0,
          tradesCount: 0,
          status: 'waiting',
        };

        // Populate and activate all active user sessions under the Autopilot trading pipeline
        for (const session of userSessions.values()) {
          const sessionBal = session.account ? session.account.balance : 1000;
          let sessionStake = autopilotState.customFixedStake;
          if (autopilotState.autopilotStakeMode === 'percent') {
            sessionStake = parseFloat((sessionBal * (autopilotState.customStakePercent / 100)).toFixed(2));
            if (sessionStake < 0.35) sessionStake = 0.35;
          }

          session.processedContracts.clear();
          session.botState = {
            ...session.botState,
            symbol: assetId,
            isRunning: true,
            currentStake: sessionStake,
            consecutiveLosses: 0,
            wins: 0,
            losses: 0,
            profit: 0,
            tradesCount: 0,
            status: 'waiting',
          };

          session.botConfig.stake = sessionStake;
          session.botConfig.maxWins = autopilotState.customMaxWins;
          session.botConfig.maxLosses = autopilotState.customMaxLosses;
          session.botConfig.martingaleMultiplier = autopilotState.customMartingale;

          addSessionLog(session, 'success', `▶️ AUTOPILOT STARTED: Automatic trade pipeline locked on ${goldenPair.info.short} with stake $${sessionStake.toFixed(2)} USD.`);
        }
        
        autopilotState.status = 'trading';
        autopilotState.targetCandidate = goldenPair.info.name;
        
        addPremiumLog(`🔥 AUTOPILOT RUNNING: Fully hands-free operation initiated on ${goldenPair.info.short}.`);
      }
    } 
    
    else if (autopilotState.status === 'trading') {
      // Automatic Pair-Health Watchdog
      if (botState.isRunning) {
        const activeSymbol = botState.symbol;
        const activeSymbolState = symbolsState[activeSymbol];
        
        if (activeSymbolState) {
          const simTotal = activeSymbolState.wins + activeSymbolState.losses;
          const simWinRate = simTotal >= 8 ? (activeSymbolState.wins / simTotal) * 100 : null;
          
          const botTotal = botState.wins + botState.losses;
          const botWinRate = botTotal >= 8 ? (botState.wins / botTotal) * 100 : null;
          
          // Watchdog fires when win rate drops below 54% for Over 4 Barrier (breakeven is 52.63%)
          const isSimUnhealthy = simWinRate !== null && simWinRate < 59.0;
          const isBotUnhealthy = botWinRate !== null && botWinRate < 59.0;
          
          if (isSimUnhealthy || isBotUnhealthy) {
            const now = Date.now();
            // Throttle swaps: minimum 30 seconds between mid-session adjustments to avoid trading noise
            if (!autopilotState.lastWatchdogSwapAt || (now - autopilotState.lastWatchdogSwapAt) > 30000) {
              const reason = isSimUnhealthy 
                ? `Scanner simulation win-rate fell to ${simWinRate?.toFixed(1)}% (below 54.0% entry gate)`
                : `Active session live trade win-rate fell to ${botWinRate?.toFixed(1)}% (below 54.0% entry gate)`;
              
              addPremiumLog(`🛡️ WATCHDOG ACTIVATED: Mid-session pair-health deterioration detected on [${activeSymbolState.info.short}]! (${reason})`);
              
              const ranked = getRankedCandidates();
              const alternatives = ranked.filter(c => 
                c.info.id !== activeSymbol && 
                c.winRate !== null && 
                c.winRate >= 56.0 && 
                c.score >= 51.0 &&
                (c.wins + c.losses) >= 8
              );
              
              let goldenChoice = alternatives[0];
              if (!goldenChoice) {
                // No 56%+ pair available — accept a 54.5%+ pair as a fallback
                const backups = ranked.filter(c =>
                  c.info.id !== activeSymbol &&
                  c.winRate !== null &&
                  c.winRate >= 54.5 &&
                  (c.wins + c.losses) >= 8
                );
                if (backups.length > 0) {
                  goldenChoice = backups[0];
                }
              }
              
              if (goldenChoice) {
                const oldName = activeSymbolState.info.short;
                const newName = goldenChoice.info.short;
                
                addPremiumLog(`🎯 WATCHDOG ACTION: Automatically hot-swapped target pair [${oldName}] ➡️ [${newName}] mid-session without interruption.`);
                addPremiumLog(`🔄 CONTINUOUS PIPELINE: Retaining existing session metrics (Net Profit: $${botState.profit.toFixed(2)}, Wins: ${botState.wins}, Losses: ${botState.losses}).`);
                
                botState.symbol = goldenChoice.info.id;
                autopilotState.targetCandidate = goldenChoice.info.name;
                autopilotState.lastWatchdogSwapAt = now;
                autopilotState.watchdogSwapsCount += 1;
                
                processedContracts.clear();

                for (const session of userSessions.values()) {
                  session.botState.symbol = goldenChoice.info.id;
                  session.processedContracts.clear();
                  addSessionLog(session, 'info', `🎯 WATCHDOG: Hot-swapped target pair [${oldName}] ➡️ [${newName}] mid-session.`);
                }
              } else {
                addPremiumLog(`⚠️ WATCHDOG ALERT: Attempted automated hot-swap but no high-performance alternative asset is qualifying. Keeping [${activeSymbolState.info.short}] under close watchdog monitoring...`);
                autopilotState.lastWatchdogSwapAt = now - 15000; // soft throttle
              }
            }
          }
        }
      }

      // Monitor current bot state
      if (!botState.isRunning) {
        const wasWinLimit = botState.status === 'won_limit' || botState.wins >= autopilotState.customMaxWins;
        const wasLossLimit = botState.status === 'lost_limit' || botState.consecutiveLosses >= autopilotState.customMaxLosses || botState.losses >= autopilotState.customMaxLosses;
        
        if (wasWinLimit) {
          addPremiumLog(`🎉 SESSION SUCCESS: Max Wins objective met! Net profit achieved: $${botState.profit.toFixed(2)} USD.`);
          addPremiumLog('♻️ PIPELINE RESET: Delaying 10 seconds before auto-resuming continuous scanner scans...');
          autopilotState.status = 'countdown_next';
          autopilotState.countdownNextStart = Date.now();
          autopilotState.countdown = 10;
        } else if (wasLossLimit) {
          addPremiumLog(`🚨 CAPITAL SAFEGUARD HIT: Halted session to prevent high consecutive losses.`);
          addPremiumLog(`⏳ PROTECTION TIMEOUT: Autopilot locked in 30 minutes cooldown...`);
          autopilotState.status = 'cooldown';
          autopilotState.cooldownStartedAt = Date.now();
          autopilotState.countdown = 1800;
          const failedPair = botState.symbol;
          if (failedPair && !autopilotState.blacklistedPairs.includes(failedPair)) {
            autopilotState.blacklistedPairs.push(failedPair);
            autopilotState.cooldownTriggerPair = failedPair;
            addPremiumLog(`🚫 BLACKLISTED: [${(symbolsState[failedPair]?.info?.short) || failedPair}] excluded from next scan cycle.`);
          }
        } else {
          addPremiumLog(`⏹️ SESSION INACTIVE: Bot terminated execution.`);
          addPremiumLog('♻️ RE-ROUTING TERMINATION: Starting 10-second scan loop countdown before next verification...');
          autopilotState.status = 'countdown_next';
          autopilotState.countdownNextStart = Date.now();
          autopilotState.countdown = 10;
        }
      }
    }
  }, 1000);
}

// Start immediately on bootstrap
startAutopilotLoop();

function addLog(type: LogMessage['type'], message: string) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const log: LogMessage = {
    id: Math.random().toString(36).substring(2, 11),
    timestamp,
    type,
    message,
  };
  logs.push(log);
  if (logs.length > 300) logs.shift();
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Per-session log helper
function addSessionLog(session: UserSession, type: LogMessage['type'], message: string) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const log: LogMessage = {
    id: Math.random().toString(36).substring(2, 11),
    timestamp,
    type,
    message,
  };
  session.logs.push(log);
  if (session.logs.length > 300) session.logs.shift();
  console.log(`[${type.toUpperCase()}] ${message}`);
}

addLog('info', '🧠 Background persistence trading module booting up...');

// -----------------------------------------------------------------------------
// WEBSOCKET CHANNELS MANAGEMENT
// -----------------------------------------------------------------------------
let publicWs: WebSocket | null = null;
let publicPingInterval: NodeJS.Timeout | null = null;

// Legacy globals kept for public scanner (shared across all users)
let authorizedWs: WebSocket | null = null;
let lastAuthorizedToken = '';
let authorizedWsStatus: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';
let authorizedPingInterval: NodeJS.Timeout | null = null;

// Function to start real Deriv Public Ticks listener
function initPublicSocket() {
  if (publicPingInterval) {
    clearInterval(publicPingInterval);
    publicPingInterval = null;
  }
  if (publicWs) {
    try {
      publicWs.removeAllListeners();
      publicWs.on('error', () => {}); // Silently capture any cleanup errors
      publicWs.close();
    } catch (e) {}
    publicWs = null;
  }

  connectionStatus = 'connecting';
  addLog('info', '🌐 Connecting server core to Deriv WebSocket Cloud...');
  
  const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${adminSettings.appId}`);
  
  // Register error handler immediately to prevent uncaught system crash exceptions
  ws.on('error', (err) => {
    if (publicWs !== ws) return;
    connectionStatus = 'error';
    addLog('error', `❌ Public feed WebSocket error: ${err.message}`);
  });

  publicWs = ws;

  ws.on('open', () => {
    if (publicWs !== ws) return;
    connectionStatus = 'connected';
    addLog('success', '🌐 Connected: Public ticker scanner online in server background.');
    
    // Subscribe to all 10 indices with safety guards and staggered delays to prevent concurrent connection rate limits
    SYMBOLS.forEach((sym, index) => {
      setTimeout(() => {
        try {
          if (ws.readyState === WebSocket.OPEN && publicWs === ws) {
            ws.send(JSON.stringify({ ticks: sym.id, subscribe: 1 }));
          }
        } catch (err) {
          console.error(`Error sending subscription for ${sym.id}:`, err);
        }
      }, index * 200);
    });

    // Send heartbeats every 30 seconds to prevent channel reaping
    publicPingInterval = setInterval(() => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        }
      } catch (e) {}
    }, 30000);
  });

  ws.on('message', (msgData: string) => {
    let data;
    try {
      data = JSON.parse(msgData.toString());
    } catch (e) {
      return;
    }

    if (data.error) {
      const failedSymbol = data.echo_req && data.echo_req.ticks ? data.echo_req.ticks : '';
      const symbolDetails = failedSymbol ? ` for index ${failedSymbol}` : '';
      // Volatility indices can be restricted by region or App ID; log as warning to prevent false alarm logging reports
      addLog('warning', `⚠️ Public Deriv feed reports non-fatal warning${symbolDetails}: ${data.error.message}`);
      return;
    }

    const msgType = data.msg_type;
    if (msgType === 'tick') {
      const tick = data.tick;
      const symId = tick.symbol;

      const s = symbolsState[symId];
      if (!s) return;

      const pip = s.info.pip;
      const newPrice = tick.quote;
      const newDigit = getLastDigit(newPrice, pip);

      // Settle simulated contract on actual next live tick update — per session
      for (const [uid, session] of userSessions.entries()) {
        if (session.pendingSimulatedTrade && session.pendingSimulatedTrade.symbol === symId) {
          const trade = session.pendingSimulatedTrade;
          session.pendingSimulatedTrade = null; // Clear to prevent double processing

          const activeBarrier = getBarrierDigit(session.botConfig.tradingMode, session.botConfig.barrierDigit);
          const didWin = newDigit > activeBarrier;

          // Dynamic payout calculation based on barrier:
          const winProbability = (9 - activeBarrier) / 10;
          const rawPayout = (1 / winProbability - 1) * 0.95;
          const payoutPercent = activeBarrier === 3 ? 0.665 : (activeBarrier === 4 ? 0.95 : parseFloat(rawPayout.toFixed(3)));

          const profitValue = didWin ? parseFloat((trade.stake * payoutPercent).toFixed(2)) : -trade.stake;

          settleContract(
            uid,
            session,
            didWin ? 'won' : 'lost',
            profitValue,
            trade.stake,
            didWin ? `V-Win (Exit Digit: ${newDigit} > ${activeBarrier})` : `V-Loss (Exit Digit: ${newDigit} <= ${activeBarrier})`
          );
        }
      }

      const oldPrice = s.price;
      const direction = oldPrice === null ? null : newPrice > oldPrice ? 'rise' : newPrice < oldPrice ? 'fall' : s.direction;
      
      let { wins, losses, signals, pendingSignal, lastSignalTick } = s;
      const currentTickId = s.ticks + 1;

      // ── Resolve previous signal on THIS tick ──
      // Exit digit must come from a strictly later tick than the entry tick
      // This prevents the entry digit itself from counting as the result
      let recentSignalExitDigits = s.recentSignalExitDigits || [];
      if (pendingSignal !== null && currentTickId > pendingSignal.tickId) {
        if (newDigit > pendingSignal.barrier) {
          wins++;
        } else {
          losses++;
        }
        recentSignalExitDigits = [...recentSignalExitDigits, newDigit].slice(-40);
        pendingSignal = null;
      }

      // ── Scanner entry condition ──
      // Entry fires when: price is rising AND last digit is 4 or 5
      // Guard: only register a new signal if no signal is already pending
      // (prevents double-counting on back-to-back entry digits)
      const isEntry = direction === 'rise' && (newDigit === 4 || newDigit === 5) && pendingSignal === null;
      if (isEntry) {
        signals++;
        // tickId stored so resolution enforces currentTickId > tickId
        pendingSignal = { barrier: 4, tickId: currentTickId };
        lastSignalTick = currentTickId;
        globalSignals++;

        // Trigger action for every active session watching this symbol
        for (const session of userSessions.values()) {
          if (symId === session.botState.symbol && session.botState.isRunning) {
            triggerBotEntry(session, symId, newDigit);
          }
        }
      }

      const extendedDigits = [...s.recentDigits, newDigit].slice(-10);
      symbolsState[symId] = {
        ...s,
        price: newPrice,
        prevPrice: oldPrice,
        lastDigit: newDigit,
        direction,
        recentDigits: extendedDigits,
        ticks: currentTickId,
        signals,
        wins,
        losses,
        lastSignalTick,
        connected: true,
        pendingSignal,
        recentSignalExitDigits,
      };

      // Advanced mode — Pair credibility check per session
      // Pauses when win rate drops below safety threshold
      // Requires minimum 5 sim trades before making any judgment
      for (const session of userSessions.values()) {
        const mode = session.botConfig.tradingMode;
        const activeBarrier = getBarrierDigit(session.botConfig.tradingMode, session.botConfig.barrierDigit);

        const entryGate = 55.0;
        const pauseThreshold = session.botConfig.credibilityFalloutPercent !== undefined 
          ? session.botConfig.credibilityFalloutPercent 
          : 55.0;

        if (mode === 'advanced' && session.botState.isRunning && symId === session.botState.symbol) {
          const activeState = symbolsState[symId];
          const metrics = getSymbolMetrics(activeState, activeBarrier);
          if (metrics.totalSim >= 5) {
            const liveWinRate = metrics.winRate;
            if (liveWinRate !== null && liveWinRate < pauseThreshold) {
              session.botState = {
                ...session.botState,
                isRunning: false,
                status: 'paused_low_winrate',
              };
              addSessionLog(session, 'warning', `⚠️ PAIR CREDIBILITY LOST: ${symId} win rate dropped to ${liveWinRate.toFixed(1)}% (below ${pauseThreshold.toFixed(1)}% safety threshold for barrier ${activeBarrier}). Session paused. Scanning for next best qualifying pair...`);
            }
          }
        }
 
        // Automatic background resume checker for Advanced mode session in 'paused_low_winrate'
        if (mode === 'advanced' && !session.botState.isRunning && session.botState.status === 'paused_low_winrate') {
          let bestSymId: string | null = null;
          let bestWinRate = 0;
          for (const sId of Object.keys(symbolsState)) {
            // Do not swap immediately to the same symbol if its win rate is still low
            if (sId === session.botState.symbol) continue;
            const assetState = symbolsState[sId];
            const metrics = getSymbolMetrics(assetState, activeBarrier);
            if (metrics.totalSim >= 5 && metrics.winRate !== null) {
              if (metrics.winRate >= entryGate) {
                if (metrics.winRate > bestWinRate) {
                  bestWinRate = metrics.winRate;
                  bestSymId = sId;
                }
              }
            }
          }
          if (bestSymId) {
            const info = SYMBOLS.find((s) => s.id === bestSymId);
            session.botState = {
              ...session.botState,
              symbol: bestSymId,
              isRunning: true,
              status: 'waiting',
            };
            addSessionLog(session, 'success', `▶️ AUTO-SWAP RESUME: Found qualifying pair ${info?.short || bestSymId} with ${bestWinRate.toFixed(1)}% credibility score. Continuing the session automatically!`);
          }
        }
      }

      globalTicks++;
      if (wins !== s.wins || losses !== s.losses) {
        saveSymbolsState().catch(() => {});
      }
    }
  });

  ws.on('close', () => {
    if (publicPingInterval) {
      clearInterval(publicPingInterval);
      publicPingInterval = null;
    }
    if (publicWs !== ws) return;
    connectionStatus = 'disconnected';
    addLog('warning', '⚠️ Public feed WebSocket closed. Seeking immediate recovery loop...');
    setTimeout(() => {
      if (publicWs === ws) {
        initPublicSocket();
      }
    }, 5000);
  });
}

// Helper to mirror active user-session botState back to the global autopilot botState
function syncGlobalBotStateFromSession(session: UserSession) {
  if (autopilotState.status === 'trading') {
    botState.wins = session.botState.wins;
    botState.losses = session.botState.losses;
    botState.profit = session.botState.profit;
    botState.consecutiveLosses = session.botState.consecutiveLosses;
    botState.tradesCount = session.botState.tradesCount;
    botState.currentStake = session.botState.currentStake;
    botState.status = session.botState.status;
    botState.isRunning = session.botState.isRunning;
    botState.cooldownActive = session.botState.cooldownActive;
    botState.cooldownRemaining = session.botState.cooldownRemaining;
    botState.cooldownReason = session.botState.cooldownReason;
  }
}

// Trigger buy orders for the autotrader — operates on a per-user session
function triggerBotEntry(session: UserSession, symId: string, entryDigit: number) {
  // Check if cooldown is active
  if (session.cooldownExpiresAt) {
    const remainingMs = session.cooldownExpiresAt - Date.now();
    if (remainingMs > 0) {
      // Cooldown is active: silently ignore entries
      return;
    } else {
      // Cooldown expired: clean up
      session.cooldownExpiresAt = undefined;
      session.botState.cooldownActive = false;
      session.botState.cooldownRemaining = 0;
      session.botState.cooldownReason = 'none';
    }
  }

  if (session.botState.status === 'trading') return; // block simultaneous overlapping trades

  const activeStake = parseFloat(session.botState.currentStake.toFixed(2));
  addSessionLog(session, 'trade', `🎯 Background Trigger Locked: Last decimal was ${entryDigit} on ${symId}. Evaluating trade params...`);

  // Demo balance pre-check
  // Stop before placing a trade if demo balance can't cover the stake
  if (isTradingInDemoMode(session) && session.demoAccount.balance < activeStake) {
    session.botState.isRunning = false;
    session.botState.status = 'insufficient_balance';
    addSessionLog(session, 'error', `💰 INSUFFICIENT DEMO BALANCE: $${session.demoAccount.balance.toFixed(2)} available — not enough to place $${activeStake.toFixed(2)} stake. Please reset your demo balance to continue.`);
    syncActiveAccount(session);
    syncGlobalBotStateFromSession(session);
    return;
  }

  // Demo sandbox simulation — only when user is explicitly in DEMO mode
  if (isTradingInDemoMode(session)) {
    session.botState.status = 'trading';
    syncGlobalBotStateFromSession(session);
    addSessionLog(session, 'info', `🗳️ [SANDBOX ENGINE] Dispatching trade ticket. Stake: $${activeStake.toFixed(2)}. Contract bought at Entry Spot. Waiting for next tick quote to settle contract...`);
    session.pendingSimulatedTrade = {
      symbol: symId,
      stake: activeStake
    };
  } else {
    // Live authorized broker execution
    try {
      if (session.authorizedWs && session.authorizedWs.readyState === WebSocket.OPEN) {
        session.botState.status = 'trading';
        syncGlobalBotStateFromSession(session);
        addSessionLog(session, 'info', `🗳️ [LIVE PRODUCTION] Submitting Deriv Order Ticket: stake $${activeStake.toFixed(2)} USD.`);

        session.authorizedWs.send(JSON.stringify({
          buy: 1,
          price: activeStake,
          parameters: {
            amount: activeStake,
            basis: 'stake',
            contract_type: 'DIGITOVER',
            currency: session.realAccount.currency || 'USD',
            duration: 1,
            duration_unit: 't',
            barrier: String(getBarrierDigit(session.botConfig.tradingMode, session.botConfig.barrierDigit)),
            symbol: symId,
            app_markup_percentage: adminSettings.markupPercent
          }
        }));
      } else {
        // Handle offline, connecting, or disconnected states dynamically by establishing automatic reconnection
        if (session.botConfig.apiToken && (!session.authorizedWs || session.authorizedWs.readyState !== WebSocket.CONNECTING)) {
          addSessionLog(session, 'warning', '🔄 Secure API connection is currently offline. Triggering immediate auto-reconnection...');
          // find userId for this session
          for (const [uid, s] of userSessions.entries()) {
            if (s === session) { initAuthorizedSocketForUser(uid, session.botConfig.apiToken); break; }
          }
        }
        session.authorizedWsStatus = 'connecting';
        addSessionLog(session, 'warning', '⏳ Live trade deferred: Secure API channel is reconnecting. Retrying entry on next incoming feedback tick...');
      }
    } catch (err: any) {
      addSessionLog(session, 'error', `❌ Live order submission failed: ${err.message}`);
      session.botState.status = 'error';
      syncGlobalBotStateFromSession(session);
    }
  }
}

// Settle contract outcomes — accepts a user session for per-user state isolation
function settleContract(userId: string, session: UserSession, status: 'won' | 'lost', profitValue: number, buyPrice: number, description: string) {
  const isWin = status === 'won';

  const updatedWins = isWin ? session.botState.wins + 1 : session.botState.wins;
  const updatedLosses = !isWin ? session.botState.losses + 1 : session.botState.losses;
  const updatedConsecutiveLosses = isWin ? 0 : session.botState.consecutiveLosses + 1;
  const updatedProfit = session.botState.profit + profitValue;

  // Add settled trade to session pastTrades history
  const isAutopilotActive = autopilotState.status === 'trading';
  const newTrade = {
    id: Math.random().toString(36).substring(2, 9),
    symbol: session.botState.symbol,
    timestamp: new Date().toISOString(),
    outcome: isWin ? 'win' : 'loss',
    stake: buyPrice,
    profit: profitValue,
    description: description,
    isAutopilot: isAutopilotActive,
  };

  addSessionLog(
    session,
    isWin ? 'success' : 'trade',
    isWin
      ? `🎉 Trade WON! Profit: +$${profitValue.toFixed(2)} USD. DetailRef: ${description}`
      : `💀 Trade LOST! Stake lost: -$${Math.abs(profitValue).toFixed(2)} USD. DetailRef: ${description}`
  );

  let runStatus = session.botState.isRunning;
  let botStateStatus: BotState['status'] = 'waiting';
  let nextStake = session.botConfig.stake;

  const targetReached = session.botConfig.targetProfit > 0 && updatedProfit >= session.botConfig.targetProfit;
  const winsLimitReached = updatedWins >= session.botConfig.maxWins;
  const lossesLimitReached = updatedConsecutiveLosses >= session.botConfig.maxLosses;

  let cooldownActive = session.botState.cooldownActive;
  let cooldownRemaining = session.botState.cooldownRemaining;
  let cooldownReason = session.botState.cooldownReason || 'none';

  if (targetReached || winsLimitReached) {
    runStatus = false;
    botStateStatus = 'won_limit';
    addSessionLog(session, 'success', `🏆 AUTO-TRADER GOAL ACHIEVED! Profit Target / Max Wins completed. Saved Net: $${updatedProfit.toFixed(2)} USD.`);
  } else if (lossesLimitReached) {
    runStatus = false;
    botStateStatus = 'lost_limit';
    addSessionLog(session, 'warning', `🚨 CAPITAL PROTECTION BREACH: Consecutive loss ceiling reached (${updatedConsecutiveLosses}). Martingale terminated.`);
  } else {
    if (isWin) {
      nextStake = session.botConfig.stake;
      // Clear consecutive loss cooldown upon a win (as consecutive losses reset to 0)
      if (cooldownReason === 'consecutive_loss') {
        session.cooldownExpiresAt = undefined;
        cooldownActive = false;
        cooldownRemaining = 0;
        cooldownReason = 'none';
      }
    } else {
      nextStake = parseFloat((session.botState.currentStake * session.botConfig.martingaleMultiplier).toFixed(2));
      addSessionLog(session, 'warning', `⚡ Martingale escalation: Stake raised $${session.botState.currentStake.toFixed(2)} → $${nextStake.toFixed(2)} USD.`);
      
      if (updatedConsecutiveLosses > 0 && updatedConsecutiveLosses % 2 === 0) {
        // Trigger a 60-second cooldown pause after every 2 consecutive losses
        session.cooldownExpiresAt = Date.now() + 60000;
        cooldownActive = true;
        cooldownRemaining = 60;
        cooldownReason = 'consecutive_loss';
        addSessionLog(session, 'warning', `⏳ COOLDOWN TRIGGERED: ${updatedConsecutiveLosses} consecutive losses hit. Pausing entries for 60 seconds to allow market patterns to re-align for a better entry. Martingale stake of $${nextStake.toFixed(2)} USD is preserved.`);
      }
    }
  }

  session.botState = {
    ...session.botState,
    isRunning: runStatus,
    currentStake: nextStake,
    consecutiveLosses: updatedConsecutiveLosses,
    wins: updatedWins,
    losses: updatedLosses,
    profit: updatedProfit,
    tradesCount: session.botState.tradesCount + 1,
    status: botStateStatus,
    lastTradeResult: isWin ? 'win' : 'loss',
    cooldownActive,
    cooldownRemaining,
    cooldownReason: cooldownReason as any,
  };

  // Update balance and trade history for the correct account side
  if (isTradingInDemoMode(session)) {
    // ── Demo balance guard ──
    // Before applying a loss, check if there's enough balance to cover the stake
    if (!isWin && session.demoAccount.balance < buyPrice) {
      session.botState = {
        ...session.botState,
        isRunning: false,
        status: 'insufficient_balance',
      };
      addSessionLog(session, 'error', `💰 INSUFFICIENT DEMO BALANCE: $${session.demoAccount.balance.toFixed(2)} remaining — not enough to cover $${buyPrice.toFixed(2)} stake. Please top up your demo balance to continue.`);
      syncActiveAccount(session);
      syncGlobalBotStateFromSession(session);
      return;
    }

    // Update demo account balance and demo trade list
    session.demoAccount.balance = parseFloat((session.demoAccount.balance + profitValue).toFixed(2));
    // Clamp to zero — never go negative
    if (session.demoAccount.balance < 0) session.demoAccount.balance = 0;
    session.demoPastTrades.unshift(newTrade);
    session.pastTrades = session.demoPastTrades;
    if (newTrade.isAutopilot) { session.autopilotPastTrades.unshift(newTrade); }
    else { session.manualPastTrades.unshift(newTrade); }
    syncActiveAccount(session);
    saveUserDemoData(userId, session.demoAccount.balance, session.demoPastTrades);
  } else {
    // Real account — balance is updated live via Deriv's balance subscription
    // We manually apply the delta here as well so the UI reflects it instantly
    // before the next balance push arrives from Deriv
    if (session.realAccount) {
      session.realAccount.balance = parseFloat((session.realAccount.balance + profitValue).toFixed(2));
      session.account = session.realAccount;
    }
    session.realPastTrades.unshift(newTrade);
    session.pastTrades = session.realPastTrades;
    if (newTrade.isAutopilot) { session.autopilotPastTrades.unshift(newTrade); }
    else { session.manualPastTrades.unshift(newTrade); }
  }

  // Update creator/owner markup metrics dynamically
  adminSettings.totalClientVolume = parseFloat((adminSettings.totalClientVolume + buyPrice).toFixed(2));
  adminSettings.totalMarkupEarnings = parseFloat((adminSettings.totalMarkupEarnings + (buyPrice * (adminSettings.markupPercent / 100))).toFixed(2));
  saveAdminSettings();
  syncGlobalBotStateFromSession(session);
}

// Initialize authorized live API socket
function initAuthorizedSocket(token: string) {
  if (authorizedPingInterval) {
    clearInterval(authorizedPingInterval);
    authorizedPingInterval = null;
  }
  // If we are already connected or connecting using this exact token, bypass re-initialization
  if (authorizedWs && lastAuthorizedToken === token && (authorizedWsStatus === 'connected' || authorizedWsStatus === 'connecting')) {
    addLog('info', '🔐 Secure API token link is already active or establishing connection.');
    return;
  }

  if (authorizedWs) {
    try {
      authorizedWs.removeAllListeners();
      authorizedWs.on('error', () => {}); // Catch closure errors silently to prevent unhandled 'error' engine crash
      authorizedWs.close();
    } catch(e) {}
    authorizedWs = null;
  }

  lastAuthorizedToken = token;
  authorizedWsStatus = 'connecting';
  addLog('info', `🔐 Establishing isolated secure API socket for token: ${token.substring(0, 4)}***`);
  
  const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${adminSettings.appId}`);
  
  // Register error handler immediately to prevent uncaught exceptions on handshake or DNS failure
  ws.on('error', (err) => {
    if (authorizedWs !== ws) return;
    addLog('error', `🔐 Secure API Socket Error: ${err.message}`);
    authorizedWsStatus = 'error';
  });

  authorizedWs = ws;

  ws.on('open', () => {
    if (authorizedWs !== ws) return;
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ authorize: token }));
      }
    } catch (err: any) {
      addLog('error', `🔐 Authorization request send failure: ${err.message}`);
    }

    // Keep live authorized broker stream active with periodic heartbeats (15s to guarantee hot-standby)
    authorizedPingInterval = setInterval(() => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        }
      } catch (e) {}
    }, 15000);
  });

  ws.on('message', (msgData: string) => {
    if (authorizedWs !== ws) return;
    let data;
    try {
      data = JSON.parse(msgData.toString());
    } catch(e) {
      return;
    }

    if (data.error) {
      let friendlyError = data.error.message;
      if (friendlyError.includes('Input validation failed') || friendlyError.includes('authorize')) {
        friendlyError = 'API Token is invalid, expired, or has incorrect permissions. Please verify the alphanumeric token was copied correctly and includes read and trade scopes.';
      }
      addLog('error', `🔐 Token Rejected: ${friendlyError}`);
      authorizedWsStatus = 'error';
      account = null;
      botConfig.apiToken = '';
      return;
    }

    const msgType = data.msg_type;
    
    if (msgType === 'authorize') {
      const auth = data.authorize;
      account = {
        balance: parseFloat(auth.balance),
        currency: auth.currency,
        email: auth.email,
        fullname: auth.fullname,
        is_virtual: auth.is_virtual === 1,
        loginid: auth.loginid,
        scopes: auth.scopes,
      };

      // Track registered user in JSON database files
      upsertRegistryUser({
        loginid: auth.loginid,
        fullname: auth.fullname,
        email: auth.email || '',
        currency: auth.currency,
        is_virtual: auth.is_virtual === 1,
        lastActive: new Date().toISOString()
      });

      botConfig.apiToken = token;
      // Preserve the user's mode toggle (demo/live) — do NOT auto-switch on account type
      authorizedWsStatus = 'connected';
      addLog('success', `🔐 ID ${auth.loginid} Authorize Verified (${auth.is_virtual ? 'Demo' : 'Live Real'}).`);

      // Subscribe to real time trade sold notifications & balance
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
          ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        }
      } catch (err: any) {
        addLog('error', `🔐 Authorization subscriptions setup failure: ${err.message}`);
      }
    }

    else if (msgType === 'balance') {
      if (account) {
        account.balance = parseFloat(data.balance.balance);
      }
      // Also push update to any session using this global account
      for (const session of userSessions.values()) {
        if (session.realAccount && !session.botConfig.isDemo) {
          session.realAccount.balance = parseFloat(data.balance.balance);
          session.account = session.realAccount;
        }
      }
    }

    else if (msgType === 'proposal_open_contract') {
      const contract = data.proposal_open_contract;
      if (!contract) return;

      if (contract.is_sold === 1) {
        const contractId = contract.contract_id || contract.id;
        if (contractId) {
          if (processedContracts.has(contractId)) return;
          processedContracts.add(contractId);
        }

        const status = contract.status;
        if (status !== 'won' && status !== 'lost') return;

        const defaultSession = getSession('default');
        if (defaultSession.botState.isRunning) {
          settleContract(
            'default',
            defaultSession,
            status,
            parseFloat(contract.profit),
            parseFloat(contract.buy_price),
            contract.longcode || 'Real Asset Settlement'
          );
        }
      }
    }
  });

  ws.on('close', () => {
    if (authorizedPingInterval) {
      clearInterval(authorizedPingInterval);
      authorizedPingInterval = null;
    }
    if (authorizedWs !== ws) return;
    addLog('info', '🔓 Secure API Socket channel released.');
    if (authorizedWsStatus !== 'idle' && token === botConfig.apiToken && botConfig.apiToken) {
      authorizedWsStatus = 'connecting';
      addLog('warning', '⚠️ Authorized socket disconnected. Attempting auto reconnection in 2s...');
      setTimeout(() => {
        if (authorizedWs === ws) {
          initAuthorizedSocket(token);
        }
      }, 2000);
    }
  });
}

// Per-user authorized WebSocket — each user's token connects independently
function initAuthorizedSocketForUser(userId: string, token: string) {
  const session = getSession(userId);

  if (session.authorizedPingInterval) {
    clearInterval(session.authorizedPingInterval);
    session.authorizedPingInterval = null;
  }

  if (session.authorizedWs) {
    try {
      session.authorizedWs.removeAllListeners();
      session.authorizedWs.on('error', () => {});
      session.authorizedWs.close();
    } catch(e) {}
    session.authorizedWs = null;
  }

  session.authorizedWsStatus = 'connecting';
  addSessionLog(session, 'info', `🔐 Establishing isolated secure API socket for token: ${token.substring(0, 4)}***`);

  const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${adminSettings.appId}`);

  ws.on('error', (err) => {
    if (session.authorizedWs !== ws) return;
    addSessionLog(session, 'error', `🔐 Secure API Socket Error: ${err.message}`);
    session.authorizedWsStatus = 'error';
  });

  session.authorizedWs = ws;

  ws.on('open', () => {
    if (session.authorizedWs !== ws) return;
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ authorize: token }));
      }
    } catch (err: any) {
      addSessionLog(session, 'error', `🔐 Authorization request send failure: ${err.message}`);
    }

    session.authorizedPingInterval = setInterval(() => {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
      } catch(e) {}
    }, 15000);
  });

  ws.on('message', (msgData: string) => {
    if (session.authorizedWs !== ws) return;
    let data;
    try { data = JSON.parse(msgData.toString()); } catch(e) { return; }

    if (data.error) {
      const errMsg = data.error.message || 'Unknown error';
      const errCode = data.error.code || '';

      // If a live trade was in-flight, this error is a trade rejection — not an auth failure.
      if (session.botState.status === 'trading') {
        // Insufficient balance — pause the bot without logging the user out
        if (
          errCode === 'InsufficientBalance' ||
          errMsg.toLowerCase().includes('insufficient balance') ||
          errMsg.toLowerCase().includes('insufficient funds')
        ) {
          session.botState.isRunning = false;
          session.botState.status = 'insufficient_balance';
          addSessionLog(session, 'error', `💰 Insufficient balance to place trade: ${errMsg}. Bot paused. Please top up your account to continue.`);
          return;
        }
        // All other rejections — reset to waiting so the next tick can retry
        session.botState.status = 'waiting';
        addSessionLog(session, 'error', `❌ Live trade rejected by Deriv: ${errMsg} (code: ${errCode})`);
        return;
      }

      // Auth-level error — token is invalid or expired
      let friendlyError = errMsg;
      if (friendlyError.includes('Input validation failed') || friendlyError.includes('authorize') || errCode === 'AuthorizationRequired' || errCode === 'InvalidToken') {
        friendlyError = 'API Token is invalid, expired, or has incorrect permissions.';
      }
      addSessionLog(session, 'error', `🔐 Token Rejected: ${friendlyError}`);
      session.authorizedWsStatus = 'error';
      session.account = null;
      session.botConfig.apiToken = '';
      return;
    }

    const msgType = data.msg_type;

    if (msgType === 'authorize') {
      const auth = data.authorize;
      const authorizedAccount = {
        balance: parseFloat(auth.balance),
        currency: auth.currency,
        email: auth.email,
        fullname: auth.fullname,
        is_virtual: auth.is_virtual === 1,
        loginid: auth.loginid,
        scopes: auth.scopes,
      };
      // Store as realAccount — demo account is preserved independently
      session.realAccount = authorizedAccount;
      // Preserve the user's mode toggle (demo/live) — do NOT auto-switch on account type
      syncActiveAccount(session);

      upsertRegistryUser({
        loginid: auth.loginid,
        fullname: auth.fullname,
        email: auth.email || '',
        currency: auth.currency,
        is_virtual: auth.is_virtual === 1,
        lastActive: new Date().toISOString()
      });

      session.botConfig.apiToken = token;
      session.authorizedWsStatus = 'connected';
      addSessionLog(session, 'success', `🔐 ID ${auth.loginid} Authorize Verified (${auth.is_virtual ? 'Demo' : 'Live Real'}).`);

      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
          ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        }
      } catch (err: any) {
        addSessionLog(session, 'error', `🔐 Authorization subscriptions setup failure: ${err.message}`);
      }
    }

    else if (msgType === 'balance') {
      if (session.realAccount) {
        session.realAccount.balance = parseFloat(data.balance.balance);
        // Also sync session.account so the UI polling picks up the updated balance
        if (!session.botConfig.isDemo) {
          session.account = session.realAccount;
        }
      }
    }

    else if (msgType === 'buy') {
      const buyResponse = data.buy;
      if (buyResponse && buyResponse.contract_id) {
        addSessionLog(session, 'info', `✅ Order confirmed by Deriv: contract_id=${buyResponse.contract_id}, buy_price=${buyResponse.buy_price}`);
      } else {
        // buy response with no contract_id means the order was rejected at the buy stage
        session.botState.status = 'waiting';
        addSessionLog(session, 'error', `❌ Deriv buy response missing contract_id — order may have been rejected.`);
      }
    }

    else if (msgType === 'proposal_open_contract') {
      const contract = data.proposal_open_contract;
      if (!contract || contract.is_sold !== 1) return;

      const contractId = contract.contract_id || contract.id;
      if (contractId) {
        if (session.processedContracts.has(contractId)) return;
        session.processedContracts.add(contractId);
      }

      const status = contract.status;
      if (status !== 'won' && status !== 'lost') return;

      if (session.botState.isRunning) {
        settleContract(
          userId,
          session,
          status,
          parseFloat(contract.profit),
          parseFloat(contract.buy_price),
          contract.longcode || 'Real Asset Settlement'
        );
      }
    }
  });

  ws.on('close', () => {
    if (session.authorizedPingInterval) {
      clearInterval(session.authorizedPingInterval);
      session.authorizedPingInterval = null;
    }
    if (session.authorizedWs !== ws) return;
    addSessionLog(session, 'info', '🔓 Secure API Socket channel released.');
    if (session.authorizedWsStatus !== 'idle' && token === session.botConfig.apiToken && session.botConfig.apiToken) {
      session.authorizedWsStatus = 'connecting';
      setTimeout(() => {
        if (session.authorizedWs === ws) {
          initAuthorizedSocketForUser(userId, token);
        }
      }, 2000);
    }
  });
}

// -----------------------------------------------------------------------------
// SERVER INIT PROCESS & EXPRESS HTTP SERVICE API
// -----------------------------------------------------------------------------
async function run() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Route: Get state
  app.get('/api/state', (req, res) => {
    const userId = getUserId(req);
    const session = getSession(userId);

    const elapsed = Math.floor((Date.now() - session.sessionStartTime) / 1000);
    const hrs = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    const sessionTimeFormatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Compute dynamic cooldown state
    let dCooldownActive = false;
    let dCooldownRemaining = 0;
    let dCooldownReason = session.botState.cooldownReason || 'none';

    if (session.cooldownExpiresAt) {
      const remainingMs = session.cooldownExpiresAt - Date.now();
      if (remainingMs > 0) {
        dCooldownActive = true;
        dCooldownRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
      } else {
        // Cooldown has elapsed
        session.cooldownExpiresAt = undefined;
        session.botState.cooldownActive = false;
        session.botState.cooldownReason = 'none';
        session.botState.cooldownRemaining = 0;
        dCooldownReason = 'none';
      }
    }

    session.botState.cooldownActive = dCooldownActive;
    session.botState.cooldownRemaining = dCooldownRemaining;
    session.botState.cooldownReason = dCooldownReason as any;

    res.json({
      botConfig: session.botConfig,
      botState: session.botState,
      symbolsState,
      logs: session.logs,
      account: session.account,
      demoAccount: session.demoAccount,
      realAccount: session.realAccount,
      connectionStatus,
      authorizedWsStatus: session.authorizedWsStatus,
      globalTicks,
      globalSignals,
      pastTrades: session.pastTrades,
      demoPastTrades: session.demoPastTrades,
      realPastTrades: session.realPastTrades,
      autopilotPastTrades: session.autopilotPastTrades,
      manualPastTrades: session.manualPastTrades,
      sessionTime: sessionTimeFormatted,
      sessionUptime: elapsed,
      maintenanceMode: adminSettings.maintenanceMode,
      adminAlert: adminSettings.adminAlert,
      premiumLocked: adminSettings.premiumLocked,
      registeredUsersCount: registeredUsers.length,
      premiumSubscriptionPrice: adminSettings.premiumSubscriptionPrice || 29.99,
    });
  });

  // API Route: Update configuration parameters
  app.post('/api/config', (req, res) => {
    const session = getSession(getUserId(req));
    const prev = session.botConfig.isDemo;
    session.botConfig = { ...session.botConfig, ...req.body };
    if (!session.botState.isRunning) {
      session.botState.currentStake = session.botConfig.stake;
    }
    // If the demo/real toggle changed, swap the active account and pastTrades view
    if (prev !== session.botConfig.isDemo) {
      syncActiveAccount(session);
    }
    res.json({ success: true, botConfig: session.botConfig });
  });

  // API Route: Run the auto trader
  app.post('/api/start', (req, res) => {
    const session = getSession(getUserId(req));
    session.processedContracts.clear();
    session.cooldownExpiresAt = undefined;
    session.botState = {
      ...session.botState,
      isRunning: true,
      currentStake: session.botConfig.stake,
      consecutiveLosses: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      tradesCount: 0,
      status: 'waiting',
      cooldownActive: false,
      cooldownRemaining: 0,
      cooldownReason: 'none',
    };
    const activeInfo = SYMBOLS.find((s) => s.id === session.botState.symbol);
    addSessionLog(session, 'success', `▶️ AUTOMATED ACTION STARTED inside server stack for ${activeInfo?.short}! Cap protection consecutive ceiling: ${session.botConfig.maxLosses}.`);
    res.json({ success: true, botState: session.botState });
  });

  // API Route: Pause the automated trader
  app.post('/api/stop', (req, res) => {
    const session = getSession(getUserId(req));
    session.cooldownExpiresAt = undefined;
    session.botState = {
      ...session.botState,
      isRunning: false,
      status: 'idle',
      cooldownActive: false,
      cooldownRemaining: 0,
      cooldownReason: 'none',
    };
    addSessionLog(session, 'warning', '⏹️ AUTOMATED ACTION DE-ACTIVATED. System in standby mode.');
    res.json({ success: true, botState: session.botState });
  });

  // API Route: Select active symbol
  app.post('/api/select-symbol', (req, res) => {
    const session = getSession(getUserId(req));
    const { symbolId } = req.body;
    if (symbolId) {
      session.botState.symbol = symbolId;
      const act = SYMBOLS.find((s) => s.id === symbolId);
      addSessionLog(session, 'info', `🏷️ Loaded active asset target: ${act?.name || symbolId}`);
    }
    res.json({ success: true, botState: session.botState });
  });

  // API Route: Resume with a new symbol after pair credibility loss (advanced mode)
  app.post('/api/resume-with-symbol', (req, res) => {
    const session = getSession(getUserId(req));
    const { symbolId } = req.body;
    if (!symbolId || !symbolsState[symbolId]) {
      return res.status(400).json({ error: 'Invalid symbol ID' });
    }
    const info = SYMBOLS.find((s) => s.id === symbolId);
    session.botState = { ...session.botState, symbol: symbolId, isRunning: true, status: 'waiting' };
    addSessionLog(session, 'success', `▶️ SESSION RESUMED on ${info?.short || symbolId}. Pair swapped due to low win-rate.`);
    res.json({ success: true, botState: session.botState });
  });

  // API Route: Authorize Token API
  app.post('/api/authorize', (req, res) => {
    const { token, tgUserId } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No authorization token supplied.' });
    }
    const userId = tgUserId || 'default';
    const session = getSession(userId);

    const isMock = token.trim() === 'DEMO_MOCK_TOKEN' || token.trim().toUpperCase().startsWith('MOCK_DEMO_');
    if (isMock) {
      session.realAccount = {
        balance: 10000.00,
        currency: 'USD',
        email: 'demo-sandbox@nexscaniq.example',
        fullname: 'NexScan IQ Demo Trader (Sandbox)',
        is_virtual: true,
        loginid: 'VRTC1007421',
        scopes: ['read', 'trade'],
      };
      session.botConfig.isDemo = true; // it's still virtual
      syncActiveAccount(session);

      upsertRegistryUser({
        loginid: 'VRTC1007421',
        fullname: 'NexScan IQ Demo Trader (Sandbox)',
        email: 'demo-sandbox@nexscaniq.example',
        currency: 'USD',
        is_virtual: true,
        lastActive: new Date().toISOString()
      });

      session.botConfig.apiToken = token;
      session.authorizedWsStatus = 'connected';
      addSessionLog(session, 'success', '🔐 Restored Local Sandbox Simulated credentials. Standby mode.');
      return res.json({ success: true, account: session.account });
    }

    // Real Deriv Broker authentication
    initAuthorizedSocketForUser(userId, token);
    res.json({ success: true, message: 'Authorization process initialized on background server context.' });
  });

  // API Route: Deauthorize
  app.post('/api/deauthorize', async (req, res) => {
    const userId = getUserId(req);
    const session = getSession(userId);
    session.botConfig.apiToken = '';
    session.botConfig.isDemo = true; // switch back to demo mode
    session.authorizedWsStatus = 'idle';
    if (session.authorizedPingInterval) {
      clearInterval(session.authorizedPingInterval);
      session.authorizedPingInterval = null;
    }
    if (session.authorizedWs) {
      try { session.authorizedWs.close(); } catch(e){}
      session.authorizedWs = null;
    }
    // Clear the real account — demo account is already preserved in demoAccount
    session.realAccount = null;
    session.realPastTrades = [];
    syncActiveAccount(session);
    addSessionLog(session, 'warning', '🔓 Deriv token disconnected. Switched back to your demo account.');
    res.json({ success: true });
  });

  // API Route: Clear logging dashboard
  app.post('/api/clear-logs', (req, res) => {
    const session = getSession(getUserId(req));
    session.logs = [];
    addSessionLog(session, 'info', '🗑️ Server logs dashboard cleared.');
    res.json({ success: true });
  });

  // API Route: Clear past trades history
  app.post('/api/clear-trades', (req, res) => {
    const userId = getUserId(req);
    const session = getSession(userId);
    if (session.botConfig.isDemo) {
      session.demoPastTrades = [];
      session.pastTrades = [];
      saveUserDemoData(userId, session.demoAccount.balance, []);
    } else {
      session.realPastTrades = [];
      session.pastTrades = [];
    }
    addSessionLog(session, 'info', '🗑️ Past trading history cleared.');
    res.json({ success: true });
  });

  // API Route: Reset demo balance back to $1000 (user-initiated)
  app.post('/api/reset-demo-balance', (req, res) => {
    const userId = getUserId(req);
    const session = getSession(userId);
    session.demoAccount.balance = 1000.00;
    session.demoPastTrades = [];
    if (session.botConfig.isDemo) session.pastTrades = [];
    saveUserDemoData(userId, 1000.00, []);
    addSessionLog(session, 'success', '🔄 Demo balance reset to $1,000.00 USD.');
    res.json({ success: true, balance: 1000.00 });
  });

  // API Route: Restart scanning and reset all statistics
  app.post('/api/restart-scanning', (req, res) => {
    const session = getSession(getUserId(req));
    session.sessionStartTime = Date.now();
    globalTicks = 0;
    globalSignals = 0;
    Object.keys(symbolsState).forEach((key) => {
      symbolsState[key].ticks = 0;
      symbolsState[key].signals = 0;
      symbolsState[key].wins = 0;
      symbolsState[key].losses = 0;
      symbolsState[key].recentDigits = [];
      symbolsState[key].lastSignalTick = -99;
      symbolsState[key].pendingSignal = null;
      symbolsState[key].recentSignalExitDigits = [];
    });

    // Only reconnect WebSocket if actually down — never kill a healthy connection
    const wsState = publicWs ? publicWs.readyState : -1;
    if (!publicWs || wsState === 3 || wsState === 2) {
      try { initPublicSocket(); } catch (e) { console.warn('[restart] reconnect warning:', e); }
    }

    // Persist cleared state to MongoDB immediately
    saveSymbolsState().catch(() => {});
    saveSessionStartTime().catch(() => {});

    addSessionLog(session, 'success', '♻️ Scanner successfully restarted. All stats, win rates, and signal feeds fully reset.');
    res.json({ success: true });
  });

  // API Route: Start a new trading session (reset bot state after session complete/lost)
  app.post('/api/new-session', (req, res) => {
    const session = getSession(getUserId(req));
    session.botState = {
      ...session.botState,
      isRunning: false,
      consecutiveLosses: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      tradesCount: 0,
      status: 'idle',
      currentStake: session.botConfig.stake,
      lastTradeResult: null,
    };
    session.processedContracts.clear();
    addSessionLog(session, 'info', '🔄 New trading session initialized. Bot ready for next run.');
    res.json({ success: true, botState: session.botState });
  });

  // API Route: Verify Admin PIN code
  app.get('/api/public-settings', (req, res) => {
    res.json({
      success: true,
      appId: adminSettings.appId,
      markupPercent: adminSettings.markupPercent
    });
  });

  // API Route: Verify Admin PIN code

  // ── PREMIUM WAITLIST ─────────────────────────────────────────────────────
  app.post('/api/premium-waitlist', async (req, res) => {
    const { name, contact } = req.body;
    if (!name || !contact) return res.status(400).json({ success: false, error: 'Name and contact required.' });
    const c = col('premiumWaitlist');
    if (!c) return res.status(500).json({ success: false, error: 'Storage unavailable.' });
    try {
      const existing = await c.findOne({ contact } as any);
      if (existing) return res.json({ success: true, alreadyRegistered: true });
      await c.insertOne({ name: name.trim(), contact: contact.trim().toLowerCase(), joinedAt: new Date().toISOString(), notified: false } as any);
      res.json({ success: true, alreadyRegistered: false });
    } catch { res.status(500).json({ success: false, error: 'Failed to save.' }); }
  });

  app.post('/api/admin/get-waitlist', async (req, res) => {
    const { pin } = req.body;
    if (pin !== (process.env.ADMIN_PIN || '2003')) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    const c = col('premiumWaitlist');
    if (!c) return res.json({ success: true, entries: [], count: 0 });
    try {
      const entries = await c.find({}).sort({ joinedAt: -1 }).toArray();
      res.json({ success: true, entries, count: entries.length });
    } catch { res.status(500).json({ success: false, error: 'Failed to fetch.' }); }
  });

  app.post('/api/admin/toggle-premium-lock', (req, res) => {
    const { pin, locked } = req.body;
    if (pin !== (process.env.ADMIN_PIN || '2003')) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    adminSettings.premiumLocked = locked === true;
    saveAdminSettings();
    addLog('info', `🔒 Premium access ${adminSettings.premiumLocked ? 'LOCKED' : 'UNLOCKED'} by admin.`);
    res.json({ success: true, premiumLocked: adminSettings.premiumLocked });
  });

  app.post('/api/admin/verify-pin', (req, res) => {
    const { pin } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin === correctPin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Incorrect administrator PIN.' });
    }
  });

  // API Route: Obtain current persistent Creator/Admin Settings
  app.post('/api/admin/get-settings', (req, res) => {
    const { pin } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }
    res.json({ success: true, settings: adminSettings, registeredUsers, premiumCredentials: sanitizeCredentials(premiumCredentials), premiumSubmissions });
  });

  // Helper: Securely register application via WebSocket using Creator API Token
  function registerDerivAppWithToken(token: string, markupPercent: number, requestOrigin?: string, appName: string = "NexScan IQ Bot"): Promise<number> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
      let isSettled = false;

      const timeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try { ws.close(); } catch (e) {}
          reject(new Error('Deriv server handshake timeout. Please check your network connection or token.'));
        }
      }, 15000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ authorize: token }));
      });

      ws.on('message', (msgData: any) => {
        try {
          const rawString = msgData.toString();
          const data = JSON.parse(rawString);

          if (data.error) {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeout);
              try { ws.close(); } catch (e) {}
              const errMsg = data.error.message || 'Unknown Deriv API validation error.';
              const customErr: any = new Error(errMsg);
              customErr.code = data.error.code;
              customErr.details = data.error.details;
              reject(customErr);
            }
            return;
          }

          if (data.msg_type === 'authorize') {
            const appUrl = requestOrigin || process.env.APP_URL || 'https://ais-pre-34b5giynxskpkq343znvkq-147708293252.europe-west2.run.app';
            
            const registerPayload: any = {
              app_register: 1,
              name: appName,
              redirect_uri: appUrl,
              verification_uri: appUrl,
              scopes: ["read", "trade"]
            };

            // Only add markup percentage if strictly greater than 0
            if (markupPercent > 0) {
              registerPayload.app_markup_percentage = parseFloat(markupPercent.toFixed(2));
            }

            ws.send(JSON.stringify(registerPayload));
          } else if (data.msg_type === 'app_register') {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeout);
              try { ws.close(); } catch (e) {}
              const registeredApp = data.app_register;
              if (registeredApp && registeredApp.app_id) {
                resolve(Number(registeredApp.app_id));
              } else {
                reject(new Error('No App ID was returned in the registration payload.'));
              }
            }
          }
        } catch (err: any) {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeout);
            try { ws.close(); } catch (e) {}
            reject(err);
          }
        }
      });

      ws.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeout);
          try { ws.close(); } catch (e) {}
          reject(err);
        }
      });

      ws.on('close', () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket connection with Deriv was closed pre-maturely.'));
        }
      });
    });
  }

  // API Route: Register App ID dynamically using Creator Token
  app.post('/api/admin/register-app', async (req, res) => {
    const { pin, creatorToken, markupPercent } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }

    if (!creatorToken || !creatorToken.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter a valid Creator API Token.' });
    }

    const parsedMarkup = parseFloat(markupPercent);
    if (isNaN(parsedMarkup) || parsedMarkup < 0 || parsedMarkup > 5.0) {
      return res.status(400).json({ success: false, error: 'Markup Rate % must be between 0% and 5%.' });
    }

    let currentMarkup = parsedMarkup;
    let finalAppName = "NexScan IQ Bot";
    let attempts = 0;
    const maxAttempts = 5;
    let registeredAppId = 0;
    let lastError: any = null;

    const requestOrigin = req.get('origin') || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);

    while (attempts < maxAttempts) {
      attempts++;
      try {
        addLog('warning', `⚙️ Dynamic registration [Attempt ${attempts}/${maxAttempts}]: Contacting Deriv (name="${finalAppName}", markup=${currentMarkup}%)...`);
        registeredAppId = await registerDerivAppWithToken(creatorToken.trim(), currentMarkup, requestOrigin, finalAppName);
        lastError = null;
        break; // Successfully registered!
      } catch (err: any) {
        lastError = err;
        const errMessage = (err.message || '').toLowerCase();
        const errCode = (err.code || '').toLowerCase();

        addLog('error', `⚠️ Attempt ${attempts} registration failed inside server core: [Code: ${err.code}] Message: "${err.message}"`);

        // Check if name is taken
        if (errMessage.includes('name is taken') || errMessage.includes('taken') || errCode.includes('taken')) {
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          finalAppName = `NexScan IQ Bot ${randomSuffix}`;
          addLog('warning', `⚡ Recovery: App Name is taken on Deriv server. Regenerating name to "${finalAppName}" and auto-retrying...`);
          continue;
        }

        // Check if markup percentage is rejected
        if (errMessage.includes('app_markup_percentage') || errCode.includes('app_markup_percentage') || errMessage.includes('markup')) {
          if (currentMarkup > 0) {
            currentMarkup = 0;
            addLog('warning', `⚡ Recovery: Partner-configured commission markup is rejected by Deriv (often due to non-affiliate/non-partner account status). Retrying registration with 0% Markup...`);
            continue;
          }
        }

        // If it's some other non-recoverable error, break immediately (e.g. invalid token)
        break;
      }
    }

    if (lastError) {
      const displayMsg = lastError.message || 'Dynamic registration failed. Please check your Creator API Token scopes.';
      addLog('error', `❌ All self-healing registration attempts exhausted. Last Error: ${displayMsg}`);
      return res.status(400).json({ success: false, error: displayMsg });
    }

    try {
      const oldAppId = adminSettings.appId;
      adminSettings.appId = registeredAppId;
      adminSettings.creatorToken = creatorToken.trim();
      adminSettings.markupPercent = currentMarkup;
      saveAdminSettings();

      let successLog = `🎉 DYNAMIC REGISTRATION SUCCESS: App ID ${registeredAppId} registered on your Deriv account under the name "${finalAppName}".`;
      if (currentMarkup > 0) {
        successLog += ` Automatically tracking a ${currentMarkup}% markup commission!`;
      } else if (parsedMarkup > 0 && currentMarkup === 0) {
        successLog += ` (Note: Commission was gracefully lowered to 0% because your account does not support markup).`;
      }
      addLog('success', successLog);

      // Trigger socket reconnected with new App ID
      if (oldAppId !== registeredAppId) {
        initPublicSocket();
        
        if (authorizedWs) {
          try {
            authorizedWs.close();
          } catch (e) {}
          authorizedWs = null;
          authorizedWsStatus = 'idle';
          addLog('warning', '🔐 Active broker credentials disconnected due to App ID change. Client must re-authenticate.');
        }
      }

      res.json({ 
        success: true, 
        appId: registeredAppId, 
        settings: adminSettings,
        registeredName: finalAppName,
        markupApplied: currentMarkup === parsedMarkup,
        adjustedMarkup: currentMarkup
      });
    } catch (routeErr: any) {
      addLog('error', `❌ Error finishing settings update: ${routeErr.message}`);
      res.status(500).json({ success: false, error: routeErr.message });
    }
  });

  // API Route: Update persistent Creator/Admin Settings
  app.post('/api/admin/save-settings', (req, res) => {
    const { pin, settings } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }

    if (!settings) {
      return res.status(400).json({ success: false, error: 'No configuration payload supplied.' });
    }

    const { appId, markupPercent, affiliateToken, creatorToken, maintenanceMode, adminAlert, premiumSubscriptionPrice } = settings;
    const parsedAppId = parseInt(appId, 10);
    const parsedMarkup = parseFloat(markupPercent);
    const parsedPrice = parseFloat(premiumSubscriptionPrice);

    if (isNaN(parsedAppId) || parsedAppId <= 0) {
      return res.status(400).json({ success: false, error: 'App ID must be a positive integer.' });
    }

    if (isNaN(parsedMarkup) || parsedMarkup < 0 || parsedMarkup > 10.0) {
      return res.status(400).json({ success: false, error: 'Markup Rate % must be between 0% and 10%.' });
    }

    const oldAppId = adminSettings.appId;

    adminSettings.appId = parsedAppId;
    adminSettings.markupPercent = parsedMarkup;
    adminSettings.affiliateToken = affiliateToken || '';
    adminSettings.creatorToken = creatorToken || '';
    adminSettings.maintenanceMode = maintenanceMode === true;
    adminSettings.adminAlert = adminAlert || '';
    adminSettings.premiumLocked = settings.premiumLocked === true;
    if (!isNaN(parsedPrice) && parsedPrice >= 0) {
      adminSettings.premiumSubscriptionPrice = parsedPrice;
    }
    saveAdminSettings();

    addLog('success', `🔧 SYSTEM UPDATE: App ID: ${parsedAppId}, Markup: ${parsedMarkup}%, Active Maintenance: ${adminSettings.maintenanceMode}, Sys Alert Msg: "${adminSettings.adminAlert}", Premium Price: $${adminSettings.premiumSubscriptionPrice || 29.99}`);

    // If the registered App ID was changed by the administrator, trigger a clean socket reconnection
    if (oldAppId !== parsedAppId) {
      addLog('info', `🔄 APPLICABLE APP ID SHIFT: Reconnecting WebSocket services under new App ID ${parsedAppId}...`);
      initPublicSocket();
      
      // If a secure broker proxy was active, terminate it so the user can re-authenticate cleanly under the new app_id
      if (authorizedWs) {
        try {
          authorizedWs.close();
        } catch (e) {}
        authorizedWs = null;
        authorizedWsStatus = 'idle';
        addLog('warning', '🔐 Active broker credentials disconnected due to App ID change. Client must re-authenticate.');
      }
    }

    res.json({ success: true, settings: adminSettings, registeredUsers, premiumCredentials: sanitizeCredentials(premiumCredentials), premiumSubmissions });
  });

  // API Route: Delete specific user from user tracking list
  app.post('/api/admin/remove-user', (req, res) => {
    const { pin, loginid } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }

    if (!loginid) {
      return res.status(400).json({ success: false, error: 'User Login ID value is required.' });
    }

    const initialLength = registeredUsers.length;
    registeredUsers = registeredUsers.filter(u => u.loginid !== loginid);
    saveUserRegistry();

    addLog('warning', `⚙️ ADMIN: Removed user ID "${loginid}" from the local workspace registry database.`);
    res.json({ success: true, deleted: registeredUsers.length < initialLength, registeredUsers });
  });

  // API Route: Clear all users
  app.post('/api/admin/clear-users', (req, res) => {
    const { pin } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }

    registeredUsers = [];
    saveUserRegistry();
    addLog('warning', '⚙️ ADMIN: Cleared out user registry history databases completely.');
    res.json({ success: true, registeredUsers });
  });

  // ==========================================
  // Premium Autopilot Credentials API Routes
  // ==========================================

  // Admin Route: Get all Premium accounts
  app.post('/api/admin/get-premium-credentials', (req, res) => {
    const { pin } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }
    res.json({ success: true, premiumCredentials: sanitizeCredentials(premiumCredentials) });
  });

  // Admin Route: Create/Generate active premium logins (Only one device login tracked via activeSessionId)
  app.post('/api/admin/generate-premium-credential', (req, res) => {
    const { pin, username, password, derivApiToken } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Both username and password are required.' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (trimmedUsername.length < 3 || trimmedPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'Username must be >= 3 chars, password >= 4 chars.' });
    }

    const exists = premiumCredentials.some(c => c.username === trimmedUsername);
    if (exists) {
      return res.status(400).json({ success: false, error: `Account with username "${trimmedUsername}" already exists.` });
    }

    const newCred: PremiumCredential = {
      username: trimmedUsername,
      password: hashPassword(trimmedPassword),
      createdAt: new Date().toISOString(),
      activeSessionId: null,
      lastActive: null,
      derivApiToken: derivApiToken ? derivApiToken.trim() : ''
    };

    premiumCredentials.push(newCred);
    savePremiumCredentials();

    addLog('success', `⚙️ ADMIN: Generated new Premium Access Account: "${trimmedUsername}"`);
    res.json({ success: true, premiumCredentials: sanitizeCredentials(premiumCredentials) });
  });

  // Admin Route: Delete a premium access login
  app.post('/api/admin/delete-premium-credential', (req, res) => {
    const { pin, username } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }

    if (!username) {
      return res.status(400).json({ success: false, error: 'Target username is required.' });
    }

    const target = username.trim().toLowerCase();
    premiumCredentials = premiumCredentials.filter(c => c.username !== target);
    savePremiumCredentials();

    addLog('warning', `⚙️ ADMIN: Suspended or deleted Premium Access Account: "${target}"`);
    res.json({ success: true, premiumCredentials: sanitizeCredentials(premiumCredentials) });
  });

  // Admin Route: Revoke session (kick device / log out user)
  app.post('/api/admin/kick-premium-credential', (req, res) => {
    const { pin, username } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }

    if (!username) {
      return res.status(400).json({ success: false, error: 'Target username is required.' });
    }

    const target = username.trim().toLowerCase();
    const index = premiumCredentials.findIndex(c => c.username === target);
    if (index !== -1) {
      premiumCredentials[index].activeSessionId = null;
      savePremiumCredentials();
    }

    addLog('warning', `⚙️ ADMIN: Cleared active device handle for Premium Account: "${target}"`);
    res.json({ success: true, premiumCredentials: sanitizeCredentials(premiumCredentials) });
  });

  // Client Premium submit subscription (processes payment simulation, saves Deriv API Token)
  app.post('/api/premium/submit-subscription', (req, res) => {
    const { cardholderName, cardNumber, expiry, cvc, derivApiToken } = req.body;
    
    if (!cardholderName || !cardNumber || !derivApiToken) {
      return res.status(400).json({ success: false, error: 'Cardholder Name, Card Number, and Deriv API Token are required.' });
    }

    if (!derivApiToken.trim()) {
      return res.status(400).json({ success: false, error: 'A valid Deriv API Token is required.' });
    }

    const newSubmission: PremiumSubmission = {
      id: 'sub_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
      cardholderName: cardholderName.trim(),
      derivApiToken: derivApiToken.trim(),
      amount: adminSettings.premiumSubscriptionPrice || 29.99,
      timestamp: new Date().toISOString()
    };

    premiumSubmissions.push(newSubmission);
    savePremiumSubmissions();

    addLog('success', `💳 PAYMENT: Generated subscription payment checkout for "${cardholderName.trim()}" with Deriv API Token.`);
    res.json({
      success: true,
      message: 'Subscription payment simulation processed successfully! Deriv API Token was linked.'
    });
  });

  // Admin Route: Delete specific checkout submission
  app.post('/api/admin/delete-submission', (req, res) => {
    const { pin, id } = req.body;
    const correctPin = process.env.ADMIN_PIN || '2003';
    if (pin !== correctPin) {
      return res.status(401).json({ success: false, error: 'Unauthorized credentials.' });
    }
    premiumSubmissions = premiumSubmissions.filter(s => s.id !== id);
    savePremiumSubmissions();
    res.json({ success: true, premiumSubmissions });
  });

  // Client Premium login verify (Forces single-device handle via unique activeSessionId)
  app.post('/api/premium/verify-login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Please enter both username and password.' });
    }

    const target = username.trim().toLowerCase();
    const pass = password.trim();

    const matchedIndex = premiumCredentials.findIndex(c => c.username === target);
    if (matchedIndex === -1) {
      return res.status(401).json({ success: false, error: 'Invalid premium credentials or subscription expired.' });
    }

    const cred = premiumCredentials[matchedIndex];

    // Migrate plaintext passwords to hashed on first login (backwards-compatible)
    ensurePasswordHashed(cred, matchedIndex);

    if (!verifyPassword(pass, premiumCredentials[matchedIndex].password)) {
      return res.status(401).json({ success: false, error: 'Invalid premium credentials or subscription expired.' });
    }

    // Single active device lock handler: Generate random sessionId
    const uniqueSessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    
    premiumCredentials[matchedIndex].activeSessionId = uniqueSessionId;
    premiumCredentials[matchedIndex].lastActive = new Date().toISOString();
    savePremiumCredentials();

    addLog('success', `👑 PREMIUM: Subscription verified. Account "${target}" logged in. Previous devices invalidated.`);
    res.json({ 
      success: true, 
      username: target, 
      sessionId: uniqueSessionId,
      derivApiToken: cred.derivApiToken || ''
    });
  });

  // Client Session validator
  app.post('/api/premium/validate-session', (req, res) => {
    const { username, sessionId } = req.body;
    if (!username || !sessionId) {
      return res.json({ success: true, valid: false });
    }

    const target = username.trim().toLowerCase();
    const cred = premiumCredentials.find(c => c.username === target);

    if (!cred || cred.activeSessionId !== sessionId) {
      return res.json({ success: true, valid: false });
    }

    // Extend active time
    cred.lastActive = new Date().toISOString();
    res.json({ 
      success: true, 
      valid: true,
      derivApiToken: cred.derivApiToken || ''
    });
  });

  // Get premium autopilot background state
  app.get('/api/premium/autopilot-state', (req, res) => {
    // Validate session from query params
    const { username, sessionId } = req.query as { username?: string; sessionId?: string };
    if (!username || !sessionId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const target = username.trim().toLowerCase();
    const cred = premiumCredentials.find(c => c.username === target);
    if (!cred || cred.activeSessionId !== sessionId) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }

    res.json({
      success: true,
      autopilotState,
      autopilotLogs,
    });
  });

  // Launch premium autopilot on server
  app.post('/api/premium/start-autopilot', (req, res) => {
    // Server-side lock enforcement — cannot be bypassed from the frontend
    if (adminSettings.premiumLocked) {
      return res.status(403).json({ success: false, error: 'Premium access is currently locked by the administrator.' });
    }

    const { 
      customMaxWins, 
      customMaxLosses, 
      customMartingale, 
      autopilotStakeMode, 
      customStakePercent, 
      customFixedStake 
    } = req.body;

    // Reset dates if transitioning from idle
    if (autopilotState.status === 'idle') {
      autopilotState.warmupStart = Date.now();
      autopilotState.status = 'warmup';
      autopilotState.countdown = 600;
      autopilotLogs = [];
      addPremiumLog('👑 PRE-FLIGHT COMPLETED: Premium Autopilot successfully activated on background thread.');
      addPremiumLog('⏳ WARMUP COUNTDOWN: Commencing 10 minutes broker stabilization and pre-scan calibration...');
    }

    if (customMaxWins !== undefined) autopilotState.customMaxWins = Number(customMaxWins);
    if (customMaxLosses !== undefined) autopilotState.customMaxLosses = Number(customMaxLosses);
    if (customMartingale !== undefined) autopilotState.customMartingale = Number(customMartingale);
    if (autopilotStakeMode !== undefined) autopilotState.autopilotStakeMode = autopilotStakeMode;
    if (customStakePercent !== undefined) autopilotState.customStakePercent = Number(customStakePercent);
    if (customFixedStake !== undefined) autopilotState.customFixedStake = Number(customFixedStake);

    res.json({ success: true, autopilotState });
  });

  // Turn off premium autopilot
  app.post('/api/premium/stop-autopilot', (req, res) => {
    autopilotState.status = 'idle';
    autopilotState.countdown = 0;
    autopilotState.warmupStart = null;
    autopilotState.cooldownStartedAt = null;
    autopilotState.countdownNextStart = null;
    autopilotState.targetCandidate = null;

    // Also request stopping underlying bot state if running
    botState.isRunning = false;
    botState.status = 'idle';

    // Stop bot running status for all user sessions in sync
    for (const session of userSessions.values()) {
      session.botState.isRunning = false;
      session.botState.status = 'idle';
      addSessionLog(session, 'info', `⏹️ AUTOPILOT DE-ACTIVATED: Automatic trade pipeline stopped.`);
    }

    addPremiumLog('⏹️ DE-ACTIVATION: Autopilot fully disengaged and placed in standby.');
    res.json({ success: true, autopilotState });
  });

  // Link user's Deriv API Token and pair it with their premium credentials
  app.post('/api/premium/link-token', (req, res) => {
    const { username, sessionId, token } = req.body;
    if (!username || !sessionId || !token) {
      return res.status(400).json({ success: false, error: 'Username, session, and API token are required.' });
    }

    const target = username.trim().toLowerCase();
    const index = premiumCredentials.findIndex(c => c.username === target);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Premium subscriber account not found.' });
    }

    const cred = premiumCredentials[index];
    if (cred.activeSessionId !== sessionId) {
      return res.status(401).json({ success: false, error: 'Invalid or expired active session.' });
    }

    // Save/update the token in premium credentials list
    premiumCredentials[index].derivApiToken = token.trim();
    savePremiumCredentials();

    addLog('success', `👑 PREMIUM: Linked/Updated Deriv API Token for premium account "${target}"`);
    res.json({ 
      success: true, 
      message: 'Deriv API Token linked successfully to your subscription profile.',
      derivApiToken: token.trim() 
    });
  });

  // Unlink user's Deriv API Token from their premium credentials
  app.post('/api/premium/unlink-token', (req, res) => {
    const { username, sessionId } = req.body;
    if (!username || !sessionId) {
      return res.status(400).json({ success: false, error: 'Username and session are required.' });
    }

    const target = username.trim().toLowerCase();
    const index = premiumCredentials.findIndex(c => c.username === target);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Premium subscriber account not found.' });
    }

    const cred = premiumCredentials[index];
    if (cred.activeSessionId !== sessionId) {
      return res.status(401).json({ success: false, error: 'Invalid or expired active session.' });
    }

    // Unlink/clear the token
    premiumCredentials[index].derivApiToken = '';
    savePremiumCredentials();

    addLog('warning', `👑 PREMIUM: Unlinked Deriv API Token for premium account "${target}"`);
    res.json({ 
      success: true, 
      message: 'Deriv API Token successfully unlinked.'
    });
  });

  // Start Background Public feeds
  initPublicSocket();

  // Vite builder / static compiler setup - robust production detection
  // This avoids importing 'vite' in the production container which causes startup crashes.
  const isProduction = process.env.NODE_ENV === 'production' || 
                       (typeof __dirname !== 'undefined' && __dirname.includes('dist')) || 
                       (process.argv[1] && (process.argv[1].includes('dist') || process.argv[1].includes('server.cjs')));

  if (!isProduction) {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteError: any) {
      console.warn('⚡ Warning: Failed to load Vite development server middleware. Falling back to static production file serving:', viteError.message);
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Health endpoint for keep-alive
  app.get('/health', (_req, res) => res.status(200).send('ok'));

  // Auto-reset timing
  let autoResetStartTime = Date.now();
  const AUTO_RESET_INTERVAL_MS = 60 * 60 * 1000;

  function performAutoReset() {
    console.log('[auto-reset] 60-min cycle — resetting scanner...');
    autoResetStartTime = Date.now();
    globalTicks = 0;
    globalSignals = 0;
    Object.keys(symbolsState).forEach((key) => {
      symbolsState[key].ticks = 0;
      symbolsState[key].signals = 0;
      symbolsState[key].wins = 0;
      symbolsState[key].losses = 0;
      symbolsState[key].recentDigits = [];
      symbolsState[key].lastSignalTick = -99;
      symbolsState[key].pendingSignal = null;
    });
    userSessions.forEach((session) => { session.sessionStartTime = Date.now(); });
    const wsState = publicWs ? publicWs.readyState : -1;
    if (!publicWs || wsState === 3 || wsState === 2) {
      try { initPublicSocket(); } catch (e) {}
    }
    saveSymbolsState().catch(() => {});
    saveSessionStartTime().catch(() => {});
    console.log('[auto-reset] Done.');
  }

  app.get('/api/reset-timer', (_req, res) => {
    const elapsed = Date.now() - autoResetStartTime;
    const remaining = Math.max(0, AUTO_RESET_INTERVAL_MS - elapsed);
    res.json({ remainingMs: remaining, elapsedMs: elapsed, intervalMs: AUTO_RESET_INTERVAL_MS });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    const SELF_URL = process.env.APP_URL || `http://0.0.0.0:${PORT}`;
    setInterval(() => {
      fetch(`${SELF_URL}/health`).then(() => {}).catch(() => {});
    }, 4 * 60 * 1000);

    setInterval(performAutoReset, AUTO_RESET_INTERVAL_MS);
    console.log('[auto-reset] 60-min reset armed.');

    setInterval(async () => {
      await saveSymbolsState();
      await saveSessionStartTime();
    }, 2 * 60 * 1000);
    console.log('[persist] Auto-save armed (every 2 min).');
  });
}

run().catch((err) => {
  console.error('Fatal Server crash on startup:', err);
});
