import Phaser from 'phaser';
import { animateLegs, createPassenger } from '../people.js';
import { addSun, createCloud, createPlane, paintGround, paintSky } from '../draw.js';
import { makeLook, planeById } from '../config.js';
import { resetSave, save } from '../state.js';
import { initAudio } from '../audio.js';
import { addMuteButton, confirmDialog, makeButton, skyText } from '../ui.js';
import { bindKeys, fontPx, isPortrait, pressed } from '../util.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const portrait = isPortrait(this);
    this.keys = bindKeys(this);
    paintSky(this);
    const groundY = portrait ? h * 0.86 : h * 0.82;
    paintGround(this, groundY);
    addSun(this, portrait ? 78 : 130, portrait ? 280 : 188, portrait ? 36 : 46);
    this.clouds = [
      createCloud(this, portrait ? 200 : 280, portrait ? 200 : 120, 0.7),
      createCloud(this, w * 0.48, portrait ? 120 : 78, 0.55),
    ];

    skyText(this, w / 2, portrait ? h * 0.16 : h * 0.2, 'SkyKids Air', fontPx(this, portrait ? 64 : 84));
    skyText(this, w / 2, portrait ? h * 0.23 : h * 0.32, 'Fly happy passengers across the sky', fontPx(this, portrait ? 22 : 28));

    const steps = ['1  Pick a city', '2  Board the plane', '3  Land softly'];
    steps.forEach((step, i) => {
      const x = portrait ? w / 2 : w * (0.22 + i * 0.28);
      const y = portrait ? h * (0.3 + i * 0.06) : h * 0.42;
      skyText(this, x, y, step, fontPx(this, 22));
    });

    const bh = Math.max(96, fontPx(this, 28) * 2.4);
    makeButton(this, w / 2, portrait ? h * 0.56 : h * 0.56, Math.min(420, w * 0.7), bh, 'Play', () => this.play(), {
      fill: 0x3ecf8e,
      fontSize: fontPx(this, 40),
    });

    this.stats = skyText(
      this,
      w / 2,
      portrait ? h * 0.66 : h * 0.68,
      `${save.coins} coins    ·    ${save.flights} flights`,
      fontPx(this, 22),
    );

    this.hero = createPlane(this, planeById(save.planeId), portrait ? 0.7 : 0.85, { wheels: false });
    this.hero.root.setPosition(-180, portrait ? h * 0.74 : h * 0.72);
    this.heroBaseY = this.hero.root.y;

    this.folks = [0, 1, 2, 3].map((i) => {
      const person = createPassenger(this, makeLook(i + 2), 1);
      person.setScale(portrait ? 0.6 : 0.7);
      person.setPosition(w * (0.2 + i * 0.18), groundY);
      return person;
    });

    addMuteButton(this);
    const resetW = Math.min(220, w * 0.4);
    makeButton(this, portrait ? w / 2 : 130, h - 48, resetW, 56, 'Start over', () => {
      confirmDialog(this, 'Erase coins, planes, and unlocked cities?', () => {
        resetSave();
        this.scene.restart();
      });
    }, { fill: 0xfff6df, fontSize: fontPx(this, 18) });
  }

  play() {
    initAudio();
    this.scene.start('map');
  }

  update(time, delta) {
    const dt = Math.min(0.033, delta / 1000);
    const w = this.scale.width;
    this.clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt * 0.6;
      if (cloud.x < -100) cloud.x = w + 80;
    });
    if (this.hero) {
      this.hero.root.x += 90 * dt;
      this.hero.root.y = this.heroBaseY + Math.sin(time / 380) * 14;
      if (this.hero.root.x > w + 200) this.hero.root.x = -200;
    }
    this.folks.forEach((person) => animateLegs(person, time, true));
    if (pressed(this.keys.enter) || pressed(this.keys.space)) this.play();
  }
}
