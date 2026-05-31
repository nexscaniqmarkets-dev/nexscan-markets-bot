import { useState } from 'react';
import { 
  X, ShieldCheck, Key, HelpCircle, Bot, Sliders, Play, 
  ChevronRight, ChevronLeft, Layers, Trophy, Compass 
} from 'lucide-react';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingGuide({ isOpen, onClose }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to NexScan IQ Markets",
      icon: <Bot className="w-8 h-8 text-indigo-400" />,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-slate-300 font-sans leading-relaxed">
          <p>
            Welcome! <strong className="text-white">NexScan IQ Markets</strong> is an executive high-speed market scanner and automated trader designed exclusively for Volatility Indices.
          </p>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <h4 className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-wider">🎯 Core Algorithmic Blueprint</h4>
            <p className="text-xs text-slate-400">
              The scanner establishes continuous connections to Deriv's live networks, tracking ticket decimal points. When a <strong className="text-slate-250">"Rise" direction tick</strong> is combined with a terminal last digit of <strong className="text-amber-400">4 or 5</strong>, it triggers a strong entry signal.
            </p>
            <p className="text-xs text-slate-400">
              The system places <strong className="text-slate-200">DigitOver (prediction: 4)</strong> positions. This creates an extremely high win probability, where any tick ending in 5, 6, 7, 8, or 9 rewards you with quick payouts!
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Let's walk through a brief configuration checklist to secure your account and automate your trades safely.
          </p>
        </div>
      ),
    },
    {
      title: "Step 1: Securely Authorize Deriv Connection",
      icon: <Key className="w-8 h-8 text-indigo-400" />,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-slate-300 font-sans leading-relaxed">
          <p>
            To execute automated parameters, the system leverages a direct API connection to Deriv.
          </p>
          <div className="space-y-3">
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center font-mono text-xs font-bold leading-none shrink-0 mt-0.5">1</div>
              <p className="text-xs text-slate-400">
                Log into your <strong className="text-slate-200">Deriv Account</strong> and go to <strong className="text-slate-250">Account Settings</strong> → <strong className="text-slate-250">API Token</strong> page.
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center font-mono text-xs font-bold leading-none shrink-0 mt-0.5">2</div>
              <p className="text-xs text-slate-400">
                Generate a token by checking the <strong className="text-emerald-400">"Read"</strong> and <strong className="text-emerald-400">"Trade"</strong> permissions options (required to read balances and execute contract entries).
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center font-mono text-xs font-bold leading-none shrink-0 mt-0.5">3</div>
              <p className="text-xs text-slate-400">
                Copy your token, switch over to our <strong className="text-slate-200">Automated Trader tab</strong>, paste it into the authorization input, and press submit.
              </p>
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-mono text-slate-500">
              🔒 <strong className="text-slate-300 font-medium">Privacy Statement:</strong> Your API credentials are processed locally inside your browser memory. They are never sent to external servers or logged.
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Step 2: Customize Risk Management",
      icon: <Sliders className="w-8 h-8 text-indigo-400" />,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-slate-300 font-sans leading-relaxed">
          <p>
            Trading involves probability. We enforce strict parameters to safeguard capital:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850/80">
              <h5 className="font-mono text-[11px] text-slate-400 uppercase tracking-wider font-extrabold mb-1">💸 Base Stake</h5>
              <p className="text-xs text-slate-500">
                Starting trade level. Typically 1% of your overall account capacity (e.g. $1.00 on a $100.00 balance). Minimum is $0.35.
              </p>
            </div>
            
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850/80">
              <h5 className="font-mono text-[11px] text-slate-400 uppercase tracking-wider font-extrabold mb-1">⚡ Martingale Multiplier</h5>
              <p className="text-xs text-slate-500">
                On losses, stakes are automatically multiplied to recover deficits. Default is 2.0x. Resets to base stake immediately after a win.
              </p>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850/80">
              <h5 className="font-mono text-[11px] text-emerald-400 uppercase tracking-wider font-extrabold mb-1">🏁 Win Target Limit</h5>
              <p className="text-xs text-slate-500">
                The bot automatically stops executing and disarms itself after hitting this amount of wins. Safe standard is 2 or 3 wins.
              </p>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850/80">
              <h5 className="font-mono text-[11px] text-rose-400 uppercase tracking-wider font-extrabold mb-1">🚨 Consecutive Loss Cap</h5>
              <p className="text-xs text-slate-500">
                Ultimate circuit-breaker. Stops automated trading if consecutive losses reach this limit, protecting your remaining capital.
              </p>
            </div>
          </div>
          <p className="text-xs text-indigo-400">
            💡 <strong className="font-bold">Tip:</strong> Use our pre-designed <strong className="text-white">Smart Preset Buttons</strong> to automatically set parameters based on your balance!
          </p>
        </div>
      ),
    },
    {
      title: "Step 3: Scanner Feed & Stepping Engine",
      icon: <Compass className="w-8 h-8 text-indigo-400" />,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-slate-300 font-sans leading-relaxed">
          <p>
            NexScan IQ Markets continuous tracking provides live analytics ranking assets based on performance:
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                <strong className="text-slate-250">Global Tick Grid:</strong> Provides a massive overview of all 10 major index pairs. Displays live price directions, last digit status, and individual historical performance indexes.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                <strong className="text-slate-250">Performance Leaderboard:</strong> Ranks assets with our custom score formula (65% win-rate + 35% frequency pacing).
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                <strong className="text-slate-250">Opportunity Auto-Pauser:</strong> Once any top ranking asset crosses <strong className="text-emerald-400">55% win rate</strong> (after 5+ signals), the scanner highlights it inside a golden priority banner with an expiry countdown timer.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">
            You can load any asset instantly into your Active Automated Trader via the "Load Pair" button in any tab.
          </p>
        </div>
      ),
    },
    {
      title: "Step 4: Live Execution Workflow",
      icon: <Play className="w-8 h-8 text-indigo-400" />,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-slate-300 font-sans leading-relaxed">
          <p>
            Once initialized, the live execution steps unfold as follows:
          </p>
          <div className="border border-indigo-950 bg-indigo-950/20 rounded-xl p-4 space-y-3 font-mono text-[11px] text-slate-400">
            <div className="flex gap-2">
              <span className="text-indigo-400 font-bold">▶ 1. Armed Scanner</span>
              <span>- Continuously monitors active sockets.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-indigo-400 font-bold">⚡ 2. Signal Triggered</span>
              <span>- Optimal tick combination (Rise + Digit 4 or 5) is recorded.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-indigo-400 font-bold">💼 3. Live Trade Placed</span>
              <span>- Executed within milliseconds on your private profile.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-indigo-400 font-bold">🏁 4. Boundary Target Halt</span>
              <span>- Hard stops once your target wins are successfully achieved, or loss threshold cap hits.</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            You are fully prepared! Disarm/stop the bot at any time by pressing the main <strong className="text-rose-400">"Stop Bot"</strong> buttons in either the header panel or trading console.
          </div>
        </div>
      ),
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glowing border highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-650" />

        {/* Header toolbar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3">
            {steps[currentStep].icon}
            <div>
              <span className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-widest block leading-none">
                Interactive Onboarding Guide (Step {currentStep + 1} of {steps.length})
              </span>
              <h3 className="text-sm md:text-base font-bold text-white tracking-tight mt-1.5 leading-none">
                {steps[currentStep].title}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Onboarding step payload content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 space-y-4">
          {steps[currentStep].content}
        </div>

        {/* Action bar and dots progress indicator */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-4.5 bg-indigo-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 py-2 px-4 border border-slate-800 hover:border-slate-750 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-semibold tracking-wide cursor-pointer shadow-lg shadow-indigo-950/40 transition-all active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
