// Panen Sawit — the harvest cart (keranjang) the player slides along the
// soil row. It answers to arrow keys / A,D and to the mouse, leans into its
// motion, and its basket rim is the catch zone the fruit is judged against.

import { WORLD } from './world.js';

export class Cart {
  constructor() {
    this.x = WORLD.width / 2;
    this.y = WORLD.groundY - 34; // basket rim, held above the soil line
    this.width = 128;
    this.speed = 0;
    this.tilt = 0;
    this.bob = 0;
  }

  reset() {
    this.x = WORLD.width / 2;
    this.speed = 0;
    this.tilt = 0;
  }

  // keys: {left, right}; pointerX: mouse x in canvas units, or null.
  update(dt, keys, pointerX) {
    const accel = 3400;
    const maxSpeed = 880;
    let drive = 0;
    if (keys.left) drive -= 1;
    if (keys.right) drive += 1;

    if (drive !== 0) {
      this.speed += drive * accel * dt;
    } else if (pointerX !== null && Math.abs(pointerX - this.x) > 4) {
      const toward = Math.sign(pointerX - this.x);
      const dist = Math.abs(pointerX - this.x);
      this.speed = toward * Math.min(maxSpeed, dist * 9);
    } else {
      this.speed *= Math.pow(0.0001, dt); // firm braking, no ice rink
    }
    this.speed = Math.max(-maxSpeed, Math.min(maxSpeed, this.speed));
    this.x += this.speed * dt;
    const half = this.width / 2;
    if (this.x < half) { this.x = half; this.speed = 0; }
    if (this.x > WORLD.width - half) { this.x = WORLD.width - half; this.speed = 0; }

    const targetTilt = (this.speed / maxSpeed) * 0.09;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 10);
    this.bob = Math.sin(performance.now() * 0.02) * Math.min(2.4, Math.abs(this.speed) * 0.003);
  }

  // A fruit is caught when its centre crosses the basket mouth within the rim.
  catches(fruit) {
    const rimY = this.y;
    return (
      fruit.y + fruit.radius * 0.4 >= rimY &&
      fruit.y - fruit.radius * 0.4 <= rimY + 26 &&
      Math.abs(fruit.x - this.x) <= this.width / 2 - 6
    );
  }

  draw(ctx) {
    const { x, y } = this;
    ctx.save();
    ctx.translate(x, y + this.bob);
    ctx.rotate(this.tilt);

    // Wheels.
    ctx.fillStyle = '#3a2a18';
    for (const wx of [-42, 42]) {
      ctx.beginPath();
      ctx.arc(wx, 56, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6a42';
      ctx.beginPath();
      ctx.arc(wx, 56, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2a18';
    }

    // Cart body: slatted wooden crate, wider at the mouth.
    const body = ctx.createLinearGradient(0, 0, 0, 58);
    body.addColorStop(0, '#a9743c');
    body.addColorStop(1, '#7c5226');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2, 0);
    ctx.lineTo(this.width / 2, 0);
    ctx.lineTo(this.width / 2 - 14, 52);
    ctx.lineTo(-this.width / 2 + 14, 52);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 45, 18, 0.65)';
    ctx.lineWidth = 3;
    for (const ly of [13, 27, 41]) {
      ctx.beginPath();
      ctx.moveTo(-this.width / 2 + 4, ly);
      ctx.lineTo(this.width / 2 - 4, ly);
      ctx.stroke();
    }

    // Woven rim the fruit lands on.
    ctx.fillStyle = '#c98f4a';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.width / 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a24';
    ctx.beginPath();
    ctx.ellipse(0, -1, this.width / 2 - 9, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Handles.
    ctx.strokeStyle = '#6d4c2a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2, 8);
    ctx.lineTo(-this.width / 2 - 14, 20);
    ctx.moveTo(this.width / 2, 8);
    ctx.lineTo(this.width / 2 + 14, 20);
    ctx.stroke();

    ctx.restore();
  }
}
