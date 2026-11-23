/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebVitals } from '../../../../../common/types/applications';
import { toRanks, toUxMetrics } from './to_ux_metrics';

const NO_VITAL = { p75Ms: null, sampleCount: 0, ratings: null };

const NO_SCORE_VITAL = { p75: null, sampleCount: 0, ratings: null };

const WEB_VITALS: WebVitals = {
  lcp: { p75Ms: 2412.5, sampleCount: 10, ratings: { good: 0.8, needsImprovement: 0.1, poor: 0.1 } },
  inp: { p75Ms: 180.25, sampleCount: 4, ratings: { good: 1, needsImprovement: 0, poor: 0 } },
  cls: { p75: 0.045, sampleCount: 4, ratings: { good: 0.5, needsImprovement: 0.25, poor: 0.25 } },
  fcp: { p75Ms: 1500.5, sampleCount: 10, ratings: { good: 1, needsImprovement: 0, poor: 0 } },
  ttfb: NO_VITAL,
};

describe('toRanks', () => {
  it('turns the shares into percentages in good, needs-improvement and poor order', () => {
    expect(toRanks({ good: 0.8, needsImprovement: 0.1, poor: 0.1 })).toEqual([80, 10, 10]);
  });

  it('always adds up to 100, whatever the rounding', () => {
    const ranks = toRanks({ good: 1 / 3, needsImprovement: 1 / 3, poor: 1 / 3 });

    expect(ranks).toEqual([33, 34, 33]);
    expect(ranks?.reduce((total, rank) => total + rank, 0)).toBe(100);
    expect(toRanks({ good: 0.505, needsImprovement: 0.495, poor: 0 })).toEqual([51, 49, 0]);
  });

  it('has no percentages without samples, so the vital shows no data instead of being all good', () => {
    expect(toRanks(null)).toBeUndefined();
  });
});

describe('toUxMetrics', () => {
  it('passes the milliseconds of LCP and INP and the unitless CLS through', () => {
    expect(toUxMetrics(WEB_VITALS)).toEqual({
      lcp: 2412.5,
      lcpRanks: [80, 10, 10],
      inp: 180.25,
      inpRanks: [100, 0, 0],
      cls: 0.045,
      clsRanks: [50, 25, 25],
    });
  });

  it('keeps a missing percentile missing', () => {
    expect(toUxMetrics({ ...WEB_VITALS, lcp: NO_VITAL, cls: NO_SCORE_VITAL })).toEqual(
      expect.objectContaining({ lcp: null, lcpRanks: undefined, cls: null, clsRanks: undefined })
    );
  });
});
