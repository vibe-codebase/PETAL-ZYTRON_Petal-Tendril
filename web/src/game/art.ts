/**
 * Tendril art: a botanical plate. Sepia ink linework with watercolour washes on old herbarium
 * paper: a garden wall of stone courses, ink-drawn brambles, buds that open into flowers.
 * Everything is painted procedurally at the device's pixel density.
 */
import type { Level } from './sim';

export type Palette = { paper: [string, string]; wash: string; ink: string; leaf: [string, string]; flower: [string, string]; light: string };
export const PALETTES: Palette[] = [
  { paper: ['#f4ecd9', '#e6dabd'], wash: '#b9b4a3', ink: '#3b2f22', leaf: ['#7fa35a', '#3f6b2f'], flower: ['#b49ad8', '#6c4fa0'], light: '#ffe7a3' },
  { paper: ['#f6ead3', '#e9d6b4'], wash: '#c2b49a', ink: '#3d2a1c', leaf: ['#7aa04e', '#3b6328'], flower: ['#f2a0ae', '#c2445c'], light: '#fff0b8' },
  { paper: ['#f2e4cc', '#dfc79f'], wash: '#bca788', ink: '#3a2618', leaf: ['#a5a047', '#6b6a24'], flower: ['#c9a3e0', '#8a52b4'], light: '#ffd58a' },
];

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return { c, g: c.getContext('2d')! };
}
export function rng(seed: number) {
  let s = Math.imul(seed | 0, 2654435761) >>> 0;
  s ^= s >>> 15; s = Math.imul(s, 0x2c1b3c6d) >>> 0; s ^= s >>> 12;
  s = s >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** A shaky hand-inked line, so nothing looks ruled. */
function inkLine(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, rand: () => number, wob = 0.8) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
  g.beginPath(); g.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    g.lineTo(x0 + (x1 - x0) * t + (i < n ? (rand() - 0.5) * wob : 0), y0 + (y1 - y0) * t + (i < n ? (rand() - 0.5) * wob : 0));
  }
  g.stroke();
}

/** The whole garden wall for one level: paper, faint brick courses, the light at the top, stones and brambles. */
export function wallTexture(p: Palette, level: Level, r: number, seed: number) {
  const W = 360, H = level.height;
  const { c, g } = canvas(W * r, H * r);
  g.scale(r, r);
  const rand = rng(seed);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, p.paper[0]); bg.addColorStop(1, p.paper[1]);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // foxing and stains on old paper
  for (let i = 0; i < H / 40; i++) {
    const x = rand() * W, y = rand() * H, rad = 8 + rand() * 40;
    const s = g.createRadialGradient(x, y, 0, x, y, rad);
    s.addColorStop(0, 'rgba(150,110,60,0.07)'); s.addColorStop(1, 'rgba(150,110,60,0)');
    g.fillStyle = s; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // faint pencil brick courses
  g.strokeStyle = hexA(p.ink, 0.07); g.lineWidth = 0.7;
  for (let y = 60, row = 0; y < H; y += 22, row++) {
    inkLine(g, 0, y, W, y, rand, 0.6);
    for (let x = (row % 2) * 30; x < W; x += 60) inkLine(g, x, y, x, y + 22, rand, 0.4);
  }
  // the light at the top of the wall
  const light = g.createLinearGradient(0, 0, 0, 120);
  light.addColorStop(0, hexA(p.light, 0.95)); light.addColorStop(1, hexA(p.light, 0));
  g.fillStyle = light; g.fillRect(0, 0, W, 120);
  g.strokeStyle = hexA('#d9a03a', 0.35); g.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const a = Math.PI * (0.1 + (i / 13) * 0.8); inkLine(g, W / 2, -30, W / 2 + Math.cos(a) * 260, -30 + Math.sin(a) * 150, rand, 0.3); }
  // garden-wall edges, left and right
  for (const x of [0, W - 8]) {
    g.fillStyle = hexA(p.wash, 0.55); g.fillRect(x, 0, 8, H);
    g.strokeStyle = hexA(p.ink, 0.5); g.lineWidth = 1; inkLine(g, x === 0 ? 8 : W - 8, 0, x === 0 ? 8 : W - 8, H, rand, 0.8);
  }
  for (const st of level.stones) stoneBlock(g, p, st.x, st.y, st.w, st.h, rand);
  for (const th of level.thorns) bramble(g, p, th.x, th.y, th.r, rand);
  return c;
}

function stoneBlock(g: CanvasRenderingContext2D, p: Palette, x: number, y: number, w: number, h: number, rand: () => number) {
  if (w < 2) return;
  // split long courses into individual stones
  let cx = x;
  while (cx < x + w - 1) {
    const sw = Math.min(x + w - cx, 30 + rand() * 30);
    const wash = g.createLinearGradient(cx, y, cx, y + h);
    wash.addColorStop(0, hexA(p.wash, 0.75)); wash.addColorStop(1, hexA(p.wash, 0.95));
    g.fillStyle = wash;
    g.beginPath(); g.roundRect(cx + 0.8, y + 0.8, sw - 1.6, h - 1.6, 4); g.fill();
    g.strokeStyle = hexA(p.ink, 0.85); g.lineWidth = 1.1;
    g.beginPath(); g.roundRect(cx + 0.8, y + 0.8, sw - 1.6, h - 1.6, 4); g.stroke();
    // cross-hatched shadow underneath
    g.strokeStyle = hexA(p.ink, 0.3); g.lineWidth = 0.5;
    for (let hx = cx + 3; hx < cx + sw - 3; hx += 3) { g.beginPath(); g.moveTo(hx, y + h - 4); g.lineTo(hx + 3, y + h - 1); g.stroke(); }
    // moss
    if (rand() < 0.55) { g.fillStyle = hexA('#6f8a3c', 0.55); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(cx + 4 + rand() * (sw - 8), y + 2 + rand() * 4, 1 + rand() * 2.2, 0, Math.PI * 2); g.fill(); } }
    cx += sw;
  }
}

function bramble(g: CanvasRenderingContext2D, p: Palette, x: number, y: number, r: number, rand: () => number) {
  // a dark knot of briar: looping stems bristling with hooked thorns pointing outward
  g.fillStyle = 'rgba(70,30,20,0.10)'; g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.fill();
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < 4; k++) {
    const a0 = rand() * Math.PI * 2;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = a0 + (i / 24) * Math.PI * 1.8, rr = r * (0.45 + 0.5 * Math.abs(Math.sin(i * 0.45 + k)));
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, a]);
    }
    g.strokeStyle = '#2e1a10'; g.lineWidth = 2.4;
    g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
    g.strokeStyle = '#5e3a22'; g.lineWidth = 1;
    g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
    // hooked thorns
    g.fillStyle = '#2e1a10';
    for (let i = 1; i < pts.length; i += 2) {
      const [px, py] = pts[i];
      const out = Math.atan2(py - y, px - x) + (rand() - 0.5) * 0.6;
      const len = 3.5 + rand() * 2.5;
      g.beginPath();
      g.moveTo(px + Math.cos(out + 1.4) * 1.3, py + Math.sin(out + 1.4) * 1.3);
      g.lineTo(px + Math.cos(out) * len, py + Math.sin(out) * len);
      g.lineTo(px + Math.cos(out - 1.4) * 1.3, py + Math.sin(out - 1.4) * 1.3);
      g.closePath(); g.fill();
    }
  }
  void p;
}

/** A heart-shaped vine leaf with veins, drawn pointing right from its stalk at (0, centre). */
export function leafTexture(p: Palette, r: number, seed: number) {
  const L = 18, H = 14;
  const { c, g } = canvas((L + 4) * r, (H + 4) * r);
  g.scale(r, r);
  const rand = rng(seed);
  const cy = (H + 4) / 2;
  const grd = g.createLinearGradient(2, 0, L, 0);
  grd.addColorStop(0, p.leaf[1]); grd.addColorStop(0.5, p.leaf[0]); grd.addColorStop(1, p.leaf[1]);
  g.fillStyle = grd; g.strokeStyle = hexA(p.ink, 0.85); g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(3, cy);
  g.bezierCurveTo(4, cy - H / 2 - 1, L * 0.6, cy - H / 2, L, cy - 1 + (rand() - 0.5));
  g.bezierCurveTo(L * 0.6, cy + H / 2, 4, cy + H / 2 + 1, 3, cy);
  g.fill(); g.stroke();
  g.strokeStyle = hexA(p.ink, 0.45); g.lineWidth = 0.5;
  g.beginPath(); g.moveTo(3, cy); g.lineTo(L - 1, cy); g.stroke();
  for (let i = 1; i < 4; i++) { const x = 3 + i * (L / 4.2); g.beginPath(); g.moveTo(x, cy); g.lineTo(x + 3, cy - 3.6); g.moveTo(x, cy); g.lineTo(x + 3, cy + 3.6); g.stroke(); }
  g.fillStyle = 'rgba(255,255,230,0.2)'; g.beginPath(); g.ellipse(L * 0.45, cy - 2.5, 4, 1.5, -0.2, 0, Math.PI * 2); g.fill();
  return c;
}

/** A closed bud on a little stem. */
export function budTexture(p: Palette, r: number) {
  const { c, g } = canvas(24 * r, 30 * r);
  g.scale(r, r);
  g.strokeStyle = hexA(p.ink, 0.85); g.lineWidth = 0.9;
  g.fillStyle = p.leaf[1];
  g.beginPath(); g.moveTo(12, 29); g.quadraticCurveTo(11, 24, 12, 20); g.stroke();
  const grd = g.createLinearGradient(6, 6, 18, 20);
  grd.addColorStop(0, p.flower[0]); grd.addColorStop(1, p.flower[1]);
  g.fillStyle = grd;
  g.beginPath(); g.moveTo(12, 4); g.bezierCurveTo(20, 10, 18, 19, 12, 21); g.bezierCurveTo(6, 19, 4, 10, 12, 4); g.fill(); g.stroke();
  g.fillStyle = p.leaf[0];
  g.beginPath(); g.moveTo(12, 21); g.quadraticCurveTo(5, 19, 6, 13); g.quadraticCurveTo(9, 18, 12, 18); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(12, 21); g.quadraticCurveTo(19, 19, 18, 13); g.quadraticCurveTo(15, 18, 12, 18); g.fill(); g.stroke();
  g.strokeStyle = hexA(p.ink, 0.4); g.beginPath(); g.moveTo(12, 6); g.quadraticCurveTo(13, 13, 12, 19); g.stroke();
  return c;
}

/** An open flower: clematis (6 broad petals), rose (layered) or aster (many fine rays), per chapter. */
export function flowerTexture(p: Palette, kind: 'clematis' | 'rose' | 'aster', r: number, seed: number) {
  const S = 40;
  const { c, g } = canvas(S * r, S * r);
  g.scale(r, r);
  const rand = rng(seed);
  const cx = S / 2, cy = S / 2;
  g.strokeStyle = hexA(p.ink, 0.8); g.lineWidth = 0.7;
  const petal = (a: number, len: number, wid: number, col: string) => {
    g.save(); g.translate(cx, cy); g.rotate(a);
    const grd = g.createLinearGradient(0, 0, len, 0);
    grd.addColorStop(0, p.flower[1]); grd.addColorStop(1, col);
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.3, -wid, len * 0.85, -wid * 0.8, len, 0); g.bezierCurveTo(len * 0.85, wid * 0.8, len * 0.3, wid, 0, 0); g.fill(); g.stroke();
    g.strokeStyle = hexA(p.ink, 0.25); g.beginPath(); g.moveTo(2, 0); g.lineTo(len * 0.85, 0); g.stroke();
    g.restore();
  };
  if (kind === 'clematis') { for (let i = 0; i < 6; i++) petal((i / 6) * Math.PI * 2 + rand() * 0.1, 17, 6.5, p.flower[0]); }
  else if (kind === 'aster') { for (let i = 0; i < 18; i++) petal((i / 18) * Math.PI * 2, 16 + rand() * 2, 2.2, p.flower[0]); }
  else {
    for (let i = 0; i < 5; i++) petal((i / 5) * Math.PI * 2, 17, 8, p.flower[0]);
    for (let i = 0; i < 5; i++) petal((i / 5) * Math.PI * 2 + 0.6, 11, 6, p.flower[0]);
  }
  g.fillStyle = kind === 'rose' ? '#e8c35a' : '#f1d36a';
  g.beginPath(); g.arc(cx, cy, kind === 'aster' ? 4.5 : 3.6, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = hexA(p.ink, 0.6);
  for (let i = 0; i < 8; i++) { const a = rand() * Math.PI * 2, d = rand() * 3; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.5, 0, Math.PI * 2); g.fill(); }
  return c;
}

/** A small curled tendril. */
export function curlTexture(p: Palette, r: number) {
  const { c, g } = canvas(18 * r, 18 * r);
  g.scale(r, r);
  g.strokeStyle = p.leaf[1]; g.lineWidth = 0.9; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 3.2, rr = 7 * (1 - t) + 0.6; const x = 9 + Math.cos(a) * rr, y = 9 + Math.sin(a) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  return c;
}

export function dotTexture(color: string, rad: number, r: number) {
  const { c, g } = canvas(rad * 2 * r, rad * 2 * r);
  g.scale(r, r);
  const grd = g.createRadialGradient(rad, rad, 0, rad, rad, rad);
  grd.addColorStop(0, hexA(color, 0.95)); grd.addColorStop(0.45, hexA(color, 0.4)); grd.addColorStop(1, hexA(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, rad * 2, rad * 2);
  return c;
}
