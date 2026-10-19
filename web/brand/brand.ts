// Store icon, adaptive-icon layers and splash: a vine with a clematis, inked on herbarium paper.
import * as A from '../src/game/art';

const P = A.PALETTES[0];
const R = 4;

function paper(g: CanvasRenderingContext2D, W: number, H: number) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, P.paper[0]); bg.addColorStop(1, P.paper[1]);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rand = A.rng(4);
  for (let i = 0; i < 40; i++) { const x = rand() * W, y = rand() * H, r = 20 + rand() * 80; const s = g.createRadialGradient(x, y, 0, x, y, r); s.addColorStop(0, 'rgba(150,110,60,0.06)'); s.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = s; g.fillRect(x - r, y - r, r * 2, r * 2); }
}
/** An S-curving vine from (x, y0) up to (x, y1), with leaves and a flower at the top. */
function vine(g: CanvasRenderingContext2D, x: number, y0: number, y1: number, s: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([x + Math.sin(t * Math.PI * 2.2) * 70 * s, y0 + (y1 - y0) * t]); }
  const stroke = (w: number, col: string) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); };
  stroke(16 * s, P.ink); stroke(12 * s, P.leaf[1]); stroke(4 * s, P.leaf[0]);
  const leaf = A.leafTexture(P, R, 3), curl = A.curlTexture(P, R);
  for (let i = 5; i < 56; i += 6) {
    const [px, py] = pts[i], [qx, qy] = pts[i + 1];
    const ang = Math.atan2(qy - py, qx - px), side = (i / 6) % 2 < 1 ? 1 : -1;
    const tex = i % 18 === 11 ? curl : leaf;
    g.save(); g.translate(px, py); g.rotate(ang + side * 1.0); g.scale(s * 3.2, s * 3.2);
    g.drawImage(tex, -tex.width / R * 0.12, -tex.height / R / 2, tex.width / R, tex.height / R); g.restore();
  }
  const fl = A.flowerTexture(P, 'clematis', R, 7);
  const [fx, fy] = pts[60];
  g.save(); g.translate(fx, fy); g.scale(s * 4.6, s * 4.6); g.drawImage(fl, -fl.width / R / 2, -fl.height / R / 2, fl.width / R, fl.height / R); g.restore();
  const bud = A.budTexture(P, R);
  const [bx, by] = pts[30];
  g.save(); g.translate(bx + 60 * s, by); g.rotate(0.5); g.scale(s * 3, s * 3); g.drawImage(bud, -bud.width / R / 2, -bud.height / R / 2, bud.width / R, bud.height / R); g.restore();
}
export function icon() { const { c, g } = A.canvas(1024, 1024); paper(g, 1024, 1024); vine(g, 430, 1100, 300, 2.0); return c; }
export function adaptive() { const { c, g } = A.canvas(1024, 1024); vine(g, 460, 860, 340, 1.35); return c; }
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); paper(g, 1024, 1024); return c; }
export function splash() {
  const W = 1284, H = 2778;
  const { c, g } = A.canvas(W, H);
  paper(g, W, H);
  vine(g, W / 2 - 40, H + 40, H * 0.46, 2.1);
  g.textAlign = 'center';
  g.fillStyle = '#2f5422';
  g.font = 'italic 600 260px "Cormorant Garamond", Georgia, serif';
  g.fillText('Tendril', W / 2, H * 0.3);
  g.fillStyle = 'rgba(59,47,34,0.7)';
  g.font = 'italic 600 70px "Cormorant Garamond", Georgia, serif';
  g.fillText('Vitis ludens', W / 2, H * 0.3 + 110);
  g.save(); g.shadowBlur = 0; g.font = '700 58px Karla, sans-serif'; g.fillStyle = '#7d55b3'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('PETAL', W / 2 + 17, H * 0.3 - 230); g.restore();
  return c;
}
/** The Play Store feature graphic: the vine climbing toward its clematis on herbarium paper at the right; the words at the left. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  paper(g, W, H);
  vine(g, 800, H + 30, 120, 0.72);
  const sun = g.createRadialGradient(820, 40, 0, 820, 40, 260); sun.addColorStop(0, 'rgba(255,226,150,0.55)'); sun.addColorStop(1, 'rgba(255,226,150,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(59,47,34,0.35)'; g.lineWidth = 2; g.strokeRect(14, 14, W - 28, H - 28);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.save(); g.shadowBlur = 0; g.font = '700 22px Karla, sans-serif'; g.fillStyle = '#7d55b3'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('PETAL', 62, 118); g.restore();
  g.fillStyle = '#2f5422'; g.font = 'italic 600 128px "Cormorant Garamond", Georgia, serif'; g.fillText('Tendril', 52, 232);
  g.fillStyle = 'rgba(59,47,34,0.7)'; g.font = 'italic 600 30px "Cormorant Garamond", Georgia, serif'; g.fillText('Vitis ludens', 60, 270);
  g.fillStyle = '#4f7a38'; g.fillRect(62, 292, 52, 3);
  g.fillStyle = '#3b2f22'; g.font = '700 25px Karla, sans-serif'; g.fillText('Steer the vine, open every bud.', 62, 336);
  g.fillStyle = 'rgba(59,47,34,0.75)'; g.font = '500 18px Karla, sans-serif'; g.fillText('24 gardens · spring, summer and autumn', 62, 370);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
