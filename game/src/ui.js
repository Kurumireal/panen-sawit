// Panen Sawit — everything the player reads: the HUD (score, day quota,
// lives, combo) and the screens (title, day clear, victory, game over,
// pause). All canvas-drawn so screenshots show the real game.

import { WORLD } from './world.js';

const CREAM = '#fff6dd';
const GOLD = '#ffc456';
const INK = '#20301f';

function panel(ctx, w, h) {
  const x = (WORLD.width - w) / 2;
  const y = (WORLD.height - h) / 2;
  ctx.fillStyle = 'rgba(18, 34, 22, 0.86)';
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.stroke();
  return { x, y, w, h };
}

function centered(ctx, text, y, font, color = CREAM) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, WORLD.width / 2, y);
}

function heart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-16, -4, -8, -16, 0, -7);
  ctx.bezierCurveTo(8, -16, 16, -4, 0, 10);
  ctx.closePath();
  ctx.fillStyle = filled ? '#e8452c' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.restore();
}

export function drawHud(ctx, g) {
  // Score, top-left on a leaf-dark chip.
  ctx.fillStyle = 'rgba(18, 34, 22, 0.72)';
  ctx.beginPath();
  ctx.roundRect(18, 16, 252, 58, 12);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 15px Georgia, serif';
  ctx.fillStyle = GOLD;
  ctx.fillText('SKOR', 36, 34);
  ctx.font = '700 30px Georgia, serif';
  ctx.fillStyle = CREAM;
  ctx.fillText(String(g.score), 36, 60);

  // Day + quota progress, top-centre.
  ctx.fillStyle = 'rgba(18, 34, 22, 0.72)';
  ctx.beginPath();
  ctx.roundRect(430, 16, 420, 58, 12);
  ctx.fill();
  ctx.font = '700 17px Georgia, serif';
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.fillText(`HARI ${g.day} / ${g.totalDays}`, 640, 31);
  const barX = 452;
  const barW = 376;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.roundRect(barX, 42, barW, 12, 6);
  ctx.fill();
  const frac = Math.min(1, g.quotaCaught / g.quotaTarget);
  ctx.fillStyle = frac >= 1 ? '#7ddb6a' : '#f06a35';
  ctx.beginPath();
  ctx.roundRect(barX, 42, Math.max(12, barW * frac), 12, 6);
  ctx.fill();
  ctx.font = '700 13px Georgia, serif';
  ctx.fillStyle = CREAM;
  ctx.fillText(`target ${g.quotaCaught}/${g.quotaTarget} tandan`, 640, 66);

  // Lives, top-right.
  for (let i = 0; i < g.maxLives; i++) {
    heart(ctx, 1152 + i * 40, 42, 1.15, i < g.lives);
  }

  // Combo meter under the score when a streak is running.
  if (g.combo >= 2) {
    ctx.textAlign = 'left';
    ctx.font = '700 24px Georgia, serif';
    ctx.fillStyle = GOLD;
    ctx.fillText(`COMBO x${g.multiplier}`, 36, 102);
    ctx.font = '400 14px Georgia, serif';
    ctx.fillStyle = CREAM;
    ctx.fillText(`${g.combo} tangkapan beruntun`, 36, 124);
  }

  // Small control hints, bottom corners.
  ctx.font = '400 13px Georgia, serif';
  ctx.fillStyle = 'rgba(255, 246, 221, 0.75)';
  ctx.textAlign = 'left';
  ctx.fillText('← → / mouse: geser keranjang', 20, WORLD.height - 14);
  ctx.textAlign = 'right';
  ctx.fillText('P: jeda   M: suara', WORLD.width - 20, WORLD.height - 14);
}

export function drawTitle(ctx, time) {
  const p = panel(ctx, 700, 470);
  const cx = WORLD.width / 2;
  centered(ctx, '🌴', p.y + 58, '64px Georgia, serif');
  centered(ctx, 'PANEN SAWIT', p.y + 128, '700 62px Georgia, serif', GOLD);
  centered(ctx, 'Panen tandan matang sebelum matahari terbenam!', p.y + 178, 'italic 20px Georgia, serif');

  ctx.textAlign = 'left';
  ctx.font = '400 19px Georgia, serif';
  ctx.fillStyle = CREAM;
  const lines = [
    '🍊  Tandan oranye & emas: tangkap! Itu panenmu.',
    '🥬  Tandan hijau masih mentah — menangkapnya mengurangi skor.',
    '🍇  Tandan busuk: hindari, dan jangan sampai tandan bagus jatuh.',
    '🎯  Penuhi target tiap hari selama 5 hari untuk menang.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, cx - 300, p.y + 232 + i * 34));

  const pulse = 0.75 + 0.25 * Math.sin(time * 4);
  ctx.globalAlpha = pulse;
  centered(ctx, '— KLIK atau tekan ENTER untuk mulai —', p.y + 404, '700 22px Georgia, serif', GOLD);
  ctx.globalAlpha = 1;
}

export function drawDayBanner(ctx, day, totalDays) {
  centered(ctx, `HARI ${day}`, 300, '700 84px Georgia, serif', GOLD);
  centered(ctx, day === totalDays ? 'Hari terakhir — panen raya menanti!' : 'Matahari terbit, tandan mulai jatuh…', 366, 'italic 22px Georgia, serif');
}

export function drawDayClear(ctx, g) {
  const p = panel(ctx, 560, 330);
  centered(ctx, '🎉', p.y + 52, '52px Georgia, serif');
  centered(ctx, `HARI ${g.day} SELESAI!`, p.y + 112, '700 40px Georgia, serif', GOLD);
  centered(ctx, `Target ${g.quotaTarget} tandan tercapai`, p.y + 158, '20px Georgia, serif');
  centered(ctx, `Bonus matahari terbenam: +${g.lastBonus}`, p.y + 196, '20px Georgia, serif');
  centered(ctx, `Skor sementara: ${g.score}`, p.y + 234, '700 24px Georgia, serif');
  centered(ctx, 'Klik atau ENTER untuk lanjut ke hari berikutnya', p.y + 288, 'italic 17px Georgia, serif');
}

export function drawWin(ctx, g) {
  const p = panel(ctx, 620, 380);
  centered(ctx, '🏆', p.y + 56, '56px Georgia, serif');
  centered(ctx, 'PANEN RAYA!', p.y + 122, '700 52px Georgia, serif', GOLD);
  centered(ctx, 'Lima hari, lima target — kebun ini bangga padamu.', p.y + 172, 'italic 20px Georgia, serif');
  centered(ctx, `Skor akhir: ${g.score}`, p.y + 226, '700 32px Georgia, serif');
  centered(ctx, `Tandan tertangkap: ${g.stats.caught}   •   Emas: ${g.stats.golden}`, p.y + 268, '19px Georgia, serif');
  centered(ctx, 'Klik atau ENTER untuk panen lagi', p.y + 326, 'italic 18px Georgia, serif');
}

export function drawGameOver(ctx, g) {
  const p = panel(ctx, 620, 380);
  centered(ctx, '🌧️', p.y + 56, '56px Georgia, serif');
  centered(ctx, 'PANEN GAGAL', p.y + 122, '700 52px Georgia, serif', '#e88a6a');
  centered(ctx, `Terlalu banyak tandan bagus yang jatuh di hari ${g.day}.`, p.y + 172, 'italic 20px Georgia, serif');
  centered(ctx, `Skor akhir: ${g.score}`, p.y + 226, '700 32px Georgia, serif');
  centered(ctx, `Sampai hari: ${g.day}   •   Tandan tertangkap: ${g.stats.caught}`, p.y + 268, '19px Georgia, serif');
  centered(ctx, 'Klik atau ENTER untuk coba lagi', p.y + 326, 'italic 18px Georgia, serif');
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10, 20, 14, 0.55)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  centered(ctx, 'JEDA', 320, '700 54px Georgia, serif', GOLD);
  centered(ctx, 'Tekan P untuk lanjut', 378, 'italic 20px Georgia, serif');
}

export { INK };
