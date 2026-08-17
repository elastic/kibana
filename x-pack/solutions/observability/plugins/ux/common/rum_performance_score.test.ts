/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RUM_PERFORMANCE_VITALS,
  rumPerformanceScore,
  rumPerformanceScoreBand,
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
    expect(broken).toBeLessThan(Number(clean));
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
});

describe('rumPerformanceScoreBand', () => {
  it('maps the Sentry-style bands', () => {
    expect(rumPerformanceScoreBand(90)).toBe('success');
    expect(rumPerformanceScoreBand(89)).toBe('warning');
    expect(rumPerformanceScoreBand(50)).toBe('warning');
    expect(rumPerformanceScoreBand(49)).toBe('danger');
  });
});
