import { SymbolInfo } from './types';

export const SYMBOLS: SymbolInfo[] = [
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

export const VOL_COLORS: Record<number, string> = {
  10: '#4ade80',  // Emerald Green
  25: '#22d3ee',  // Cyan/Teal
  50: '#a78bfa',  // Purple/Lavender
  75: '#fb923c',  // Sunset Orange
  100: '#f87171', // Coral Red
};

export const FALLBACK_COLOR = '#94a3b8';

export const getVolColor = (vol: number) => VOL_COLORS[vol] || FALLBACK_COLOR;

export const digitColor = (d: number | null) => {
  if (d === null) return '#1e293b'; // slate-800
  if (d === 4) return '#fbbf24';    // amber-400 (Entry Digit 1)
  if (d === 5) return '#f97316';    // orange-500 (Entry Digit 2)
  if (d >= 6) return '#22c55e';     // green-500 (Strong High Digits)
  if (d === 0) return '#64748b';    // slate-500
  return '#3b82f6';                 // blue-500
};

export const getLastDigit = (price: number, pip: number): number => {
  const dec = Math.max(0, Math.round(-Math.log10(pip)));
  return Math.abs(Math.round(price * Math.pow(10, dec))) % 10;
};

export const formatPrice = (price: number | null, pip: number): string => {
  if (price === null) return '—';
  const dec = Math.max(0, Math.round(-Math.log10(pip)));
  return price.toFixed(dec);
};
