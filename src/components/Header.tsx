/**
 * Header.tsx — NexScan IQ Markets
 * Redesigned: slim top bar with logo, status and controls
 */

import { Activity, Sparkles, Clock, Shield, HelpCircle, Square } from 'lucide-react';
import { AccountInfo } from '../types';
import nexscanLogo from '../assets/images/nexscan_iq_logo_main.png';

interface HeaderProps {
  ticksCount: number;
  signalsCount: number;
  sessionTime: string;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
  account: AccountInfo | null;
  botRunning: boolean;
  onStopAll: () => void;
  onOpenOnboarding: () => void;
  onOpenAdminHub: () => void;
  isTelegram?: boolean;
  tgUser?: any;
}

export function Header({
  ticksCount,
  signalsCount,
  sessionTime,
  connectionStatus,
  account,
  botRunning,
  onStopAll,
  onOpenOnboarding,
  onOpenAdminHub,
  isTelegram = false,
  tgUser = null,
}: HeaderProps) {
  const statusMap = {
    idle:         { dot: '#475569', label: 'Idle' },
    connecting:   { dot: '#f59e0b', label: 'Connecting' },
    connected:    { dot: '#10b981', label: 'Live' },
    error:        { dot: '#f43f5e', label: 'Error' },
    disconnected: { dot: '#475569', label: 'Offline' },
  };
  const { dot, label } = statusMap[connectionStatus];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(8, 15, 26, 0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '10px 12px',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {/* Row 1: Logo + controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ position: 'relative' }}>
            <img src={nexscanLogo} alt="NexScan IQ" style={{
              width: 36, height: 36, borderRadius: 9,
              objectFit: 'contain', background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
            }} />
            <span style={{
              position: 'absolute', top: -3, right: -3,
              width: 9, height: 9, borderRadius: '50%',
              background: dot, border: '2px solid #080f1a',
              display: 'block',
            }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                NEXSCAN <span style={{ color: '#6366f1' }}>IQ</span>
              </span>
              <span style={{
                fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                padding: '2px 6px', borderRadius: 4,
                background: '#052e16', color: '#10b981',
                border: '1px solid #10b98133', letterSpacing: '0.05em',
              }}>
                MARKETS
              </span>
              {isTelegram && (
                <span style={{
                  fontSize: 9, fontFamily: 'monospace', padding: '2px 6px',
                  borderRadius: 4, background: '#0c1a2e', color: '#38bdf8',
                  border: '1px solid #38bdf833',
                }}>
                  TG {tgUser?.first_name ? `· ${tgUser.first_name}` : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#334155', marginTop: 1 }}>
              Digit Over · Martingale Recovery
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onOpenAdminHub} title="Administrator" style={{
            background: 'transparent', border: '1px solid #1e293b',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#475569',
          }}>
            <Shield size={14} color="#10b981" />
          </button>
          <button onClick={onOpenOnboarding} title="How to Use" style={{
            background: 'transparent', border: '1px solid #1e293b',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#475569',
          }}>
            <HelpCircle size={14} color="#6366f1" />
          </button>
          {botRunning && (
            <button onClick={onStopAll} style={{
              background: '#1a0000', border: '1px solid #f43f5e55',
              borderRadius: 8, padding: '6px 12px',
              display: 'flex', alignItems: 'center', gap: 5,
              cursor: 'pointer', color: '#f43f5e',
              fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
            }}>
              <Square size={11} fill="#f43f5e" /> STOP
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Stats strip */}
      <div style={{
        display: 'flex', gap: 6,
        background: '#0a0f1e', borderRadius: 9,
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '8px 12px',
      }}>
        {[
          { Icon: Activity, value: ticksCount.toLocaleString(), label: 'Ticks', color: '#6366f1' },
          { Icon: Sparkles, value: signalsCount.toString(), label: 'Signals', color: '#f59e0b' },
          { Icon: Clock, value: sessionTime, label: 'Session', color: '#64748b' },
        ].map(({ Icon, value, label: l, color }, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6,
            paddingRight: i < 2 ? 6 : 0,
            borderRight: i < 2 ? '1px solid #1e293b' : 'none',
          }}>
            <Icon size={12} color={color} />
            <div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#334155', lineHeight: 1.1 }}>{l}</div>
            </div>
          </div>
        ))}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          paddingLeft: 6, borderLeft: '1px solid #1e293b',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: dot }}>{label}</span>
        </div>
      </div>
    </header>
  );
}
