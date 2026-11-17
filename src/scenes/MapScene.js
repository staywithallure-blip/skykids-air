import Phaser from 'phaser';
import { CITIES, PLANES } from '../config.js';
import { addSun, createCloud, drawLand, paintSky } from '../draw.js';
import {
  buyPlane,
  isUnlocked,
  ownsPlane,
  resetTrip,
  save,
  selectPlane,
  unlockCity,
} from '../state.js';
import { sfx } from '../audio.js';
import { addMuteButton, confirmDialog, inkText, makeButton, panel, skyText } from '../ui.js';
import { bindKeys, fontPx, isPortrait, pressed } from '../util.js';

export default class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
  }

  create() {
    const w = this.scale.width;
    this.keys = bindKeys(this);
    this.portrait = isPortrait(this);
    this.dialog = false;
    paintSky(this).setDepth(0);
    addSun(this, this.portrait ? 56 : 48, 46, 22).setDepth(1);
    this.clouds = [0.34, 0.62].map((nx, i) => {
      const cloud = createCloud(this, w * nx, this.portrait ? 78 : 40, 0.42);
      cloud.setDepth(1);
      cloud.minY = this.portrait ? 70 : 28;
      return cloud;
    });
    addMuteButton(this);
    const open = CITIES.find((city) => !city.home && isUnlocked(city));
    this.selectedId = open ? open.id : 'denver';
    this.pendingRedraw = true;
  }

  drawUi() {
    if (this.ui) this.ui.destroy(true);
    this.ui = this.add.container(0, 0).setDepth(5);
    const w = this.scale.width;
    const h = this.scale.height;
    const portrait = this.portrait;
    const city = CITIES.find((item) => item.id === this.selectedId) || CITIES[1];

    const title = skyText(this, portrait ? w / 2 : w * 0.28, portrait ? 64 : 52, 'Where should we fly?', fontPx(this, portrait ? 30 : 38));
    const coins = skyText(this, portrait ? w / 2 : w * 0.5, portrait ? 100 : 52, `${save.coins} coins`, fontPx(this, 22));
    this.ui.add([title, coins]);

    const mapRect = portrait
      ? { x: 16, y: 124, w: w - 32, h: h * 0.36 }
      : { x: 20, y: 88, w: w * 0.55, h: h - 120 };
    const water = this.add.graphics();
    water.fillStyle(0x1d2b4a, 1);
    water.fillRoundedRect(mapRect.x, mapRect.y + 8, mapRect.w, mapRect.h, 26);
    water.fillStyle(0x49c4ff, 1);
    water.fillRoundedRect(mapRect.x, mapRect.y, mapRect.w, mapRect.h, 26);
    water.lineStyle(6, 0x1d2b4a, 1);
    water.strokeRoundedRect(mapRect.x, mapRect.y, mapRect.w, mapRect.h, 26);
    this.ui.add(water);

    this.landRect = {
      x: mapRect.x + 18,
      y: mapRect.y + 16,
      w: mapRect.w - 36,
      h: mapRect.h - 32,
    };
    const land = this.add.graphics();
    drawLand(land, this.landRect);
    this.ui.add(land);
    this.routeG = this.add.graphics();
    this.ui.add(this.routeG);

    CITIES.forEach((item) => this.drawCity(item));

    const cardW = portrait ? w - 28 : w - (mapRect.x + mapRect.w) - 36;
    const cardH = portrait ? h - (mapRect.y + mapRect.h) - 20 : h - 116;
    const cardX = portrait ? w / 2 : mapRect.x + mapRect.w + 18 + cardW / 2;
    const cardY = portrait ? mapRect.y + mapRect.h + 10 + cardH / 2 : 82 + cardH / 2;
    this.ui.add(panel(this, cardX, cardY, cardW, cardH));
    this.drawCard(city, cardX, cardY, cardW, cardH);
  }

  pointFor(city) {
    return {
      x: this.landRect.x + (city.nx / 100) * this.landRect.w,
      y: this.landRect.y + (city.ny / 100) * this.landRect.h,
    };
  }

  drawCity(city) {
    const { x, y } = this.pointFor(city);
    const open = city.home || isUnlocked(city);
    const selected = city.id === this.selectedId;
    const color = city.home ? 0xff7a59 : open ? 0xffc93c : 0xd5dbe6;
    const dot = this.add.circle(x, y, selected ? 20 : 15, color).setStrokeStyle(4, 0x1d2b4a);
    if (!city.home) {
      dot.setInteractive({ useHandCursor: true });
      dot.on('pointerdown', () => {
        this.selectedId = city.id;
        this.pendingRedraw = true;
      });
    }
    const name = skyText(this, x, y + 30, city.home ? 'Austin' : city.name, fontPx(this, 16));
    this.ui.add([dot, name]);
    if (!open) {
      const lock = this.add.graphics();
      lock.lineStyle(3, 0x1d2b4a, 1);
      lock.strokeCircle(x, y - 4, 4);
      lock.fillStyle(0xfff6df, 1);
      lock.fillRoundedRect(x - 5, y - 1, 10, 8, 2);
      lock.lineStyle(2, 0x1d2b4a, 1);
      lock.strokeRoundedRect(x - 5, y - 1, 10, 8, 2);
      this.ui.add(lock);
    }
  }

  drawCard(city, cx, cy, cw, ch) {
    const top = cy - ch / 2;
    const name = inkText(this, cx, top + 36, city.name, fontPx(this, 32));
    const blurb = inkText(this, cx, top + 70, city.blurb, fontPx(this, 18), { wrap: cw - 36, color: '#3d4d6b' });
    const miles = inkText(
      this,
      cx,
      top + 112,
      `${city.miles.toLocaleString()} miles from Austin`,
      fontPx(this, 22),
    );
    const pay = inkText(this, cx, top + 146, `Base pay: ${city.reward} coins`, fontPx(this, 22), { color: '#c47d09' });
    const extra = inkText(this, cx, top + 176, 'Plus stars and a soft-landing bonus', fontPx(this, 16), {
      wrap: cw - 40,
      color: '#3d4d6b',
    });
    this.ui.add([name, blurb, miles, pay, extra]);

    const locked = !isUnlocked(city);
    let label = "Let's fly!";
    let fill = 0x3ecf8e;
    let enabled = true;
    if (locked && save.coins >= city.unlock) {
      label = `Unlock for ${city.unlock}`;
      fill = 0xffc93c;
    } else if (locked) {
      label = `Need ${city.unlock} coins`;
      enabled = false;
    }
    const bw = Math.min(cw - 36, 360);
    const fly = makeButton(this, cx, top + 230, bw, 74, label, () => {
      if (locked) this.askUnlock(city);
      else this.fly(city);
    }, { fill, fontSize: fontPx(this, 24) });
    fly.setEnabled(enabled);
    this.ui.add(fly);

    const planeTitle = inkText(this, cx, top + 284, 'Your plane', fontPx(this, 18), { color: '#3d4d6b' });
    this.ui.add(planeTitle);
    const gap = Math.min(150, (cw - 24) / 3);
    PLANES.forEach((plane, index) => {
      const owned = ownsPlane(plane.id);
      const selected = save.planeId === plane.id && owned;
      const x = cx + (index - 1) * gap;
      const short = plane.id === 'puddle' ? 'Puddle' : plane.id === 'sunny' ? 'Sunny' : 'Jumbo';
      const detail = owned ? `${plane.pax} seats` : `${plane.price} coins`;
      let btnFill = 0xfff6df;
      if (selected) btnFill = 0xb8f3d8;
      else if (!owned && save.coins >= plane.price) btnFill = 0xffe08a;
      const btn = makeButton(this, x, top + 348, gap - 10, 78, `${short}\n${detail}`, () => this.onPlane(plane), {
        fill: btnFill,
        fontSize: fontPx(this, 15),
      });
      this.ui.add(btn);
    });

    if (save.flights === 0) {
      const hint = inkText(this, cx, cy + ch / 2 - 22, 'Denver and Miami are ready!', fontPx(this, 16), { color: '#3d4d6b' });
      this.ui.add(hint);
    }
  }

  onPlane(plane) {
    if (ownsPlane(plane.id)) {
      selectPlane(plane.id);
      this.pendingRedraw = true;
      return;
    }
    if (save.coins < plane.price) return;
    this.dialog = true;
    confirmDialog(this, `Buy the ${plane.name} for ${plane.price} coins? It carries ${plane.pax} passengers.`, () => {
      this.dialog = false;
      if (buyPlane(plane.id)) {
        sfx('unlock');
        this.pendingRedraw = true;
      }
    }, () => {
      this.dialog = false;
    });
  }

  askUnlock(city) {
    if (save.coins < city.unlock) return;
    this.dialog = true;
    confirmDialog(this, `Unlock ${city.name} for ${city.unlock} coins?`, () => {
      this.dialog = false;
      if (unlockCity(city.id)) {
        sfx('unlock');
        this.pendingRedraw = true;
      }
    }, () => {
      this.dialog = false;
    });
  }

  fly(city) {
    if (this.dialog || !isUnlocked(city)) return;
    resetTrip(city.id);
    this.scene.start('boarding');
  }

  cycle(dir) {
    const list = CITIES.filter((city) => !city.home);
    const index = list.findIndex((city) => city.id === this.selectedId);
    const next = list[(index + dir + list.length) % list.length];
    this.selectedId = next.id;
    this.pendingRedraw = true;
  }

  drawRoute(time) {
    if (!this.routeG || !this.landRect) return;
    const austin = CITIES[0];
    const city = CITIES.find((item) => item.id === this.selectedId);
    if (!city) return;
    const a = this.pointFor(austin);
    const b = this.pointFor(city);
    this.routeG.clear();
    this.routeG.lineStyle(4, 0x1d2b4a, 0.85);
    const steps = 18;
    const offset = (time / 180) % 2;
    for (let i = 0; i < steps; i += 1) {
      if ((i + Math.floor(offset)) % 2 === 0) continue;
      const t0 = i / steps;
      const t1 = (i + 0.55) / steps;
      this.routeG.lineBetween(
        a.x + (b.x - a.x) * t0,
        a.y + (b.y - a.y) * t0,
        a.x + (b.x - a.x) * t1,
        a.y + (b.y - a.y) * t1,
      );
    }
  }

  update(time, delta) {
    const dt = Math.min(0.033, delta / 1000);
    this.clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt * 0.4;
      if (cloud.x < -80) cloud.x = this.scale.width + 60;
      if (cloud.minY != null && cloud.y < cloud.minY) cloud.y = cloud.minY;
    });
    if (this.pendingRedraw && !this.dialog) {
      this.pendingRedraw = false;
      this.drawUi();
    }
    this.drawRoute(time);
    if (this.dialog) return;
    if (pressed(this.keys.left)) this.cycle(-1);
    if (pressed(this.keys.right)) this.cycle(1);
    if (pressed(this.keys.enter) || pressed(this.keys.space)) {
      const city = CITIES.find((item) => item.id === this.selectedId);
      if (city && isUnlocked(city)) this.fly(city);
      else if (city) this.askUnlock(city);
    }
  }
}

