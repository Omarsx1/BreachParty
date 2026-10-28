import { useCallback, useState } from 'react';
import type { SoundName } from '../types/game';

const STORAGE_KEY = 'breachparty:muted';

interface ToneSpec {
  type: OscillatorType;
  from: number;
  to: number;
  duration: number;
  gain: number;
  delay: number;
}

const RECIPES: Record<SoundName, ToneSpec[]> = {
  click: [{ type: 'square', from: 720, to: 480, duration: 0.06, gain: 0.035, delay: 0 }],
  join: [
    { type: 'sine', from: 520, to: 880, duration: 0.16, gain: 0.05, delay: 0 },
    { type: 'triangle', from: 880, to: 1040, duration: 0.12, gain: 0.03, delay: 0.08 },
  ],
  tick: [{ type: 'square', from: 1240, to: 1040, duration: 0.04, gain: 0.025, delay: 0 }],
  whoosh: [
    { type: 'sawtooth', from: 200, to: 900, duration: 0.3, gain: 0.03, delay: 0 },
    { type: 'triangle', from: 500, to: 1600, duration: 0.24, gain: 0.02, delay: 0.03 },
  ],
  vote: [
    { type: 'triangle', from: 440, to: 440, duration: 0.09, gain: 0.045, delay: 0 },
    { type: 'triangle', from: 660, to: 660, duration: 0.12, gain: 0.035, delay: 0.08 },
  ],
  reveal: [
    { type: 'triangle', from: 523, to: 523, duration: 0.12, gain: 0.04, delay: 0 },
    { type: 'triangle', from: 659, to: 659, duration: 0.12, gain: 0.04, delay: 0.1 },
    { type: 'triangle', from: 784, to: 784, duration: 0.2, gain: 0.04, delay: 0.2 },
  ],
  victory: [
    { type: 'triangle', from: 523, to: 523, duration: 0.16, gain: 0.05, delay: 0 },
    { type: 'triangle', from: 659, to: 659, duration: 0.16, gain: 0.05, delay: 0.12 },
    { type: 'triangle', from: 784, to: 784, duration: 0.18, gain: 0.05, delay: 0.24 },
    { type: 'triangle', from: 1046, to: 1046, duration: 0.34, gain: 0.055, delay: 0.38 },
    { type: 'sine', from: 261, to: 261, duration: 0.5, gain: 0.03, delay: 0.38 },
  ],
  error: [{ type: 'sawtooth', from: 220, to: 110, duration: 0.24, gain: 0.04, delay: 0 }],
};

type AudioContextConstructor = new () => AudioContext;

interface AudioScope {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

let audioContext: AudioContext | null = null;
let mutedPreference: boolean | null = null;

function readMutedPreference(): boolean {
  if (mutedPreference !== null) return mutedPreference;
  if (typeof window === 'undefined') {
    mutedPreference = true;
    return true;
  }
  mutedPreference = window.localStorage.getItem(STORAGE_KEY) === '1';
  return mutedPreference;
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext === null) {
    const scope = window as unknown as AudioScope;
    const Constructor = scope.AudioContext ?? scope.webkitAudioContext;
    if (Constructor === undefined) return null;
    audioContext = new Constructor();
  }
  return audioContext;
}

/** Sintetiza el efecto en el AudioContext del host. Sin archivos externos. */
export function playSound(name: SoundName): void {
  if (readMutedPreference()) return;
  const context = ensureContext();
  if (context === null) return;
  if (context.state === 'suspended') void context.resume();
  const start = context.currentTime;
  for (const spec of RECIPES[name]) {
    const at = start + spec.delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = spec.type;
    oscillator.frequency.setValueAtTime(spec.from, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(spec.to, 1), at + spec.duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(spec.gain, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + spec.duration + 0.02);
  }
}

export function unlockAudio(): void {
  const context = ensureContext();
  if (context !== null && context.state === 'suspended') void context.resume();
}

export interface SoundEffects {
  muted: boolean;
  play: (name: SoundName) => void;
  toggleMuted: () => void;
}

export function useSoundEffects(): SoundEffects {
  const [muted, setMuted] = useState<boolean>(() => readMutedPreference());

  const play = useCallback((name: SoundName) => {
    playSound(name);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;
      mutedPreference = next;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      }
      if (!next) unlockAudio();
      return next;
    });
  }, []);

  return { muted, play, toggleMuted };
}
