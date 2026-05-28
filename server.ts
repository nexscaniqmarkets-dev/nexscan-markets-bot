import express from 'express';
import path from 'path';
import { WebSocket } from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

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
  status: 'idle' | 'waiting' | 'trading' | 'won_limit' | 'lost_limit' | 'error';
  lastTradeResult: 'win' | 'loss' | null;
}

interface LogMessage {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade';
  message: string;
}

interface AdminSettings {
  appId: number;
  markupPercent: number;
  affiliateToken: string;
  creatorToken: string;
  totalClientVolume: number;
  totalMarkupEarnings: number;
}

const ADMIN_CONFIG_PATH = path.join(process.cwd(), 'admin-config.json');

let adminSettings: AdminSettings = {
  appId: 1089,
  markupPercent: 1.5,
  affiliateToken: '',
  creatorToken: '',
  totalClientVolume: 0,
  totalMarkupEarnings: 0,
};

function loadAdminSettings() {
  try {
    if (fs.existsSync(ADMIN_CONFIG_PATH)) {
      const data = fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      adminSettings = {
        appId: Number(parsed.appId) || 1089,
         markupPercent: parsed.markupPercent !== undefined ? Number(parsed.markupPercent) : 1.5,
        affiliateToken: parsed.affiliateToken || '',
        creatorToken: parsed.creatorToken || '',
        totalClientVolume: Number(parsed.totalClientVolume) || 0,
        totalMarkupEarnings: Number(parsed.totalMarkupEarnings) || 0,
      };
      console.log('Successfully loaded persisted Admin Settings:', adminSettings);
    } else {
      saveAdminSettings();
    }
  } catch (err) {
    console.error('Failed to parse or read admin settings:', err);
  }
}

function saveAdminSettings() {
  try {
    fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(adminSettings, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write admin settings persistently:', err);
  }
}

// Bootstrap admin configs immediately
loadAdminSettings();

const SYMBOLS: SymbolInfo[] = [
  { id: 'R_10', name: 'Volatility 10 Index', short: 'V10', vol: 10, tier: 'STD', pip: 0.001 },
  { id: 'R_25', name: 'Volatility 25 Index', short: 'V25', vol: 25, tier: 'STD', pip: 0.001 },
  { id: 'R_50', name: 'Volatility 50 Index', short: 'V50', vol: 50, tier: 'STD', pip: 0.01 },
  { id: 'R_75', name: 'Volatility 75 Index', short: 'V75', vol: 75, tier: 'STD', pip: 0.0001 },
  { id: 'R_100', name: 'Volatility 100 Index', short: 'V100', vol: 100, tier: 'STD', pip: 0.01 },
  { id: '1HZ10V', name: 'Volatility 10 (1s) Index', short: 'V10 1s', vol: 10, tier: '1S', pip: 0.001 },
  { id: '1HZ25V', name: 'Volatility 25 (1s) Index', short: 'V25 1s', vol: 25, tier: '1S', pip: 0.001 },
  { id: '1HZ50V', name: 'Volatility 50 (1s) Index', short: 'V50 1s', vol: 50, tier: '1S', pip: 0.01 },
  { id: '1HZ75V', name: 'Volatility 75 (1s) Index', short: 'V75 1s', vol: 75, tier: '1S', pip: 0.0001 },
  { id: '1HZ100V', name: 'Volatility 100 (1s) Index', short: 'V100 1s', vol: 100, tier: '1S', pip: 0.01 },
];

function getLastDigit(price: number, pip: number): number {
  const dec = Math.max(0, Math.round(-Math.log10(pip)));
  return Math.abs(Math.round(price * Math.pow(10, dec))) % 10;
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
  };
});

let botConfig: BotConfig = {
  apiToken: '',
  isDemo: true,
  stake: 0.35,
  martingaleMultiplier: 2.0,
  maxWins: 2,
  maxLosses: 5,
  targetProfit: 0,
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

addLog('info', '🧠 Background persistence trading module booting up...');

// -----------------------------------------------------------------------------
// WEBSOCKET CHANNELS MANAGEMENT
// -----------------------------------------------------------------------------
let publicWs: WebSocket | null = null;
let authorizedWs: WebSocket | null = null;
let lastAuthorizedToken = '';
let authorizedWsStatus: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';
let publicPingInterval: NodeJS.Timeout | null = null;
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
    
    // Subscribe to all 10 indices with safety guards
    SYMBOLS.forEach((sym) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ticks: sym.id, subscribe: 1 }));
        }
      } catch (err) {
        console.error(`Error sending subscription for ${sym.id}:`, err);
      }
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
      addLog('error', `⚠️ Public Deriv feed reports error: ${data.error.message}`);
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

      // Settle simulated contract on actual next live tick update
      if (pendingSimulatedTrade && pendingSimulatedTrade.symbol === symId) {
        const trade = pendingSimulatedTrade;
        pendingSimulatedTrade = null; // Clear to prevent double processing

        const didWin = newDigit > 4;
        const profitValue = didWin ? parseFloat((trade.stake * 0.95).toFixed(2)) : -trade.stake;

        settleContract(
          didWin ? 'won' : 'lost',
          profitValue,
          trade.stake,
          didWin ? `V-Win (Exit Digit: ${newDigit} > 4)` : `V-Loss (Exit Digit: ${newDigit} <= 4)`
        );
      }

      const oldPrice = s.price;
      const direction = oldPrice === null ? null : newPrice > oldPrice ? 'rise' : newPrice < oldPrice ? 'fall' : s.direction;
      
      let { wins, losses, signals, pendingSignal, lastSignalTick } = s;
      const currentTickId = s.ticks + 1;

      // Process simulated results for scanner performance
      if (pendingSignal !== null) {
        if (newDigit > pendingSignal.barrier) {
          wins++;
        } else {
          losses++;
        }
        pendingSignal = null;
      }

      // Scanner entry condition matching
      const isEntry = direction === 'rise' && (newDigit === 4 || newDigit === 5);
      if (isEntry) {
        signals++;
        pendingSignal = { barrier: 4, tickId: currentTickId };
        lastSignalTick = currentTickId;
        globalSignals++;

        // Trigger action IF this index is the bot's current selection and bot is active
        if (symId === botState.symbol && botState.isRunning) {
          triggerBotEntry(symId, newDigit);
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
      };

      globalTicks++;
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

// Trigger buy orders for the autotrader
function triggerBotEntry(symId: string, entryDigit: number) {
  if (botState.status === 'trading') return; // block simultaneous overlapping trades

  const activeStake = parseFloat(botState.currentStake.toFixed(2));
  addLog('trade', `🎯 Background Trigger Locked: Last decimal was ${entryDigit} on ${symId}. Evaluating trade params...`);

  // Simple sandbox simulator mode matching live market outcome rules exactly
  if (!account || account.fullname.toLowerCase().includes('sandbox') || account.fullname.toLowerCase().includes('demo')) {
    botState.status = 'trading';
    addLog('info', `🗳️ [SANDBOX ENGINE] Dispatching trade ticket. Stake: $${activeStake.toFixed(2)}. Contract bought at Entry Spot. Waiting for next tick quote to settle contract...`);
    
    pendingSimulatedTrade = {
      symbol: symId,
      stake: activeStake
    };
  } else {
    // Live authorized broker execution
    try {
      if (authorizedWs && authorizedWs.readyState === WebSocket.OPEN) {
        botState.status = 'trading';
        addLog('info', `🗳️ [LIVE PRODUCTION] Submitting Deriv Order Ticket: stake $${activeStake.toFixed(2)} USD.`);
        
        authorizedWs.send(JSON.stringify({
          buy: 1,
          price: activeStake,
          parameters: {
            amount: activeStake,
            basis: 'stake',
            contract_type: 'DIGITOVER',
            currency: account.currency || 'USD',
            duration: 1,
            duration_unit: 't',
            barrier: '4',
            symbol: symId,
            app_markup_percentage: adminSettings.markupPercent
          }
        }));
      } else {
        // Handle offline, connecting, or disconnected states dynamically by establishing automatic reconnection
        if (botConfig.apiToken && (!authorizedWs || authorizedWs.readyState !== WebSocket.CONNECTING)) {
          addLog('warning', '🔄 Secure API connection is currently offline. Triggering immediate auto-reconnection...');
          initAuthorizedSocket(botConfig.apiToken);
        }
        
        authorizedWsStatus = 'connecting';
        addLog('warning', '⏳ Live trade deferred: Secure API channel is reconnecting. Retrying entry on next incoming feedback tick...');
      }
    } catch (err: any) {
      addLog('error', `❌ Live order submission failed: ${err.message}`);
      botState.status = 'error';
    }
  }
}

// Settle contract outcomes
function settleContract(status: 'won' | 'lost', profitValue: number, buyPrice: number, description: string) {
  const isWin = status === 'won';

  const updatedWins = isWin ? botState.wins + 1 : botState.wins;
  const updatedLosses = !isWin ? botState.losses + 1 : botState.losses;
  const updatedConsecutiveLosses = isWin ? 0 : botState.consecutiveLosses + 1;
  const updatedProfit = botState.profit + profitValue;

  // Add settled trade to pastTrades history
  pastTrades.unshift({
    id: Math.random().toString(36).substring(2, 9),
    symbol: botState.symbol,
    timestamp: new Date().toISOString(),
    outcome: isWin ? 'win' : 'loss',
    stake: buyPrice,
    profit: profitValue,
    description: description,
  });

  addLog(
    isWin ? 'success' : 'trade',
    isWin
      ? `🎉 Trade WON! Profit: +$${profitValue.toFixed(2)} USD. DetailRef: ${description}`
      : `💀 Trade LOST! Stake lost: -$${Math.abs(profitValue).toFixed(2)} USD. DetailRef: ${description}`
  );

  let runStatus = botState.isRunning;
  let botStateStatus: BotState['status'] = 'waiting';
  let nextStake = botConfig.stake;

  const targetReached = botConfig.targetProfit > 0 && updatedProfit >= botConfig.targetProfit;
  const winsLimitReached = updatedWins >= botConfig.maxWins;
  const lossesLimitReached = updatedConsecutiveLosses >= botConfig.maxLosses;

  if (targetReached || winsLimitReached) {
    runStatus = false;
    botStateStatus = 'won_limit';
    addLog('success', `🏆 AUTO-TRADER GOAL ACHIEVED! Profit Target / Max Wins completed. Saved Net: $${updatedProfit.toFixed(2)} USD.`);
  } else if (lossesLimitReached) {
    runStatus = false;
    botStateStatus = 'lost_limit';
    addLog('warning', `🚨 CAPITAL PROTECTION BREACH: Consecutive loss ceiling reached (${updatedConsecutiveLosses}). Martingale terminated.`);
  } else {
    if (isWin) {
      nextStake = botConfig.stake;
    } else {
      nextStake = parseFloat((botState.currentStake * botConfig.martingaleMultiplier).toFixed(2));
      addLog('warning', `⚡ Martingale escalation: Stake raised $${botState.currentStake.toFixed(2)} → $${nextStake.toFixed(2)} USD.`);
    }
  }

  botState = {
    ...botState,
    isRunning: runStatus,
    currentStake: nextStake,
    consecutiveLosses: updatedConsecutiveLosses,
    wins: updatedWins,
    losses: updatedLosses,
    profit: updatedProfit,
    tradesCount: botState.tradesCount + 1,
    status: botStateStatus,
    lastTradeResult: isWin ? 'win' : 'loss',
  };

  // Balance is updated automatically via Deriv's real-time balance subscription
  // Manual update removed to prevent double deduction in the interface

  // Update creator/owner markup metrics dynamically
  adminSettings.totalClientVolume = parseFloat((adminSettings.totalClientVolume + buyPrice).toFixed(2));
  adminSettings.totalMarkupEarnings = parseFloat((adminSettings.totalMarkupEarnings + (buyPrice * (adminSettings.markupPercent / 100))).toFixed(2));
  saveAdminSettings();
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

      botConfig.apiToken = token;
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

        settleContract(
          status,
          parseFloat(contract.profit),
          parseFloat(contract.buy_price),
          contract.longcode || 'Real Asset Settlement'
        );
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

// -----------------------------------------------------------------------------
// SERVER INIT PROCESS & EXPRESS HTTP SERVICE API
// -----------------------------------------------------------------------------
async function run() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get state
  app.get('/api/state', (req, res) => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const hrs = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    const sessionTimeFormatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    res.json({
      botConfig,
      botState,
      symbolsState,
      logs,
      account,
      connectionStatus,
      authorizedWsStatus,
      globalTicks,
      globalSignals,
      pastTrades,
      sessionTime: sessionTimeFormatted,
      sessionUptime: elapsed,
    });
  });

  // API Route: Update configuration parameters
  app.post('/api/config', (req, res) => {
    botConfig = {
      ...botConfig,
      ...req.body,
    };
    // Sync active state stake if bot is standby
    if (!botState.isRunning) {
      botState.currentStake = botConfig.stake;
    }
    res.json({ success: true, botConfig });
  });

  // API Route: Run the auto trader
  app.post('/api/start', (req, res) => {
    processedContracts.clear();
    botState = {
      ...botState,
      isRunning: true,
      currentStake: botConfig.stake,
      consecutiveLosses: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      tradesCount: 0,
      status: 'waiting',
    };
    
    const activeInfo = SYMBOLS.find((s) => s.id === botState.symbol);
    addLog('success', `▶️ AUTOMATED ACTION STARTED inside server stack for ${activeInfo?.short}! Cap protection consecutive ceiling: ${botConfig.maxLosses}.`);
    res.json({ success: true, botState });
  });

  // API Route: Pause the automated trader
  app.post('/api/stop', (req, res) => {
    botState = {
      ...botState,
      isRunning: false,
      status: 'idle',
    };
    addLog('warning', '⏹️ AUTOMATED ACTION DE-ACTIVATED. System in standby mode.');
    res.json({ success: true, botState });
  });

  // API Route: Select active symbol
  app.post('/api/select-symbol', (req, res) => {
    const { symbolId } = req.body;
    if (symbolId) {
      botState.symbol = symbolId;
      const act = SYMBOLS.find((s) => s.id === symbolId);
      addLog('info', `🏷️ Loaded active asset target: ${act?.name || symbolId}`);
    }
    res.json({ success: true, botState });
  });

  // API Route: Authorize Token API
  app.post('/api/authorize', (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No authorization token supplied.' });
    }

    const isMock = token.trim() === 'DEMO_MOCK_TOKEN' || token.trim().toUpperCase().startsWith('MOCK_DEMO_');
    if (isMock) {
      account = {
        balance: 10000.00,
        currency: 'USD',
        email: 'demo-sandbox@nexscaniq.example',
        fullname: 'NexScan IQ Demo Trader (Sandbox)',
        is_virtual: true,
        loginid: 'VRTC1007421',
        scopes: ['read', 'trade'],
      };
      botConfig.apiToken = token;
      authorizedWsStatus = 'connected';
      addLog('success', '🔐 Restored Local Sandbox Simulated credentials. Standby mode.');
      return res.json({ success: true, account });
    }

    // Real Deriv Broker authentication
    initAuthorizedSocket(token);
    res.json({ success: true, message: 'Authorization process initialized on background server context.' });
  });

  // API Route: Deauthorize
  app.post('/api/deauthorize', (req, res) => {
    account = null;
    botConfig.apiToken = '';
    authorizedWsStatus = 'idle';
    if (authorizedPingInterval) {
      clearInterval(authorizedPingInterval);
      authorizedPingInterval = null;
    }
    if (authorizedWs) {
      try {
        authorizedWs.close();
      } catch(e){}
      authorizedWs = null;
    }
    addLog('warning', '🔓 Profile credentials cleared. Returned to anonymous simulator.');
    res.json({ success: true });
  });

  // API Route: Clear logging dashboard
  app.post('/api/clear-logs', (req, res) => {
    logs = [];
    addLog('info', '🗑️ Server logs dashboard cleared.');
    res.json({ success: true });
  });

  // API Route: Clear past trades history
  app.post('/api/clear-trades', (req, res) => {
    pastTrades = [];
    addLog('info', '🗑️ Past trading history cleared.');
    res.json({ success: true });
  });

  // API Route: Restart scanning and reset all statistics
  app.post('/api/restart-scanning', (req, res) => {
    sessionStartTime = Date.now();
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
    addLog('success', '♻️ Scanner successfully restarted. Global stats, session runtime, and indicator metrics reset.');
    res.json({ success: true });
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
    res.json({ success: true, settings: adminSettings });
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

    const { appId, markupPercent, affiliateToken, creatorToken } = settings;
    const parsedAppId = parseInt(appId, 10);
    const parsedMarkup = parseFloat(markupPercent);

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
    saveAdminSettings();

    addLog('success', `🔧 CREATOR OVERRIDE: App ID set to ${parsedAppId}, Markup Rate to ${parsedMarkup}%`);

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

    res.json({ success: true, settings: adminSettings });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running persistently on http://0.0.0.0:${PORT}`);
  });
}

run().catch((err) => {
  console.error('Fatal Server crash on startup:', err);
});
