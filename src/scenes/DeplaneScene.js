import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { mountGate } from '../gate.js';
import { animateLegs, createBag, createPassenger, passengerScale, queueSteps, tickSteps } from '../people.js';
import { affordableHint, bankTrip, breakdown, resetTrip, save, trip } from '../state.js';
import { addMuteButton, drawBar, inkText, makeButton, panel, skyText } from '../ui.js';
import { bindKeys, clamp, fontPx, isPortrait, lerp, pressed } from '../util.js';

const COLORS = [0xff7a59, 0xffc93c, 0x3ecf8e, 0x7c6bff, 0xff8ad4, 0x8fd4ff];

export default class DeplaneScene extends Phaser.Scene {
  constructor() {
    super('deplane');
  }

  create() {
    if (!trip.looks || !trip.cityId) {
      this.scene.start('map');
      return;
    }
    this.keys = bindKeys(this);
    this.portrait = isPortrait(this);
    this.result = breakdown();
    this.gate = mountGate(this, {
      sign: this.result.city.name,
      doorOpen: trip.deplaned > 0,
      stairs: trip.deplaned > 0,
    });
    if (trip.deplaned === 0) {
      this.gate.stairs.setVisible(false);
      this.gate.belt.setVisible(false);
      this.gate.plane.setDoor(false);
    }
    this.pScale = passengerScale(this.gate.plane.metrics.s);
    this.people = [];
    this.bags = [];
    this.spawned = trip.deplaned;
    this.spawnWait = 0.3;
    this.taxing = trip.deplaned === 0 && !trip.banked;
    this.taxiX = this.gate.parkX + Math.min(360, this.scale.width * 0.4);
    if (this.taxing) this.gate.plane.root.x = this.taxiX;

    const w = this.scale.width;
    this.caption = skyText(
      this,
      w / 2,
      this.portrait ? 86 : 58,
      this.taxing ? `Taxi to the ${this.result.city.name} gate` : `Welcome to ${this.result.city.name}!`,
      fontPx(this, 30),
    ).setDepth(20);
    this.countText = skyText(this, w / 2, this.portrait ? 124 : 96, '', fontPx(this, 22)).setDepth(20);
    this.bar = this.add.graphics().setDepth(20);
    addMuteButton(this);
    this.confetti = [];
    this.summary = null;
    this.refreshHud();
    if (trip.banked || trip.deplaned >= trip.looks.length) this.showSummary();
  }

  refreshHud() {
    const total = trip.looks.length;
    this.countText.setText(`${trip.deplaned} / ${total} stepping off`);
    const w = this.scale.width;
    const width = Math.min(640, w * 0.6);
    drawBar(this.bar, w / 2 - width / 2, this.portrait ? 150 : 122, width, 20, total ? trip.deplaned / total : 0, 0xffc93c);
  }

  parkPlane() {
    this.gate.plane.root.x = this.gate.parkX;
    this.gate.stairs.setVisible(true);
    this.gate.belt.setVisible(true);
    this.gate.plane.setDoor(true);
    this.gate.door = this.gate.plane.worldPoint(this.gate.plane.metrics.doorX, this.gate.plane.metrics.doorY);
    this.gate.cargo = this.gate.plane.worldPoint(this.gate.plane.metrics.cargoX, this.gate.plane.metrics.cargoY);
    this.taxing = false;
    this.caption.setText(`Welcome to ${this.result.city.name}!`);
    sfx('door');
  }

  spawnOne() {
    const look = trip.looks[this.spawned];
    const top = this.gate.steps[this.gate.steps.length - 1];
    const root = createPassenger(this, look, 1);
    root.setScale(this.pScale * 0.55);
    root.setAlpha(0);
    root.setPosition(top.x, top.y);
    root.setDepth(7);
    this.people.push({ root, phase: 'out', t: 0 });
    const bag = createBag(this, look.bag, this.pScale);
    bag.setPosition(this.gate.cargo.x, this.gate.cargo.y);
    bag.setDepth(4);
    bag.setVisible(false);
    this.bags.push({ root: bag, phase: 'wait', t: 0 });
    this.spawned += 1;
  }

  stepPerson(person, dt, time) {
    const top = this.gate.steps[this.gate.steps.length - 1];
    if (person.phase === 'out') {
      person.t += dt;
      const u = clamp(person.t / 0.28, 0, 1);
      person.root.setAlpha(u);
      person.root.setScale(lerp(this.pScale * 0.55, this.pScale, u));
      person.root.setPosition(top.x, top.y);
      if (u >= 1) {
        const start = Math.max(0, this.gate.steps.length - 2);
        queueSteps(person, this.gate.steps, start, -1);
      }
    } else if (person.phase === 'steps') {
      if (tickSteps(person, dt, time)) person.phase = 'walk';
    } else if (person.phase === 'walk') {
      person.root.x -= 200 * dt;
      person.root.y = this.gate.groundY;
      animateLegs(person.root, time, true);
      if (person.root.x <= this.gate.walkStart.x) person.phase = 'in';
    } else if (person.phase === 'in') {
      person.root.alpha -= dt * 3;
      if (person.root.alpha <= 0) {
        person.phase = 'done';
        person.root.destroy();
        trip.deplaned += 1;
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
      bag.root.setVisible(true);
    }
    bag.t += dt;
    const u = clamp(bag.t / 0.75, 0, 1);
    bag.root.x = lerp(this.gate.cargo.x, this.gate.cartPoint.x, u);
    bag.root.y = lerp(this.gate.cargo.y, this.gate.cartPoint.y, u);
    if (u >= 1) {
      bag.phase = 'done';
      bag.root.destroy();
      sfx('bag');
    }
  }

  showSummary() {
    if (this.summary) return;
    this.caption.setVisible(false);
    this.countText.setVisible(false);
    this.bar.setVisible(false);
    const wasBanked = trip.banked;
    const result = bankTrip();
    this.result = result;
    if (!wasBanked) sfx('fanfare');

    const w = this.scale.width;
    const h = this.scale.height;
    const pw = Math.min(w - 28, 640);
    const ph = Math.min(h - 28, this.portrait ? 900 : 600);
    const nodes = [];
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x1d2b4a, 0.35).setInteractive();
    const board = panel(this, w / 2, h / 2, pw, ph);
    nodes.push(dim, board);

    const top = h / 2 - ph / 2;
    nodes.push(inkText(this, w / 2, top + 42, `Welcome to ${result.city.name}!`, fontPx(this, 30)));
    nodes.push(inkText(this, w / 2, top + 82, `${result.plane.pax} happy passengers delivered`, fontPx(this, 20), { color: '#3d4d6b' }));

    result.parts.forEach((part, i) => {
      const y = top + 124 + i * 32;
      nodes.push(inkText(this, w / 2 - pw * 0.32, y, part[0], fontPx(this, 18), { originX: 0, color: '#3d4d6b' }));
      nodes.push(inkText(this, w / 2 + pw * 0.32, y, `+${part[1]}`, fontPx(this, 18), { originX: 1 }));
    });

    const totalY = top + 124 + result.parts.length * 32 + 8;
    nodes.push(inkText(this, w / 2, totalY, `${result.landing.title}  +${result.total} coins`, fontPx(this, 24)));
    const bank = inkText(this, w / 2, totalY + 36, `Piggy bank: ${save.coins} coins`, fontPx(this, 22), { color: '#c47d09' });
    nodes.push(bank);
    if (!wasBanked) {
      const counter = { v: save.coins - result.total };
      this.tweens.add({
        targets: counter,
        v: save.coins,
        duration: 700,
        onUpdate: () => bank.setText(`Piggy bank: ${Math.round(counter.v)} coins`),
      });
    }

    const hint = affordableHint();
    let note = result.landing.blurb;
    if (hint.city) note = `You can unlock ${hint.city.name}!`;
    else if (hint.plane) note = `You can buy the ${hint.plane.name}!`;
    if (trip.bumps > 0) note = `${note}  Cloud bumps: ${trip.bumps}.`;
    nodes.push(inkText(this, w / 2, totalY + 72, note, fontPx(this, 16), { wrap: pw - 48, color: '#3d4d6b' }));

    const again = makeButton(this, w / 2 - pw * 0.22, h / 2 + ph / 2 - 58, pw * 0.38, 70, 'Fly again', () => {
      resetTrip(result.city.id);
      this.scene.start('boarding');
    }, { fill: 0x3ecf8e, fontSize: fontPx(this, 20), depth: 46 });
    const map = makeButton(this, w / 2 + pw * 0.22, h / 2 + ph / 2 - 58, pw * 0.38, 70, 'New city', () => {
      this.scene.start('map');
    }, { fill: 0xfff6df, fontSize: fontPx(this, 20), depth: 46 });
    nodes.forEach((node) => node.setDepth(44));
    this.summary = { again, map };

    if (!wasBanked) {
      for (let i = 0; i < 36; i += 1) {
        const bit = this.add.rectangle(
          Math.random() * w,
          -20 - Math.random() * h * 0.4,
          8 + Math.random() * 8,
          12 + Math.random() * 10,
          COLORS[i % COLORS.length],
        ).setDepth(48);
        bit.vy = 90 + Math.random() * 160;
        bit.vx = -50 + Math.random() * 100;
        bit.spin = -2 + Math.random() * 4;
        this.confetti.push(bit);
      }
    }
  }

  update(time, delta) {
    if (!this.gate) return;
    const dt = Math.min(0.05, delta / 1000);
    this.gate.clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -90) cloud.x = this.scale.width + 80;
      if (cloud.y < cloud.minY) cloud.y = cloud.minY;
    });
    this.confetti.forEach((bit) => {
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.rotation += bit.spin * dt;
      if (bit.y > this.scale.height + 20) bit.y = -20;
    });
    if (this.summary) {
      if (pressed(this.keys.enter)) this.scene.start('map');
      return;
    }
    if (this.taxing) {
      this.gate.plane.root.x -= 140 * dt;
      if (this.gate.plane.root.x <= this.gate.parkX) this.parkPlane();
      return;
    }
    const onStairs = this.people.some((person) => person.phase === 'out' || person.phase === 'steps');
    this.spawnWait -= dt;
    if (this.spawned < trip.looks.length && this.spawnWait <= 0 && !onStairs) {
      this.spawnOne();
      this.spawnWait = 0.1;
    }
    this.people.forEach((person) => this.stepPerson(person, dt, time));
    this.bags.forEach((bag) => this.stepBag(bag, dt));
    const done = trip.deplaned >= trip.looks.length
      && this.people.every((person) => person.phase === 'done' || person.phase == null);
    if (done && this.spawned >= trip.looks.length) this.showSummary();
  }
}
