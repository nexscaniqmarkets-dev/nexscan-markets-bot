import React, { useState } from 'react';
import { Compass, ShieldCheck, Zap, ArrowRight, ArrowLeft, CircleCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Real-Time Neural Scanner",
    icon: Compass,
    iconCls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25",
    desc: "NexScan IQ continually tracks and ingests last-digit tick stream events from Deriv's API across top synthetic asset brackets (e.g., Volatility 10S, 100S, etc.). Watch the Scanner table to identify pairs that currently exhibit highly consistent distributions.",
  },
  {
    title: "Autonomic Risk Guardrails",
    icon: ShieldCheck,
    iconCls: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    desc: "Before launching execution streams, calibrate your boundaries. Configure standard stakes, custom stop-loss thresholds, consecutive loss pause points, and target wins (typically 2-3 standard wins before safe system self-disarm). This avoids unnecessary capital fallout.",
  },
  {
    title: "Gated Autopilot Execution",
    icon: Zap,
    iconCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    desc: "Launch the Autopilot Trader in standard high-EV normal mode, or leverage Advanced Mode. Advanced Mode monitors pair credibility, systematically swapping assets to keep live performance optimal. No random human over-trading.",
  }
];

export function OnboardingGuide({ isOpen, onClose }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const ActiveIcon = STEPS[currentStep].icon;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
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
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-950 border border-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[420px]"
      >
        {/* Step indicator bar */}
        <div className="flex bg-slate-955 border-b border-slate-900/60 font-mono text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`flex-1 text-center py-2.5 border-r border-slate-900 last:border-r-0 transition-colors ${
                idx === currentStep ? 'bg-indigo-500/5 text-indigo-400 border-b-2 border-b-indigo-500' : 'bg-transparent'
              }`}
            >
              Step {idx + 1}
            </div>
          ))}
        </div>

        {/* Dynamic content card wrapper */}
        <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 flex-1"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${STEPS[currentStep].iconCls}`}>
                  <ActiveIcon className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-sans text-slate-100 uppercase tracking-tight">
                    {STEPS[currentStep].title}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    Interactive Interface Guide
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-sans leading-relaxed pt-2">
                {STEPS[currentStep].desc}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Nav Footer controls */}
          <div className="border-t border-slate-900/60 pt-5 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`py-2 px-4 rounded-lg font-mono text-[10px] uppercase font-extrabold tracking-widest flex items-center gap-1 border transition-all ${
                currentStep === 0
                  ? 'border-transparent text-slate-600 cursor-not-allowed'
                  : 'border-slate-800 hover:border-slate-705 text-slate-400 hover:text-white cursor-pointer hover:bg-slate-900/50'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <button
              onClick={handleNext}
              className="py-2.5 px-5 rounded-lg font-mono text-[10px] uppercase font-bold bg-indigo-500 text-white hover:bg-indigo-400 shadow shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-98 transition-all flex items-center gap-1 cursor-pointer"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  GET STARTED <CircleCheck className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
