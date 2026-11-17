import Phaser from 'phaser';
import { engineSet, sfx } from '../audio.js';
import { planeById } from '../config.js';
import { save } from '../state.js';
import { createPlane, paintGround, paintSky } from '../draw.js';
import { mountGate } from '../gate.js';
import { trip } from '../state.js';
import { addMuteButton, attachPause, consumePress, drawBar, makeButton, skyText } from '../ui.js';
import { bindKeys, clamp, finePointer, fontPx, isPortrait, lerp, pressed } from '../util.js';

export default class TakeoffScene extends Phaser.Scene {
  constructor() {
    super('takeoff');
  }

  create() {
    if (!trip.cityId) {
      this.scene.start('map');
      return;
    }
    this.keys = bindKeys(this);
    this.portrait = isPortrait(this);
    this.speed = trip.takeoffSpeed || 0;
    this.phase = trip.takeoffPhase || 'pushback';
    this.timer = 0;
    this.rotateWait = 0;
    const w = this.scale.width;
    const h = this.scale.height;
    this.caption = skyText(this, w / 2, this.portrait ? 90 : 64, '', fontPx(this, 30)).setDepth(20);
    this.bar = this.add.graphics().setDepth(20);
    const bh = Math.max(100, fontPx(this, 24) * 2.6);
    this.throttle = makeButton(
      this,
      w / 2,
      h - bh * 0.62 - 8,
      Math.min(520, w * 0.8),
      bh,
      'HOLD TO GO',
      () => {},
      { hold: true, fill: 0xff7a59, fontSize: fontPx(this, 30), depth: 20 },
    );
    this.throttle.setVisible(false);
    addMuteButton(this);
    attachPause(this);
    this.events.once('shutdown', () => {
      if (this.phase !== 'done') {
        trip.takeoffPhase = this.phase;
        trip.takeoffSpeed = this.speed || 0;
      }
      engineSet(0);
    });

    if (this.phase === 'climb' || this.phase === 'done') {
      this.phase = 'done';
      this.scene.start('flight');
      return;
    }
    if (this.phase === 'roll' || this.phase === 'rotate') this.showRunway();
    else {
      this.phase = 'pushback';
      this.showGate();
    }
  }

  showGate() {
    this.clearWorld();
    this.view = mountGate(this, { sign: 'Austin', doorOpen: false, stairs: false });
    this.tug = this.add.graphics().setDepth(6);
    this.drawTug(this.tug);
    this.phase = 'pushback';
    this.timer = 0;
    this.caption.setText('Pushing back from the gate');
    this.throttle.setVisible(false);
    engineSet(0.15);
  }

  showRunway() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    this.clearWorld();
    const w = this.scale.width;
    const h = this.scale.height;
    const groundY = this.portrait ? h * 0.62 : h * 0.7;
    const sky = paintSky(this).setDepth(0);
    const ground = paintGround(this, groundY + 50).setDepth(1);
    const runway = this.add.tileSprite(w / 2, groundY, w, 100, 'runway').setDepth(2);
    this.world.add([sky, ground, runway]);
    // tileSprite added to scene AND container moves it. Re-add carefully:
    this.runway = runway;
    this.groundY = groundY;

    const scale = this.portrait ? 1.05 : 1.35;
    this.ship = createPlane(this, planeById(save.planeId), scale, { wheels: true, doorOpen: false });
    this.baseY = groundY - (this.ship.metrics.wheelY + this.ship.metrics.wheelR);
    this.ship.root.setPosition(w * 0.3, this.baseY);
    this.ship.root.setDepth(5);
    this.world.add(this.ship.root);

    const number = skyText(this, w * 0.72, groundY - 8, '27', fontPx(this, 28)).setDepth(3);
    this.world.add(number);

    this.phase = this.speed >= 1 ? 'rotate' : 'roll';
    this.timer = 0;
    this.throttle.setVisible(true);
    this.throttle.setLabel(this.phase === 'rotate' ? 'PULL UP!' : 'HOLD TO GO');
    this.throttle.setFill(this.phase === 'rotate' ? 0x3ecf8e : 0xff7a59);
    this.caption.setText(this.phase === 'rotate' ? 'Tap PULL UP!' : 'Hold the throttle to speed up');
    if (finePointer() && this.phase === 'roll') {
      this.hint = skyText(this, w / 2, groundY - 150, 'Keyboard: hold Up arrow', fontPx(this, 18)).setDepth(20);
    }
  }

  drawTug(g) {
    g.clear();
    g.fillStyle(0xffc93c, 1);
    g.fillRoundedRect(-28, -16, 56, 28, 6);
    g.lineStyle(3, 0x1d2b4a, 1);
    g.strokeRoundedRect(-28, -16, 56, 28, 6);
    g.fillStyle(0x1d2b4a, 1);
    g.fillCircle(-16, 16, 6);
    g.fillCircle(16, 16, 6);
  }

  clearWorld() {
    if (this.world) this.world.destroy(true);
    this.world = this.add.container(0, 0).setDepth(1);
    this.ship = null;
    this.runway = null;
    if (this.tug) {
      this.tug.destroy();
      this.tug = null;
    }
  }

  noseX() {
    if (!this.view) return 0;
    return this.view.plane.worldPoint(this.view.plane.metrics.L * 0.55, 10).x;
  }

  startClimb() {
    this.phase = 'climb';
    this.timer = 0;
    this.throttle.setVisible(false);
    this.caption.setText('Up we go!');
    sfx('takeoff');
    engineSet(1);
  }

  update(time, delta) {
    if (!this.phase || this.phase === 'done') return;
    if (this.paused) {
      engineSet(0);
      return;
    }
    const dt = Math.min(0.05, delta / 1000);
    const tap = consumePress(this.throttle)
      || pressed(this.keys.space)
      || pressed(this.keys.enter)
      || pressed(this.keys.up);
    const holding = this.throttle.held || this.keys.up.isDown || this.keys.right.isDown || this.keys.w.isDown;

    if (this.phase === 'pushback' && this.view) {
      this.timer += dt;
      const u = clamp(this.timer / 1.5, 0, 1);
      this.view.plane.root.x = lerp(this.view.parkX, this.view.parkX + (this.portrait ? 90 : 150), u);
      if (this.tug) {
        const nose = this.noseX();
        this.tug.setPosition(nose - 10, this.view.groundY - 16);
      }
      engineSet(0.2);
      if (u >= 1) {
        this.phase = 'taxi';
        this.timer = 0;
        this.caption.setText('Taxi to the runway');
      }
    } else if (this.phase === 'taxi') {
      this.timer += dt;
      engineSet(0.25);
      if (this.timer > 0.9) this.showRunway();
    } else if (this.phase === 'roll' || this.phase === 'rotate') {
      if (this.phase === 'roll') {
        if (holding) this.speed = Math.min(1, this.speed + dt * 0.48);
        else this.speed = Math.max(0, this.speed - dt * 0.22);
        if (this.speed >= 1) {
          this.phase = 'rotate';
          this.rotateWait = 0;
          this.throttle.setLabel('PULL UP!');
          this.throttle.setFill(0x3ecf8e);
          this.caption.setText('Tap PULL UP!');
          if (this.hint) this.hint.setText('Tap Space or the green button');
          sfx('ready');
        }
      } else {
        this.speed = 1;
        this.rotateWait += dt;
        if (tap || this.rotateWait > 5.5) {
          if (!tap) this.caption.setText('Co-pilot helps you pull up!');
          this.startClimb();
        }
      }
      if (this.runway) this.runway.tilePositionX -= (80 + this.speed * 900) * dt;
      if (this.ship && this.phase !== 'climb') {
        this.ship.root.y = this.baseY + Math.sin(time / 45) * this.speed * 2;
      }
      engineSet(0.25 + this.speed * 0.75);
      const w = this.scale.width;
      drawBar(this.bar, w / 2 - Math.min(280, w * 0.34), this.portrait ? 130 : 108, Math.min(560, w * 0.62), 26, this.speed, this.speed >= 1 ? 0x3ecf8e : 0xffc93c);
    } else if (this.phase === 'climb' && this.ship) {
      this.timer += dt;
      const u = clamp(this.timer / 0.7, 0, 1);
      this.ship.root.rotation = lerp(0, -0.42, u);
      this.ship.root.y -= 120 * dt;
      if (this.runway) this.runway.tilePositionX -= 980 * dt;
      engineSet(1);
      if (this.timer > 1.25) {
        this.phase = 'done';
        trip.takeoffPhase = null;
        trip.takeoffSpeed = 0;
        this.scene.start('flight');
      }
    }
  }
}
