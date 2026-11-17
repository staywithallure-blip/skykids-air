// Cartoon travelers. The container's origin is at the feet, so y = ground puts them on the floor.

export function createPassenger(scene, look, scale = 1) {
  const s = scale;
  const root = scene.add.container(0, 0);
  const legL = scene.add.rectangle(-4.5 * s, -15 * s, 5 * s, 15 * s, 0x2c3a55).setOrigin(0.5, 0);
  const legR = scene.add.rectangle(4.5 * s, -15 * s, 5 * s, 15 * s, 0x2c3a55).setOrigin(0.5, 0);
  const torso = scene.add.rectangle(0, -30 * s, 18 * s, 20 * s, look.shirt).setStrokeStyle(3, 0x1d2b4a);
  const arm = scene.add.rectangle(11 * s, -30 * s, 5 * s, 12 * s, look.skin).setStrokeStyle(2, 0x1d2b4a);
  const bag = scene.add.rectangle(16 * s, -24 * s, 10 * s, 9 * s, look.bag).setStrokeStyle(2, 0x1d2b4a);
  const head = scene.add.circle(0, -48 * s, 9 * s, look.skin).setStrokeStyle(3, 0x1d2b4a);
  const parts = [legL, legR, torso, arm, bag, head];
  if (look.hair) {
    parts.push(scene.add.ellipse(0, -54 * s, 16 * s, 10 * s, look.hair));
  }
  const eyeL = scene.add.circle(-3.2 * s, -49 * s, 1.5 * s, 0x1d2b4a);
  const eyeR = scene.add.circle(3.2 * s, -49 * s, 1.5 * s, 0x1d2b4a);
  const smile = scene.add.graphics();
  smile.lineStyle(2, 0x1d2b4a, 1);
  smile.beginPath();
  smile.arc(0, -46 * s, 3.4 * s, 0.15 * Math.PI, 0.85 * Math.PI, false);
  smile.strokePath();
  parts.push(eyeL, eyeR, smile);
  if (look.hat === 'cap') {
    parts.push(scene.add.rectangle(1 * s, -58 * s, 16 * s, 5 * s, look.hatColor).setStrokeStyle(2, 0x1d2b4a));
    parts.push(scene.add.rectangle(8 * s, -56 * s, 7 * s, 3 * s, look.hatColor));
  } else if (look.hat === 'beanie') {
    parts.push(scene.add.ellipse(0, -58 * s, 14 * s, 10 * s, look.hatColor).setStrokeStyle(2, 0x1d2b4a));
  } else if (look.hat === 'bow') {
    parts.push(scene.add.circle(-5 * s, -56 * s, 3.2 * s, look.hatColor).setStrokeStyle(2, 0x1d2b4a));
    parts.push(scene.add.circle(5 * s, -56 * s, 3.2 * s, look.hatColor).setStrokeStyle(2, 0x1d2b4a));
  }
  root.add(parts);
  root.legL = legL;
  root.legR = legR;
  return root;
}

export function createBag(scene, color, scale = 1) {
  const s = scale;
  const body = scene.add.rectangle(0, 0, 14 * s, 11 * s, color).setStrokeStyle(2, 0x1d2b4a);
  const handle = scene.add.rectangle(0, -8 * s, 8 * s, 4 * s, color).setStrokeStyle(2, 0x1d2b4a);
  return scene.add.container(0, 0, [handle, body]);
}

export function animateLegs(root, time, moving) {
  if (!root.legL) return;
  const swing = moving ? Math.sin(time / 70) * 0.7 : 0;
  root.legL.rotation = swing;
  root.legR.rotation = -swing;
}

// Big enough that faces read next to the jet, on a laptop and on a phone.
export function passengerScale(planeScale) {
  const fuselage = 44 * planeScale;
  return (fuselage * 1.42) / 62;
}

export function queueSteps(person, points, startIndex, direction) {
  person.phase = 'steps';
  person.points = points;
  person.dir = direction;
  person.step = startIndex;
  person.t = 0;
  person.fromX = person.root.x;
  person.fromY = person.root.y;
  person.to = points[startIndex];
}

// One tread at a time, with a little hop. Returns true when the last tread is done.
export function tickSteps(person, dt, time) {
  const duration = 0.18;
  person.t += dt;
  const u = Math.min(1, person.t / duration);
  const hop = Math.sin(u * Math.PI) * 14;
  person.root.x = person.fromX + (person.to.x - person.fromX) * u;
  person.root.y = person.fromY + (person.to.y - person.fromY) * u - hop;
  animateLegs(person.root, time, true);
  if (u < 1) return false;
  const next = person.step + person.dir;
  if (next < 0 || next >= person.points.length) {
    person.root.y = person.to.y;
    return true;
  }
  person.fromX = person.to.x;
  person.fromY = person.to.y;
  person.step = next;
  person.to = person.points[next];
  person.t = 0;
  return false;
}
