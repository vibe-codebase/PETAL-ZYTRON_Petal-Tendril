import { describe, expect, it } from 'vitest';
import { LEVELS, CHAPTERS } from '../game/levels';
import { createSim, step, score, headingTo, W, MAX_LEAN } from '../game/sim';
import { solve, replay } from '../game/bot';
import { MENU_LEVEL, MENU_PLAN } from '../game/menuPlan';
import { parseSave, freshSave, recordResult, isUnlocked, totalStars } from '../state/save';

describe('gardens', () => {
  it('has 24 uniquely named gardens, 8 per season, each with three buds', () => {
    expect(LEVELS).toHaveLength(24);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    CHAPTERS.forEach((_, c) => expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8));
    for (const l of LEVELS) { expect(l.buds).toHaveLength(3); for (const b of l.buds) { expect(b.x).toBeGreaterThan(20); expect(b.x).toBeLessThan(W - 20); } }
  });
  it('introduces thorns in summer and wind in autumn', () => {
    expect(LEVELS.filter((l) => l.chapter === 0).every((l) => l.thorns.length === 0 && l.winds.length === 0)).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 1).some((l) => l.thorns.length > 0)).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 2).some((l) => l.winds.length > 0)).toBe(true);
  });
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s can be climbed with every bud in bloom, deciding only every 0.15 s', (_id, l) => {
    const sol = solve(l);
    expect(sol).not.toBeNull();
    const { result } = replay(l, sol!.plan);
    expect(result.success).toBe(true);
    expect(result.stars).toBe(3);
  });
  it('the title screen climb still works', () => {
    const { result } = replay(MENU_LEVEL, MENU_PLAN);
    expect(result.success).toBe(true);
  });
});

describe('growth', () => {
  it('grows toward the sun when untouched and never points more than 100° from up', () => {
    const l = LEVELS[0];
    const s = createSim(l);
    for (let i = 0; i < 240; i++) step(l, s, Math.PI); // steering straight down is clamped
    expect(Math.abs(s.heading)).toBeLessThanOrEqual(MAX_LEAN + 1e-9);
    const t = createSim(l);
    for (let i = 0; i < 120; i++) step(l, t, null);
    expect(t.x).toBeCloseTo(l.start, 5);
    expect(t.y).toBeLessThan(l.height - 20);
  });
  it('bends toward the finger', () => {
    const l = LEVELS[0];
    const s = createSim(l);
    for (let i = 0; i < 60; i++) step(l, s, headingTo(s, s.x + 100, s.y - 50));
    expect(s.x).toBeGreaterThan(l.start + 5);
  });
  it('stops at stone and scores nothing', () => {
    const l = LEVELS[0];
    const s = createSim(l);
    while (s.outcome === 'growing') step(l, s, 1.6);
    expect(s.outcome).toBe('stone');
    expect(score(l, s).success).toBe(false);
  });
});

describe('save', () => {
  it('survives garbage and keeps the best climb', () => {
    for (const raw of [null, '', '{', 'null', '[]', '{"v":9}', '{"v":1,"paths":{"spring-1":[[1]]}}']) expect(parseSave(raw)).toEqual(expect.objectContaining({ v: 1 }));
    expect(parseSave('{"v":1,"paths":{"spring-1":[[1]]}}').paths['spring-1']).toBeUndefined();
    let s = freshSave();
    s = recordResult(s, 'spring-1', 2, [[1, 2]]);
    s = recordResult(s, 'spring-1', 1, [[3, 4]]);
    expect(s.stars['spring-1']).toBe(2); expect(s.paths['spring-1']).toEqual([[1, 2]]);
    expect(isUnlocked(s, 1)).toBe(true); expect(totalStars(s)).toBe(2);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
});
