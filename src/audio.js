import { persist, save } from './state.js';

let ctx = null;
let engineOsc = null;
let engineGain = null;
let started = false;
const listeners = new Set();

function context() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function initAudio() {
  try {
    context();
  } catch {
    ctx = null;
  }
}

export function onMuteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toggleMute() {
  save.muted = !save.muted;
  persist();
  if (save.muted) engineSet(0);
  listeners.forEach((fn) => fn(save.muted));
}

function tone(freq, duration, type, volume, slideTo) {
  const audio = context();
  if (!audio || save.muted) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), audio.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration + 0.02);
}

export function sfx(name) {
  try {
    if (name === 'click') tone(520, 0.08, 'triangle', 0.08, 320);
    else if (name === 'board') tone(660, 0.09, 'sine', 0.07, 880);
    else if (name === 'bag') tone(240, 0.08, 'square', 0.03, 180);
    else if (name === 'door') tone(180, 0.18, 'triangle', 0.08, 90);
    else if (name === 'star') {
      tone(740, 0.1, 'sine', 0.07, 980);
      tone(1180, 0.14, 'triangle', 0.04);
    } else if (name === 'coin') tone(880, 0.12, 'square', 0.04, 1320);
    else if (name === 'bump') tone(180, 0.18, 'sine', 0.06, 90);
    else if (name === 'ready') tone(520, 0.12, 'triangle', 0.08, 760);
    else if (name === 'takeoff') tone(220, 0.4, 'sawtooth', 0.04, 660);
    else if (name === 'butter') {
      tone(523, 0.12, 'sine', 0.07);
      tone(659, 0.16, 'sine', 0.06);
      tone(784, 0.22, 'triangle', 0.05);
    } else if (name === 'bounce') tone(160, 0.28, 'triangle', 0.08, 90);
    else if (name === 'fanfare') {
      [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.18, 'triangle', 0.06), i * 110);
      });
    } else if (name === 'unlock') tone(640, 0.16, 'triangle', 0.08, 960);
  } catch {
    // Sound is optional. Never let a tone break the game.
  }
}

export function engineSet(amount) {
  try {
    const audio = context();
    if (!audio) return;
    if (!started) {
      engineOsc = audio.createOscillator();
      engineGain = audio.createGain();
      engineOsc.type = 'triangle';
      engineOsc.frequency.value = 90;
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(audio.destination);
      engineOsc.start();
      started = true;
    }
    const level = save.muted ? 0 : Math.max(0, Math.min(1, amount)) * 0.045;
    const freq = 70 + Math.max(0, amount) * 150;
    engineGain.gain.linearRampToValueAtTime(level, audio.currentTime + 0.08);
    engineOsc.frequency.linearRampToValueAtTime(freq, audio.currentTime + 0.08);
  } catch {
    // ignore
  }
}
