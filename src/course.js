import { clamp, hashString, mulberry32 } from './util.js';

// One course per city. Stars weave up and down so you have to steer.
// Hazards sit beside the path, never on the star, so a careful flyer is fine.
export function buildCourse(city) {
  const rand = mulberry32(hashString(`${city.id}:skykids-wave`));
  const length = 1700 + city.miles * 0.85;
  const items = [];
  let i = 0;
  for (let x = 460; x < length - 360; x += 230) {
    const y = clamp(0.5 + Math.sin(i * 0.9) * 0.34, 0.14, 0.86);
    const coin = rand() < 0.12;
    items.push({ kind: coin ? 'coin' : 'star', x, y, r: 20 });
    const side = Math.cos(i * 0.9) >= 0 ? -1 : 1;
    const hy = clamp(y + side * (0.24 + rand() * 0.06), 0.1, 0.9);
    if (Math.abs(hy - y) > 0.16) {
      items.push({
        kind: rand() < 0.42 ? 'bird' : 'cloud',
        x: x + 16,
        y: hy,
        r: 24,
      });
    }
    i += 1;
  }
  items.push({ kind: 'town', x: length - 80, y: 0.92, r: 0 });
  return { length, items };
}
