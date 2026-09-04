/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RUM_PERFORMANCE_VITALS,
  rumApdexFromRanks,
  rumPerformanceScore,
  rumPerformanceScoreBand,
  rumPerformanceScoreBreakdown,
  rumScoreGaps,
  rumScoreStrengths,
  rumVitalScore,
} from './rum_performance_score';

const { lcp } = RUM_PERFORMANCE_VITALS;

describe('rumVitalScore', () => {
  it('is ~90 at p10 and ~50 at p50', () => {
    expect(rumVitalScore(lcp.p10, lcp.p10, lcp.p50)).toBeCloseTo(90, 0);
    expect(rumVitalScore(lcp.p50, lcp.p10, lcp.p50)).toBeCloseTo(50, 0);
  });

  it('is monotonic: faster vitals score higher', () => {
    const fast = rumVitalScore(1200, lcp.p10, lcp.p50);
    const good = rumVitalScore(lcp.p10, lcp.p10, lcp.p50);
    const mid = rumVitalScore(lcp.p50, lcp.p10, lcp.p50);
    const slow = rumVitalScore(8000, lcp.p10, lcp.p50);
    expect(fast).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(slow);
  });

  it('treats zero as a perfect score', () => {
    expect(rumVitalScore(0, 0.1, 0.25)).toBe(100);
  });
});

describe('rumApdexFromRanks', () => {
  it('gives full credit to good and half to needs-improvement', () => {
    expect(rumApdexFromRanks({ good: 100, ni: 0 })).toBe(100);
    expect(rumApdexFromRanks({ good: 0, ni: 100 })).toBe(50);
    expect(rumApdexFromRanks({ good: 0, ni: 0 })).toBe(0);
    expect(rumApdexFromRanks({ good: 70, ni: 20 })).toBe(80);
  });
});

describe('rumPerformanceScore', () => {
  it('returns null when every vital is missing', () => {
    expect(rumPerformanceScore({})).toBeNull();
    expect(
      rumPerformanceScore({
        lcp: null,
        inp: null,
        cls: null,
        fcp: null,
        ttfb: null,
        errorRate: null,
      })
    ).toBeNull();
  });

  it('scores error-only apps as 100 minus the frustrated share', () => {
    expect(rumPerformanceScore({ errorRate: 0 })).toBe(100);
    expect(rumPerformanceScore({ errorRate: 0.25 })).toBe(75);
    expect(rumPerformanceScore({ errorRate: 1 })).toBe(0);
  });

  it('lets error rate pull a strong vitals score down', () => {
    const vitals = {
      lcp: RUM_PERFORMANCE_VITALS.lcp.p10,
      inp: RUM_PERFORMANCE_VITALS.inp.p10,
    };
    const clean = rumPerformanceScore({ ...vitals, errorRate: 0 });
    const broken = rumPerformanceScore({ ...vitals, errorRate: 0.2 });
    expect(clean).toEqual(expect.any(Number));
    expect(broken).toEqual(expect.any(Number));
    expect(clean).toBeGreaterThan(80);
    expect(broken).toBe(Math.round(Number(clean) * 0.8));
  });

  it('renormalizes weights when only some vitals are present', () => {
    const lcpOnly = rumPerformanceScore({ lcp: lcp.p10 });
    expect(lcpOnly).toBe(Math.round(rumVitalScore(lcp.p10, lcp.p10, lcp.p50)));
  });

  it('weights LCP and INP equally when both sit on the same band point', () => {
    expect(
      rumPerformanceScore({
        lcp: RUM_PERFORMANCE_VITALS.lcp.p50,
        inp: RUM_PERFORMANCE_VITALS.inp.p50,
      })
    ).toBe(50);
  });

  it('prefers Apdex-from-ranks over p75 when both exist', () => {
    expect(
      rumPerformanceScore({
        lcp: 8000,
        ranks: { lcp: { good: 80, ni: 20, poor: 0 } },
      })
    ).toBe(90);
  });

  it('multiplies Apdex ranks by the non-error share', () => {
    expect(
      rumPerformanceScore({
        ranks: { lcp: { good: 100, ni: 0, poor: 0 } },
        errorRate: 0.2,
      })
    ).toBe(80);
  });
});

describe('rumPerformanceScoreBand', () => {
  it('maps the Sentry-style bands', () => {
    expect(rumPerformanceScoreBand(90)).toBe('success');
    expect(rumPerformanceScoreBand(89)).toBe('warning');
    expect(rumPerformanceScoreBand(50)).toBe('warning');
    expect(rumPerformanceScoreBand(49)).toBe('danger');
  });
});

describe('rumPerformanceScoreBreakdown', () => {
  it('explains weighted vitals, the error penalty, and what to fix first', () => {
    const breakdown = rumPerformanceScoreBreakdown({
      ranks: {
        lcp: { good: 40, ni: 20, poor: 40 },
        inp: { good: 100, ni: 0, poor: 0 },
      },
      errorRate: 0.2,
    });
    expect(breakdown).not.toBeNull();
    if (breakdown == null) {
      return;
    }
    expect(breakdown.vitals).toHaveLength(2);
    expect(breakdown.vitals.find((vital) => vital.name === 'lcp')).toMatchObject({
      method: 'ranks',
      score: 50,
    });
    expect(breakdown.vitals.find((vital) => vital.name === 'inp')).toMatchObject({
      method: 'ranks',
      score: 100,
    });
    expect(rumScoreStrengths(breakdown)).toEqual([
      expect.objectContaining({ name: 'inp', score: 100 }),
    ]);
    const gaps = rumScoreGaps(breakdown);
    expect(gaps[0]).toMatchObject({ kind: 'vital', name: 'lcp' });
    expect(gaps.some((gap) => gap.kind === 'error')).toBe(true);
    expect(breakdown.missing).toEqual(['cls', 'fcp', 'ttfb']);
  });
});
