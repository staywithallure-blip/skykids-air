import Phaser from 'phaser';
import { engineSet, sfx } from '../audio.js';
import { LANDING, cityById, planeById } from '../config.js';
import { createPlane, paintGround, paintSky } from '../draw.js';
import { save, trip } from '../state.js';
import { addMuteButton, attachPause, consumePress, makeButton, skyText } from '../ui.js';
import { bindKeys, clamp, finePointer, fontPx, isPortrait } from '../util.js';

export default class LandingScene extends Phaser.Scene {
  constructor() {
    super('landing');
  }

  create() {
    if (!trip.cityId) {
      this.scene.start('map');
      return;
    }
    if (trip.landingDone) {
      this.scene.start('deplane');
      return;
    }
    this.city = cityById(trip.cityId);
    this.keys = bindKeys(this);
    this.portrait = isPortrait(this);
    const w = this.scale.width;
    const h = this.scale.height;
    paintSky(this).setDepth(0);
    this.groundY = this.portrait ? h * 0.72 : h * 0.74;
    paintGround(this, this.groundY).setDepth(1);
    this.runwayStart = w * 0.4;
    this.drawRunway();

    this.startX = w * 0.14;
    this.endX = w * 0.62;
    this.startAlt = h * 0.34;
    this.planeX = trip.landingX != null ? trip.landingX : this.startX;
    this.alt = trip.landingAlt != null ? trip.landingAlt : this.startAlt;
    this.sink = 36;
    this.hop = 0;
    this.helped = false;
    this.landed = false;
    this.left = false;
    this.elapsed = 0;
    this.celebrate = 0;

    const scale = this.portrait ? 0.85 : 1.15;
    this.ship = createPlane(this, planeById(save.planeId), scale, { wheels: true });
    this.ship.root.setDepth(6);
    this.wheelDrop = this.ship.metrics.wheelY + this.ship.metrics.wheelR;

    this.guide = this.add.graphics().setDepth(3);
    this.drawGuide();

    this.readout = skyText(this, w / 2, this.portrait ? 100 : 70, 'Line up with the dots', fontPx(this, 28)).setDepth(20);
    this.flare = skyText(this, w / 2, this.portrait ? 140 : 108, '', fontPx(this, 22)).setDepth(20);

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
    if (finePointer()) {
      skyText(this, w / 2, h - bh - 24, 'Hold Up to float · Hold Down to drop', fontPx(this, 16)).setDepth(20);
    }
    this.nextBtn = null;
    this.dragOk = false;
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
    engineSet(0.4);
  }

  drawRunway() {
    const w = this.scale.width;
    const g = this.add.graphics().setDepth(2);
    const y = this.groundY - 8;
    g.fillStyle(0x5c6573, 1);
    g.fillRect(this.runwayStart, y - 46, w - this.runwayStart + 20, 70);
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 6; i += 1) {
      g.fillRect(this.runwayStart + 8 + i * 18, y - 40, 10, 58);
    }
    g.fillStyle(0xffd23f, 1);
    for (let x = this.runwayStart + 140; x < w; x += 70) {
      g.fillRoundedRect(x, y - 8, 36, 8, 2);
    }
    skyText(this, this.runwayStart + 90, y - 70, '27', fontPx(this, 26)).setDepth(4);
  }

  idealAlt(x) {
    const t = clamp((x - this.startX) / (this.endX - this.startX), 0, 1);
    return this.startAlt * (1 - t);
  }

  drawGuide() {
    this.guide.clear();
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      const x = this.startX + (this.endX - this.startX) * t;
      const alt = this.startAlt * (1 - t);
      const y = this.groundY - this.wheelDrop - alt;
      this.guide.fillStyle(0xffffff, 0.85);
      this.guide.fillCircle(x, y, 5);
      this.guide.lineStyle(2, 0x1d2b4a, 0.6);
      this.guide.strokeCircle(x, y, 5);
    }
  }

  touchDown() {
    this.landed = true;
    this.alt = 0;
    const onGrass = this.planeX < this.runwayStart - 10;
    let rating = 'smooth';
    if (this.helped || this.elapsed > 18) rating = 'helped';
    else if (onGrass) rating = this.sink < 110 ? 'grass' : 'bumpy';
    else if (this.sink < 48) rating = 'butter';
    else if (this.sink < 92) rating = 'smooth';
    else if (this.sink < 150) rating = 'bumpy';
    else rating = 'bouncy';
    trip.landing = rating;
    trip.landingDone = true;
    const info = LANDING[rating];
    sfx(rating === 'bouncy' || rating === 'bumpy' ? 'bounce' : 'butter');
    const hops = rating === 'bouncy' ? 3 : rating === 'bumpy' ? 1 : 0;
    if (hops) {
      this.tweens.add({
        targets: this,
        hop: rating === 'bouncy' ? 64 : 26,
        duration: 150,
        yoyo: true,
        repeat: hops - 1,
        ease: 'Quad.easeOut',
      });
    }
    this.readout.setText(info.title);
    this.flare.setText(info.blurb);
    this.celebrate = 1.8;
    const w = this.scale.width;
    const h = this.scale.height;
    this.nextBtn = makeButton(this, w / 2, h * 0.42, Math.min(360, w * 0.7), 80, 'To the gate', () => this.go(), {
      fill: 0x3ecf8e,
      fontSize: fontPx(this, 26),
      depth: 22,
    });
  }

  go() {
    if (this.left) return;
    this.left = true;
    trip.landingX = null;
    trip.landingAlt = null;
    this.scene.start('deplane');
  }

  update(_time, delta) {
    if (!this.ship || this.left) return;
    if (this.paused) {
      engineSet(0);
      return;
    }
    const dt = Math.min(0.05, delta / 1000);
    this.elapsed += dt;
    consumePress(this.upBtn);
    consumePress(this.downBtn);
    engineSet(this.landed ? 0.2 : 0.45);

    if (!this.landed) {
      const up = this.upBtn.held || this.keys.up.isDown || this.keys.w.isDown;
      const down = this.downBtn.held || this.keys.down.isDown || this.keys.s.isDown;
      const dragging = this.dragOk && this.input.activePointer.isDown && !up && !down;
      const width = this.scale.width;
      if (this.planeX > width * 0.82) this.helped = true;
      if (this.helped) {
        this.sink = Math.max(this.sink, 52);
        this.flare.setText('Co-pilot is helping you down');
      } else if (dragging) {
        const targetAlt = this.groundY - this.wheelDrop - this.input.activePointer.y;
        this.sink = clamp((this.alt - targetAlt) * 2.2, 12, 220);
      } else if (up) this.sink -= 150 * dt;
      else if (down) this.sink += 200 * dt;
      else this.sink += (58 - this.sink) * 1.6 * dt;
      this.sink = clamp(this.sink, this.helped ? 52 : 14, 240);
      this.alt -= this.sink * dt;
      const maxX = width - 100;
      if (this.planeX < maxX) this.planeX += (this.portrait ? 100 : 125) * dt;
      if (this.planeX >= maxX) {
        this.helped = true;
        this.sink = Math.max(this.sink, 80);
      }
      trip.landingX = this.planeX;
      trip.landingAlt = Math.max(0, this.alt);

      if (!this.helped && this.alt < 120 && this.sink > 70 && this.planeX > this.runwayStart) {
        this.flare.setText('Hold UP for a soft landing');
      } else if (!this.helped) {
        const diff = this.alt - this.idealAlt(this.planeX);
        if (diff > 80) this.flare.setText('A bit high');
        else if (diff < -70) this.flare.setText('A bit low');
        else this.flare.setText('Looking good');
      }

      if (this.alt <= 0 || this.elapsed > 16) this.touchDown();
    } else {
      this.celebrate -= dt;
      if (this.celebrate <= 0) this.go();
    }

    const y = this.groundY - this.wheelDrop - Math.max(0, this.alt) - this.hop;
    this.ship.root.setPosition(this.planeX, y);
    const targetRot = this.landed ? 0 : clamp(this.sink / 280, -0.05, 0.35);
    this.ship.root.rotation = targetRot;
  }
}
