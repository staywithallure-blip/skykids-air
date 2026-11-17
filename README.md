# SkyKids Air

A friendly 2D airline game for kids. Pick a city, board the passengers, take off, fly, land softly, and watch everyone walk off the plane. Coins stay on this device and unlock new cities and bigger planes.

Built with [Phaser 3](https://phaser.io/) and [Vite](https://vitejs.dev/). No accounts, no network calls, and no install for players. The production build is a static `dist/` folder.

## Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5199`).

Build the static site:

```bash
npm run build
npm run preview
```

`dist/` can be uploaded to any static host. Paths are relative (`base: './'`), so the same build works at a domain root (`https://example.com/`) and in a subfolder (`https://example.com/skykids/`). Open it through a server (`npm run preview`, `npx serve dist`, and so on). Browsers block ES modules from a `file://` URL.

### Free hosting

This repo includes two ready configs. Neither one can publish by itself.

**Netlify.** `netlify.toml` builds with `npm run build` and publishes `dist/`. Sign in at [netlify.com](https://www.netlify.com), choose "Add new site" → "Import an existing project" (or drag the `dist/` folder onto the drop zone). A Netlify account is required. There is no token in this environment, so the game is not deployed.

**GitHub Pages.** `.github/workflows/pages.yml` builds and deploys on every push to `main`. Push the repo to GitHub, then in the repo settings open Pages and set the source to "GitHub Actions". The site URL will look like `https://<user>.github.io/<repo>/`. The relative asset paths work in that subfolder. GitHub needs its own account and the Pages setting turned on.

## How to play

1. **Play** on the title screen.
2. On the map, tap a city. Austin is home. Denver and Miami are open. New York and Seattle unlock with coins. The card shows miles and base pay.
3. Pick a plane. The Puddle Jumper is free. The Sunny Jet and Jumbo Pal carry more passengers.
4. Passengers walk out of the terminal, climb the airstairs, and their bags ride the belt loader. Press **Close doors** when the counter is full.
5. The plane pushes back and taxis. **Hold** the throttle button (or the Up arrow) until the bar is full, then tap **PULL UP**.
6. In the air, follow the stars as they weave up and down. Storm clouds and birds sit beside the path. A bump only slows you down.
7. On approach, follow the white dots. Hold **Up** as you reach the runway for a butter landing. A hard landing bounces. You always land safely.
8. At the gate, passengers walk off with their bags. The trip summary adds coins to your piggy bank.

### Controls

| Action | Mouse | Keyboard | Touch |
| --- | --- | --- | --- |
| Buttons | Click | Enter or Space on the main action | Tap |
| Throttle | Hold the button | Hold Up or Right | Hold the button |
| Pull up | Tap PULL UP | Tap Up, Enter, or Space | Tap PULL UP |
| Fly / land | Drag, or Up and Down buttons | Arrow keys or W and S | Drag, or the buttons |
| Mute | Sound button | M | Sound button |

On-screen buttons are always there, so a phone and a laptop can share the same game. Turning the phone swaps between a tall layout and a wide one.

## Coins

Coins are remembered in `localStorage` under `skykids-air-v1`.

- Route pay is listed on the map.
- Each passenger adds a thank-you coin.
- Stars are worth 1. Big coins in the sky are worth 3.
- A soft landing pays the biggest bonus. A bounce still pays a little.

**Start over** on the title screen clears coins, planes, and unlocked cities.

Prices and cities live in `src/config.js` if you want to change the game.

## Project map

- `src/main.js` — Phaser setup and scaling
- `src/config.js` — cities, planes, payouts
- `src/state.js` — saved coins and the current trip
- `src/audio.js` — tiny Web Audio tones
- `src/scenes/` — one file per part of the flight

Art is drawn with Phaser shapes. The Fredoka font is included under the SIL Open Font License (`public/fonts/OFL.txt`).
