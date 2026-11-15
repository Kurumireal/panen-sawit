// Panen Sawit — the plantation itself: sky, sun, hills, palms and soil.
// Everything is drawn procedurally on the canvas; there are no image files.
// The sun rides an arc across the sky as the day timer runs, and the whole
// palette warms from morning gold to dusk ember with it.

export const WORLD = {
  width: 1280,
  height: 720,
  groundY: 646, // top edge of the soil strip the cart rolls on
};

// The five palms the harvest falls from. crownX/crownY is where bunches
// detach; lean bends the trunk for a hand-drawn feel.
export const PALMS = [
  { x: 148, crownY: 148, lean: -14, scale: 1.0 },
  { x: 402, crownY: 118, lean: 10, scale: 1.12 },
  { x: 640, crownY: 158, lean: -6, scale: 0.94 },
  { x: 884, crownY: 112, lean: 14, scale: 1.08 },
  { x: 1132, crownY: 146, lean: -10, scale: 1.0 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

function rgb(c) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Sky keyframes across one day: morning, noon, afternoon, dusk.
const SKY_STOPS = [
  { at: 0.0, top: [122, 178, 224], low: [252, 224, 160] },
  { at: 0.45, top: [84, 156, 219], low: [214, 238, 246] },
  { at: 0.75, top: [94, 128, 196], low: [250, 196, 128] },
  { at: 1.0, top: [52, 58, 110], low: [246, 130, 74] },
];

function skyAt(progress) {
  for (let i = 1; i < SKY_STOPS.length; i++) {
    if (progress <= SKY_STOPS[i].at) {
      const a = SKY_STOPS[i - 1];
      const b = SKY_STOPS[i];
      const t = (progress - a.at) / (b.at - a.at);
      return { top: mixColor(a.top, b.top, t), low: mixColor(a.low, b.low, t) };
    }
  }
  const last = SKY_STOPS[SKY_STOPS.length - 1];
  return { top: last.top, low: last.low };
}

// Sun position on its arc: rises left, sets right, sinking as progress -> 1.
export function sunPosition(progress) {
  const x = lerp(120, 1160, progress);
  const y = 500 - Math.sin(progress * Math.PI) * 380 - progress * 130;
  return { x, y };
}

function drawPalm(ctx, palm, time, wind) {
  const baseX = palm.x;
  const baseY = WORLD.groundY + 6;
  const crownX = baseX + palm.lean;
  const crownY = palm.crownY;
  const sway = Math.sin(time * 0.9 + palm.x) * 3 + wind * 9;

  // Trunk: a tapering curved band of ringed segments.
  ctx.strokeStyle = '#7a5a38';
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const t0 = i / 9;
    const t1 = (i + 0.92) / 9;
    const x0 = lerp(baseX, crownX, t0) + Math.sin(t0 * 2.4 + palm.x) * 4;
    const y0 = lerp(baseY, crownY, t0);
    const x1 = lerp(baseX, crownX, t1) + Math.sin(t1 * 2.4 + palm.x) * 4;
    const y1 = lerp(baseY, crownY, t1);
    ctx.lineWidth = lerp(17, 8, t0) * palm.scale;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Fronds: layered arcs fanning from the crown, tips drooping.
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const angle = Math.PI * (0.08 + (0.84 * i) / (fronds - 1)) + sway * 0.004;
    const len = (118 + ((i * 37) % 40)) * palm.scale;
    const tipX = crownX + Math.cos(angle) * len + sway;
    const tipY = crownY - Math.sin(angle) * len * 0.52 + len * 0.34;
    const midX = crownX + Math.cos(angle) * len * 0.55 + sway * 0.5;
    const midY = crownY - Math.sin(angle) * len * 0.62;
    ctx.strokeStyle = i % 2 ? '#2e7d43' : '#35924f';
    ctx.lineWidth = 7 * palm.scale;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }

  // Crown heart.
  ctx.fillStyle = '#256b36';
  ctx.beginPath();
  ctx.arc(crownX, crownY, 13 * palm.scale, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWorld(ctx, progress, time, wind) {
  const { width, height, groundY } = WORLD;
  const sky = skyAt(progress);

  // Sky.
  const grad = ctx.createLinearGradient(0, 0, 0, groundY);
  grad.addColorStop(0, rgb(sky.top));
  grad.addColorStop(1, rgb(sky.low));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, groundY);

  // Sun with a soft halo.
  const sun = sunPosition(progress);
  const halo = ctx.createRadialGradient(sun.x, sun.y, 8, sun.x, sun.y, 120);
  halo.addColorStop(0, 'rgba(255, 214, 110, 0.85)');
  halo.addColorStop(0.35, 'rgba(255, 190, 90, 0.35)');
  halo.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sun.x - 130, sun.y - 130, 260, 260);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 34, 0, Math.PI * 2);
  ctx.fill();

  // Distant plantation hills, two receding rows.
  ctx.fillStyle = 'rgba(70, 130, 84, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= width; x += 64) {
    ctx.lineTo(x, groundY - 120 - Math.sin(x * 0.006 + 2) * 42);
  }
  ctx.lineTo(width, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(52, 108, 66, 0.8)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= width; x += 64) {
    ctx.lineTo(x, groundY - 52 - Math.sin(x * 0.009 + 5) * 30);
  }
  ctx.lineTo(width, groundY);
  ctx.closePath();
  ctx.fill();

  // The palms stand on the near hill line.
  for (const palm of PALMS) drawPalm(ctx, palm, time, wind);

  // Soil strip with planting rows running to the horizon edge.
  const soil = ctx.createLinearGradient(0, groundY, 0, height);
  soil.addColorStop(0, '#8a613c');
  soil.addColorStop(1, '#5f4126');
  ctx.fillStyle = soil;
  ctx.fillRect(0, groundY, width, height - groundY);
  ctx.strokeStyle = 'rgba(60, 38, 18, 0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < PALMS.length; i++) {
    const x = PALMS[i].x;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 4);
    ctx.lineTo(x + (x - width / 2) * 0.24, height);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 220, 150, 0.16)';
  ctx.fillRect(0, groundY, width, 4);
}
