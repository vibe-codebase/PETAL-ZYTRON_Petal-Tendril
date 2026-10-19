import Phaser from 'phaser';
import * as A from './art';
import { CHAPTERS, LEVELS } from './levels';
import { createSim, headingTo, score, step, DT, W, type Level, type Result, type Sim } from './sim';
import { solve } from './bot';
import { MENU_LEVEL, MENU_PLAN } from './menuPlan';
import { sound } from '../audio/sound';

export type Finish = { level: Level; result: Result; path: [number, number][] };
type Hooks = {
  onFinish?: (f: Finish) => void;
  onStart?: () => void;
  onBloom?: (n: number) => void;
  onHaptic?: (style: 'light' | 'medium' | 'success' | 'warning') => void;
};

/** Bridge between React and the Phaser scene. */
export const garden = {
  hooks: {} as Hooks,
  scene: null as GardenScene | null,
  reducedMotion: false,
  progress: 0,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  debug() { return this.scene?.debugState(); },
  /** QA only: grow the whole vine with the solver ('win') or straight into trouble ('fail'). */
  qa(kind: 'win' | 'fail') { this.scene?.qaRun(kind); },
};
(window as unknown as { __garden: typeof garden }).__garden = garden;

const DECIDE_TICKS = 18; // the menu replays the solver's plan, one choice every 0.15 s

export class GardenScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private state: 'ready' | 'growing' | 'finished' = 'ready';
  private sim!: Sim;
  private paused = false;
  private finger: { x: number; y: number } | null = null;
  private acc = 0;
  private r = 2;
  private viewH = 700;
  private texSeq = 0;
  private runId = 0;
  private vine!: Phaser.GameObjects.Graphics;
  private aim!: Phaser.GameObjects.Graphics;
  private tipGlow!: Phaser.GameObjects.Image;
  private leafKeys: string[] = [];
  private curlKey = '';
  private flowerKey = '';
  private leaves: Phaser.GameObjects.Image[] = [];
  private buds: { bud: Phaser.GameObjects.Image; flower: Phaser.GameObjects.Image }[] = [];
  private windLines: { g: Phaser.GameObjects.Graphics; push: number; y: number; h: number; t: number }[] = [];
  private grown = 0;          // path length already decorated with leaves
  private planIdx = 0;
  private tick = 0;
  private wilt = 0;
  private menuWait = 0;

  constructor() { super('garden'); }

  create() {
    garden.scene = this;
    const setFinger = (p: Phaser.Input.Pointer) => { this.finger = { x: p.worldX, y: p.worldY }; };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.mode !== 'play' || this.paused || this.state === 'finished') return;
      setFinger(p);
      if (this.state === 'ready') { this.state = 'growing'; garden.hooks.onStart?.(); sound.startGrowth(); }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown && this.finger) setFinger(p); });
    this.input.on('pointerup', () => { this.finger = null; });
    this.input.on('pointerupoutside', () => { this.finger = null; });
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', MENU_LEVEL);
  }

  debugState() { return { mode: this.mode, state: this.state, x: this.sim?.x, y: this.sim?.y, outcome: this.sim?.outcome, bloomed: this.sim?.bloomed }; }

  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode; this.level = level;
    this.paused = false; this.finger = null;
    this.state = mode === 'menu' ? 'growing' : 'ready';
    this.runId++;
    this.sim = createSim(level);
    this.grown = 0; this.planIdx = 0; this.tick = 0; this.wilt = 0; this.menuWait = 0;
    garden.progress = 0;
    this.rebuild();
  }
  setPaused(p: boolean) { this.paused = p; if (p) this.finger = null; }

  private tex(prefix: string, c: HTMLCanvasElement) { const k = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(k, c); return k; }

  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    this.leaves = []; this.buds = []; this.windLines = []; this.grown = 0;

    const pw = this.scale.width, ph = this.scale.height;
    const zoom = pw / W;
    this.r = Math.min(2, Math.max(1, zoom));
    this.viewH = ph / zoom;
    const l = this.level, r = this.r, p = A.PALETTES[l.chapter];
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // Phaser zooms about the camera centre, so shift the view to keep the wall's left edge at the screen's left edge
    cam.scrollX = -(pw - pw / zoom) / 2;
    cam.setBackgroundColor(p.paper[1]);
    const seed = l.id.length * 271 + l.chapter * 7;

    this.add.image(0, 0, this.tex('wall', A.wallTexture(p, l, r, seed))).setOrigin(0, 0).setScale(1 / r);
    for (const w of l.winds) {
      const g = this.add.graphics();
      this.windLines.push({ g, push: w.push, y: w.y, h: w.h, t: 0 });
    }
    const budKey = this.tex('bud', A.budTexture(p, r));
    this.flowerKey = this.tex('flower', A.flowerTexture(p, CHAPTERS[l.chapter].flower, r, seed));
    for (const b of l.buds) {
      const bud = this.add.image(b.x, b.y, budKey).setScale(1 / r).setOrigin(0.5, 0.6);
      if (!garden.reducedMotion) this.tweens.add({ targets: bud, angle: { from: -5, to: 5 }, duration: 1600 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const flower = this.add.image(b.x, b.y, this.flowerKey).setScale(0).setAlpha(0);
      this.buds.push({ bud, flower });
    }
    this.vine = this.add.graphics();
    this.leafKeys = [0, 1, 2].map((i) => this.tex('leaf', A.leafTexture(p, r, seed + i)));
    this.curlKey = this.tex('curl', A.curlTexture(p, r));
    this.tipGlow = this.add.image(0, 0, this.tex('glow', A.dotTexture(p.leaf[0], 14, r))).setScale(1 / r).setBlendMode(Phaser.BlendModes.SCREEN);
    this.aim = this.add.graphics();
    // re-apply blooms (after a resize)
    this.sim.bloomed.forEach((on, i) => { if (on) { this.buds[i].bud.setVisible(false); this.buds[i].flower.setScale(1 / r).setAlpha(1); } });
    this.decorate(true);
    this.follow(true);
  }

  // ── loop ──────────────────────────────────────────────────────────────
  update(_t: number, deltaMs: number) {
    if (!this.sim) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    this.animateWind(dt);
    if (!this.paused) {
      if (this.mode === 'menu' && this.sim.outcome !== 'growing') {
        this.menuWait += dt;
        if (this.menuWait > 3.5) { this.show('menu', this.level); return; }
      } else if (this.state === 'growing') {
        this.acc += dt;
        let n = 0;
        while (this.acc >= DT && n < 24 && this.sim.outcome === 'growing') {
          this.acc -= DT; n++;
          step(this.level, this.sim, this.steer());
          this.handleEvents();
        }
        if (n >= 24) this.acc = 0;
        garden.progress = 1 - this.sim.y / this.level.height;
        if (this.mode === 'play') sound.growthHeight(garden.progress);
      }
    }
    this.drawVine();
    this.decorate(false);
    this.drawAim();
    this.follow(false);
  }

  private steer(): number | null {
    if (this.mode === 'menu') {
      const c = MENU_PLAN[Math.min(MENU_PLAN.length - 1, this.planIdx)];
      if (++this.tick >= DECIDE_TICKS) { this.tick = 0; this.planIdx++; }
      return c;
    }
    return this.finger ? headingTo(this.sim, this.finger.x, this.finger.y) : null;
  }

  private handleEvents() {
    for (const e of this.sim.events) {
      if (e.kind === 'bloom') this.bloom(e.i);
      else if (e.kind === 'reached' || e.kind === 'stone' || e.kind === 'thorn') this.finish();
    }
  }

  private bloom(i: number) {
    const b = this.buds[i];
    if (!b) return;
    b.bud.setVisible(false);
    if (this.mode === 'play') { sound.bloom(i); garden.hooks.onHaptic?.('medium'); garden.hooks.onBloom?.(this.sim.bloomed.filter(Boolean).length); }
    if (garden.reducedMotion) { b.flower.setScale(1 / this.r).setAlpha(1); return; }
    this.tweens.add({ targets: b.flower, scale: 1 / this.r, alpha: 1, angle: { from: -60, to: 0 }, duration: 700, ease: 'Back.out' });
  }

  private finish() {
    if (this.state === 'finished' || this.mode === 'menu') return;
    this.state = 'finished';
    this.finger = null;
    const result = score(this.level, this.sim);
    sound.stopGrowth();
    if (result.success) { sound.reached(result.stars); garden.hooks.onHaptic?.('success'); }
    else { sound.wilt(); garden.hooks.onHaptic?.('warning'); this.tweens.addCounter({ from: 0, to: 1, duration: 900, onUpdate: (tw) => { this.wilt = tw.getValue() ?? 0; } }); }
    const run = this.runId;
    const path = this.sim.path.filter((_, i) => i % 4 === 0).map((q) => [Math.round(q.x), Math.round(q.y)] as [number, number]);
    window.setTimeout(() => { if (run === this.runId) garden.hooks.onFinish?.({ level: this.level, result, path }); }, result.success ? 1700 : 1300);
  }

  qaRun(kind: 'win' | 'fail') {
    if (this.mode !== 'play' || this.state === 'finished') return;
    if (this.state === 'ready') garden.hooks.onStart?.();
    this.state = 'growing';
    if (kind === 'win') {
      const sol = solve(this.level);
      this.sim = createSim(this.level);
      for (const c of sol?.plan ?? []) for (let k = 0; k < DECIDE_TICKS && this.sim.outcome === 'growing'; k++) { step(this.level, this.sim, c); this.handleEvents(); }
    } else {
      while (this.sim.outcome === 'growing') { step(this.level, this.sim, 1.5); this.handleEvents(); }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────────
  private follow(snap: boolean) {
    const cam = this.cameras.main;
    const target = Math.max(Math.min(0, this.level.height - this.viewH), Math.min(this.level.height - this.viewH, this.sim.y - this.viewH * 0.62));
    // with zoom, the visible top edge is scrollY + (height - height / zoom) / 2
    const want = target - (cam.height - cam.height / cam.zoom) / 2;
    cam.scrollY = snap ? want : cam.scrollY + (want - cam.scrollY) * 0.08;
  }

  private drawVine() {
    const g = this.vine, pts = this.sim.path, p = A.PALETTES[this.level.chapter];
    g.clear();
    if (pts.length < 2) return;
    const all = [...pts, { x: this.sim.x, y: this.sim.y }];
    const n = all.length;
    const dark = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.HexStringToColor(p.leaf[1]), Phaser.Display.Color.HexStringToColor('#6b5228'), 100, Math.round(this.wilt * 100));
    const light = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.HexStringToColor(p.leaf[0]), Phaser.Display.Color.HexStringToColor('#a0884e'), 100, Math.round(this.wilt * 100));
    const darkC = Phaser.Display.Color.GetColor(dark.r, dark.g, dark.b), lightC = Phaser.Display.Color.GetColor(light.r, light.g, light.b);
    const ink = Phaser.Display.Color.HexStringToColor(p.ink).color;
    // thick, old stem at the root tapering to a fine tip
    const width = (i: number) => { const fromTip = (n - 1 - i) * 2; return Math.min(7, 2.2 + fromTip * 0.045); };
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < n; i++) {
        const w = width(i);
        if (pass === 0) g.lineStyle(w + 1.8, ink, 0.85);
        else if (pass === 1) g.lineStyle(w, darkC, 1);
        else g.lineStyle(Math.max(0.6, w * 0.35), lightC, 0.9);
        const a = all[i - 1], b = all[i];
        const ox = pass === 2 ? -0.6 : 0;
        g.lineBetween(a.x + ox, a.y, b.x + ox, b.y);
      }
    }
    this.tipGlow.setPosition(this.sim.x, this.sim.y).setAlpha(this.sim.outcome === 'growing' ? 0.9 : 0);
    g.fillStyle(lightC, 1); g.fillCircle(this.sim.x, this.sim.y, 2.2);
  }

  /** Leaves unfurl along the stem as it grows, alternating sides, with the odd curling tendril. */
  private decorate(instant: boolean) {
    const pts = this.sim.path;
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      len += seg;
      if (len <= this.grown) continue;
      while (this.grown + 24 <= len) {
        this.grown += 24;
        const k = Math.round(this.grown / 24);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const side = k % 2 ? 1 : -1;
        const isCurl = k % 7 === 3;
        const im = this.add.image(b.x, b.y, isCurl ? this.curlKey : this.leafKeys[k % 3]).setOrigin(isCurl ? 0.1 : 0.12, 0.5)
          .setRotation(ang + side * (isCurl ? 1.2 : 1.0)).setScale(instant || garden.reducedMotion ? 1 / this.r : 0);
        if (!instant && !garden.reducedMotion) this.tweens.add({ targets: im, scale: (0.85 + (k % 3) * 0.12) / this.r, duration: 600, ease: 'Back.out' });
        else im.setScale((0.85 + (k % 3) * 0.12) / this.r);
        this.leaves.push(im);
        if (this.mode === 'play' && !instant && !isCurl && k % 2 === 0) sound.leaf();
      }
    }
    if (this.wilt > 0) this.leaves.forEach((l) => l.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - this.wilt * 60), Math.round(255 - this.wilt * 140))));
  }

  private drawAim() {
    const g = this.aim;
    g.clear();
    if (!this.finger || this.state !== 'growing') return;
    const p = A.PALETTES[this.level.chapter];
    const ink = Phaser.Display.Color.HexStringToColor(p.ink).color;
    const fx = this.finger.x, fy = this.finger.y, sx = this.sim.x, sy = this.sim.y;
    const d = Math.hypot(fx - sx, fy - sy);
    for (let t = 0.12; t < 1; t += 18 / Math.max(18, d)) { g.fillStyle(ink, 0.35); g.fillCircle(sx + (fx - sx) * t, sy + (fy - sy) * t, 1.2); }
    g.lineStyle(1.4, ink, 0.55); g.strokeCircle(fx, fy, 14);
    g.lineStyle(1, ink, 0.25); g.strokeCircle(fx, fy, 20);
  }

  private animateWind(dt: number) {
    for (const w of this.windLines) {
      w.t += dt;
      const g = w.g;
      g.clear();
      const ink = Phaser.Display.Color.HexStringToColor(A.PALETTES[this.level.chapter].ink).color;
      g.fillStyle(ink, 0.04); g.fillRect(0, w.y, W, w.h);
      if (garden.reducedMotion) continue;
      for (let i = 0; i < 9; i++) {
        const y = w.y + 10 + ((i * 37) % (w.h - 20));
        const span = 40 + (i % 3) * 18;
        let x = ((w.t * Math.abs(w.push) * 2.2 + i * 53) % (W + span)) - span;
        if (w.push < 0) x = W - x - span;
        g.lineStyle(1, ink, 0.28); g.lineBetween(x, y, x + span, y + Math.sin(w.t * 2 + i) * 2);
        g.lineBetween(x + span * 0.3, y + 4, x + span * 0.8, y + 4);
      }
    }
  }
}

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#efe6d2',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 2 },
    scene: [GardenScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
