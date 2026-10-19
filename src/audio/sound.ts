/**
 * Small synthesized sound kit (Web Audio), so there are no audio files to load.
 * The AudioContext is only created on the first user gesture (browser autoplay rules).
 */
import type { WorldId } from '../content/worlds';

type Sfx = 'click' | 'correct' | 'wrong' | 'combo' | 'levelUp' | 'bossHit' | 'bossWin' | 'coin' | 'star' | 'chest' | 'hint' | 'magic';

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxVolume = 0.8;
let musicVolume = 0.3;
let musicTimer: number | null = null;
let musicWorld: WorldId | 'home' | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  sfxGain = ctx.createGain();
  sfxGain.gain.value = sfxVolume;
  sfxGain.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = musicVolume * 0.25;
  musicGain.connect(ctx.destination);
  return ctx;
}

/** Call once from a user gesture to unlock audio. */
export function unlockAudio() {
  const c = ensure();
  if (c?.state === 'suspended') void c.resume();
  if (musicWorld && !musicTimer) startMusic(musicWorld);
}

export function setVolumes(sfx: number, music: number) {
  sfxVolume = sfx;
  musicVolume = music;
  if (sfxGain) sfxGain.gain.value = sfx;
  if (musicGain) musicGain.gain.value = music * 0.25;
  if (music === 0) stopMusic(false);
  else if (musicWorld && !musicTimer) startMusic(musicWorld);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, out: AudioNode | null = sfxGain) {
  if (!ctx || !out) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.3) {
  if (!ctx || !sfxGain) return;
  const t = ctx.currentTime + start;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.buffer = buffer;
  src.connect(filter).connect(g).connect(sfxGain);
  src.start(t);
}

const note = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);

export function play(sfx: Sfx, combo = 0) {
  if (!ensure() || sfxVolume === 0) return;
  switch (sfx) {
    case 'click': tone(660, 0, 0.06, 'triangle', 0.15); break;
    case 'hint': tone(880, 0, 0.1, 'sine', 0.15); tone(1175, 0.08, 0.15, 'sine', 0.12); break;
    case 'magic': [0, 7, 12, 16, 19].forEach((s, i) => tone(note(15 + s), i * 0.05, 0.35, 'sine', 0.1)); break;
    case 'correct': tone(note(3), 0, 0.12, 'triangle'); tone(note(7), 0.09, 0.2, 'triangle'); break;
    case 'combo': {
      const base = Math.min(combo, 12);
      tone(note(3 + base), 0, 0.1, 'triangle');
      tone(note(7 + base), 0.07, 0.12, 'triangle');
      tone(note(10 + base), 0.14, 0.2, 'triangle', 0.25);
      break;
    }
    case 'wrong': tone(note(-5), 0, 0.18, 'sine', 0.2); tone(note(-9), 0.12, 0.25, 'sine', 0.15); break;
    case 'coin': tone(note(14), 0, 0.07, 'square', 0.08); tone(note(19), 0.06, 0.18, 'square', 0.08); break;
    case 'star': tone(note(12), 0, 0.25, 'sine', 0.25); tone(note(19), 0, 0.3, 'triangle', 0.1); break;
    case 'bossHit': noise(0, 0.25, 0.5); tone(110, 0, 0.2, 'sawtooth', 0.15); break;
    case 'levelUp':
      [0, 4, 7, 12].forEach((s, i) => tone(note(3 + s), i * 0.11, 0.25, 'triangle', 0.25));
      tone(note(15), 0.44, 0.6, 'triangle', 0.25);
      break;
    case 'bossWin':
      [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(note(s), i * 0.12, 0.3, 'square', 0.1));
      tone(note(24), 0.84, 0.9, 'triangle', 0.25);
      break;
    case 'chest':
      noise(0, 0.15, 0.2);
      [0, 4, 7, 11, 14, 19].forEach((s, i) => tone(note(5 + s), 0.15 + i * 0.07, 0.4, 'sine', 0.2));
      break;
  }
}

// ---------- Background music: a gentle generative arpeggio, different scale per world ----------

const SCALES: Partial<Record<WorldId, number[]>> & { default: number[] } = {
  default: [0, 2, 4, 7, 9],
  equations: [0, 2, 5, 7, 9],
  quadratic: [0, 3, 5, 7, 10],
  probability: [0, 2, 4, 6, 9],
};

export function startMusic(world: WorldId | 'home') {
  musicWorld = world;
  if (!ctx || musicVolume === 0) return;
  stopMusic(false);
  const scale = (world !== 'home' && SCALES[world]) || SCALES.default;
  let i = 0;
  musicTimer = window.setInterval(() => {
    const deg = scale[(i * 3 + (i >> 2)) % scale.length];
    const octave = i % 8 < 4 ? 0 : 12;
    tone(note(-9 + deg + octave), 0, 1.4, 'sine', 0.35, musicGain);
    if (i % 4 === 0) tone(note(-21 + scale[(i >> 2) % scale.length]), 0, 2.4, 'triangle', 0.3, musicGain);
    i++;
  }, 600);
}

export function stopMusic(forget = true) {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
  if (forget) musicWorld = null;
}
