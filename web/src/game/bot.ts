import { createSim, step, score, W, type Level, type Sim } from './sim';

/**
 * Gardener autopilot used by the tests: a beam search over steering choices, re-deciding only
 * every 0.15 s like a person would. It proves each garden can be climbed with every bud in bloom.
 */
const CHOICES: (number | null)[] = [null, -1.5, -0.9, -0.45, 0, 0.45, 0.9, 1.5];
const DECIDE = 0.15;

type Node = { s: Sim; plan: (number | null)[]; v: number };
function clone(s: Sim): Sim { return { ...s, bloomed: [...s.bloomed], path: s.path.slice(-2), events: [] }; }

function value(level: Level, s: Sim) {
  if (s.outcome === 'stone' || s.outcome === 'thorn') return -1e9;
  const blooms = s.bloomed.filter(Boolean).length;
  let v = blooms * 4000 + (level.height - s.y) * 2;
  if (s.outcome === 'reached') return v + 1e6;
  // pull toward the nearest unbloomed bud that is still ahead (above) the tip
  let best = Infinity;
  level.buds.forEach((b, i) => { if (!s.bloomed[i] && b.y < s.y + 10 && b.y > s.y - 220) best = Math.min(best, Math.abs(b.x - s.x) + Math.max(0, s.y - b.y) * 0.3); });
  if (best < Infinity) v -= best * 2.2;
  // a bud the vine has already climbed past is lost: heavy penalty
  level.buds.forEach((b, i) => { if (!s.bloomed[i] && b.y > s.y + 10) v -= 6000; });
  // stay away from the walls
  v -= Math.max(0, 30 - Math.min(s.x, W - s.x)) * 20;
  return v;
}

export function solve(level: Level, beam = 160): { plan: (number | null)[]; sim: Sim } | null {
  let layer: Node[] = [{ s: createSim(level), plan: [], v: 0 }];
  const ticks = Math.round(DECIDE / (1 / 120));
  for (let depth = 0; depth < 2000; depth++) {
    const next: Node[] = [];
    for (const n of layer) {
      for (const c of CHOICES) {
        const s = clone(n.s);
        for (let k = 0; k < ticks && s.outcome === 'growing'; k++) step(level, s, c);
        if (s.outcome === 'stone' || s.outcome === 'thorn') continue;
        const node = { s, plan: [...n.plan, c], v: value(level, s) };
        if (s.outcome === 'reached') {
          if (s.bloomed.every(Boolean)) return { plan: node.plan, sim: s };
          continue;
        }
        next.push(node);
      }
    }
    if (!next.length) return null;
    next.sort((a, b) => b.v - a.v);
    // keep the beam varied: one node per coarse cell of position, heading and blooms
    const seen = new Set<string>();
    layer = [];
    for (const n of next) {
      const key = `${Math.round(n.s.x / 8)},${Math.round(n.s.y / 12)},${Math.round(n.s.heading * 3)},${n.s.bloomed.map(Number).join('')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      layer.push(n);
      if (layer.length >= beam) break;
    }
  }
  return null;
}

/** Replays a plan exactly as the solver produced it. */
export function replay(level: Level, plan: (number | null)[]) {
  const s = createSim(level);
  const ticks = Math.round(DECIDE / (1 / 120));
  for (const c of plan) for (let k = 0; k < ticks && s.outcome === 'growing'; k++) step(level, s, c);
  return { sim: s, result: score(level, s) };
}
