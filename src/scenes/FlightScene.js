import Phaser from 'phaser';
import { engineSet, sfx } from '../audio.js';
import { cityById, planeById } from '../config.js';
import { buildCourse } from '../course.js';
import {
  createBird,
  createBuilding,
  createCloud,
  createCoin,
  createPlane,
  createStar,
  paintGround,
  paintSky,
} from '../draw.js';
import { save, trip } from '../state.js';
import { addMuteButton, attachPause, consumePress, drawBar, floatText, makeButton, skyText } from '../ui.js';
import { bindKeys, clamp, finePointer, fontPx, isPortrait } from '../util.js';

export default class FlightScene extends Phaser.Scene {
  constructor() {
    super('flight');
  }

  create() {
    if (!trip.cityId) {
      this.scene.start('map');
      return;
    }
    trip.takeoffPhase = null;
    trip.takeoffSpeed = 0;
    this.city = cityById(trip.cityId);
    this.keys = bindKeys(this);
    this.portrait = isPortrait(this);
    const w = this.scale.width;
    const h = this.scale.height;

    paintSky(this).setDepth(0);
    this.groundY = h * 0.84;
    paintGround(this, this.groundY).setDepth(1);
    this.hills = this.add.tileSprite(w / 2, this.groundY - 18, w, 60, 'hills').setDepth(2);
    this.farClouds = [0.12, 0.48, 0.8].map((nx, i) => {
      const cloud = createCloud(this, w * nx, 0, 0.75);
      cloud.setDepth(2);
      cloud.lane = i;
      return cloud;
    });

    this.course = buildCourse(this.city);
    this.distance = Math.min(trip.flightDistance || 0, this.course.length);
    this.hitTimer = 0;
    this.ending = false;
    this.endTimer = 0;
    this.vy = 0;
    this.bandTop = this.portrait ? 210 : 156;
    this.bandBottom = this.groundY - 78;
    this.farClouds.forEach((cloud) => {
      cloud.y = this.bandTop + 48 + cloud.lane * 42;
      cloud.minY = this.bandTop + 36;
    });
    this.planeX = w * 0.24;
    this.planeY = (this.bandTop + this.bandBottom) / 2;
    this.dragOk = false;

    this.ship = createPlane(this, planeById(save.planeId), this.portrait ? 0.7 : 0.88, { wheels: false });
    this.ship.root.setDepth(8);

    this.items = [];
    this.course.items.forEach((item, index) => {
      item.index = index;
      if (item.kind === 'town' || trip.collected[index]) {
        item.got = item.kind !== 'town';
        return;
      }
      let sprite;
      if (item.kind === 'star') sprite = createStar(this);
      else if (item.kind === 'coin') sprite = createCoin(this);
      else if (item.kind === 'bird') sprite = createBird(this);
      else sprite = createCloud(this, 0, 0, 0.95, true);
      sprite.setDepth(item.kind === 'cloud' ? 7 : 6);
      item.sprite = sprite;
      this.items.push(item);
    });

    this.town = [64, 100, 78, 120].map((height, i) => {
      const building = createBuilding(this, height);
      building.setDepth(3);
      building.setVisible(false);
      building.offset = i * 42;
      return building;
    });

    this.bar = this.add.graphics().setDepth(20);
    this.progressLabel = skyText(this, w / 2, this.portrait ? 188 : 146, this.city.name, fontPx(this, 20)).setDepth(20);
    const bh = Math.max(88, fontPx(this, 22) * 2.5);
    const bw = Math.min(190, w * 0.34);
    this.upBtn = makeButton(this, this.portrait ? w * 0.26 : bw * 0.65 + 8, h - bh * 0.58, bw, bh, 'Up', () => {}, {
      hold: true,
      fill: 0x8fd4ff,
      fontSize: fontPx(this, 28),
      depth: 20,
    });
    this.downBtn = makeButton(this, this.portrait ? w * 0.74 : w - bw * 0.65 - 8, h - bh * 0.58, bw, bh, 'Down', () => {}, {
      hold: true,
      fill: 0xffd08a,
      fontSize: fontPx(this, 28),
      depth: 20,
    });
    this.hint = skyText(this, w / 2, h * 0.42, 'Grab stars. Steer around clouds.', fontPx(this, 22)).setDepth(20);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 2600, duration: 500 });
    if (finePointer()) {
      skyText(this, w / 2, h - bh - 28, 'Arrow keys or drag', fontPx(this, 16)).setDepth(20);
    }

    addMuteButton(this);
    attachPause(this);
    this.input.on('pointerdown', (_pointer, over) => {
      const onUi = over && over.some((obj) => obj.getData && obj.getData('ui'));
      this.dragOk = !onUi;
    });
    this.input.on('pointerup', () => {
      this.dragOk = false;
    });
    this.events.once('shutdown', () => engineSet(0));
    engineSet(0.5);
  }

  update(time, delta) {
    if (!this.ship) return;
    if (this.paused) {
      engineSet(0);
      return;
    }
    const dt = Math.min(0.05, delta / 1000);
    const w = this.scale.width;
    engineSet(this.ending ? 0.35 : 0.5);
    consumePress(this.upBtn);
    consumePress(this.downBtn);

    let dir = 0;
    if (this.upBtn.held || this.keys.up.isDown || this.keys.w.isDown) dir -= 1;
    if (this.downBtn.held || this.keys.down.isDown || this.keys.s.isDown) dir += 1;
    const dragging = this.dragOk && this.input.activePointer.isDown;
    if (dragging && dir === 0) {
      const target = clamp(this.input.activePointer.y, this.bandTop, this.bandBottom);
      this.planeY += (target - this.planeY) * Math.min(1, dt * 8);
      this.vy = 0;
    } else {
      this.vy += dir * 860 * dt;
      this.vy *= Math.exp(-3.2 * dt);
      this.planeY += this.vy * dt;
    }
    this.planeY = clamp(this.planeY, this.bandTop, this.bandBottom);
    this.ship.root.setPosition(this.planeX, this.planeY);
    this.ship.root.rotation = clamp(-this.vy / 420, -0.28, 0.28);

    if (this.hitTimer > 0) this.hitTimer -= dt;
    this.ship.root.alpha = this.hitTimer > 0 && Math.sin(time / 40) > 0 ? 0.4 : 1;

    const speed = this.ending ? 50 : (this.hitTimer > 0 ? 88 : 150);
    if (!this.ending) this.distance += speed * dt;
    trip.flightDistance = this.distance;
    this.hills.tilePositionX += speed * dt * 0.45;
    this.farClouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -140) cloud.x = w + 120;
      if (cloud.y < cloud.minY) cloud.y = cloud.minY;
    });

    const bandH = Math.max(1, this.bandBottom - this.bandTop);
    this.items.forEach((item) => {
      if (!item.sprite) return;
      const sx = this.planeX + (item.x - this.distance);
      const bob = Math.sin(time / 280 + item.x) * (item.kind === 'bird' ? 16 : 5);
      const sy = this.bandTop + item.y * bandH + bob;
      item.sprite.setPosition(sx, sy);
      item.sprite.setVisible(sx > -120 && sx < w + 120);
      if (item.kind === 'star' || item.kind === 'coin') item.sprite.rotation += dt;
      if (item.kind === 'bird' && item.sprite.wing) {
        item.sprite.wing.scaleY = 0.35 + Math.abs(Math.sin(time / 90 + item.x * 0.01));
      }
      if (item.got || this.ending) return;
      const dx = sx - this.planeX;
      const dy = sy - this.planeY;
      if (dx * dx + dy * dy > (item.r + 22) * (item.r + 22)) return;
      item.got = true;
      trip.collected[item.index] = true;
      if (item.kind === 'star') {
        trip.stars += 1;
        sfx('star');
        floatText(this, sx, sy, '+1');
      } else if (item.kind === 'coin') {
        trip.coinPickups += 1;
        sfx('coin');
        floatText(this, sx, sy, '+3');
      } else if (this.hitTimer <= 0) {
        this.hitTimer = 1;
        trip.bumps += 1;
        sfx('bump');
        floatText(this, this.planeX + 10, this.planeY - 36, 'Whoops!');
      }
      item.sprite.destroy();
      item.sprite = null;
    });

    if (this.distance > this.course.length - 500) {
      this.town.forEach((building) => {
        building.setVisible(true);
        const sx = this.planeX + (this.course.length + building.offset - this.distance);
        building.setPosition(sx, this.groundY - 8);
      });
    }

    const progress = clamp(this.distance / this.course.length, 0, 1);
    const barX = 156;
    const barW = Math.max(220, w - 320);
    drawBar(this.bar, barX, this.portrait ? 168 : 118, barW, 22, progress, 0xffc93c);
    this.progressLabel.setText(`To ${this.city.name}  ${Math.round(progress * 100)}%`);

    if (!this.ending && progress >= 1) {
      this.ending = true;
      this.endTimer = 0.9;
      this.banner = skyText(this, w / 2, this.scale.height * 0.36, `${this.city.name} ahead!`, fontPx(this, 40)).setDepth(21);
    }
    if (this.ending) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.scene.start('landing');
    }
  }
}
