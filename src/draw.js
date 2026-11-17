import Phaser from 'phaser';
import { US_SHAPE } from './config.js';

export function planeMetrics(plane, scale) {
  const mul = plane.id === 'jumbo' ? 1.32 : plane.id === 'sunny' ? 1.12 : 1;
  const length = 150 * scale * mul;
  return {
    L: length,
    s: scale,
    doorX: length * 0.36,
    doorY: -12 * scale,
    doorW: 18 * scale,
    doorH: 32 * scale,
    cargoX: -length * 0.06,
    cargoY: 14 * scale,
    wheelY: 34 * scale,
    wheelR: 7 * scale,
  };
}

export function paintSky(scene) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const g = scene.add.graphics();
  const top = Phaser.Display.Color.ValueToColor(0x3aa0ff);
  const mid = Phaser.Display.Color.ValueToColor(0x8fd4ff);
  const horizon = Phaser.Display.Color.ValueToColor(0xfff3c4);
  const bands = 28;
  for (let i = 0; i < bands; i += 1) {
    const t = i / (bands - 1);
    const color = t < 0.65
      ? Phaser.Display.Color.Interpolate.ColorWithColor(top, mid, 100, (t / 0.65) * 100)
      : Phaser.Display.Color.Interpolate.ColorWithColor(mid, horizon, 100, ((t - 0.65) / 0.35) * 100);
    g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
    const y = Math.floor((h * i) / bands);
    const next = Math.floor((h * (i + 1)) / bands);
    g.fillRect(0, y, w, next - y + 1);
  }
  return g;
}

export function paintGround(scene, groundY) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const g = scene.add.graphics();
  g.fillStyle(0x67c23a, 1);
  g.fillRect(0, groundY, w, h - groundY);
  g.fillStyle(0x8ed86a, 1);
  g.fillRect(0, groundY, w, 10);
  g.fillStyle(0x3f9e2e, 1);
  for (let x = 16; x < w; x += 38) {
    g.fillTriangle(x, groundY + 8, x + 7, groundY - 10, x + 14, groundY + 8);
  }
  return g;
}

export function addSun(scene, x, y, radius) {
  const g = scene.add.graphics();
  g.lineStyle(6, 0xffe08a, 0.9);
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI * 2 * i) / 10;
    g.lineBetween(
      x + Math.cos(a) * (radius + 6),
      y + Math.sin(a) * (radius + 6),
      x + Math.cos(a) * (radius + 18),
      y + Math.sin(a) * (radius + 18),
    );
  }
  g.fillStyle(0xffe066, 1);
  g.fillCircle(x, y, radius);
  g.lineStyle(4, 0x1d2b4a, 1);
  g.strokeCircle(x, y, radius);
  g.fillStyle(0x1d2b4a, 1);
  g.fillCircle(x - radius * 0.28, y - radius * 0.1, radius * 0.08);
  g.fillCircle(x + radius * 0.28, y - radius * 0.1, radius * 0.08);
  g.lineStyle(3, 0x1d2b4a, 1);
  g.beginPath();
  g.arc(x, y + radius * 0.05, radius * 0.38, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.strokePath();
  return g;
}

export function createCloud(scene, x, y, scale = 1, storm = false) {
  const g = scene.add.graphics();
  const puff = (cx, cy, r) => {
    g.fillStyle(storm ? 0x6d7c8f : 0xffffff, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(3, 0x1d2b4a, storm ? 0.7 : 0.35);
    g.strokeCircle(cx, cy, r);
  };
  puff(-18 * scale, 6 * scale, 16 * scale);
  puff(6 * scale, 8 * scale, 22 * scale);
  puff(28 * scale, 4 * scale, 15 * scale);
  puff(8 * scale, -8 * scale, 14 * scale);
  if (storm) {
    g.fillStyle(0xffd23f, 1);
    g.fillTriangle(-2 * scale, 10 * scale, 10 * scale, 10 * scale, 2 * scale, 32 * scale);
    g.lineStyle(2, 0x1d2b4a, 0.8);
    g.strokeTriangle(-2 * scale, 10 * scale, 10 * scale, 10 * scale, 2 * scale, 32 * scale);
  }
  const root = scene.add.container(x, y, [g]);
  root.speed = 18 + scale * 10;
  return root;
}

function paintStar(g, x, y, outer, inner, color) {
  g.fillStyle(color, 1);
  g.beginPath();
  const points = 5;
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0x1d2b4a, 0.85);
  g.strokePath();
}

export function createStar(scene) {
  const g = scene.add.graphics();
  paintStar(g, 0, 0, 14, 6, 0xffe566);
  return scene.add.container(0, 0, [g]);
}

export function createCoin(scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xffc93c, 1);
  g.fillCircle(0, 0, 13);
  g.lineStyle(3, 0x1d2b4a, 1);
  g.strokeCircle(0, 0, 13);
  g.lineStyle(2, 0xc47d09, 1);
  g.strokeCircle(0, 0, 7);
  return scene.add.container(0, 0, [g]);
}

export function createBird(scene) {
  const wing = scene.add.triangle(0, -2, -16, 2, 16, 2, 0, -16, 0x5c6bc0);
  wing.setStrokeStyle(2, 0x1d2b4a);
  const body = scene.add.ellipse(0, 2, 22, 12, 0x3949ab).setStrokeStyle(3, 0x1d2b4a);
  const beak = scene.add.triangle(12, 2, 0, -3, 0, 3, 9, 0, 0xffb703);
  const eye = scene.add.circle(4, 0, 1.6, 0xffffff);
  const pupil = scene.add.circle(4.6, 0, 0.8, 0x1d2b4a);
  const root = scene.add.container(0, 0, [wing, body, beak, eye, pupil]);
  root.wing = wing;
  return root;
}

export function createBuilding(scene, height) {
  const w = 28 + (height % 18);
  const g = scene.add.graphics();
  g.fillStyle(height % 2 === 0 ? 0xfff6df : 0xd7e6ff, 1);
  g.fillRoundedRect(-w / 2, -height, w, height, 4);
  g.lineStyle(3, 0x1d2b4a, 1);
  g.strokeRoundedRect(-w / 2, -height, w, height, 4);
  g.fillStyle(0x7ec8ff, 1);
  for (let y = -height + 10; y < -8; y += 14) {
    for (let x = -w / 2 + 6; x < w / 2 - 4; x += 12) {
      g.fillRect(x, y, 6, 8);
    }
  }
  return scene.add.container(0, 0, [g]);
}

export function createPlane(scene, plane, scale, opts = {}) {
  const m = planeMetrics(plane, scale);
  const { s, L } = m;
  const g = scene.add.graphics();

  g.fillStyle(plane.tail, 1);
  g.fillTriangle(-L * 0.4, -6 * s, -L * 0.52, -62 * s, -L * 0.05, -14 * s);
  g.lineStyle(4, 0x1d2b4a, 1);
  g.strokeTriangle(-L * 0.4, -6 * s, -L * 0.52, -62 * s, -L * 0.05, -14 * s);
  paintStar(g, -L * 0.32, -38 * s, 7 * s, 3 * s, 0xffffff);

  g.fillStyle(0xd7e2ef, 1);
  g.fillTriangle(-4 * s, 6 * s, 36 * s, 2 * s, -18 * s, 22 * s);
  g.lineStyle(4, 0x1d2b4a, 1);
  g.strokeTriangle(-4 * s, 6 * s, 36 * s, 2 * s, -18 * s, 22 * s);

  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(-L * 0.48, -22 * s, L * 0.96, 44 * s, 20 * s);
  g.lineStyle(4, 0x1d2b4a, 1);
  g.strokeRoundedRect(-L * 0.48, -22 * s, L * 0.96, 44 * s, 20 * s);

  g.fillStyle(0xffffff, 1);
  g.fillCircle(L * 0.44, 0, 16 * s);
  g.lineStyle(4, 0x1d2b4a, 1);
  g.strokeCircle(L * 0.44, 0, 16 * s);

  g.fillStyle(plane.stripe, 1);
  g.fillRect(-L * 0.42, -3 * s, L * 0.8, 9 * s);

  const windows = plane.pax >= 14 ? 7 : plane.pax >= 10 ? 5 : 4;
  g.fillStyle(0x16345c, 1);
  for (let i = 0; i < windows; i += 1) {
    g.fillCircle(-L * 0.18 + i * (14 * s), -10 * s, 3.6 * s);
  }

  g.fillStyle(0xb5e4ff, 1);
  g.fillRoundedRect(L * 0.26, -16 * s, 20 * s, 13 * s, 5 * s);
  g.lineStyle(3, 0x1d2b4a, 1);
  g.strokeRoundedRect(L * 0.26, -16 * s, 20 * s, 13 * s, 5 * s);

  g.fillStyle(0x1d2b4a, 1);
  g.fillCircle(L * 0.5, -3 * s, 2.2 * s);
  g.lineStyle(2.5, 0x1d2b4a, 1);
  g.beginPath();
  g.arc(L * 0.46, 3 * s, 6 * s, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.strokePath();

  g.fillStyle(0x5c6b7c, 1);
  g.fillRoundedRect(L * 0.02, 16 * s, 34 * s, 14 * s, 7 * s);
  g.lineStyle(3, 0x1d2b4a, 1);
  g.strokeRoundedRect(L * 0.02, 16 * s, 34 * s, 14 * s, 7 * s);

  g.lineStyle(3, 0x1d2b4a, 1);
  g.strokeRoundedRect(m.doorX - m.doorW / 2, m.doorY - m.doorH / 2, m.doorW, m.doorH, 3);
  g.strokeRoundedRect(m.cargoX - 8 * s, m.cargoY - 6 * s, 16 * s, 12 * s, 2);

  const doorHole = scene.add
    .rectangle(m.doorX, m.doorY, m.doorW - 2, m.doorH - 2, 0x1d2b4a)
    .setVisible(Boolean(opts.doorOpen));

  g.lineStyle(4, 0x5c6b7c, 1);
  g.lineBetween(-L * 0.16, 16 * s, -L * 0.16, m.wheelY - m.wheelR);
  g.lineBetween(L * 0.24, 16 * s, L * 0.24, m.wheelY - m.wheelR);

  const w1 = scene.add.circle(-L * 0.16, m.wheelY, m.wheelR, 0x1d2b4a);
  const w2 = scene.add.circle(L * 0.24, m.wheelY, m.wheelR, 0x1d2b4a);
  const h1 = scene.add.circle(-L * 0.16, m.wheelY, m.wheelR * 0.45, 0xd0d7e2);
  const h2 = scene.add.circle(L * 0.24, m.wheelY, m.wheelR * 0.45, 0xd0d7e2);
  const wheels = [w1, w2, h1, h2];
  if (opts.wheels === false) wheels.forEach((wheel) => wheel.setVisible(false));

  const root = scene.add.container(0, 0, [g, doorHole, ...wheels]);
  return {
    root,
    metrics: m,
    doorHole,
    wheels,
    setDoor(open) {
      doorHole.setVisible(open);
    },
    setWheels(on) {
      wheels.forEach((wheel) => wheel.setVisible(on));
    },
    worldPoint(localX, localY) {
      const facing = root.scaleX < 0 ? -1 : 1;
      return {
        x: root.x + localX * facing,
        y: root.y + localY,
      };
    },
  };
}

export function drawLand(graphics, rect) {
  const pts = US_SHAPE.map(([nx, ny]) => ({
    x: rect.x + (nx / 100) * rect.w,
    y: rect.y + (ny / 100) * rect.h,
  }));
  graphics.fillStyle(0x7ed957, 1);
  graphics.beginPath();
  graphics.moveTo(pts[0].x, pts[0].y);
  pts.forEach((p) => graphics.lineTo(p.x, p.y));
  graphics.closePath();
  graphics.fillPath();
  graphics.lineStyle(5, 0x1d2b4a, 1);
  graphics.strokePath();
  graphics.fillStyle(0x4aa3e8, 0.45);
  graphics.fillEllipse(rect.x + rect.w * 0.58, rect.y + rect.h * 0.28, rect.w * 0.12, rect.h * 0.08);
}
