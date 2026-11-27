/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { areDistinguishable, computeScoreStats, pairedDeltas } from './score_stats';

describe('computeScoreStats', () => {
  it('computes mean/std/CI over scored values and counts N/A separately', () => {
    const s = computeScoreStats([1, 1, 0, null, 0.5]);
    expect(s.n).toBe(4);
    expect(s.naCount).toBe(1);
    expect(s.mean).toBeCloseTo(0.625, 5);
    expect(s.std).toBeCloseTo(0.479, 2);
    expect(s.ci95).toBeCloseTo((1.96 * s.std) / 2, 5);
    expect(s.saturated).toBe(false);
  });

  it('flags an evaluator pinned at 1.0 as saturated — no discriminating signal', () => {
    const s = computeScoreStats([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(s.saturated).toBe(true);
  });

  it('flags an evaluator pinned at 0 as saturated', () => {
    expect(computeScoreStats([0, 0, 0]).saturated).toBe(true);
  });

  it('does not flag a constant mid-range score as saturated', () => {
    // 0.5 everywhere is suspicious for other reasons, but it is not "all pass".
    expect(computeScoreStats([0.5, 0.5, 0.5]).saturated).toBe(false);
  });

  it('reports n=0 without throwing on an all-N/A evaluator', () => {
    const s = computeScoreStats([null, null]);
    expect(s.n).toBe(0);
    expect(s.naCount).toBe(2);
    expect(Number.isNaN(s.mean)).toBe(true);
  });
});

describe('areDistinguishable', () => {
  it('marks the observed 459-vs-461 golden MITRE swing as noise, not signal', () => {
    // Actual dataset means from builds 459 and 461 (same model, same code):
    // 0.83 vs 0.74, per-example F1 spread within each run. A single-value
    // array carries no variance, so represent the nine scored examples.
    const a = computeScoreStats([1, 1, 1, 1, 0.83, 0.83, 0.67, 0.67, 0.5]);
    const b = computeScoreStats([1, 0.83, 0.83, 0.75, 0.67, 0.67, 0.67, 0.5, 0.75]);
    const r = areDistinguishable(a, b);
    expect(r.distinguishable).toBe(false);
    expect(r.note).toContain('not resolvable');
  });

  it('marks a gap larger than the combined CI as distinguishable', () => {
    const a = computeScoreStats([1, 1, 1, 1, 1, 1, 0.8, 0.8, 0.8]);
    const b = computeScoreStats([0, 0, 0, 0.2, 0.2, 0.2, 0.3, 0.3, 0.1]);
    expect(areDistinguishable(a, b).distinguishable).toBe(true);
  });
});

describe('pairedDeltas', () => {
  it('pairs per-example scores and skips examples missing on either arm', () => {
    const a = new Map([
      ['ex-1', 1],
      ['ex-2', 0],
      ['ex-3', 1],
      ['ex-4', null],
    ]);
    const b = new Map([
      ['ex-1', 0.5],
      ['ex-2', 0],
      ['ex-3', null],
      ['ex-5', 1],
    ]);
    const r = pairedDeltas(a, b);
    expect(r.pairedIds).toEqual(['ex-1', 'ex-2']);
    expect(r.deltas).toEqual([0.5, 0]);
    expect(r.skippedIds).toEqual(['ex-3', 'ex-4']);
  });
});
