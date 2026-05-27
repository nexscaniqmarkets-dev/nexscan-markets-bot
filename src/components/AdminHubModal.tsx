import React, { useState, useEffect } from 'react';
import { Shield, Settings, Key, DollarSign, BarChart2, CheckCircle2, AlertTriangle, Lock, Unlock, X } from 'lucide-react';
import { AdminSettings } from '../types';

interface AdminHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminHubModal({ isOpen, onClose }: AdminHubModalProps) {
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Settings State
  const [appId, setAppId] = useState(1089);
  const [markupPercent, setMarkupPercent] = useState(1.5);
  const [affiliateToken, setAffiliateToken] = useState('');
  const [creatorToken, setCreatorToken] = useState('');
  const [totalClientVolume, setTotalClientVolume] = useState(0);
  const [totalMarkupEarnings, setTotalMarkupEarnings] = useState(0);

  // Reset states when closed
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setIsUnlocked(false);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please input your master code PIN.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/get-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setIsUnlocked(true);
        setAppId(data.settings.appId);
        setMarkupPercent(data.settings.markupPercent);
        setAffiliateToken(data.settings.affiliateToken);
        setCreatorToken(data.settings.creatorToken || '');
        setTotalClientVolume(data.settings.totalClientVolume);
        setTotalMarkupEarnings(data.settings.totalMarkupEarnings);
      } else {
        setError(data.error || 'Authentication code invalid. Access denied.');
      }
    } catch (err) {
      setError('Connection to backend failure. Verify server state.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRegister = async () => {
    if (!creatorToken.trim()) {
      setError('Please enter your Creator API Token first.');
      return;
    }

    setIsRegistering(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/register-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          creatorToken: creatorToken.trim(),
          markupPercent
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        let successMsg = `🎉 Deriv App registered successfully! New App ID: ${data.appId}.`;
        if (data.registeredName) {
          successMsg += ` Registered under the name: "${data.registeredName}".`;
        }
        if (markupPercent > 0 && !data.markupApplied) {
          successMsg += ` WARNING: The selected Markup rate was adjusted to 0.0% because your Creator API account is not registered under Deriv's Affiliate/Partner Program yet.`;
        } else if (data.adjustedMarkup !== undefined && data.adjustedMarkup > 0) {
          successMsg += ` Tracking standard ${data.adjustedMarkup}% commission markup!`;
        }
        setSuccess(successMsg);
        setAppId(data.appId);
        setCreatorToken(data.settings.creatorToken || '');
        setMarkupPercent(data.settings.markupPercent);
      } else {
        setError(data.error || 'Deriv app registration failed. Check token scopes.');
      }
    } catch (err) {
      setError('Communication error with administrator node during registration.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          settings: {
            appId,
            markupPercent,
            affiliateToken,
            creatorToken: creatorToken.trim()
          }
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('Developer configuration successfully loaded and persisted live!');
        setAppId(data.settings.appId);
        setMarkupPercent(data.settings.markupPercent);
        setAffiliateToken(data.settings.affiliateToken);
        setCreatorToken(data.settings.creatorToken || '');
        setTotalClientVolume(data.settings.totalClientVolume);
        setTotalMarkupEarnings(data.settings.totalMarkupEarnings);
        
        // Clear success message after 3.5s
        setTimeout(() => setSuccess(''), 3500);
      } else {
        setError(data.error || 'Failed to persist creator configurations.');
      }
    } catch (err) {
      setError('Communication error with administrator node.');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPin('');
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 text-left overflow-hidden max-h-[90vh] overflow-y-auto"
        id="adminHubPanel"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/50 border border-indigo-805/40 flex items-center justify-center">
              {isUnlocked ? (
                <Unlock className="w-5 h-5 text-indigo-400" />
              ) : (
                <Lock className="w-5 h-5 text-indigo-400 animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Creator & Broker Console
                <span className="text-[9px] font-mono font-bold tracking-widest bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
                  MARKUP ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Administer Deriv Dev App IDs, custom payouts, and accumulated broker overrides.
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-705 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lock / Pin Authorization Panel */}
        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="space-y-6 max-w-md mx-auto py-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-indigo-400">
                <Key className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Unlock Administrator Panel</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Please enter your private pin code to manage trade fee markups and revenue settings.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Administrator PIN</label>
              <input
                type="password"
                placeholder="••••"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-slate-100 placeholder:text-slate-700 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-950/40 border border-rose-900/60 text-xs text-rose-400 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-mono text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? 'VERIFYING CREDENTIAL SEED...' : 'UNLOCK COMMAND CONSOLE'}
            </button>
          </form>
        ) : (
          /* Unlocked Mode: Admin Settings Panel */
          <div className="space-y-6">
            
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* volume */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-900/60 flex items-center justify-center text-indigo-400">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Accrued Volume</span>
                  <span className="text-lg font-mono font-bold text-slate-100">${totalClientVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Total stakes placed via App</span>
                </div>
              </div>

              {/* markup earnings */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/50 border border-emerald-900/60 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Broker Profit</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">${totalMarkupEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Accumulated creator markup commission</span>
                </div>
              </div>
            </div>

            {/* Custom Information Banner */}
            <div className="bg-slate-950/40 border border-slate-800/65 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-400">
              <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-200 mb-1">How Deriv App Overrides Work</p>
                When clients configure their account tokens to scanner automated trades, the trades routing sequence operates via the registered <span className="text-indigo-400 font-mono">App ID</span> configuration. By inputting your custom registered App ID (configured with Markup in the Deriv Developer Console), Deriv awards you commission on client payouts automatically.
              </div>
            </div>

            {/* Settings Forms */}
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* APP ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Custom Registered App ID</label>
                  <input
                    type="number"
                    value={appId}
                    onChange={(e) => setAppId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none transition-colors"
                    required
                  />
                  <span className="text-[9px] text-slate-500 block">Default mock fallback is 1089. Replace this with your personal App ID.</span>
                </div>

                {/* Markup Percent */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Your Set Fee Markup (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.1"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <span className="w-14 text-center font-mono text-xs font-bold text-slate-100 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800 whitespace-nowrap">
                      {markupPercent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">The percentage commission tracking rate of customer volumes.</span>
                </div>
              </div>

              {/* Affiliate Token Partner ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Affiliate Affiliate/Partner Token (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. tracking_partner_abc_123"
                  value={affiliateToken}
                  onChange={(e) => setAffiliateToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none transition-colors"
                />
                <span className="text-[9px] text-slate-500 block text-slate-500">Allows you to track affiliated signup metrics from your clients.</span>
              </div>

              {/* Creator Token Section for Direct Markup Automation */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <Key className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Automated App integration & Markup using Creator API Token</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Enter your Creator API token to dynamically register a Deriv App ID. Custom markups and commission payouts will automatically route to your account credentials!
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Creator API Token</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      placeholder="Paste your Deriv Admin API Token here"
                      value={creatorToken}
                      onChange={(e) => setCreatorToken(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      disabled={isRegistering || !creatorToken.trim()}
                      onClick={handleAutoRegister}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-mono text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0 cursor-pointer"
                    >
                      {isRegistering ? 'REGISTERING...' : '⚙️ AUTO-REGISTER APP ID'}
                    </button>
                  </div>
                  
                  {/* Step instructions */}
                  <div className="text-[9.5px] text-slate-400 space-y-1 pt-1 ml-1 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                    <p className="font-semibold text-slate-300">How to generate your Creator API Token:</p>
                    <ol className="list-decimal list-inside space-y-1 leading-relaxed text-slate-400">
                      <li>Log in to the Deriv account that should collect markups in the developer panel.</li>
                      <li>Go to <span className="text-slate-300 font-mono bg-slate-950 px-1 py-0.5 rounded">Deriv Settings -&gt; API Token</span>.</li>
                      <li>Create a token named <span className="text-indigo-400 font-mono italic">"NexScan Live Commission"</span>.</li>
                      <li>
                        Select permissions: <span className="text-slate-300 font-semibold">"Read"</span>, <span className="text-slate-300 font-semibold">"Trade"</span>, <span className="text-slate-300 font-semibold">"Payments"</span>, and <span className="text-rose-400 font-bold underline">"Admin" (CRITICAL: Mandated by Deriv to register custom apps)</span>.
                        <p className="text-[9px] text-rose-300/95 mt-0.5 ml-4 font-sans bg-rose-950/40 px-2 py-1 rounded border border-rose-900/40">
                          ⚠️ <strong>CRITICAL NOTE:</strong> If you do not select the <strong>"Admin"</strong> scope checkbox, Deriv's API server will reject the registration request with <em>"Permission denied, requires admin scope(s)"</em>.
                        </p>
                      </li>
                      <li>Copy the generated token, paste it here, and click <span className="text-emerald-400 font-semibold">AUTO-REGISTER APP ID</span>!</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Event Feedback messages */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-950/40 border border-rose-900/60 text-xs text-rose-400 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-950/40 border border-emerald-950/60 text-xs text-emerald-400 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Actions row */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-mono text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50"
                >
                  {loading ? 'SAVING...' : 'SAVE CONFIGURATION'}
                </button>
                
                <button
                  type="button"
                  onClick={handleLock}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-mono text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>LOCK CONSOLE</span>
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
