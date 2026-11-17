import Phaser from 'phaser';
import { FONT } from './config.js';
import { initAudio, onMuteChange, sfx, toggleMute } from './audio.js';
import { save } from './state.js';
import { fontPx } from './util.js';

export function skyText(scene, x, y, str, size, align = 'center') {
  const text = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${Math.round(size)}px`,
    color: '#fffdf6',
    fontStyle: 'bold',
    align,
  }).setOrigin(align === 'left' ? 0 : align === 'right' ? 1 : 0.5, 0.5);
  text.setStroke('#1d2b4a', Math.max(4, Math.round(size / 7)));
  text.setResolution(2);
  return text;
}

export function inkText(scene, x, y, str, size, opts = {}) {
  const text = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${Math.round(size)}px`,
    color: opts.color || '#1d2b4a',
    fontStyle: 'bold',
    align: opts.align || 'center',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
  }).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
  text.setResolution(2);
  return text;
}

export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const radius = Math.min(24, h * 0.3);
  const shadow = scene.add.graphics();
  const face = scene.add.graphics();
  let fill = opts.fill ?? 0x3ecf8e;
  const draw = () => {
    shadow.clear();
    face.clear();
    shadow.fillStyle(0x1d2b4a, 1);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 7, w, h, radius);
    face.fillStyle(fill, 1);
    face.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    face.lineStyle(5, 0x1d2b4a, 1);
    face.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  };
  draw();
  const text = inkText(scene, 0, -2, label, opts.fontSize || Math.min(34, h * 0.36), {
    color: opts.textColor || '#1d2b4a',
  });
  const root = scene.add.container(x, y, [shadow, face, text]);
  root.setSize(w, h);
  root.setInteractive(
    new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
    Phaser.Geom.Rectangle.Contains,
  );
  root.setData('ui', true);
  root.enabled = opts.enabled !== false;
  root.held = false;
  root.justDown = false;
  root.alpha = root.enabled ? 1 : 0.45;
  if (opts.depth != null) root.setDepth(opts.depth);

  const press = (pointer, _x, _y, event) => {
    if (!root.enabled) return;
    root.held = true;
    root.justDown = true;
    root.pointerId = pointer.id;
    if (!opts.silent) {
      initAudio();
      sfx('click');
    }
    scene.tweens.add({ targets: root, scale: 0.96, duration: 70, yoyo: true });
    if (event && event.stopPropagation) event.stopPropagation();
  };
  const release = (pointer) => {
    if (pointer && root.pointerId != null && pointer.id !== root.pointerId) return;
    root.held = false;
  };
  root.on('pointerdown', press);
  root.on('pointerup', (pointer, _x, _y, event) => {
    if (!root.enabled || root.pointerId !== pointer.id) {
      release(pointer);
      return;
    }
    release(pointer);
    if (!opts.hold) onClick();
    if (event && event.stopPropagation) event.stopPropagation();
  });
  root.on('pointerupoutside', release);

  root.setEnabled = (on) => {
    root.enabled = on;
    root.alpha = on ? 1 : 0.45;
    if (!on) root.held = false;
  };
  root.setLabel = (str) => text.setText(str);
  root.setFill = (color) => {
    fill = color;
    draw();
  };
  return root;
}

export function consumePress(button) {
  if (!button) return false;
  const was = button.justDown;
  button.justDown = false;
  return was;
}

export function panel(scene, x, y, w, h, fill = 0xfff6df) {
  const g = scene.add.graphics();
  g.fillStyle(0x1d2b4a, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2 + 8, w, h, 26);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 26);
  g.lineStyle(6, 0x1d2b4a, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 26);
  return g;
}

export function drawBar(g, x, y, w, h, amount, fill) {
  const p = Math.max(0, Math.min(1, amount));
  g.clear();
  g.fillStyle(0x1d2b4a, 1);
  g.fillRoundedRect(x, y, w, h, h / 2);
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(x + 4, y + 4, Math.max(0, w - 8), h - 8, (h - 8) / 2);
  const inner = Math.max(0, (w - 8) * p);
  if (inner > 1) {
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x + 4, y + 4, inner, h - 8, (h - 8) / 2);
  }
}

export function floatText(scene, x, y, str) {
  const text = skyText(scene, x, y, str, fontPx(scene, 28));
  text.setDepth(40);
  scene.tweens.add({
    targets: text,
    y: y - 46,
    alpha: 0,
    duration: 750,
    onComplete: () => text.destroy(),
  });
  return text;
}

export function addMuteButton(scene) {
  const w = scene.scale.width;
  const width = Math.max(118, fontPx(scene, 18) * 5.2);
  const height = Math.max(58, fontPx(scene, 18) * 2.3);
  // Top-right corner, clear of the sun (the sun stays on the left or mid sky).
  const btn = makeButton(
    scene,
    w - width / 2 - 16,
    height / 2 + 14,
    width,
    height,
    save.muted ? 'Muted' : 'Sound',
    () => toggleMute(),
    { fill: save.muted ? 0xffb4a2 : 0xfff6df, fontSize: fontPx(scene, 18), depth: 30 },
  );
  const off = onMuteChange((muted) => {
    btn.setLabel(muted ? 'Muted' : 'Sound');
    btn.setFill(muted ? 0xffb4a2 : 0xfff6df);
  });
  scene.events.once('shutdown', off);
  return btn;
}

export function attachPause(scene) {
  scene.paused = false;
  const sizeW = Math.max(120, fontPx(scene, 18) * 5);
  const sizeH = Math.max(64, fontPx(scene, 18) * 2.4);
  let overlay = null;
  const hide = () => {
    if (overlay) overlay.destroy(true);
    overlay = null;
    btn.setLabel('Pause');
  };
  const show = () => {
    hide();
    const w = scene.scale.width;
    const h = scene.scale.height;
    const dim = scene.add.rectangle(w / 2, h / 2, w, h, 0x1d2b4a, 0.45).setInteractive();
    const board = panel(scene, w / 2, h / 2, Math.min(w - 48, 520), Math.min(280, h * 0.4));
    const title = skyText(scene, w / 2, h / 2 - 50, 'Paused', fontPx(scene, 48));
    const resume = makeButton(scene, w / 2, h / 2 + 40, Math.min(280, w * 0.5), 84, 'Keep flying', () => {
      scene.paused = false;
      hide();
    }, { fill: 0x3ecf8e, depth: 36 });
    overlay = scene.add.container(0, 0, [dim, board, title, resume]);
    overlay.setDepth(28);
    btn.setLabel('Play');
  };
  const btn = makeButton(scene, sizeW * 0.55 + 8, sizeH * 0.65 + 10, sizeW, sizeH, 'Pause', () => {
    scene.paused = !scene.paused;
    if (scene.paused) show();
    else hide();
  }, { fill: 0xfff6df, fontSize: fontPx(scene, 20), depth: 30 });
  scene.events.once('shutdown', hide);
  return btn;
}

export function confirmDialog(scene, message, onYes, onNo) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const pw = Math.min(w - 40, 560);
  const ph = Math.min(h - 80, 360);
  const dim = scene.add.rectangle(w / 2, h / 2, w, h, 0x1d2b4a, 0.5).setInteractive().setDepth(40);
  const board = panel(scene, w / 2, h / 2, pw, ph).setDepth(41);
  const text = inkText(scene, w / 2, h / 2 - 50, message, fontPx(scene, 28), {
    wrap: pw - 48,
  }).setDepth(42);
  const close = () => {
    dim.destroy();
    board.destroy();
    text.destroy();
    yes.destroy();
    no.destroy();
  };
  const yes = makeButton(scene, w / 2 - pw * 0.22, h / 2 + ph * 0.26, pw * 0.36, 76, 'Yes', () => {
    close();
    onYes();
  }, { fill: 0x3ecf8e, depth: 42 });
  const no = makeButton(scene, w / 2 + pw * 0.22, h / 2 + ph * 0.26, pw * 0.36, 76, 'Not now', () => {
    close();
    if (onNo) onNo();
  }, { fill: 0xfff6df, depth: 42 });
}
