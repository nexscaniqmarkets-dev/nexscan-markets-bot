// Web Audio API browser synth audio chimes
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playWinChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Low rise high chord
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc2.type = 'triangle';
    
    // Play a G4 (392Hz) rising to C5 (523Hz)
    osc1.frequency.setValueAtTime(392, now);
    osc1.frequency.exponentialRampToValueAtTime(523, now + 0.15);
    
    // Harmony E5 (659Hz)
    osc2.frequency.setValueAtTime(659, now);
    
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

export function playLossChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    
    // E3 (165Hz) slumping to A2 (110Hz)
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.3);
    
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    // Filter out very harsh high frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

export function playTargetReachedChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Rich fanfare sequence: G4 -> C5 -> E5 -> G5
    const notes = [392, 523, 659, 784];
    const duration = 0.1;
    
    notes.forEach((freq, index) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + index * 0.1);
      
      g.gain.setValueAtTime(0.1, now + index * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.35);
      
      o.connect(g);
      g.connect(ctx.destination);
      
      o.start(now + index * 0.1);
      o.stop(now + index * 0.1 + 0.35);
    });
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}
