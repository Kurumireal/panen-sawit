// Panen Sawit — sound bank. Every effect is synthesised with WebAudio
// oscillators and noise buffers; the game ships no audio files at all.
// The context is created lazily on the first user gesture (browser policy).

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freqA, freqB, seconds, type = 'sine', gainPeak = 0.16, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqB), t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  noise(seconds, gainPeak = 0.12, filterFreq = 900, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, (seconds * this.ctx.sampleRate) | 0);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t0);
  }

  // A ripe bunch lands in the basket: a pluck that climbs with the combo.
  catchRipe(combo) {
    const base = 340 + Math.min(combo, 10) * 45;
    this.tone(base, base * 1.6, 0.12, 'triangle', 0.18);
    this.tone(base * 2, base * 2.4, 0.08, 'sine', 0.07, 0.02);
  }

  // A golden bunch: a little three-note arpeggio.
  catchGolden() {
    this.tone(660, 660, 0.1, 'triangle', 0.16);
    this.tone(880, 880, 0.1, 'triangle', 0.16, 0.07);
    this.tone(1320, 1560, 0.16, 'triangle', 0.15, 0.14);
  }

  // An unripe bunch: dull, descending, faintly sour.
  catchUnripe() {
    this.tone(220, 130, 0.18, 'square', 0.07);
  }

  // A rotten bunch in the basket: buzz and a wobble.
  catchRotten() {
    this.tone(140, 90, 0.28, 'sawtooth', 0.12);
    this.tone(147, 95, 0.28, 'sawtooth', 0.1, 0.03);
    this.noise(0.2, 0.06, 500);
  }

  // A good bunch hits the soil: soft splat.
  splat() {
    this.noise(0.14, 0.14, 700);
    this.tone(120, 55, 0.14, 'sine', 0.14);
  }

  // Wind gust rolling through the crowns.
  gust() {
    this.noise(0.9, 0.05, 1400);
  }

  click() {
    this.tone(520, 700, 0.06, 'triangle', 0.1);
  }

  // Day quota met: a short rising jingle.
  dayClear() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this.tone(f, f, 0.14, 'triangle', 0.15, i * 0.09));
  }

  // The fifth day is cleared: the full harvest fanfare.
  fanfare() {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318];
    notes.forEach((f, i) => this.tone(f, f, 0.16, 'triangle', 0.16, i * 0.1));
    this.noise(0.5, 0.04, 3000, 0.2);
  }

  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this.tone(f, f * 0.94, 0.22, 'triangle', 0.14, i * 0.16));
  }
}
