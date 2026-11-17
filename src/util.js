import Phaser from 'phaser';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function finePointer() {
  return window.matchMedia('(pointer: fine)').matches;
}

export function fitScale(scene) {
  const gameW = scene.scale.width;
  const gameH = scene.scale.height;
  const screenW = window.innerWidth || gameW;
  const screenH = window.innerHeight || gameH;
  return Math.min(screenW / gameW, screenH / gameH) || 1;
}

/** Convert a desired on-screen pixel size into game pixels. */
export function tap(scene, cssPx) {
  return cssPx / fitScale(scene);
}

export function fontPx(scene, designPx) {
  return Math.max(designPx, Math.round(tap(scene, 16)));
}

export function isPortrait(scene) {
  return scene.scale.height > scene.scale.width;
}

export function bindKeys(scene) {
  if (!scene.input.keyboard) {
    const fake = { isDown: false };
    return { up: fake, down: fake, left: fake, right: fake, w: fake, s: fake, space: fake, enter: fake };
  }
  return scene.input.keyboard.addKeys({
    up: 'UP',
    down: 'DOWN',
    left: 'LEFT',
    right: 'RIGHT',
    w: 'W',
    s: 'S',
    space: 'SPACE',
    enter: 'ENTER',
  });
}

export function pressed(key) {
  if (!key || !key.plugin) return false;
  return Phaser.Input.Keyboard.JustDown(key);
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
