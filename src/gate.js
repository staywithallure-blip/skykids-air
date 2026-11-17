import { FONT, planeById } from './config.js';
import { addSun, createCloud, createPlane, paintGround, paintSky, planeMetrics } from './draw.js';
import { save } from './state.js';
import { isPortrait } from './util.js';

// Side view of a gate: terminal, airstairs, belt loader, and the player's plane.
export function mountGate(scene, opts = {}) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const portrait = isPortrait(scene);
  const nodes = [];
  const add = (obj, depth) => {
    obj.setDepth(depth);
    nodes.push(obj);
    return obj;
  };

  add(paintSky(scene), 0);
  const groundY = portrait ? h * 0.7 : h * 0.78;
  add(paintGround(scene, groundY), 1);
  // Sun stays left of center so the Sound button can own the top-right corner.
  add(addSun(scene, portrait ? w * 0.16 : w * 0.38, portrait ? 340 : 280, portrait ? 30 : 36), 1);

  const cloudFloor = portrait ? 280 : 230;
  const clouds = [0.18, 0.55, 0.78].map((nx, i) => {
    const cloud = createCloud(scene, w * nx, cloudFloor + 24 + i * 36, 0.65 + i * 0.1, false);
    cloud.minY = cloudFloor;
    add(cloud, 1);
    return cloud;
  });

  const planeDef = planeById(save.planeId);
  const scale = portrait ? 1.2 : 1.65;
  const metrics = planeMetrics(planeDef, scale);
  const terminalW = portrait ? w * 0.3 : 250;
  const terminalH = portrait ? 180 : 220;
  const terminalX = portrait ? 18 : 48;
  const terminalRight = terminalX + terminalW;
  const noseX = terminalRight + (portrait ? 150 : 230);
  const planeX = noseX + metrics.L * 0.5;
  const planeY = groundY - (metrics.wheelY + metrics.wheelR);

  const building = scene.add.graphics();
  building.fillStyle(0xfff6df, 1);
  building.fillRoundedRect(terminalX, groundY - terminalH, terminalW, terminalH, 12);
  building.lineStyle(5, 0x1d2b4a, 1);
  building.strokeRoundedRect(terminalX, groundY - terminalH, terminalW, terminalH, 12);
  building.fillStyle(0x7ec8ff, 1);
  const cols = portrait ? 2 : 3;
  const rows = 3;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const wx = terminalX + 18 + c * ((terminalW - 36) / cols);
      const wy = groundY - terminalH + 36 + r * 48;
      building.fillRoundedRect(wx, wy, Math.min(48, terminalW / cols - 16), 32, 4);
      building.lineStyle(3, 0x1d2b4a, 1);
      building.strokeRoundedRect(wx, wy, Math.min(48, terminalW / cols - 16), 32, 4);
    }
  }
  building.fillStyle(0xff7a59, 1);
  building.fillRect(terminalX, groundY - terminalH, terminalW, 18);
  add(building, 2);

  const tower = scene.add.graphics();
  const tx = terminalX + terminalW * 0.3;
  tower.fillStyle(0xfff6df, 1);
  tower.fillRect(tx, groundY - terminalH - 70, 36, 74);
  tower.fillStyle(0xb5e4ff, 1);
  tower.fillRect(tx - 6, groundY - terminalH - 86, 48, 22);
  tower.lineStyle(4, 0x1d2b4a, 1);
  tower.strokeRect(tx, groundY - terminalH - 70, 36, 74);
  tower.strokeRect(tx - 6, groundY - terminalH - 86, 48, 22);
  add(tower, 2);

  const sign = scene.add.text(terminalX + terminalW / 2, groundY - terminalH + 8, opts.sign || 'Austin', {
    fontFamily: FONT,
    fontSize: portrait ? '22px' : '28px',
    color: '#1d2b4a',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0).setResolution(2);
  add(sign, 3);

  const doorX = terminalRight - 8;
  const walkStart = { x: doorX, y: groundY };
  const termDoor = scene.add.rectangle(doorX - 16, groundY - 28, 26, 56, 0x1d2b4a);
  add(termDoor, 3);

  const plane = createPlane(scene, planeDef, scale, { wheels: true, doorOpen: Boolean(opts.doorOpen) });
  plane.root.setPosition(planeX, planeY);
  plane.root.scaleX = -1;
  add(plane.root, 5);

  const door = plane.worldPoint(metrics.doorX, metrics.doorY);
  const cargo = plane.worldPoint(metrics.cargoX, metrics.cargoY);
  const stair = drawStairTruck(scene, door, groundY, portrait);
  add(stair.graphics, 6);
  if (opts.stairs === false) stair.graphics.setVisible(false);
  const stairs = stair.graphics;
  const steps = stair.points;
  const stairBase = steps[0];

  const cartX = Math.min(w - 50, cargo.x + (portrait ? 50 : 80));
  const cartY = groundY - 24;
  const cart = scene.add.graphics();
  cart.fillStyle(0xff7a59, 1);
  cart.fillRoundedRect(cartX - 28, cartY - 16, 56, 28, 6);
  cart.lineStyle(3, 0x1d2b4a, 1);
  cart.strokeRoundedRect(cartX - 28, cartY - 16, 56, 28, 6);
  cart.fillStyle(0x1d2b4a, 1);
  cart.fillCircle(cartX - 14, cartY + 16, 6);
  cart.fillCircle(cartX + 14, cartY + 16, 6);
  add(cart, 3);

  const belt = scene.add.graphics();
  belt.lineStyle(12, 0x39485c, 1);
  belt.lineBetween(cartX, cartY - 8, cargo.x, cargo.y);
  belt.lineStyle(4, 0xffc93c, 1);
  belt.lineBetween(cartX, cartY - 8, cargo.x, cargo.y);
  add(belt, 3);

  const loader = scene.add.graphics();
  loader.fillStyle(0xffc93c, 1);
  loader.fillRoundedRect(cartX - 46, cartY - 8, 34, 22, 5);
  loader.lineStyle(3, 0x1d2b4a, 1);
  loader.strokeRoundedRect(cartX - 46, cartY - 8, 34, 22, 5);
  loader.fillStyle(0x1d2b4a, 1);
  loader.fillCircle(cartX - 36, cartY + 16, 5);
  loader.fillCircle(cartX - 18, cartY + 16, 5);
  add(loader, 4);

  return {
    nodes,
    clouds,
    groundY,
    plane,
    door,
    cargo,
    stairBase,
    steps,
    walkStart,
    stairs,
    belt,
    cartPoint: { x: cartX, y: cartY - 8 },
    parkX: planeX,
    destroy() {
      nodes.forEach((node) => node.destroy());
    },
  };
}

function drawStairTruck(scene, door, groundY, portrait) {
  const g = scene.add.graphics();
  const count = portrait ? 5 : 6;
  // Last tread meets the front door. The run stays left of the nose.
  const sill = { x: door.x - 6, y: door.y + 18 };
  const rise = Math.max(64, groundY - sill.y);
  const run = portrait ? 78 : 108;
  const base = { x: sill.x - run, y: groundY };
  const points = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    points.push({
      x: base.x + (sill.x - base.x) * t,
      y: base.y + (sill.y - base.y) * t,
    });
  }

  const truckLeft = base.x - 78;
  const truckTop = groundY - 32;
  g.fillStyle(0xffc93c, 1);
  g.fillRoundedRect(truckLeft, truckTop, 72, 32, 6);
  g.lineStyle(4, 0x1d2b4a, 1);
  g.strokeRoundedRect(truckLeft, truckTop, 72, 32, 6);
  g.fillStyle(0xff7a59, 1);
  g.fillRoundedRect(truckLeft, truckTop - 24, 30, 26, 4);
  g.lineStyle(3, 0x1d2b4a, 1);
  g.strokeRoundedRect(truckLeft, truckTop - 24, 30, 26, 4);
  g.fillStyle(0xb5e4ff, 1);
  g.fillRoundedRect(truckLeft + 6, truckTop - 18, 16, 12, 2);
  g.fillStyle(0x1d2b4a, 1);
  g.fillCircle(truckLeft + 16, groundY - 2, 7);
  g.fillCircle(truckLeft + 50, groundY - 2, 7);
  g.fillStyle(0xe7eef5, 1);
  g.fillCircle(truckLeft + 16, groundY - 2, 3);
  g.fillCircle(truckLeft + 50, groundY - 2, 3);

  const treadW = run / count + 8;
  const treadH = Math.max(8, Math.min(12, (rise / count) * 0.55));
  points.forEach((point, i) => {
    g.fillStyle(i % 2 === 0 ? 0xf7fbff : 0xd5dee8, 1);
    g.fillRoundedRect(point.x - treadW / 2, point.y - treadH, treadW, treadH, 2);
    g.lineStyle(3, 0x1d2b4a, 1);
    g.strokeRoundedRect(point.x - treadW / 2, point.y - treadH, treadW, treadH, 2);
  });

  const top = points[points.length - 1];
  const rail = (x0, y0, x1, y1) => {
    g.lineStyle(5, 0xffc93c, 1);
    g.lineBetween(x0, y0, x1, y1);
  };
  rail(points[0].x - 16, points[0].y - 22, top.x - 10, top.y - 20);
  rail(points[0].x + 16, points[0].y - 22, top.x + 12, top.y - 20);

  return { graphics: g, points };
}
