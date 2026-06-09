import { useState } from 'react';
import { PastTrade } from '../types';
import { SYMBOLS, formatPrice } from '../constants';
import { 
  History, Trash2, CircleCheck, CircleX, Search, TrendingUp, TrendingDown,
  Percent, CircleDollarSign, Calendar, RefreshCw, BarChart2, ShieldAlert
} from 'lucide-react';

interface HistoryTabProps {
  pastTrades: PastTrade[];
  onClearHistory: () => void;
  sessionUptime: number;
}

export function HistoryTab({ pastTrades, onClearHistory, sessionUptime }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [symbolFilter, setSymbolFilter] = useState<string>('all');
  const [isClearing, setIsClearing] = useState(false);

  // Stats calculation
  const totalTrades = pastTrades.length;
  const winTrades = pastTrades.filter(t => t.outcome === 'win');
  const lossTrades = pastTrades.filter(t => t.outcome === 'loss');
  const winCount = winTrades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  
  const totalNetProfit = pastTrades.reduce((acc, current) => acc + current.profit, 0);
  const totalStakeValue = pastTrades.reduce((acc, current) => acc + current.stake, 0);

  // Unique symbols present in past trades for filters
  const uniqueSymbols = Array.from(new Set(pastTrades.map(t => t.symbol)));

  // Filter logic
  const filteredTrades = pastTrades.filter(trade => {
    const symbolObj = SYMBOLS.find(s => s.id === trade.symbol);
    const symbolName = symbolObj ? symbolObj.name.toLowerCase() : trade.symbol.toLowerCase();
    const tradeDesc = trade.description.toLowerCase();
    const matchesSearch = symbolName.includes(searchTerm.toLowerCase()) || tradeDesc.includes(searchTerm.toLowerCase());
    
    const matchesOutcome = outcomeFilter === 'all' || trade.outcome === outcomeFilter;
    const matchesSymbol = symbolFilter === 'all' || trade.symbol === symbolFilter;

    return matchesSearch && matchesOutcome && matchesSymbol;
  });

  const handleClearTrigger = async () => {
    if (window.confirm('Are you absolutely sure you want to permanently clean up your local history boards? All past session trade tickets will be cleared.')) {
      setIsClearing(true);
      try {
        await onClearHistory();
      } catch (e) {
        console.error(e);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const getSymbolName = (symId: string) => {
    const found = SYMBOLS.find(s => s.id === symId);
    return found ? found.name : symId;
  };

  const getSymbolShort = (symId: string) => {
    const found = SYMBOLS.find(s => s.id === symId);
    return found ? found.short : symId.replace('R_', 'VOL ');
  };

  return (
    <div className="space-y-3" id="historyTabSection">
      
      {/* Real-time Session Metrics Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* Total Trades Stat */}
        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between shadow backdrop-blur-sm" id="statTotalTrades">
          <div className="space-y-0.5 text-left">
            <p className="text-[7.5px] uppercase font-mono tracking-wider text-slate-500 leading-none font-bold">Contract Tickets</p>
            <p className="text-lg font-bold font-mono tracking-tight text-white mt-0.5 leading-none">{totalTrades}</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">Processed trades</p>
          </div>
          <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/15 text-indigo-400">
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Win Rate Stat */}
        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between shadow backdrop-blur-sm" id="statWinRate">
          <div className="space-y-0.5 text-left">
            <p className="text-[7.5px] uppercase font-mono tracking-wider text-slate-500 leading-none font-bold">Win Rate Ratio</p>
            <p className="text-lg font-bold font-mono tracking-tight text-emerald-400 mt-0.5 leading-none">
              {winRate.toFixed(1)}<span className="text-[11px] text-slate-400 font-sans ml-0.5">%</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">
              {winCount}W / {lossTrades.length}L
            </p>
          </div>
          <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Net Realized Profit/Loss */}
        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between shadow backdrop-blur-sm" id="statNetProfit text-left">
          <div className="space-y-0.5 text-left">
            <p className="text-[7.5px] uppercase font-mono tracking-wider text-slate-500 leading-none font-bold">Cumulative Profit</p>
            <p className={`text-lg font-bold font-mono tracking-tight mt-0.5 leading-none ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalNetProfit >= 0 ? '+' : '-'}${Math.abs(totalNetProfit).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">Net active margin</p>
          </div>
          <div className={`p-1.5 rounded border ${
            totalNetProfit >= 0 
              ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/15 text-rose-400'
          }`}>
            {totalNetProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Aggregate Volume Stat */}
        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between shadow backdrop-blur-sm" id="statVolume text-left">
          <div className="space-y-0.5 text-left">
            <p className="text-[7.5px] uppercase font-mono tracking-wider text-slate-500 leading-none font-bold">Trading Volume</p>
            <p className="text-lg font-bold font-mono tracking-tight text-slate-200 mt-0.5 leading-none">
              ${totalStakeValue.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">Aggregate stake</p>
          </div>
          <div className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            <CircleDollarSign className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>

      {/* Advanced Filter, Search & Utility Rail Layout */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-lg" id="historyFilters">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 shadow-sm rounded-md items-center">
          
          {/* Search bar inputs */}
          <div className="relative md:col-span-5" id="historySearchContainer">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by index, asset or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 rounded-md text-[10px] bg-slate-950 border border-slate-805 focus:border-indigo-500 text-slate-300 placeholder:text-slate-600 focus:outline-none transition-all font-mono h-8 text-left"
            />
          </div>

          {/* Outcome Badge filter */}
          <div className="grid grid-cols-3 md:col-span-4 bg-slate-950 border border-slate-805 p-0.5 rounded-md h-8 items-center" id="historyOutcomeGroup">
            {(['all', 'win', 'loss'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setOutcomeFilter(filter)}
                className={`py-0.5 rounded text-[10px] font-bold uppercase transition-all tracking-wider ${
                  outcomeFilter === filter
                    ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {filter}s
              </button>
            ))}
          </div>

          {/* Symbol Quick dropdown filter */}
          <div className="md:col-span-2" id="historyAssetDropContainer">
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="w-full px-1.5 py-1 rounded-md text-[10px] bg-slate-950 border border-slate-850 focus:border-indigo-500 text-slate-400 focus:outline-none transition-all font-mono h-8"
            >
              <option value="all">ALL SYMBOLS</option>
              {uniqueSymbols.map((symId) => (
                <option key={symId} value={symId}>
                  {getSymbolShort(symId).toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Database trigger */}
          <div className="md:col-span-1 flex justify-end" id="historyClearAction">
            <button
              onClick={handleClearTrigger}
              disabled={pastTrades.length === 0 || isClearing}
              className="w-full md:w-auto p-1.5 bg-slate-950 hover:bg-rose-950/20 border border-slate-805 hover:border-rose-900 text-slate-400 hover:text-rose-450 rounded-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-center flex items-center justify-center gap-1.5 h-8 font-mono text-[11px] uppercase font-bold"
              title="Purge past trades history"
            >
              <Trash2 className="w-3 h-3 text-slate-500" />
              <span className="md:hidden">Clear History</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Table Panel container */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-lg overflow-hidden shadow" id="historyCardGrid">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="historyTable">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-800/95 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                <th className="py-1 px-2.5 font-bold">Ticket ID</th>
                <th className="py-1 px-2.5 font-bold">Volatility Asset Pin</th>
                <th className="py-1 px-2.5 font-bold">Time Initiated (Local)</th>
                <th className="py-1 px-2.5 font-bold">Underlying Contract Details</th>
                <th className="py-1 px-2.5 text-right font-bold">Active Stake</th>
                <th className="py-1 px-2.5 text-right font-bold">Net Payout</th>
                <th className="py-1 px-2.5 text-center font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-[11px] font-mono text-slate-350">
              {filteredTrades.length > 0 ? (
                filteredTrades.map((trade) => {
                  const isWin = trade.outcome === 'win';
                  return (
                    <tr 
                      key={trade.id} 
                      className="hover:bg-slate-900/20 transition-all font-mono group animate-fade-in"
                    >
                      {/* Ticket id */}
                      <td className="py-1 px-2.5 text-slate-500 select-all font-bold">
                        #{trade.id.toUpperCase()}
                      </td>

                      {/* Symbol description */}
                      <td className="py-1 px-2.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[7.5px] bg-slate-950 px-1 py-0.5 rounded font-bold border border-slate-800 text-indigo-405 text-indigo-400 group-hover:border-slate-700 transition-all">
                            {getSymbolShort(trade.symbol)}
                          </span>
                          <span className="text-slate-400 font-sans font-medium text-[11px] hidden sm:inline">
                            {getSymbolName(trade.symbol)}
                          </span>
                        </div>
                      </td>

                      {/* Formatted Date & Time */}
                      <td className="py-1 px-2.5 text-slate-400">
                        <div className="flex items-center gap-1 text-slate-550 text-slate-500 font-mono text-[11px]">
                          <Calendar className="w-2.5 h-2.5 text-slate-600" />
                          {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <span className="text-[10px] text-slate-600 ml-0.5">
                            {new Date(trade.timestamp).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Trade Contract Long Description */}
                      <td className="py-1 px-2.5 text-slate-300 font-sans max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-[11px]" title={trade.description}>
                        {trade.description}
                      </td>

                      {/* Capital stake */}
                      <td className="py-1 px-2.5 text-right text-slate-400 font-mono font-bold">
                        ${trade.stake.toFixed(2)}
                      </td>

                      {/* Realized Win/Loss Profit */}
                      <td className={`py-1 px-2.5 text-right font-mono font-bold text-[11px] ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${trade.profit.toFixed(2)}
                      </td>

                      {/* Status indicator pill */}
                      <td className="py-1 px-2.5 text-center">
                        <div className="flex justify-center">
                          {isWin ? (
                            <span className="flex items-center gap-0.5 px-1 rounded text-[7.5px] font-extrabold uppercase bg-emerald-500/10 text-emerald-450 text-emerald-400 border border-emerald-500/15 tracking-wider">
                              <CircleCheck className="w-2 h-2 text-emerald-400 font-bold" /> WIN
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1 rounded text-[7.5px] font-extrabold uppercase bg-rose-500/10 text-rose-450 text-rose-450 text-rose-400 border border-rose-500/15 tracking-wider">
                              <CircleX className="w-2 h-2 text-rose-400 font-bold" /> LOSS
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-5 px-3 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <div className="p-2 bg-slate-900 rounded-full border border-slate-800 text-slate-600">
                        <History className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold text-slate-400">No matching trades recorded</p>
                        <p className="text-[8.5px] text-slate-500 font-sans">
                          {pastTrades.length === 0 
                            ? 'Run a simulation or active authorized trading session on the and they will populate here.' 
                            : 'Try updating your filters or search constraints above.'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
