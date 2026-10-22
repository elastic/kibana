/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toDurationVital, toScoreVital, vitalStatsAggs } from './web_vitals';

const percentiles = (entries: Array<[number, number | null]>) => ({
  values: entries.map(([key, value]) => ({ key, value })),
});

describe('vitalStatsAggs', () => {
  it("asks for the p75 and the percentile ranks at the vital's thresholds", () => {
    expect(vitalStatsAggs('lcp.field', 'lcp')).toEqual({
      p75: { percentiles: { field: 'lcp.field', percents: [75], keyed: false } },
      ranks: { percentile_ranks: { field: 'lcp.field', values: [2500, 4000], keyed: false } },
    });
  });
});

describe('toDurationVital', () => {
  it('turns the percentile ranks into rating shares', () => {
    const vital = toDurationVital(
      {
        doc_count: 10,
        p75: percentiles([[75, 3100]]),
        ranks: percentiles([
          [2500, 60],
          [4000, 90],
        ]),
      },
      'lcp'
    );

    expect(vital.p75Ms).toBe(3100);
    expect(vital.sampleCount).toBe(10);
    expect(vital.ratings?.good).toBeCloseTo(0.6);
    expect(vital.ratings?.needsImprovement).toBeCloseTo(0.3);
    expect(vital.ratings?.poor).toBeCloseTo(0.1);
  });

  it('keeps the shares between 0 and 1 when the estimates overshoot', () => {
    const { ratings } = toDurationVital(
      {
        doc_count: 1,
        p75: percentiles([[75, 100]]),
        ranks: percentiles([
          [800, 100.4],
          [1800, 100],
        ]),
      },
      'ttfb'
    );

    expect(ratings).toEqual({ good: 1, needsImprovement: 0, poor: 0 });
  });

  it('has no ratings without samples', () => {
    expect(
      toDurationVital({ doc_count: 0, p75: percentiles([]), ranks: percentiles([]) }, 'inp')
    ).toEqual({ p75Ms: null, sampleCount: 0, ratings: null });
  });
});

describe('toScoreVital', () => {
  it('rates CLS against its unitless thresholds', () => {
    const { p75, ratings } = toScoreVital(
      {
        doc_count: 4,
        p75: percentiles([[75, 0.05]]),
        ranks: percentiles([
          [0.1, 100],
          [0.25, 100],
        ]),
      },
      'cls'
    );

    expect(p75).toBe(0.05);
    expect(ratings).toEqual({ good: 1, needsImprovement: 0, poor: 0 });
  });
});
