import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x5c6573, 1);
    g.fillRect(0, 0, 220, 100);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 220, 8);
    g.fillRect(0, 92, 220, 8);
    g.fillStyle(0xffd23f, 1);
    g.fillRoundedRect(24, 44, 78, 12, 3);
    g.generateTexture('runway', 220, 100);
    g.clear();
    g.fillStyle(0x5cba45, 1);
    g.fillRect(0, 18, 240, 42);
    g.fillStyle(0x8ed86a, 1);
    g.fillCircle(30, 36, 22);
    g.fillCircle(90, 40, 28);
    g.fillCircle(160, 36, 20);
    g.fillStyle(0x3f9e2e, 1);
    g.fillTriangle(200, 40, 214, 18, 228, 40);
    g.generateTexture('hills', 240, 60);
    g.destroy();
    this.scene.start('title');
  }
}
