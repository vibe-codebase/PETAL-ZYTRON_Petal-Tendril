import { useEffect, useRef } from 'react';
import { hexA, PALETTES } from '../game/art';
import type { Level } from '../game/sim';

/**
 * A herbarium plate: the garden wall in miniature, with the player's best climb pressed onto it in ink
 * (or just the wall and its buds if the garden has not been climbed yet).
 */
export function Plate({ level, path, stars, locked, width = 140, height = 150 }: { level: Level; path?: [number, number][]; stars: number; locked: boolean; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr); c.height = Math.round(height * dpr);
    const g = c.getContext('2d')!;
    const p = PALETTES[level.chapter];
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    const k = Math.min(width / 360, height / level.height);
    const ox = (width - 360 * k) / 2, oy = (height - level.height * k) / 2;
    g.save(); g.translate(ox, oy); g.scale(k, k);
    const a = locked ? 0.35 : 1;
    g.fillStyle = hexA(p.wash, 0.8 * a); g.strokeStyle = hexA(p.ink, 0.7 * a); g.lineWidth = 3;
    for (const s of level.stones) { g.fillRect(s.x, s.y, s.w, s.h); g.strokeRect(s.x, s.y, s.w, s.h); }
    g.fillStyle = hexA('#7a3a24', 0.5 * a);
    for (const t of level.thorns) { g.beginPath(); g.arc(t.x, t.y, t.r, 0, Math.PI * 2); g.fill(); }
    if (path && path.length > 1 && !locked) {
      g.strokeStyle = p.leaf[1]; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.strokeStyle = p.leaf[0]; g.lineWidth = 4;
      g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      // a leaf every so often
      g.fillStyle = p.leaf[0];
      for (let i = 4; i < path.length; i += 6) { const [x, y] = path[i]; g.beginPath(); g.ellipse(x + (i % 12 ? 12 : -12), y, 12, 7, (i % 12 ? 0.5 : -0.5), 0, Math.PI * 2); g.fill(); }
    }
    level.buds.forEach((b, i) => {
      const open = !locked && i < stars && !!path;
      g.fillStyle = open ? p.flower[0] : hexA(p.flower[1], 0.5 * a);
      g.beginPath(); g.arc(b.x, b.y, open ? 30 : 18, 0, Math.PI * 2); g.fill();
      if (open) { g.fillStyle = '#f1d36a'; g.beginPath(); g.arc(b.x, b.y, 8, 0, Math.PI * 2); g.fill(); }
    });
    g.restore();
  }, [level, path, stars, locked, width, height]);
  return <canvas ref={ref} className="plate-art" style={{ width, height }} aria-hidden />;
}
