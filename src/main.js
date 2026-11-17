import Phaser from 'phaser';
import { initAudio, toggleMute } from './audio.js';
import { save, trip } from './state.js';
import BoardingScene from './scenes/BoardingScene.js';
import BootScene from './scenes/BootScene.js';
import DeplaneScene from './scenes/DeplaneScene.js';
import FlightScene from './scenes/FlightScene.js';
import LandingScene from './scenes/LandingScene.js';
import MapScene from './scenes/MapScene.js';
import TakeoffScene from './scenes/TakeoffScene.js';
import TitleScene from './scenes/TitleScene.js';

// title -> map -> boarding -> takeoff -> flight -> landing -> deplane -> map

function gameSize() {
  const portrait = window.innerHeight > window.innerWidth;
  return portrait ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
}

const size = gameSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: size.width,
  height: size.height,
  backgroundColor: '#8fd4ff',
  banner: false,
  disableContextMenu: true,
  audio: { noAudio: true },
  input: { topOnly: true, activePointers: 3 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: size.width,
    height: size.height,
  },
  scene: [
    BootScene,
    TitleScene,
    MapScene,
    BoardingScene,
    TakeoffScene,
    FlightScene,
    LandingScene,
    DeplaneScene,
  ],
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const next = gameSize();
    const wasPortrait = game.scale.height > game.scale.width;
    const nextPortrait = next.height > next.width;
    if (game.scale.width !== next.width || game.scale.height !== next.height) {
      game.scale.setGameSize(next.width, next.height);
      game.scale.refresh();
      if (wasPortrait !== nextPortrait) {
        const current = game.scene.getScenes(true)[0];
        if (current && current.scene.key !== 'boot') current.scene.restart();
      }
    } else {
      game.scale.refresh();
    }
  }, 140);
});

window.addEventListener('pointerdown', () => initAudio(), { passive: true });
window.addEventListener('keydown', (event) => {
  initAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === 'm' || event.key === 'M') toggleMute();
});

if (import.meta.env.DEV) {
  window.__sky = { game, trip, save };

  window.addEventListener('error', (event) => {
    let box = document.getElementById('sky-error');
    if (!box) {
      box = document.createElement('pre');
      box.id = 'sky-error';
      box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;margin:0;padding:8px;background:#3b0d0d;color:#fff;z-index:50;font-size:12px;white-space:pre-wrap;max-height:28vh;overflow:auto';
      document.body.appendChild(box);
    }
    box.textContent += `${event.message}\n`;
  });
}

export default game;
