/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toDurationVital, toScoreVital, toWebVitals, vitalStatsAggs } from './web_vitals';

const percentiles = (entries: Array<[number, number | null]>) => ({
  values: entries.map(([key, value]) => ({ key, value })),
});

const vitalAggregation = (
  samples: number,
  p75: number | null,
  upToGood: number,
  upToNeedsImprovement: number
) => ({
  doc_count: samples,
  p75: percentiles(p75 === null ? [] : [[75, p75]]),
  upToGood: { doc_count: upToGood },
  upToNeedsImprovement: { doc_count: upToNeedsImprovement },
});

describe('vitalStatsAggs', () => {
  it("asks for the p75 and the samples up to the vital's thresholds, inclusive", () => {
    expect(vitalStatsAggs('lcp.field', 'lcp')).toEqual({
      p75: { percentiles: { field: 'lcp.field', percents: [75], keyed: false } },
      upToGood: { filter: { range: { 'lcp.field': { lte: 2500 } } } },
      upToNeedsImprovement: { filter: { range: { 'lcp.field': { lte: 4000 } } } },
    });
  });

  it('uses the unitless CLS thresholds', () => {
    expect(vitalStatsAggs('cls.field', 'cls')).toMatchObject({
      upToGood: { filter: { range: { 'cls.field': { lte: 0.1 } } } },
      upToNeedsImprovement: { filter: { range: { 'cls.field': { lte: 0.25 } } } },
    });
  });
});

describe('toDurationVital', () => {
  it('turns the sample counts into rating shares', () => {
    const vital = toDurationVital(vitalAggregation(10, 3100, 6, 9));

    expect(vital.p75Ms).toBe(3100);
    expect(vital.sampleCount).toBe(10);
    expect(vital.ratings?.good).toBeCloseTo(0.6);
    expect(vital.ratings?.needsImprovement).toBeCloseTo(0.3);
    expect(vital.ratings?.poor).toBeCloseTo(0.1);
  });

  it('has no ratings without samples', () => {
    expect(toDurationVital(vitalAggregation(0, null, 0, 0))).toEqual({
      p75Ms: null,
      sampleCount: 0,
      ratings: null,
    });
  });
});

describe('toScoreVital', () => {
  it('rates every sample up to the good threshold as good', () => {
    const { p75, ratings } = toScoreVital(vitalAggregation(4, 0.05, 4, 4));

    expect(p75).toBe(0.05);
    expect(ratings).toEqual({ good: 1, needsImprovement: 0, poor: 0 });
  });
});

describe('toWebVitals', () => {
  it('reads each vital from its aggregation, CLS as a score', () => {
    const duration = vitalAggregation(10, 3100, 6, 9);
    const score = vitalAggregation(4, 0.05, 4, 4);

    expect(
      toWebVitals({ lcp: duration, inp: duration, cls: score, fcp: duration, ttfb: duration })
    ).toEqual({
      lcp: toDurationVital(duration),
      inp: toDurationVital(duration),
      cls: toScoreVital(score),
      fcp: toDurationVital(duration),
      ttfb: toDurationVital(duration),
    });
  });
});
