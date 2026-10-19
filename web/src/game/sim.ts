/**
 * Tendril growth model. The vine's tip grows at a steady speed. While the player holds a finger
 * on the screen the tip bends toward it; when they let go it turns back toward the sun overhead.
 * Stone and thorns end the climb; wind leans the vine sideways; touching a bud makes it bloom.
 * Pure and deterministic: the game, the tests and the solver share it.
 */
export type Stone = { x: number; y: number; w: number; h: number };     // axis-aligned block (y grows downward)
export type Thorn = { x: number; y: number; r: number };                 // a bramble knot
export type Wind = { x: number; y: number; w: number; h: number; push: number }; // push > 0 blows right
export type Bud = { x: number; y: number };
export type Level = {
  id: string; chapter: 0 | 1 | 2; name: string; latin: string; note: string;
  height: number; speed: number; turn: number;
  start: number;                       // x of the root
  stones: Stone[]; thorns: Thorn[]; winds: Wind[]; buds: Bud[];
  hint?: string;
};

export const W = 360;
export const TIP_R = 4;
export const BUD_R = 16;
export const MAX_LEAN = (100 * Math.PI) / 180; // the vine never points more than 100° from straight up
export const SUN_RETURN = 0.9;                 // how quickly the tip turns back toward the sun (rad/s)
export const DT = 1 / 120;

export type Outcome = 'growing' | 'reached' | 'stone' | 'thorn';
export type Sim = {
  t: number; x: number; y: number; heading: number; // heading 0 = up, positive = clockwise (to the right)
  outcome: Outcome; bloomed: boolean[];
  path: { x: number; y: number }[];
  events: ({ kind: 'bloom'; i: number } | { kind: 'reached' } | { kind: 'stone' } | { kind: 'thorn' })[];
};

export function createSim(level: Level): Sim {
  const y = level.height - 20;
  return { t: 0, x: level.start, y, heading: 0, outcome: 'growing', bloomed: level.buds.map(() => false), path: [{ x: level.start, y }], events: [] };
}

const clampAngle = (a: number) => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, a));
const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

/** Angle (0 = up, + = right) from the tip toward a point. */
export function headingTo(s: Sim, px: number, py: number) { return Math.atan2(px - s.x, -(py - s.y)); }

/** `target` is the heading the player is steering toward, or null when not touching. */
export function step(level: Level, s: Sim, target: number | null, dt = DT): Sim {
  s.events = [];
  if (s.outcome !== 'growing') return s;
  s.t += dt;
  const want = target === null ? 0 : clampAngle(wrap(target));
  const rate = target === null ? SUN_RETURN : level.turn;
  const d = wrap(want - s.heading);
  s.heading = clampAngle(s.heading + Math.max(-rate * dt, Math.min(rate * dt, d)));
  let vx = Math.sin(s.heading) * level.speed, vy = -Math.cos(s.heading) * level.speed;
  for (const w of level.winds) if (s.x >= w.x && s.x <= w.x + w.w && s.y >= w.y && s.y <= w.y + w.h) vx += w.push;
  s.x += vx * dt; s.y += vy * dt;
  const last = s.path[s.path.length - 1];
  if (Math.hypot(s.x - last.x, s.y - last.y) >= 2) s.path.push({ x: s.x, y: s.y });

  // the garden walls at either side are stone too
  if (s.x < TIP_R + 6 || s.x > W - TIP_R - 6) { s.outcome = 'stone'; s.events.push({ kind: 'stone' }); return s; }
  for (const st of level.stones) {
    if (s.x + TIP_R > st.x && s.x - TIP_R < st.x + st.w && s.y + TIP_R > st.y && s.y - TIP_R < st.y + st.h) { s.outcome = 'stone'; s.events.push({ kind: 'stone' }); return s; }
  }
  for (const th of level.thorns) {
    if (Math.hypot(s.x - th.x, s.y - th.y) < th.r + TIP_R) { s.outcome = 'thorn'; s.events.push({ kind: 'thorn' }); return s; }
  }
  level.buds.forEach((b, i) => {
    if (!s.bloomed[i] && Math.hypot(s.x - b.x, s.y - b.y) < BUD_R + TIP_R) { s.bloomed[i] = true; s.events.push({ kind: 'bloom', i }); }
  });
  if (s.y <= 40) { s.outcome = 'reached'; s.events.push({ kind: 'reached' }); }
  return s;
}

export type Result = { success: boolean; stars: number; blooms: number; outcome: Outcome };
/** ★ reach the light · ★★ at least two buds bloomed · ★★★ every bud bloomed. */
export function score(level: Level, s: Sim): Result {
  const blooms = s.bloomed.filter(Boolean).length;
  const ok = s.outcome === 'reached';
  const stars = !ok ? 0 : blooms >= level.buds.length ? 3 : blooms >= 2 ? 2 : 1;
  return { success: ok, stars, blooms, outcome: s.outcome };
}

export const FAIL_COPY = {
  stone: { title: 'Stopped by stone', line: 'The tip ran into the wall. Hold your finger beside the gap to lead it through.' },
  thorn: { title: 'Caught on thorns', line: 'Brambles snag a young vine. Give them a wider berth.' },
} as const;
