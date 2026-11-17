import { CITIES, LANDING, PLANES, cityById, makeLook, planeById } from './config.js';

const KEY = 'skykids-air-v1';

export function defaultSave() {
  return {
    coins: 0,
    unlocked: ['denver', 'miami'],
    planes: ['puddle'],
    planeId: 'puddle',
    muted: false,
    flights: 0,
  };
}

export let save = loadSave();

function loadSave() {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw);
    const next = { ...base, ...data };
    const cityIds = new Set(CITIES.filter((city) => !city.home).map((city) => city.id));
    next.unlocked = (Array.isArray(next.unlocked) ? next.unlocked : []).filter((id) => cityIds.has(id));
    if (!next.unlocked.includes('denver')) next.unlocked.push('denver');
    if (!next.unlocked.includes('miami')) next.unlocked.push('miami');
    const planeIds = new Set(PLANES.map((plane) => plane.id));
    next.planes = (Array.isArray(next.planes) ? next.planes : []).filter((id) => planeIds.has(id));
    if (!next.planes.includes('puddle')) next.planes.unshift('puddle');
    if (!next.planes.includes(next.planeId)) next.planeId = 'puddle';
    next.coins = Math.max(0, Math.floor(Number(next.coins) || 0));
    next.flights = Math.max(0, Math.floor(Number(next.flights) || 0));
    next.muted = Boolean(next.muted);
    return next;
  } catch {
    return base;
  }
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private mode can block storage. The game still runs for this visit.
  }
}

export function resetSave() {
  save = defaultSave();
  persist();
}

export const trip = {
  cityId: null,
  looks: null,
  stars: 0,
  coinPickups: 0,
  bumps: 0,
  landing: null,
  banked: false,
  boarded: 0,
  deplaned: 0,
  flightDistance: 0,
  collected: {},
  landingDone: false,
};

export function resetTrip(cityId) {
  const plane = planeById(save.planeId);
  trip.cityId = cityId;
  trip.stars = 0;
  trip.coinPickups = 0;
  trip.bumps = 0;
  trip.landing = null;
  trip.banked = false;
  trip.boarded = 0;
  trip.deplaned = 0;
  trip.flightDistance = 0;
  trip.collected = {};
  trip.landingDone = false;
  trip.takeoffPhase = null;
  trip.takeoffSpeed = 0;
  trip.landingX = null;
  trip.landingAlt = null;
  trip.looks = [];
  for (let i = 0; i < plane.pax; i += 1) {
    trip.looks.push(makeLook(i + cityId.length * 3));
  }
}

export function isUnlocked(city) {
  if (!city || city.home) return false;
  if (!city.unlock) return true;
  return save.unlocked.includes(city.id);
}

export function trySpend(amount) {
  if (save.coins < amount) return false;
  save.coins -= amount;
  persist();
  return true;
}

export function ownsPlane(id) {
  return save.planes.includes(id);
}

export function selectPlane(id) {
  if (!ownsPlane(id)) return;
  save.planeId = id;
  persist();
}

export function buyPlane(id) {
  const plane = planeById(id);
  if (ownsPlane(id)) {
    selectPlane(id);
    return true;
  }
  if (!trySpend(plane.price)) return false;
  save.planes.push(id);
  save.planeId = id;
  persist();
  return true;
}

export function unlockCity(id) {
  const city = cityById(id);
  if (isUnlocked(city)) return true;
  if (!trySpend(city.unlock || 0)) return false;
  save.unlocked.push(id);
  persist();
  return true;
}

export function breakdown() {
  const city = cityById(trip.cityId);
  const plane = planeById(save.planeId);
  const landing = LANDING[trip.landing] || LANDING.smooth;
  const starCoins = trip.stars + trip.coinPickups * 3;
  const parts = [
    ['Route pay', city.reward || 0],
    ['Passenger thanks', plane.pax],
    ['Stars and coins', starCoins],
    ['Landing bonus', landing.bonus],
  ];
  const total = parts.reduce((sum, part) => sum + part[1], 0);
  return { city, plane, landing, parts, total, starCoins };
}

export function bankTrip() {
  if (trip.banked) return breakdown();
  const result = breakdown();
  save.coins += result.total;
  save.flights += 1;
  trip.banked = true;
  persist();
  return result;
}

export function affordableHint() {
  const city = CITIES.find((item) => !item.home && !isUnlocked(item) && save.coins >= item.unlock);
  const plane = PLANES.find((item) => !ownsPlane(item.id) && save.coins >= item.price);
  return { city, plane };
}
