/**
 * Tendril sound, synthesised with Web Audio: a finger-picked harp in the garden, birdsong, a soft
 * airy tone that rises as the vine climbs, and a celesta chime for each flower that opens.
 */
const semis = (root: number, n: number) => root * Math.pow(2, n / 12);
// spring Ionian, summer Mixolydian, autumn Dorian
const MODES = [
  { root: 261.63, scale: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16] },
  { root: 293.66, scale: [0, 2, 4, 5, 7, 9, 10, 12, 14, 16] },
  { root: 220.0, scale: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15] },
];
const PROG = [0, 3, 4, 0, 5, 3, 4, 4];

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private n = 0;
  private chapter = 0;
  private seed = 17;
  private growth: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode; src: AudioBufferSourceNode } | null = null;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private lastLeaf = 0;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.4);
      const wet = ctx.createGain(); wet.gain.value = 0.3;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.5 * (this.ducked ? 0.4 : 1), t, 0.2);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  // ── music: finger-picked arpeggios and the odd bird ───────────────────
  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  stopMusic() { if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } }
  private rnd() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  private schedule() {
    const ctx = this.ctx!;
    const step = 60 / 76 / 2;
    const mode = MODES[this.chapter % MODES.length];
    while (this.next < ctx.currentTime + 0.8) {
      const t = this.next;
      const chord = PROG[Math.floor(this.n / 8) % PROG.length];
      const pattern = [0, 2, 4, 7, 4, 2, 4, 2];
      const deg = chord + pattern[this.n % 8];
      const oct = pattern[this.n % 8] >= 7 ? 12 : 0;
      this.pluck(t, semis(mode.root / 2, mode.scale[deg % 7] + (deg >= 7 ? 12 : 0) + oct - 12 + 12), this.n % 8 === 0 ? 0.08 : 0.05, this.music);
      if (this.n % 8 === 0) this.pluck(t, semis(mode.root / 4, mode.scale[chord % 7]), 0.07, this.music);
      if (this.rnd() < 0.035) this.bird(t + this.rnd() * 0.3);
      this.next += step;
      this.n++;
    }
  }
  private pluck(t: number, f: number, vol: number, bus: GainNode, d = 1.6) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const g2 = ctx.createGain(); g2.gain.value = 0.3;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(bus);
    o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
  }
  /** A small bird: quick frequency-swept chirps. */
  private bird(t: number) {
    const ctx = this.ctx!;
    const base = 2600 + this.rnd() * 1600, n = 2 + Math.floor(this.rnd() * 3);
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.09 + this.rnd() * 0.05);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(base * (1 + this.rnd() * 0.2), s); o.frequency.exponentialRampToValueAtTime(base * (0.7 + this.rnd() * 0.6), s + 0.07);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.025, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.08);
      o.connect(g).connect(this.music); o.start(s); o.stop(s + 0.1);
    }
  }

  // ── growth: an airy tone that brightens as the vine climbs ────────────
  startGrowth() {
    const ctx = this.ctx;
    if (!ctx || this.growth) return;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 220;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 700; filter.Q.value = 3;
    const gain = ctx.createGain(); gain.gain.value = 0;
    const og = ctx.createGain(); og.gain.value = 0.25;
    src.connect(filter).connect(gain); osc.connect(og).connect(gain); gain.connect(this.sfx);
    src.start(); osc.start();
    gain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.4);
    this.growth = { osc, gain, filter, src };
  }
  growthHeight(p: number) {
    if (!this.ctx || !this.growth) return;
    const t = this.ctx.currentTime;
    this.growth.osc.frequency.setTargetAtTime(220 * Math.pow(2, p * 1.5), t, 0.3);
    this.growth.filter.frequency.setTargetAtTime(700 + p * 1800, t, 0.3);
  }
  stopGrowth() {
    if (!this.ctx || !this.growth) return;
    const g = this.growth; this.growth = null;
    g.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    window.setTimeout(() => { try { g.osc.stop(); g.src.stop(); } catch { /* stopped */ } }, 800);
  }

  // ── effects ─────────────────────────────────────────────────────────────
  private celesta(t: number, f: number, vol: number) {
    const ctx = this.ctx!;
    for (const [m, a, d] of [[1, 1, 1.6], [4, 0.25, 0.4], [2.01, 0.2, 0.9]] as const) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + d + 0.05);
    }
  }
  tap() { if (this.ctx) this.pluck(this.ctx.currentTime, 784, 0.05, this.sfx, 0.4); }
  leaf() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.lastLeaf < 0.25) return;
    this.lastLeaf = t;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 1;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t, Math.random()); src.stop(t + 0.15);
  }
  bloom(i: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const mode = MODES[this.chapter % MODES.length];
    [0, 2, 4].forEach((d, k) => this.celesta(t + k * 0.08, semis(mode.root * 2, mode.scale[(d + i * 2) % mode.scale.length]), 0.09));
  }
  star(i: number) { if (this.ctx) this.celesta(this.ctx.currentTime, [1046.5, 1318.5, 1568][i] ?? 1568, 0.09); }
  reached(stars: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const mode = MODES[this.chapter % MODES.length];
    [0, 2, 4, 7, 9].slice(0, 2 + stars).forEach((d, k) => this.pluck(t + k * 0.11, semis(mode.root, mode.scale[d % mode.scale.length] + (d >= 7 ? 12 : 0)), 0.1, this.sfx, 2));
    this.bird(t + 0.6); this.bird(t + 1.1);
  }
  wilt() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.7);
    g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.85);
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
}

export const sound = new Sound();
