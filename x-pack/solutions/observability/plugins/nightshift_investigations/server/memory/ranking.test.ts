/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLD_START_PRIOR,
  DECAY_LAMBDA,
  HALF_LIFE_SEC,
  RANKING_EPS,
  applyUpdate,
  applyUpdates,
  betaQuantile,
  calculateConfidence,
  conversionRate,
  decayCounters,
  decayValue,
  displayTelemetry,
  greedyRank,
  greedyScore,
  posteriorShape,
  rankForMode,
  thompsonRank,
  toCounterUpdates,
  type CounterState,
  type SampleBeta,
} from './ranking';

const t0 = 1_000_000;
const zero: CounterState = { impressions: 0, conversions: 0, lastTime: t0 };

describe('decay', () => {
  it('is the identity at Δt = 0', () => {
    expect(decayValue(10, t0, t0)).toBe(10);
    const decayed = decayCounters({ impressions: 10, conversions: 3, lastTime: t0 }, t0);
    expect(decayed.impressions).toBe(10);
    expect(decayed.conversions).toBe(3);
  });

  it('halves both counters after one half-life (7 days)', () => {
    expect(decayValue(10, t0, t0 + HALF_LIFE_SEC)).toBeCloseTo(5, 12);
    expect(decayValue(3, t0, t0 + HALF_LIFE_SEC)).toBeCloseTo(1.5, 12);
  });

  it('quarters both counters after two half-lives (14 days)', () => {
    expect(decayValue(10, t0, t0 + 2 * HALF_LIFE_SEC)).toBeCloseTo(2.5, 12);
  });

  it('clamps negative Δt (clock skew) to 0', () => {
    expect(decayValue(10, t0, t0 - 60)).toBe(10);
  });

  it('matches λ = ln(2) / τ', () => {
    expect(DECAY_LAMBDA).toBeCloseTo(Math.log(2) / HALF_LIFE_SEC, 15);
    expect(decayValue(1, 0, 86400)).toBeCloseTo(Math.exp(-DECAY_LAMBDA * 86400), 12);
  });

  it('does not rewrite lastTime on read', () => {
    const decayed = decayCounters(
      { impressions: 8, conversions: 2, lastTime: t0 },
      t0 + HALF_LIFE_SEC
    );
    expect(decayed.lastTime).toBe(t0);
    expect(decayed.impressions).toBeCloseTo(4, 12);
  });
});

describe('applyUpdate', () => {
  it('advances lastTime to the injected now', () => {
    const updated = applyUpdate({ impressions: 8, conversions: 2, lastTime: t0 }, t0 + 10, 1, 0);
    expect(updated.lastTime).toBe(t0 + 10);
  });

  it('decays then adds: (10, 3) + useful after 7d → (6, 2.5)', () => {
    const updated = applyUpdate(
      { impressions: 10, conversions: 3, lastTime: t0 },
      t0 + HALF_LIFE_SEC,
      1,
      1
    );
    expect(updated.impressions).toBeCloseTo(6, 12);
    expect(updated.conversions).toBeCloseTo(2.5, 12);
    expect(conversionRate(updated.impressions, updated.conversions)).toBeCloseTo(2.5 / 6, 12);
  });

  it('useful on a cold counter is imp=1 conv=1 cr=1', () => {
    const updated = applyUpdate(zero, t0, 1, 1);
    expect(updated).toEqual({ impressions: 1, conversions: 1, lastTime: t0 });
    expect(conversionRate(updated.impressions, updated.conversions)).toBe(1);
  });

  it('unrelated on a cold counter is imp=1 conv=0 cr=0', () => {
    const updated = applyUpdate(zero, t0, 1, 0);
    expect(updated).toEqual({ impressions: 1, conversions: 0, lastTime: t0 });
    expect(conversionRate(updated.impressions, updated.conversions)).toBe(0);
  });

  it('useful then unrelated 1ms later is ~2 imp and ~1 conv', () => {
    const afterUseful = applyUpdate(zero, t0, 1, 1);
    const afterUnrelated = applyUpdate(afterUseful, t0 + 0.001, 1, 0);
    expect(afterUnrelated.impressions).toBeCloseTo(2, 6);
    expect(afterUnrelated.conversions).toBeCloseTo(1, 6);
    expect(afterUnrelated.conversions).toBeLessThanOrEqual(afterUnrelated.impressions);
    expect(conversionRate(afterUnrelated.impressions, afterUnrelated.conversions)).toBeCloseTo(
      0.5,
      5
    );
  });
});

describe('toCounterUpdates', () => {
  it('emits +1/+1 for useful and +1/+0 for unrelated; harmful is archived only', () => {
    const { archiveIds, updates } = toCounterUpdates({
      impressionIds: ['c', 'a', 'b', 'd'],
      usefulIds: ['b', 'z-not-shown'],
      harmfulIds: ['d'],
    });

    expect(archiveIds).toEqual(['d']);
    expect(updates).toEqual([
      { id: 'a', addImp: 1, addConv: 0 },
      { id: 'b', addImp: 1, addConv: 1 },
      { id: 'c', addImp: 1, addConv: 0 },
    ]);
  });

  it('lets harmful win when an id is both useful and harmful', () => {
    const { archiveIds, updates } = toCounterUpdates({
      impressionIds: ['x'],
      usefulIds: ['x'],
      harmfulIds: ['x'],
    });
    expect(archiveIds).toEqual(['x']);
    expect(updates).toEqual([]);
  });

  it('never produces conv > imp for a useful row', () => {
    const { updates } = toCounterUpdates({
      impressionIds: ['only'],
      usefulIds: ['only'],
      harmfulIds: [],
    });
    expect(updates[0].addConv).toBeLessThanOrEqual(updates[0].addImp);
  });
});

describe('applyUpdates', () => {
  it('uses one shared now and is deterministic under input permutation', () => {
    const now = t0 + 42;
    const current = {
      a: { impressions: 4, conversions: 1, lastTime: t0 },
      b: { impressions: 2, conversions: 2, lastTime: t0 },
    };
    const forward = applyUpdates(
      current,
      [
        { id: 'b', addImp: 1, addConv: 0 },
        { id: 'a', addImp: 1, addConv: 1 },
      ],
      now
    );
    const reversed = applyUpdates(
      current,
      [
        { id: 'a', addImp: 1, addConv: 1 },
        { id: 'b', addImp: 1, addConv: 0 },
      ],
      now
    );

    expect(forward.a.lastTime).toBe(now);
    expect(forward.b.lastTime).toBe(now);
    expect(reversed.a.lastTime).toBe(now);
    expect(forward.a.impressions).toBeCloseTo(reversed.a.impressions, 12);
    expect(forward.b.conversions).toBeCloseTo(reversed.b.conversions, 12);
  });

  it('sums duplicate ids before decaying once', () => {
    const updated = applyUpdates(
      { a: zero },
      [
        { id: 'a', addImp: 1, addConv: 1 },
        { id: 'a', addImp: 1, addConv: 0 },
      ],
      t0
    );
    expect(updated.a).toEqual({ impressions: 2, conversions: 1, lastTime: t0 });
  });

  it('treats missing ids as (0, 0) at now', () => {
    const updated = applyUpdates({}, [{ id: 'new', addImp: 1, addConv: 1 }], t0);
    expect(updated.new).toEqual({ impressions: 1, conversions: 1, lastTime: t0 });
  });
});

describe('greedy ranking', () => {
  it('ranks (k=9, n=10) above (k=1, n=2) with Beta(1,1)', () => {
    expect(greedyScore(10, 9)).toBeCloseTo(10 / 12, 12);
    expect(greedyScore(2, 1)).toBeCloseTo(0.5, 12);
    expect(
      greedyRank([
        { id: 'weak', impressions: 2, conversions: 1 },
        { id: 'strong', impressions: 10, conversions: 9 },
      ])
    ).toEqual(['strong', 'weak']);
  });

  it('scores an unused arm at α0/(α0+β0) = 0.5', () => {
    expect(greedyScore(0, 0)).toBe(0.5);
    expect(COLD_START_PRIOR).toEqual({ alpha0: 1, beta0: 1 });
  });
});

describe('Thompson ranking', () => {
  it('orders by injected Beta samples, not by conversion rate', () => {
    const samples = [0.1, 0.9, 0.5];
    const sampleBeta: SampleBeta = () => samples.shift() ?? 0;
    expect(
      thompsonRank(
        [
          { id: 'a', impressions: 100, conversions: 99 },
          { id: 'b', impressions: 1, conversions: 0 },
          { id: 'c', impressions: 10, conversions: 1 },
        ],
        { sampleBeta }
      )
    ).toEqual(['b', 'c', 'a']);
  });

  it('clamps Beta shapes to ε when conversions exceed impressions', () => {
    const seen: Array<{ alpha: number; beta: number }> = [];
    const sampleBeta: SampleBeta = (alpha, beta) => {
      seen.push({ alpha, beta });
      return 0.5;
    };
    thompsonRank([{ id: 'bad', impressions: 1, conversions: 9 }], { sampleBeta });
    expect(seen).toEqual([{ alpha: 1 + 9, beta: RANKING_EPS }]);
  });
});

describe('rankForMode', () => {
  const states = {
    a: { impressions: 10, conversions: 9 },
    b: { impressions: 10, conversions: 1 },
    c: { impressions: 0, conversions: 0 },
  };

  it('search returns input order and does not sample', () => {
    const sampleBeta = jest.fn(() => 0.99);
    expect(
      rankForMode({
        mode: 'search',
        ids: ['c', 'a', 'b'],
        states,
        sampleBeta,
      })
    ).toEqual(['c', 'a', 'b']);
    expect(sampleBeta).not.toHaveBeenCalled();
  });

  it('browse + greedy uses posterior means', () => {
    expect(
      rankForMode({
        mode: 'browse',
        ids: ['c', 'b', 'a'],
        states,
        browseRanker: 'greedy',
      })
    ).toEqual(['a', 'c', 'b']);
  });

  it('browse + thompson uses the sampler', () => {
    const sampleBeta = jest
      .fn()
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.1);
    expect(
      rankForMode({
        mode: 'browse',
        ids: ['a', 'b', 'c'],
        states,
        browseRanker: 'thompson',
        sampleBeta,
      })
    ).toEqual(['b', 'a', 'c']);
    expect(sampleBeta).toHaveBeenCalledTimes(3);
  });
});

describe('confidence', () => {
  it('is 0 when impressions are 0', () => {
    expect(calculateConfidence(0, 0)).toBe(0);
    expect(calculateConfidence(0, 5)).toBe(0);
  });

  it('rises as n grows at cr ≈ 0.5 (SciPy beta.ppf goldens)', () => {
    // scipy.stats.beta.ppf with α0=β0=1: max(0, 1 - (ppf(0.975)-ppf(0.025)))
    expect(calculateConfidence(1, 0)).toBeCloseTo(0.170693000102, 5);
    expect(calculateConfidence(1, 1)).toBeCloseTo(0.170693000102, 5);
    expect(calculateConfidence(2, 1)).toBeCloseTo(0.1885986481, 5);
    expect(calculateConfidence(10, 5)).toBeCloseTo(0.467587195319, 5);
    expect(calculateConfidence(50, 25)).toBeCloseTo(0.731914279342, 5);
    expect(calculateConfidence(100, 50)).toBeCloseTo(0.807286135019, 5);
    expect(calculateConfidence(1000, 500)).toBeCloseTo(0.938126279763, 4);
  });

  it('is higher at n=100 than at n=1', () => {
    expect(calculateConfidence(100, 50)).toBeGreaterThan(calculateConfidence(1, 0));
  });
});

describe('displayTelemetry', () => {
  it('decays for display without rewriting lastTime', () => {
    const shown = displayTelemetry(
      { impressions: 10, conversions: 4, lastTime: t0 },
      t0 + HALF_LIFE_SEC
    );
    expect(shown.lastTime).toBe(t0);
    expect(shown.impressions).toBeCloseTo(5, 12);
    expect(shown.conversions).toBeCloseTo(2, 12);
    expect(shown.conversionRate).toBeCloseTo(0.4, 12);
  });
});

describe('posteriorShape', () => {
  it('uses the frozen cold-start prior', () => {
    expect(posteriorShape(0, 0)).toEqual({ alpha: 1, beta: 1 });
    expect(posteriorShape(10, 3)).toEqual({ alpha: 4, beta: 8 });
  });
});

describe('betaQuantile', () => {
  it('matches Uniform(0,1) = Beta(1,1) quantiles', () => {
    expect(betaQuantile(0.025, 1, 1)).toBeCloseTo(0.025, 6);
    expect(betaQuantile(0.975, 1, 1)).toBeCloseTo(0.975, 6);
  });
});
