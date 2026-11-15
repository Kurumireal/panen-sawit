// Panen Sawit — game orchestration: the state machine, the day cycle,
// scoring and combo rules, wind, particles, and input. The other modules
// each own one job (sound, world, fruit, cart, screens); this one runs
// the harvest.
//
// Rules in one breath: slide the cart under falling bunches. Ripe (orange)
// and golden bunches are the harvest — fill each day's quota before the
// sun sets, five days in a row, to win the Panen Raya. Unripe (green)
// bunches sour the load, rotten (dark) ones spoil it, and every good
// bunch that hits the soil costs one of three lives.

import { SoundBank } from './audio.js';
import { drawWorld, WORLD } from './world.js';
import { Spawner, Fruit, FRUIT_KINDS } from './fruit.js';
import { Cart } from './player.js';
import * as ui from './ui.js';

const DAY_SECONDS = 75;
const TOTAL_DAYS = 5;
const MAX_LIVES = 3;

function quotaForDay(day) {
  return 12 + (day - 1) * 4;
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundBank();
    this.cart = new Cart();
    this.spawner = new Spawner();
    this.keys = { left: false, right: false };
    this.pointerX = null;
    this.state = 'title'; // title | banner | playing | dayclear | win | gameover
    this.paused = false;
    this.time = 0;
    this.shake = 0;
    this.resetRun();
    this.bindInput();
    this.stageFromUrl();
  }

  resetRun() {
    this.score = 0;
    this.day = 1;
    this.lives = MAX_LIVES;
    this.maxLives = MAX_LIVES;
    this.totalDays = TOTAL_DAYS;
    this.combo = 0;
    this.multiplier = 1;
    this.stats = { caught: 0, golden: 0, missed: 0 };
    this.lastBonus = 0;
    this.fruits = [];
    this.particles = [];
    this.floaters = [];
    this.splats = [];
    this.wind = 0;
    this.windTarget = 0;
    this.windTimer = 5;
    this.dayTime = 0;
    this.quotaCaught = 0;
    this.quotaTarget = quotaForDay(1);
    this.bannerT = 0;
    this.cart.reset();
  }

  startRun() {
    this.resetRun();
    this.beginDay(1);
  }

  beginDay(day) {
    this.day = day;
    this.dayTime = 0;
    this.quotaCaught = 0;
    this.quotaTarget = quotaForDay(day);
    this.fruits = [];
    this.splats = [];
    this.spawner.reset(day);
    this.state = 'banner';
    this.bannerT = 1.7;
  }

  // ---- input -------------------------------------------------------------
  bindInput() {
    const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', (e) => {
      if (keyMap[e.code]) {
        this.keys[keyMap[e.code]] = true;
        e.preventDefault();
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.advance();
      }
      if (e.code === 'KeyP') this.togglePause();
      if (e.code === 'KeyM') this.sound.toggleMute();
    });
    window.addEventListener('keyup', (e) => {
      if (keyMap[e.code]) this.keys[keyMap[e.code]] = false;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = (e.clientX - rect.left) * (WORLD.width / rect.width);
    });
    this.canvas.addEventListener('mouseleave', () => { this.pointerX = null; });
    this.canvas.addEventListener('click', () => this.advance());
  }

  advance() {
    this.sound.unlock();
    if (this.state === 'title') { this.sound.click(); this.startRun(); }
    else if (this.state === 'dayclear') { this.sound.click(); this.beginDay(this.day + 1); }
    else if (this.state === 'win' || this.state === 'gameover') { this.sound.click(); this.startRun(); }
  }

  togglePause() {
    if (this.state === 'playing' || this.state === 'banner') this.paused = !this.paused;
  }

  // ---- scoring -----------------------------------------------------------
  onCatch(fruit) {
    const cx = fruit.x;
    const cy = this.cart.y;
    if (fruit.kind === 'ripe' || fruit.kind === 'golden') {
      this.combo += 1;
      this.multiplier = Math.min(5, 1 + Math.floor(this.combo / 4));
      const gained = FRUIT_KINDS[fruit.kind].value * this.multiplier;
      this.score += gained;
      this.quotaCaught += 1;
      this.stats.caught += 1;
      if (fruit.kind === 'golden') {
        this.stats.golden += 1;
        this.sound.catchGolden();
        this.burst(cx, cy, '#ffd94d', 16);
        this.floaters.push({ x: cx, y: cy - 26, text: `+${gained} EMAS!`, life: 1.1, color: '#ffd94d' });
      } else {
        this.sound.catchRipe(this.combo);
        this.burst(cx, cy, '#f47b3a', 10);
        this.floaters.push({ x: cx, y: cy - 26, text: `+${gained}`, life: 0.85, color: '#fff6dd' });
      }
      if (this.quotaCaught >= this.quotaTarget) this.clearDay();
    } else if (fruit.kind === 'unripe') {
      this.score = Math.max(0, this.score - 15);
      this.combo = 0;
      this.multiplier = 1;
      this.sound.catchUnripe();
      this.burst(cx, cy, '#93c25e', 8);
      this.floaters.push({ x: cx, y: cy - 26, text: '-15 mentah!', life: 0.85, color: '#b7e39a' });
    } else if (fruit.kind === 'rotten') {
      this.score = Math.max(0, this.score - 25);
      this.combo = 0;
      this.multiplier = 1;
      this.shake = 0.35;
      this.sound.catchRotten();
      this.burst(cx, cy, '#66506e', 12);
      this.floaters.push({ x: cx, y: cy - 26, text: '-25 busuk!', life: 0.9, color: '#c9a3d4' });
    }
  }

  onGroundHit(fruit) {
    this.splats.push({ x: fruit.x, kind: fruit.kind, life: 2.6 });
    if (fruit.kind === 'ripe' || fruit.kind === 'golden') {
      this.lives -= 1;
      this.stats.missed += 1;
      this.combo = 0;
      this.multiplier = 1;
      this.shake = Math.max(this.shake, 0.22);
      this.sound.splat();
      this.burst(fruit.x, WORLD.groundY + 8, '#d94326', 12);
      if (this.lives <= 0) {
        this.state = 'gameover';
        this.sound.gameOver();
      }
    }
  }

  clearDay() {
    const secondsLeft = Math.max(0, DAY_SECONDS - this.dayTime);
    this.lastBonus = 100 + Math.round(secondsLeft) * 5;
    this.score += this.lastBonus;
    if (this.day >= TOTAL_DAYS) {
      this.state = 'win';
      this.sound.fanfare();
    } else {
      this.state = 'dayclear';
      this.sound.dayClear();
    }
  }

  failDay() {
    // Sunset with the quota unmet: a life is lost and the day repeats.
    this.lives -= 1;
    this.combo = 0;
    this.multiplier = 1;
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.sound.gameOver();
    } else {
      this.beginDay(this.day);
    }
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 190;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 90,
        life: 0.45 + Math.random() * 0.4,
        maxLife: 0.85,
        color,
        r: 2.5 + Math.random() * 3.5,
      });
    }
  }

  // ---- update ------------------------------------------------------------
  update(dt) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);

    // Particles and floaters live in every state so screens stay alive.
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) { f.y -= 44 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const s of this.splats) s.life -= dt;
    this.splats = this.splats.filter((s) => s.life > 0);

    if (this.paused) return;

    if (this.state === 'banner') {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.state = 'playing';
      return;
    }
    if (this.state !== 'playing') return;

    this.dayTime += dt;
    if (this.dayTime >= DAY_SECONDS) { this.failDay(); return; }

    // Wind: eases toward a target that changes every few seconds; a
    // strong gust is announced by the sound and the leaning fronds.
    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      this.windTimer = 5 + Math.random() * 6;
      const strong = Math.random() < 0.3;
      this.windTarget = strong ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() - 0.5) * 0.7;
      if (strong) this.sound.gust();
    }
    this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 0.7);

    this.cart.update(dt, this.keys, this.pointerX);

    const spawned = this.spawner.update(dt, Math.random);
    if (spawned) this.fruits.push(spawned);

    for (const fruit of this.fruits) {
      fruit.update(dt, this.wind, this.time);
      if (!fruit.dead && this.cart.catches(fruit)) {
        fruit.dead = true;
        this.onCatch(fruit);
      } else if (!fruit.dead && fruit.y >= WORLD.groundY - 4) {
        fruit.dead = true;
        this.onGroundHit(fruit);
      }
    }
    this.fruits = this.fruits.filter((f) => !f.dead);
  }

  // ---- draw --------------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) {
      const s = this.shake * 14;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    const progress = this.state === 'title' ? 0.18 : Math.min(1, this.dayTime / DAY_SECONDS);
    drawWorld(ctx, progress, this.time, this.wind);

    // Splat decals where bunches hit the soil.
    for (const s of this.splats) {
      ctx.globalAlpha = Math.min(0.75, s.life);
      ctx.fillStyle = s.kind === 'unripe' ? '#5d7038' : s.kind === 'rotten' ? '#382838' : '#b03a20';
      ctx.beginPath();
      ctx.ellipse(s.x, WORLD.groundY + 16, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const fruit of this.fruits) fruit.draw(ctx, this.time);
    if (this.state !== 'title') this.cart.draw(ctx);

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      ctx.font = '700 21px Georgia, serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Screens and HUD on the unshaken layer.
    if (this.state === 'title') {
      ui.drawTitle(this.ctx, this.time);
    } else {
      ui.drawHud(this.ctx, this);
      if (this.state === 'banner') ui.drawDayBanner(this.ctx, this.day, this.totalDays);
      else if (this.state === 'dayclear') ui.drawDayClear(this.ctx, this);
      else if (this.state === 'win') ui.drawWin(this.ctx, this);
      else if (this.state === 'gameover') ui.drawGameOver(this.ctx, this);
      if (this.paused) ui.drawPaused(this.ctx);
    }
  }

  // ---- screenshot staging -------------------------------------------------
  // ?screen=play|clear|win|over seeds a believable mid-game scene so the
  // maker's screenshots show the real game at its best. Plain play is the
  // default and uses none of this.
  stageFromUrl() {
    const screen = new URLSearchParams(window.location.search).get('screen');
    if (!screen || screen === 'title') return;
    if (screen === 'play') {
      this.startRun();
      this.state = 'playing';
      this.day = 2;
      this.dayTime = 34;
      this.score = 340;
      this.quotaCaught = 7;
      this.quotaTarget = quotaForDay(2);
      this.combo = 5;
      this.multiplier = 2;
      this.cart.x = 620;
      this.stageFruit('ripe', 300, 300);
      this.stageFruit('ripe', 660, 210);
      this.stageFruit('golden', 905, 330);
      this.stageFruit('unripe', 1080, 260);
      this.stageFruit('ripe', 470, 430);
      this.splats.push({ x: 210, kind: 'ripe', life: 2.6 });
    } else if (screen === 'clear') {
      this.startRun();
      this.day = 2;
      this.score = 890;
      this.quotaCaught = this.quotaTarget = quotaForDay(2);
      this.lastBonus = 265;
      this.state = 'dayclear';
    } else if (screen === 'win') {
      this.startRun();
      this.day = 5;
      this.dayTime = 55;
      this.quotaCaught = this.quotaTarget = quotaForDay(5);
      this.score = 3240;
      this.stats = { caught: 96, golden: 7, missed: 4 };
      this.state = 'win';
    } else if (screen === 'over') {
      this.startRun();
      this.day = 3;
      this.dayTime = 48;
      this.quotaTarget = quotaForDay(3);
      this.quotaCaught = 13;
      this.score = 1175;
      this.lives = 0;
      this.stats = { caught: 41, golden: 2, missed: 9 };
      this.state = 'gameover';
    }
  }

  stageFruit(kind, x, y) {
    // Build a fruit through the game's own class, then place it mid-fall.
    const palm = { x, crownY: y - 200, lean: 0 };
    const fruit = new Fruit(kind, palm, 1, () => 0.5);
    fruit.x = x;
    fruit.y = y;
    fruit.vy = 140;
    this.fruits.push(fruit);
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game; // dev handle: handy in the console, harmless in play
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
