import React, { useState } from 'react';
import { 
  ShieldAlert, Check, FileText, AlertTriangle, Scale, ArrowRight, UserCheck, Percent 
} from 'lucide-react';

interface TermsAgreementModalProps {
  isOpen: boolean;
  onAccept: (signatureName: string) => void;
}

export function TermsAgreementModal({ isOpen, onAccept }: TermsAgreementModalProps) {
  const [checkedRisk, setCheckedRisk] = useState(false);
  const [checkedStrategy, setCheckedStrategy] = useState(false);
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkedRisk || !checkedStrategy) {
      setErrorMsg('Please confirm all risk and policy declarations by ticking each slider box.');
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMsg('Mandatory digital signature: Please type your full name (minimum 3 characters) to sign.');
      return;
    }
    setErrorMsg('');
    onAccept(fullName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/90 backdrop-blur-xl">
      
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Legal Charter Container */}
      <main className="relative z-15 w-full max-w-2xl bg-slate-950 border-2 border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar text-left flex flex-col gap-6">
        
        {/* Header Title section */}
        <header className="space-y-2 border-b border-slate-900 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-505/10 border border-indigo-500/10 text-indigo-400 font-mono text-[9px] uppercase tracking-widest rounded-full">
            <Scale className="w-3.5 h-3.5 text-indigo-400" /> SECURE LEGAL COMPLIANCE GATEWAY
          </div>
          <h1 className="font-sans font-black text-slate-100 text-xl md:text-2xl tracking-tight uppercase leading-none mt-1">
            NexScan IQ <span className="text-indigo-400">Risk Disclosure</span> & Terms Agreement
          </h1>
          <p className="text-xs text-slate-450 font-mono">
            Revision Protocol: V2026.5.27 • Persistent Cryptographic Agreement required before accessing brokers
          </p>
        </header>

        {/* Narrative legal elements */}
        <section className="space-y-4 max-h-[32vh] overflow-y-auto border border-slate-900 bg-slate-950/55 rounded-2xl p-4 text-xs text-slate-300 font-sans leading-relaxed custom-scrollbar text-left">
          
          <div className="space-y-2">
            <h3 className="font-bold text-slate-150 uppercase tracking-wide flex items-center gap-1.5 text-rose-450">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> 1. Operational High-Frequency Volatility Warning
            </h3>
            <p className="text-[11px] text-slate-400">
              Contracting synthetic asset volatility indices involves rapid financial transactions. Leveraged digit differences, high/low indices, or tick-level market conditions can result in rapid margin variations. Financial exposure represents extreme risk. Standard past signals represent theoretical metrics; we guarantee no static future win percentage.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-900">
            <h3 className="font-bold text-slate-150 uppercase tracking-wide flex items-center gap-1.5 text-amber-550">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> 2. Algorithmic Automation & Martingale Strategy
            </h3>
            <p className="text-[11px] text-slate-400">
              Users employing the Martingale Multiplier accept that consecutive trading losses will trigger exponentially larger stake requirements. System disconnects, broker timeouts, latency buffers, or API limits are a technical reality. Always configure defensive risk ceilings (Target Profit and Max Losses) prior to issuing active trade tickers.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-900">
            <h3 className="font-bold text-slate-150 uppercase tracking-wide flex items-center gap-1.5 text-emerald-550">
              <Check className="w-3.5 h-3.5 text-emerald-500" /> 3. Partner Sponsor Alignment
            </h3>
            <p className="text-[11px] text-slate-400">
              By launching and routing tickets through our network endpoints, you authorize standard secure WS API proxy pathways. Official affiliate tracking helps stabilize the underlying server infrastructure allowing general public runtime hosting.
            </p>
          </div>

        </section>

        {/* Form Interactive Blocks */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* Required check items sliders */}
          <div className="space-y-3.5">
            
            {/* Checkbox 1 */}
            <label className="flex items-start gap-4 p-3 bg-slate-900/45 hover:bg-slate-900 border border-slate-900 rounded-xl cursor-pointer select-none transition-colors group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input 
                  type="checkbox" 
                  checked={checkedRisk} 
                  onChange={(e) => setCheckedRisk(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                  checkedRisk ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-800 group-hover:border-slate-700'
                }`}>
                  {checkedRisk && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                </div>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-300 leading-tight">
                I acknowledge the <span className="text-rose-450 font-semibold">extreme micro-risk</span> associated with derivative synthetic assets and accept fully that NexScan is not an advisory fund.
              </span>
            </label>

            {/* Checkbox 2 */}
            <label className="flex items-start gap-4 p-3 bg-slate-900/45 hover:bg-slate-900 border border-slate-900 rounded-xl cursor-pointer select-none transition-colors group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input 
                  type="checkbox" 
                  checked={checkedStrategy} 
                  onChange={(e) => setCheckedStrategy(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                  checkedStrategy ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-800 group-hover:border-slate-700'
                }`}>
                  {checkedStrategy && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                </div>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-300 leading-tight">
                I agree that martingale execution will increase compounding exposure, and declare that I have tested my risk limits inside the demo broker network first.
              </span>
            </label>

          </div>

          {/* Electronic Signature Legal Input Box */}
          <div className="space-y-2 p-4 bg-slate-950 border border-slate-900 rounded-xl">
            <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              ✒️ Mandate Digital Legal Signature (Print Full Name)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type your full legal name matching Deriv Credentials"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 px-3.5 py-2.5 rounded-xl font-sans text-xs text-slate-200 uppercase tracking-widest"
              />
              {fullName.trim().length >= 3 && (
                <span className="absolute right-3 top-3 bg-emerald-950 text-emerald-400 text-[8px] sm:text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-900/40 uppercase tracking-widest flex items-center gap-1 font-bold">
                  <UserCheck className="w-3 h-3 text-emerald-400" /> VALIDATED SIGNATURE
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">By signing, you warrant compliance with anti-gaming laws and regional trading requirements.</span>
          </div>

          {/* Feedback & Actions */}
          {errorMsg && (
            <p className="text-[11px] text-rose-450 font-mono bg-rose-950/25 border border-rose-900/40 px-3.5 py-2 rounded-lg font-bold">
              ⚠️ {errorMsg}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full cursor-pointer py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg shadow-emerald-555/15 cursor-pointer flex items-center justify-center gap-2 transform active:scale-97 transition-all"
            >
              Sign & Unlock Automated Trader Interface <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
