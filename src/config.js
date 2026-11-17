// Tweak cities, plane prices, and payouts here.
// Distances are story miles. Unlock prices and plane prices are in coins.

export const FONT = 'Fredoka, Verdana, "Trebuchet MS", sans-serif';

export const CITIES = [
  {
    id: 'austin',
    name: 'Austin',
    blurb: 'Home base. Every trip starts here.',
    nx: 48,
    ny: 64,
    home: true,
  },
  {
    id: 'denver',
    name: 'Denver',
    blurb: 'Mountains and sunshine',
    nx: 36,
    ny: 40,
    miles: 780,
    reward: 36,
    unlock: 0,
  },
  {
    id: 'miami',
    name: 'Miami',
    blurb: 'Beaches and warm weather',
    nx: 76,
    ny: 78,
    miles: 1120,
    reward: 48,
    unlock: 0,
  },
  {
    id: 'newyork',
    name: 'New York',
    blurb: 'A big bright city',
    nx: 84,
    ny: 34,
    miles: 1510,
    reward: 70,
    unlock: 50,
  },
  {
    id: 'seattle',
    name: 'Seattle',
    blurb: 'Trees, ferries, and rain',
    nx: 16,
    ny: 22,
    miles: 1760,
    reward: 90,
    unlock: 160,
  },
];

export const PLANES = [
  {
    id: 'puddle',
    name: 'Puddle Jumper',
    pax: 6,
    price: 0,
    stripe: 0x2f8cff,
    tail: 0xffc93c,
  },
  {
    id: 'sunny',
    name: 'Sunny Jet',
    pax: 10,
    price: 90,
    stripe: 0xff7a59,
    tail: 0xffe066,
  },
  {
    id: 'jumbo',
    name: 'Jumbo Pal',
    pax: 14,
    price: 250,
    stripe: 0x7c6bff,
    tail: 0x7fd0ff,
  },
];

export const LANDING = {
  butter: { title: 'Butter landing!', bonus: 20, blurb: 'Soft as a pillow.' },
  smooth: { title: 'Smooth landing!', bonus: 12, blurb: 'Right on the marks.' },
  bumpy: { title: 'A little bumpy!', bonus: 6, blurb: 'Everyone is still smiling.' },
  bouncy: { title: 'Boing! Bouncy landing!', bonus: 4, blurb: 'The wheels hopped. Totally safe.' },
  grass: { title: 'Grassy and gentle!', bonus: 8, blurb: 'A soft touch beside the runway. The crew waves.' },
  helped: { title: 'Safe and steady!', bonus: 8, blurb: 'Your co-pilot helped you settle down.' },
};

// Stylized United States, points in 0–100 map space. Not to scale — just friendly.
export const US_SHAPE = [
  [18, 20],
  [28, 14],
  [40, 16],
  [52, 13],
  [64, 16],
  [76, 14],
  [86, 22],
  [90, 32],
  [84, 40],
  [86, 50],
  [80, 58],
  [84, 70],
  [78, 86],
  [70, 74],
  [62, 70],
  [56, 80],
  [48, 72],
  [40, 66],
  [32, 68],
  [24, 60],
  [16, 64],
  [12, 50],
  [8, 36],
  [12, 26],
];

const SHIRTS = [0xff7a59, 0x3ecf8e, 0x7c6bff, 0xffd23f, 0x4dabf7, 0xff8ad4, 0x63e6be, 0xff922b];
const SKINS = [0xfde0c4, 0xf6d7b0, 0xe0b48a, 0xc68642, 0x8d5524, 0xf1c27d];
const BAGS = [0xef476f, 0x118ab2, 0x06d6a0, 0xffd166, 0x8338ec, 0xff7a59];
const HAIR = [0x2b2118, 0x5a3825, 0xf2c14e, 0x1a1a1a, 0xa15c38, 0xe8e8e8];
const HATS = ['none', 'cap', 'none', 'beanie', 'bow', 'cap'];
const HAT_COLORS = [0xff5d8f, 0x2f8cff, 0xffd23f, 0x7c6bff, 0xef476f, 0xffffff];

export function cityById(id) {
  return CITIES.find((city) => city.id === id) || CITIES[1];
}

export function planeById(id) {
  return PLANES.find((plane) => plane.id === id) || PLANES[0];
}

export function makeLook(index) {
  return {
    shirt: SHIRTS[index % SHIRTS.length],
    skin: SKINS[(index * 3) % SKINS.length],
    bag: BAGS[(index * 5) % BAGS.length],
    hair: index % 4 === 0 ? null : HAIR[index % HAIR.length],
    hat: HATS[index % HATS.length],
    hatColor: HAT_COLORS[(index * 2) % HAT_COLORS.length],
  };
}
