import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { mountGate } from '../gate.js';
import { animateLegs, createBag, createPassenger, passengerScale, queueSteps, tickSteps } from '../people.js';
import { trip } from '../state.js';
import { addMuteButton, attachPause, drawBar, makeButton, skyText } from '../ui.js';
import { bindKeys, clamp, fontPx, isPortrait, lerp, pressed } from '../util.js';

export default class BoardingScene extends Phaser.Scene {
  constructor() {
    super('boarding');
  }

  create() {
    if (!trip.looks || !trip.looks.length) {
      this.scene.start('map');
      return;
    }
    this.keys = bindKeys(this);
    this.gate = mountGate(this, { sign: 'Austin', doorOpen: true });
    this.portrait = isPortrait(this);
    this.pScale = passengerScale(this.gate.plane.metrics.s);
    this.people = [];
    this.bags = [];
    this.spawned = trip.boarded;
    this.spawnWait = 0.25;
    this.finished = false;
    this.pulsing = false;

    const w = this.scale.width;
    const h = this.scale.height;
    this.caption = skyText(this, w / 2, this.portrait ? 86 : 58, 'Boarding in Austin', fontPx(this, 34)).setDepth(20);
    this.countText = skyText(this, w / 2, this.portrait ? 126 : 98, '', fontPx(this, 24)).setDepth(20);
    this.bar = this.add.graphics().setDepth(20);
    const bh = Math.max(88, fontPx(this, 22) * 2.5);
    this.closeBtn = makeButton(
      this,
      w / 2,
      h - bh * 0.65 - 8,
      Math.min(460, w * 0.78),
      bh,
      'Close doors',
      () => this.finish(),
      { fill: 0x3ecf8e, fontSize: fontPx(this, 28), depth: 20 },
    );
    this.closeBtn.setEnabled(false);
    addMuteButton(this);
    attachPause(this);
    this.refreshHud();
  }

  refreshHud() {
    const total = trip.looks.length;
    this.countText.setText(`${trip.boarded} / ${total} aboard`);
    const w = this.scale.width;
    const y = this.portrait ? 156 : 126;
    const width = Math.min(640, w * 0.62);
    drawBar(this.bar, w / 2 - width / 2, y, width, 22, total ? trip.boarded / total : 0, 0x3ecf8e);
  }

  spawnOne() {
    const look = trip.looks[this.spawned];
    const root = createPassenger(this, look, 1);
    root.setScale(this.pScale);
    root.setPosition(this.gate.walkStart.x - 20, this.gate.groundY);
    root.setDepth(7);
    this.people.push({ root, phase: 'walk' });

    const bag = createBag(this, look.bag, this.pScale);
    bag.setPosition(this.gate.cartPoint.x, this.gate.cartPoint.y);
    bag.setDepth(4);
    this.bags.push({ root: bag, phase: 'wait', t: 0 });
    this.spawned += 1;
  }

  stepPerson(person, dt, time) {
    const speed = 260;
    if (person.phase === 'walk') {
      const stop = this.gate.steps[0].x - 6;
      if (person.root.x < stop) person.root.x += speed * dt;
      person.root.y = this.gate.groundY;
      animateLegs(person.root, time, true);
      const climber = this.people.some((other) => other !== person && (other.phase === 'steps' || other.phase === 'enter'));
      if (person.root.x >= stop) person.wait = (person.wait || 0) + dt;
      if (person.root.x >= stop && (!climber || person.wait > 0.9)) {
        queueSteps(person, this.gate.steps, 0, 1);
      }
    } else if (person.phase === 'steps') {
      if (tickSteps(person, dt, time)) {
        person.phase = 'enter';
        person.t = 0;
      }
    } else if (person.phase === 'enter') {
      person.t += dt;
      const u = clamp(person.t / 0.42, 0, 1);
      person.root.x = lerp(person.root.x, this.gate.door.x + 16, 0.35);
      person.root.alpha = 1 - u;
      person.root.setScale(Math.max(0.2, this.pScale * (1 - u * 0.55)));
      if (u >= 1) {
        person.phase = 'done';
        person.root.destroy();
        trip.boarded += 1;
        sfx('board');
        this.refreshHud();
      }
    }
  }

  stepBag(bag, dt) {
    if (bag.phase === 'done') return;
    const moving = this.bags.some((other) => other !== bag && other.phase === 'move');
    if (bag.phase === 'wait') {
      if (moving) return;
      bag.phase = 'move';
      bag.t = 0;
    }
    bag.t += dt;
    const u = clamp(bag.t / 0.8, 0, 1);
    bag.root.x = lerp(this.gate.cartPoint.x, this.gate.cargo.x, u);
    bag.root.y = lerp(this.gate.cartPoint.y, this.gate.cargo.y, u);
    if (u >= 1) {
      bag.phase = 'done';
      bag.root.destroy();
      sfx('bag');
    }
  }

  finish() {
    if (this.finished || trip.boarded < trip.looks.length) return;
    this.finished = true;
    this.gate.plane.setDoor(false);
    this.gate.stairs.setVisible(false);
    sfx('door');
    this.closeBtn.setEnabled(false);
    this.time.delayedCall(450, () => {
      if (this.scene.isActive()) this.scene.start('takeoff');
    });
  }

  update(time, delta) {
    if (!this.gate || this.paused || this.finished) return;
    const dt = Math.min(0.05, delta / 1000);
    this.gate.clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -90) cloud.x = this.scale.width + 80;
      if (cloud.y < cloud.minY) cloud.y = cloud.minY;
    });

    const queued = this.people.filter((person) => person.phase === 'walk').length;
    this.spawnWait -= dt;
    if (this.spawned < trip.looks.length && this.spawnWait <= 0 && queued < 1) {
      this.spawnOne();
      this.spawnWait = 0.72;
    }
    this.people.forEach((person) => this.stepPerson(person, dt, time));
    this.bags.forEach((bag) => this.stepBag(bag, dt));

    const ready = trip.boarded >= trip.looks.length
      && this.people.every((person) => person.phase === 'done');
    this.closeBtn.setEnabled(ready);
    if (ready && !this.pulsing) {
      this.pulsing = true;
      this.tweens.add({ targets: this.closeBtn, scale: 1.05, yoyo: true, repeat: -1, duration: 360 });
      this.caption.setText('Everyone is aboard!');
    }
    if (ready && (pressed(this.keys.enter) || pressed(this.keys.space))) this.finish();
  }
}
