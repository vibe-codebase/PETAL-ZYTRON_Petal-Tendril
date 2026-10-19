import { W, type Level, type Stone, type Thorn, type Wind, type Bud } from './sim';

/**
 * Tendril gardens. Each wall is laid out from a seed by a small set of rules (gates of stone,
 * stone islands, bramble knots, wind) and the tests prove, with the gardener autopilot, that every
 * one can be climbed with all three buds in bloom.
 */
export const CHAPTERS = [
  { name: 'Spring', blurb: 'Old stone walls and new green shoots.', flower: 'clematis' },
  { name: 'Summer', blurb: 'Brambles in the gaps. Steer wide of the thorns.', flower: 'rose' },
  { name: 'Autumn', blurb: 'The wind leans everything. Lean against it.', flower: 'aster' },
] as const;

function rng(seed: number) {
  let s = Math.imul(seed | 0, 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Spec = { id: string; chapter: 0 | 1 | 2; name: string; latin: string; note: string; height: number; speed: number; turn: number; seed: number; gap: number; thorns: number; wind: number; hint?: string };

function layout(sp: Spec): Level {
  const rand = rng(sp.seed);
  const stones: Stone[] = [], thorns: Thorn[] = [], winds: Wind[] = [], buds: Bud[] = [];
  const start = 120 + rand() * 120;
  let y = sp.height - 200;
  let k = 0;
  while (y > 220) {
    const kind = k % 3;
    if (kind === 0) {
      // a gate: a stone course across the wall with one gap
      const gx = 70 + rand() * (W - 140), g = sp.gap;
      stones.push({ x: 0, y, w: Math.max(0, gx - g / 2), h: 22 });
      stones.push({ x: gx + g / 2, y, w: W - (gx + g / 2), h: 22 });
      if (sp.thorns > 0 && rand() < sp.thorns) thorns.push({ x: gx + (rand() < 0.5 ? -1 : 1) * (g / 2 + 4), y: y - 14, r: 9 });
    } else if (kind === 1) {
      // a stone island to go round
      const w = 60 + rand() * 70, h = 26 + rand() * 20;
      stones.push({ x: 50 + rand() * (W - 100 - w), y, w, h });
      if (sp.thorns > 0 && rand() < sp.thorns) {
        const n = 2 + Math.floor(rand() * 2), tx = 60 + rand() * (W - 120);
        for (let i = 0; i < n; i++) thorns.push({ x: tx + i * 24, y: y - 70 - rand() * 20, r: 11 + rand() * 4 });
      }
    } else if (sp.wind > 0 && rand() < 0.8) {
      winds.push({ x: 0, y: y - 120, w: W, h: 110, push: (rand() < 0.5 ? -1 : 1) * sp.wind });
    } else if (sp.thorns > 0) {
      const tx = 70 + rand() * (W - 140);
      thorns.push({ x: tx, y, r: 13 + rand() * 5 });
    }
    y -= 150 + rand() * 40;
    k++;
  }
  // three buds, one in each third of the climb, set where the vine has to reach for them
  const clear = (bx: number, by: number) => stones.every((s) => bx < s.x - 26 || bx > s.x + s.w + 26 || by < s.y - 26 || by > s.y + s.h + 26) && thorns.every((t) => Math.hypot(t.x - bx, t.y - by) > t.r + 34);
  for (let i = 0; i < 3; i++) {
    const lo = 160 + ((sp.height - 380) * i) / 3, hi = 160 + ((sp.height - 380) * (i + 1)) / 3;
    for (let tries = 0; tries < 200; tries++) {
      const bx = 40 + rand() * (W - 80), by = lo + rand() * (hi - lo);
      if (clear(bx, by)) { buds.push({ x: Math.round(bx), y: Math.round(by) }); break; }
    }
  }
  return { id: sp.id, chapter: sp.chapter, name: sp.name, latin: sp.latin, note: sp.note, height: sp.height, speed: sp.speed, turn: sp.turn, start: Math.round(start),
    stones: stones.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.w), h: Math.round(s.h) })),
    thorns: thorns.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), r: Math.round(t.r) })), winds, buds, hint: sp.hint };
}

const S = (id: string, chapter: 0 | 1 | 2, name: string, latin: string, note: string, o: Partial<Spec> & { seed: number }): Spec => ({
  id, chapter, name, latin, note, height: 1000, speed: 46, turn: 2.2, gap: 90, thorns: 0, wind: 0, ...o,
});

export const SPECS: Spec[] = [
  S('spring-1', 0, 'First Shoot', 'Clematis prima', 'A low wall and an open sky.', { seed: 11, height: 820, speed: 40, gap: 120, hint: 'Hold your finger where you want the vine to grow. Let go and it reaches for the sun.' }),
  S('spring-2', 0, 'Kitchen Wall', 'Clematis culina', 'Past the herb pots.', { seed: 1023, height: 900, speed: 42, gap: 110 }),
  S('spring-3', 0, 'Old Gate', 'Clematis porta', 'Through the gaps in the stone.', { seed: 31, height: 960, speed: 43, gap: 100 }),
  S('spring-4', 0, 'Mossy Steps', 'Clematis musci', 'Up the garden steps.', { seed: 47, height: 1020, speed: 44, gap: 96 }),
  S('spring-5', 0, 'Bell Tower', 'Clematis campana', 'A long way up.', { seed: 1059, height: 1120, speed: 45, gap: 92 }),
  S('spring-6', 0, 'Dovecote', 'Clematis columba', 'Round the nesting boxes.', { seed: 61, height: 1080, speed: 46, gap: 88 }),
  S('spring-7', 0, 'Orchard Wall', 'Clematis pomi', 'Narrow gaps between old bricks.', { seed: 73, height: 1160, speed: 47, gap: 84 }),
  S('spring-8', 0, 'Spring Cloister', 'Clematis claustri', 'All the way to the cloister roof.', { seed: 89, height: 1240, speed: 48, gap: 80 }),
  S('summer-1', 1, 'Bramble Lane', 'Rosa rubi', 'The first thorns of summer.', { seed: 101, height: 1000, speed: 46, gap: 96, thorns: 0.6, hint: 'Brambles snag the tip. Curve around them early.' }),
  S('summer-2', 1, 'Rose Arch', 'Rosa arcus', 'Under the arch, around the briars.', { seed: 113, height: 1060, speed: 47, gap: 92, thorns: 0.7 }),
  S('summer-3', 1, 'Hedge Gap', 'Rosa saepes', 'A gap in the hedge.', { seed: 1127, height: 1100, speed: 48, gap: 90, thorns: 0.75 }),
  S('summer-4', 1, 'Thorn Garden', 'Rosa spinosa', 'Thorns on every side.', { seed: 131, height: 1140, speed: 49, gap: 88, thorns: 0.85 }),
  S('summer-5', 1, 'Briar Well', 'Rosa putei', 'Round the well and its brambles.', { seed: 149, height: 1180, speed: 50, gap: 86, thorns: 0.9 }),
  S('summer-6', 1, 'Midsummer', 'Rosa solstitii', 'The longest day.', { seed: 157, height: 1260, speed: 51, gap: 84, thorns: 0.9 }),
  S('summer-7', 1, 'Briar Maze', 'Rosa labyrinthi', 'A tangle to thread.', { seed: 163, height: 1300, speed: 52, gap: 82, thorns: 1 }),
  S('summer-8', 1, 'Summer Palace', 'Rosa regia', 'To the palace parapet.', { seed: 179, height: 1360, speed: 53, gap: 80, thorns: 1 }),
  S('autumn-1', 2, 'First Gust', 'Aster venti', 'The wind arrives.', { seed: 191, height: 1040, speed: 48, gap: 96, thorns: 0.3, wind: 22, hint: 'Pale streaks show the wind. It pushes the tip, so steer into it.' }),
  S('autumn-2', 2, 'Leaf Fall', 'Aster folii', 'Leaves on the wind.', { seed: 1197, height: 1100, speed: 49, gap: 92, thorns: 0.4, wind: 26 }),
  S('autumn-3', 2, 'Weathervane', 'Aster gyri', 'Which way now?', { seed: 211, height: 1140, speed: 50, gap: 90, thorns: 0.5, wind: 30 }),
  S('autumn-4', 2, 'Harvest Barn', 'Aster horrei', 'Up the barn wall.', { seed: 223, height: 1200, speed: 51, gap: 88, thorns: 0.5, wind: 32 }),
  S('autumn-5', 2, 'Rook Tower', 'Aster corvi', 'Where the rooks nest.', { seed: 227, height: 1240, speed: 52, gap: 86, thorns: 0.6, wind: 34 }),
  S('autumn-6', 2, 'Gale', 'Aster procellae', 'Hold on tight.', { seed: 233, height: 1300, speed: 53, gap: 86, thorns: 0.6, wind: 38 }),
  S('autumn-7', 2, 'Equinox', 'Aster aequinoctii', 'Day and night in balance.', { seed: 1239, height: 1340, speed: 54, gap: 84, thorns: 0.7, wind: 40 }),
  S('autumn-8', 2, 'Last Light', 'Aster ultimus', 'The last flowers of the year.', { seed: 241, height: 1420, speed: 55, gap: 82, thorns: 0.7, wind: 42 }),
];

export const LEVELS: Level[] = SPECS.map(layout);
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
export { layout };
export type { Spec };
