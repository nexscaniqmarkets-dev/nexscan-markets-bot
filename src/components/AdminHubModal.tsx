import React, { useState, useEffect } from 'react';
import { Shield, Settings, Key, DollarSign, BarChart2, CheckCircle2, AlertTriangle, Lock, Unlock, X, Eye, EyeOff, RefreshCw, Users } from 'lucide-react';
import { AdminSettings } from '../types';

interface AdminHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequenceCompleted: boolean;
  onLockConsole: () => void;
}

export function AdminHubModal({ isOpen, onClose, sequenceCompleted, onLockConsole }: AdminHubModalProps) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adminAlert, setAdminAlert] = useState('');
  const [premiumSubscriptionPrice, setPremiumSubscriptionPrice] = useState(29.99);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [premiumSubmissions, setPremiumSubmissions] = useState<any[]>([]);

  // Premium Subscriptions State
  const [premiumCreds, setPremiumCreds] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDerivApiToken, setNewDerivApiToken] = useState('');
  const [generatingCred, setGeneratingCred] = useState(false);

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
      setError('Please enter your master passcode PIN.');
      return;
    }

    setLoading(true);
    setError('');

    // Master PIN passcode is 2003.
    const resolvedPin = pin.trim();

    try {
      const response = await fetch('/api/admin/get-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: resolvedPin }),
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
        setMaintenanceMode(data.settings.maintenanceMode === true);
        setAdminAlert(data.settings.adminAlert || '');
        setPremiumSubscriptionPrice(data.settings.premiumSubscriptionPrice !== undefined ? data.settings.premiumSubscriptionPrice : 29.99);
        setRegisteredUsers(data.registeredUsers || []);
        setPremiumCreds(data.premiumCredentials || []);
        setPremiumSubmissions(data.premiumSubmissions || []);
      } else {
        setError(data.error || 'Authentication passcode invalid. Access denied.');
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
        setRegisteredUsers(data.registeredUsers || []);
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
            creatorToken: creatorToken.trim(),
            maintenanceMode,
            adminAlert,
            premiumSubscriptionPrice: Number(premiumSubscriptionPrice)
          }
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('Global configuration successfully loaded and persisted live!');
        setAppId(data.settings.appId);
        setMarkupPercent(data.settings.markupPercent);
        setAffiliateToken(data.settings.affiliateToken);
        setCreatorToken(data.settings.creatorToken || '');
        setTotalClientVolume(data.settings.totalClientVolume);
        setTotalMarkupEarnings(data.settings.totalMarkupEarnings);
        setMaintenanceMode(data.settings.maintenanceMode === true);
        setAdminAlert(data.settings.adminAlert || '');
        setPremiumSubscriptionPrice(data.settings.premiumSubscriptionPrice !== undefined ? data.settings.premiumSubscriptionPrice : 29.99);
        setRegisteredUsers(data.registeredUsers || []);
        setPremiumSubmissions(data.premiumSubmissions || []);
        
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

  const handleRemoveUser = async (loginid: string) => {
    try {
      const response = await fetch('/api/admin/remove-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, loginid }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRegisteredUsers(data.registeredUsers || []);
        setSuccess(`Successfully removed user ${loginid} from registries.`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to delete user.');
      }
    } catch (e) {
      setError('Failed to communicate with the master node.');
    }
  };

  const handleClearUsers = async () => {
    if (!window.confirm('WIPE CLIENT REGISTRY: Are you sure you want to completely clear out all registrants? This action is irreversible.')) return;
    try {
      const response = await fetch('/api/admin/clear-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRegisteredUsers([]);
        setSuccess('Completely wiped user records library.');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to wipe registries.');
      }
    } catch (e) {
      setError('Communication error.');
    }
  };

  const handleGeneratePremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Both username and password are required to register premium client.');
      return;
    }
    setGeneratingCred(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/generate-premium-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          username: newUsername.trim(),
          password: newPassword.trim(),
          derivApiToken: newDerivApiToken.trim(),
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPremiumCreds(data.premiumCredentials || []);
        setSuccess(`Successfully generated premium access credentials for ${newUsername}!`);
        setNewUsername('');
        setNewPassword('');
        setNewDerivApiToken('');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.error || 'Failed to generate premium credential.');
      }
    } catch (err) {
      setError('Communication with server failed.');
    } finally {
      setGeneratingCred(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    try {
      const response = await fetch('/api/admin/delete-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, id }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPremiumSubmissions(data.premiumSubmissions || []);
        setSuccess('Successfully deleted checkout submission record.');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to delete submission.');
      }
    } catch (err) {
      setError('Connection to backend failure.');
    }
  };

  const handleDeletePremium = async (username: string) => {
    if (!window.confirm(`Revoke premium subscription and delete access credentials for client "${username}"?`)) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/delete-premium-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, username }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPremiumCreds(data.premiumCredentials || []);
        setSuccess(`Successfully deactivated premium credentials for ${username}.`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to delete premium access.');
      }
    } catch (err) {
      setError('Communication with central node failed.');
    }
  };

  const handleKickPremium = async (username: string) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/kick-premium-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, username }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPremiumCreds(data.premiumCredentials || []);
        setSuccess(`Logged out active session for ${username}. Only one device login limit enforced.`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to revoke device session.');
      }
    } catch (err) {
      setError('Communication with server node failed.');
    }
  };

  const suggestRandomCredentials = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pass = Math.floor(100000 + Math.random() * 900000).toString();
    setNewUsername(`premium_${randomNum}`);
    setNewPassword(pass);
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPin('');
    setError('');
    setSuccess('');
    onLockConsole();
    onClose();
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
          !sequenceCompleted ? (
            <div className="text-center py-12 space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-slate-900/40 border border-slate-800 flex items-center justify-center mx-auto text-rose-450 animate-pulse">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Gateway Interface Encrypted</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Active administrative authorization session is sealed. A physical 5-tap sequence handshake is required on the public terminal to unlock decrypt algorithms.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUnlock} className="space-y-4 max-w-md mx-auto py-4">
              <div className="text-center space-y-1 mb-2">
                <div className="w-12 h-12 rounded-full bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-center mx-auto text-indigo-400">
                  <Key className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200 font-mono tracking-tight">System Authenticator</h3>
                <p className="text-xs text-slate-400">
                  Decrypted keys successfully. Enter your master administrator security passcode digits to proceed.
                </p>
              </div>

              {/* Security Passcode field */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">Security Passcode (PIN)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter 4-digit Master Passcode"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-4 pr-10 py-3 text-xs font-mono text-slate-100 placeholder:text-slate-700 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-mono text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50"
              >
                {loading ? 'AUTHENTICATING CORE...' : 'VERIFY & ACCESS SYSTEMS'}
              </button>
            </form>
          )
        ) : (
          /* Unlocked Mode: Admin Settings Panel */
          <div className="space-y-6 animate-fade-in">
            
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

            {/* Custom Control Center Section */}
            <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400 animate-spin" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">System Operational Gateways</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Maintenance switch */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-wider text-slate-450 uppercase block">Under Maintenance Mode</label>
                  <button
                    type="button"
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      maintenanceMode
                        ? 'bg-rose-950/30 border-rose-905/70 text-rose-300'
                        : 'bg-slate-900/40 border-slate-800/80 text-emerald-400'
                    }`}
                  >
                    <span className="text-[11px] font-bold font-mono">
                      {maintenanceMode ? '🚨 SYSTEM CALIBRATION ACTIVE' : '🏆 ONLINE TRADING PERMITTED'}
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${maintenanceMode ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-950 text-slate-400'}`}>
                      {maintenanceMode ? 'BLOCKED' : 'READY'}
                    </span>
                  </button>
                </div>

                {/* Broadcast Msg marquee */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-wider text-slate-450 uppercase block">Global News announcement</label>
                  <input
                    type="text"
                    placeholder="e.g. ⚠️ Platform server calibration in active sequence."
                    value={adminAlert}
                    onChange={(e) => setAdminAlert(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Registered Users Section */}
            <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-205 uppercase tracking-wider font-mono">
                    Clients Registry ({registeredUsers.length})
                  </h3>
                </div>
                {registeredUsers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearUsers}
                    className="text-[9px] font-mono font-bold text-rose-400 hover:text-rose-300 border border-rose-950/50 hover:border-rose-900 px-2 py-0.5 rounded bg-rose-955/10 cursor-pointer transition-colors"
                  >
                    WIPE ALL RECORDS
                  </button>
                )}
              </div>

              {registeredUsers.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-[11px] text-slate-500 font-mono">No connected account tokens detected in history records.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-850 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[9px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5">Client Username</th>
                        <th className="p-2.5">Email / Activity</th>
                        <th className="p-2.5">Asset</th>
                        <th className="p-2.5 text-right">Gate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 text-slate-350">
                      {registeredUsers.map((item) => (
                        <tr key={item.loginid} className="hover:bg-slate-900/30">
                          <td className="p-2.5">
                            <span className="text-slate-205 block font-semibold">{item.fullname}</span>
                            <span className="text-[9px] text-slate-500">{item.loginid} • {item.is_virtual ? 'DEMO' : 'LIVE'}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-slate-405 block truncate max-w-[140px]">{item.email || 'N/A'}</span>
                            <span className="text-[9px] text-slate-500">Connected: {new Date(item.lastActive).toLocaleTimeString()}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="px-1 py-0.5 rounded font-bold text-[9px] bg-slate-900 text-slate-400 border border-slate-800">
                              {item.currency}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(item.loginid)}
                              className="text-[10px] font-semibold text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 px-1.5 py-1 rounded transition-colors cursor-pointer"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending Subscription Submissions */}
            <div className="bg-slate-950/60 border border-emerald-500/15 p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider font-mono flex items-center gap-1">
                  📥 Pending Checkout Submissions ({premiumSubmissions.length})
                </span>
              </div>
              
              {premiumSubmissions.length === 0 ? (
                <div className="text-center py-5 border border-dashed border-slate-850 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-mono">No new premium subscriptions or checkouts found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-900 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-850 text-[8px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5">Subscriber Cardholder</th>
                        <th className="p-2.5">Submitted Token</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 text-slate-350">
                      {premiumSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-900/30">
                          <td className="p-2.5">
                            <span className="text-slate-200 block font-bold">{sub.cardholderName}</span>
                            <span className="text-[9px] text-slate-500">Paid: ${sub.amount} • {new Date(sub.timestamp).toLocaleDateString()}</span>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="password"
                              readOnly
                              value={sub.derivApiToken}
                              onClick={(e) => {
                                const target = e.target as HTMLInputElement;
                                target.type = target.type === 'password' ? 'text' : 'password';
                              }}
                              className="bg-slate-950 font-mono text-[10px] border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 w-32 cursor-pointer focus:outline-none"
                              title="Click to reveal token"
                            />
                            <span className="text-[8px] text-emerald-500 block">Click to reveal</span>
                          </td>
                          <td className="p-2.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                // Auto provision prefill
                                setNewUsername(sub.cardholderName.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                setNewPassword('vip_' + Math.random().toString(36).substring(2, 6) + '_pass');
                                setNewDerivApiToken(sub.derivApiToken);
                                setSuccess(`Prefilled subscription form for ${sub.cardholderName}! Customize and register active subscriber key above.`);
                                setTimeout(() => setSuccess(''), 4500);
                              }}
                              className="text-[9px] font-bold text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950 px-2 py-1 rounded cursor-pointer transition-colors uppercase border border-emerald-900/40 inline-block"
                            >
                              Auto-Prefill
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this checkout submission?')) {
                                  handleDeleteSubmission(sub.id);
                                }
                              }}
                              className="text-[9px] font-bold text-rose-500 hover:text-rose-450 px-1.5 py-1 rounded cursor-pointer inline-block"
                            >
                              Dismiss
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Premium Subscriber Creator & Single Device enforcer */}
            <div className="bg-slate-950/60 border border-amber-500/20 shadow shadow-amber-500/5 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-extrabold text-sm font-sans flex items-center gap-1.5 uppercase tracking-wider">
                    👑 Premium Subscription Manager
                  </span>
                </div>
                <button
                  type="button"
                  onClick={suggestRandomCredentials}
                  className="text-[9px] font-mono font-bold text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded bg-amber-955/20 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-amber-450 animate-pulse" /> Randomize Combo
                </button>
              </div>

              {/* Form setup */}
              <form onSubmit={handleGeneratePremium} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono tracking-wider text-slate-550 uppercase block">Subscriber Username</label>
                    <input
                      type="text"
                      placeholder="e.g. golden_miner_5"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono tracking-wider text-slate-555 uppercase block">Secure Client Passcode</label>
                    <input
                      type="text"
                      placeholder="Create secure passcode..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono tracking-wider text-amber-500 uppercase block">Linked Deriv API Token (Optional - Bypasses Client Token Requirement)</label>
                  <input
                    type="password"
                    placeholder="e.g. jhs8dYshJkd9Ahs (Will save securely on premium profile)..."
                    value={newDerivApiToken}
                    onChange={(e) => setNewDerivApiToken(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/40 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-705 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={generatingCred || !newUsername.trim() || !newPassword.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-955 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-amber-500/5 cursor-pointer flex items-center justify-center gap-1"
                >
                  {generatingCred ? 'GENERATING LICENSE...' : 'REGISTER ACTIVE SUBSCRIBER KEY'}
                </button>
              </form>

              {/* Outstanding Premium list */}
              <div className="space-y-2 pt-1 font-mono text-left">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Active Premium Subscribed Clients</h4>
                
                {premiumCreds.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-slate-850 rounded-xl">
                    <p className="text-[10px] text-slate-600 font-mono">No active paid subscriptions found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-900 rounded-xl max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-850 text-[8px] uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="p-2">Client User</th>
                          <th className="p-2">Active Device Lock</th>
                          <th className="p-2 text-right">Revocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {premiumCreds.map((item) => {
                          const isOnline = !!item.activeSessionId;
                          return (
                            <tr key={item.username} className="hover:bg-slate-900/30">
                              <td className="p-2">
                                <span className="text-amber-400 font-bold block">{item.username}</span>
                                <span className="text-[9.5px] text-slate-500 font-semibold block leading-tight">Passcode: <span className="text-slate-305 select-all font-sans bg-slate-900 px-1 py-0.5 rounded border border-slate-850">{item.password}</span></span>
                                {item.derivApiToken ? (
                                  <div className="mt-1 flex items-center gap-1 text-[8.5px] text-emerald-400 font-sans">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" /> Linked Token: <span className="text-[8.5px] select-all font-mono text-emerald-300 bg-emerald-955/20 border border-emerald-500/10 px-1 rounded">***{item.derivApiToken.slice(-5)}</span>
                                  </div>
                                ) : (
                                  <span className="text-[8.5px] text-slate-550 font-sans mt-0.5 block">No Linked Token</span>
                                )}
                              </td>
                              <td className="p-2">
                                {isOnline ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 text-[9px] font-bold leading-none">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Device Connected
                                    </span>
                                    {item.lastActive && (
                                      <span className="text-[8px] text-slate-500 block leading-tight">Ping: {new Date(item.lastActive).toLocaleTimeString()}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 text-slate-500 border border-slate-850 text-[9px] font-bold leading-none">
                                    Offline
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right space-x-1.5 whitespace-nowrap">
                                {isOnline && (
                                  <button
                                    type="button"
                                    onClick={() => handleKickPremium(item.username)}
                                    className="text-[9px] font-bold text-amber-500 hover:text-amber-400 bg-amber-950/15 border border-amber-900/30 px-1.5 py-0.5 rounded cursor-pointer uppercase tracking-wider transition-colors inline-block"
                                    title="Unlocks single device locking of this profile"
                                  >
                                    Kick Session
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeletePremium(item.username)}
                                  className="text-[9px] font-bold text-rose-500 hover:text-rose-450 hover:bg-rose-950/10 px-1.5 py-0.5 rounded cursor-pointer uppercase transition-colors inline-block"
                                >
                                  Suspend
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Affiliate Token Partner ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Partner ID / Affiliate Token (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. tracking_partner_abc_123"
                    value={affiliateToken}
                    onChange={(e) => setAffiliateToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none transition-colors"
                  />
                  <span className="text-[9px] text-slate-500 block">Allows you to track affiliated signup metrics from your clients.</span>
                </div>

                {/* Subscription Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Monthly Subscription Price ($ USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.00"
                      value={premiumSubscriptionPrice}
                      onChange={(e) => setPremiumSubscriptionPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-4 py-2.5 font-mono text-xs text-slate-100 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block">Configurable monthly VIP charge required to unlock premium indicators.</span>
                </div>
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
