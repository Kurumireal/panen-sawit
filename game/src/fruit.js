// Panen Sawit — the falling fruit bunches (tandan) and their spawner.
// Four kinds drop from the crowns, and telling them apart at speed is the
// whole game: ripe and golden are the harvest, unripe sours the load,
// rotten spoils it.

import { PALMS, WORLD } from './world.js';

export const FRUIT_KINDS = {
  ripe: {
    name: 'ripe',
    value: 10,
    countsForQuota: true,
    berries: ['#e8542f', '#f06a35', '#d94326', '#f47b3a'],
    stem: '#6d4c2a',
  },
  golden: {
    name: 'golden',
    value: 50,
    countsForQuota: true,
    berries: ['#ffc93c', '#ffdb6e', '#f5b921', '#ffe89a'],
    stem: '#8a6a1f',
  },
  unripe: {
    name: 'unripe',
    value: -15,
    countsForQuota: false,
    berries: ['#7fae4c', '#93c25e', '#6b9a3e', '#a5cf74'],
    stem: '#5d7038',
  },
  rotten: {
    name: 'rotten',
    value: -25,
    countsForQuota: false,
    berries: ['#4a3550', '#5b4263', '#382838', '#66506e'],
    stem: '#3a2c33',
  },
};

// Berry offsets inside one bunch, a rough teardrop cluster.
const BERRY_LAYOUT = [
  [0, -14, 11], [-13, -6, 10], [13, -6, 10], [-8, 6, 11], [8, 6, 11],
  [0, 2, 12], [-15, 8, 8], [15, 8, 8], [0, 16, 9],
];

export class Fruit {
  constructor(kind, palm, fallScale, rng) {
    this.kind = kind;
    this.x = palm.x + palm.lean + (rng() - 0.5) * 30;
    this.y = palm.crownY + 16;
    this.vy = 26 + rng() * 30;
    this.vx = 0;
    this.radius = 21;
    this.swayPhase = rng() * Math.PI * 2;
    this.swaySpeed = 1.4 + rng() * 1.2;
    this.spin = (rng() - 0.5) * 0.6;
    this.angle = 0;
    this.fallScale = fallScale;
    this.dead = false;
  }

  update(dt, wind, time) {
    this.vy += 330 * this.fallScale * dt;
    const sway = Math.sin(time * this.swaySpeed + this.swayPhase) * 26;
    this.x += (sway + wind * 130) * dt + this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spin * dt;
    if (this.x < this.radius) this.x = this.radius;
    if (this.x > WORLD.width - this.radius) this.x = WORLD.width - this.radius;
  }

  draw(ctx, time) {
    const def = FRUIT_KINDS[this.kind];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Stem up to where it snapped off the crown.
    ctx.strokeStyle = def.stem;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(3, -18, 0, -8);
    ctx.stroke();

    for (const [bx, by, br] of BERRY_LAYOUT) {
      const shade = def.berries[(Math.abs(bx * 3 + by) | 0) % def.berries.length];
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.arc(bx - br * 0.32, by - br * 0.36, br * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Golden bunches glitter so the eye catches them in time.
    if (this.kind === 'golden') {
      const tw = 0.5 + 0.5 * Math.sin(time * 9 + this.swayPhase);
      ctx.fillStyle = `rgba(255, 240, 170, ${0.5 + tw * 0.5})`;
      for (const [sx, sy] of [[-20, -12], [18, 4], [2, 22]]) {
        const r = 2 + tw * 2.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy - r * 2);
        ctx.lineTo(sx + r, sy);
        ctx.lineTo(sx, sy + r * 2);
        ctx.lineTo(sx - r, sy);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// Chooses which kind drops next. Later days sour the mix: more unripe
// and rotten bunches hide among the ripe ones.
export function pickKind(day, rng) {
  const roll = rng();
  const goldenChance = 0.055;
  const unripeChance = 0.16 + day * 0.012;
  const rottenChance = 0.05 + day * 0.014;
  if (roll < goldenChance) return 'golden';
  if (roll < goldenChance + rottenChance) return 'rotten';
  if (roll < goldenChance + rottenChance + unripeChance) return 'unripe';
  return 'ripe';
}

export class Spawner {
  constructor() {
    this.timer = 0.6;
    this.palmOrder = 0;
  }

  reset(day) {
    this.timer = 0.5;
    this.day = day;
  }

  // Returns a Fruit when one detaches, else null. Spawn interval shrinks
  // and fall speed grows as the days advance.
  update(dt, rng) {
    this.timer -= dt;
    if (this.timer > 0) return null;
    const base = Math.max(0.42, 0.92 - this.day * 0.09);
    this.timer = base * (0.72 + rng() * 0.55);
    this.palmOrder = (this.palmOrder + 1 + ((rng() * 3) | 0)) % PALMS.length;
    const palm = PALMS[this.palmOrder];
    const fallScale = 1 + (this.day - 1) * 0.16;
    return new Fruit(pickKind(this.day, rng), palm, fallScale, rng);
  }
}
