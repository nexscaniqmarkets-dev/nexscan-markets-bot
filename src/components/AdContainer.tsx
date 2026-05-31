import { useState, useEffect } from 'react';
import { 
  X, Shield, Sparkles, AlertCircle, ArrowUpRight, 
  ExternalLink, Timer, PlayCircle, Star, Zap 
} from 'lucide-react';

interface AdContainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdContainer({ isOpen, onClose }: AdContainerProps) {
  const [countdown, setCountdown] = useState(5);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // Rotate between a couple of realistic premium broker & service ads
  const ads = [
    {
      title: "NEXSCAN IQ ELITE VPS HOSTING",
      tagline: "Ultra-Low Latency Execution Nodes",
      description: "Stop losing payouts to lag. Host your automated Deriv bot closer to the WebSocket servers and slash your tick-to-payout delay down to 14ms!",
      linkText: "GET 50% OFF CODES",
      metric: "14ms Latency",
      accent: "from-indigo-650 to-indigo-850",
      ctaLabel: "Configure VPS Node Now",
    },
    {
      title: "COPY-TRADER LIVE SIGNALS",
      tagline: "Follow Top 1% Algorithmic Accounts",
      description: "Want hands-free capital growth? Copy our vetted 89% win-rate volatility index portfolio triggers directly into your private Deriv token setup.",
      linkText: "JOIN ELITE TELEGRAM",
      metric: "89.2% Approved Winrate",
      accent: "from-amber-600 to-amber-850",
      ctaLabel: "Launch Copy-Traders Suite",
    },
    {
      title: "NEXSCAN IQ PREMIUM VIP UNLOCK",
      tagline: "100% Ad-Free Automatic Trading",
      description: "Exempt yourself permanently from interstitial ads. Switch to our flat $30 monthly subscription option which speeds up automated trade responses.",
      linkText: "SWITCH LICENSE MODEL",
      metric: "Zero Automated Interferences",
      accent: "from-indigo-950/20 to-indigo-850",
      ctaLabel: "Unlock Ad-Free Flat Plan",
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      // Select random ad
      setCurrentAdIndex(Math.floor(Math.random() * ads.length));
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const ad = ads[currentAdIndex];

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6">
        
        {/* Glow border element */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-indigo-500" />

        <div className="flex justify-between items-start">
          <div className="bg-slate-950/80 border border-slate-850 rounded-lg px-2.5 py-1 flex items-center gap-1.5 select-none font-mono text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <Star className="w-3 h-3 text-amber-500 fill-current animate-pulse" /> SPONSOR ADVERTISEMENT BLOCK
          </div>
          
          <div className="font-mono text-[10px] text-slate-500 font-bold bg-slate-950/50 border border-slate-850/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <span>AD COOLDOWN: {countdown}S</span>
          </div>
        </div>

        {/* Dynamic Ad creative container */}
        <div className={`rounded-2xl p-6 bg-gradient-to-br ${ad.accent} border border-white/10 space-y-4 shadow-inner relative overflow-hidden`}>
          {/* Decorative backdrop elements */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12" />
          
          <div className="space-y-1">
            <span className="font-mono text-[10px] tracking-widest uppercase bg-black/30 border border-white/10 text-white font-extrabold px-1.5 py-0.5 rounded-full block w-fit">
              {ad.metric}
            </span>
            <h3 className="font-sans font-black text-white text-base md:text-lg tracking-tight pt-1 leading-none uppercase">
              {ad.title}
            </h3>
            <p className="font-mono text-[10px] text-white/70 font-bold tracking-wider uppercase leading-none">
              {ad.tagline}
            </p>
          </div>

          <p className="text-white/80 text-xs leading-relaxed font-sans">
            {ad.description}
          </p>

          <div className="flex justify-between items-center bg-black/25 rounded-xl px-4 py-2 text-[10px] font-mono font-medium text-white/95">
            <span>Special NexScan Promo Code Included</span>
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
          </div>
        </div>

        {/* Affiliate link warning disclaimer */}
        <div className="text-[10px] font-mono text-slate-500 leading-normal flex gap-2">
          <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5 animate-pulse" />
          <p>
            This applet uses secure affiliate partnerships & sponsorship ads to remain free-to-use for retail bots. Premium $30 accounts bypass this screen automatically.
          </p>
        </div>

        {/* Submit execution resume/action */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <button
            onClick={() => {
              window.open('https://deriv.partners/rx?sidc=C6D4FA86-827B-4AAF-844B-344F9FE57A0F&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU334564', '_blank');
            }}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-750 text-white font-mono text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-97"
          >
            {ad.ctaLabel} <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          
          <button
            onClick={onClose}
            disabled={countdown > 0}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-xs font-bold rounded-xl cursor-pointer transition-colors active:scale-97"
          >
            {countdown > 0 ? `RESUME IN ${countdown}S...` : 'DISMISS SPONSOR & RESUME BOT'}
          </button>
        </div>

      </div>
    </div>
  );
}
