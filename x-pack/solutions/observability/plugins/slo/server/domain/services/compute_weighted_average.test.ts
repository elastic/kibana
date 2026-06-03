/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeWeightedSli, computeNormalisedWeights, NO_DATA } from './compute_weighted_average';

describe('computeWeightedSli', () => {
  it('computes weighted average from data points with equal weights', () => {
    const result = computeWeightedSli(
      [
        { weight: 1, sliValue: 0.99 },
        { weight: 1, sliValue: 0.98 },
      ],
      { target: 0.99 }
    );

    expect(result.sliValue).toBeCloseTo(0.985, 4);
    // consumed = (1 - 0.985) / 0.01 = 1.5 → remaining < 0 → VIOLATED
    expect(result.status).toBe('VIOLATED');
  });

  it('computes weighted average with unequal weights', () => {
    const result = computeWeightedSli(
      [
        { weight: 3, sliValue: 0.99 },
        { weight: 7, sliValue: 0.995 },
      ],
      { target: 0.99 }
    );

    // (3*0.99 + 7*0.995) / 10 = (2.97 + 6.965) / 10 = 0.9935
    expect(result.sliValue).toBeCloseTo(0.9935, 4);
    expect(result.status).toBe('HEALTHY');
  });

  it('computes error budget from composite target', () => {
    const result = computeWeightedSli([{ weight: 1, sliValue: 0.995 }], { target: 0.99 });

    // initial = 0.01, consumed = (1 - 0.995) / 0.01 = 0.5, remaining = 0.5
    expect(result.errorBudget.initial).toBeCloseTo(0.01, 4);
    expect(result.errorBudget.consumed).toBeCloseTo(0.5, 4);
    expect(result.errorBudget.remaining).toBeCloseTo(0.5, 4);
  });

  it('returns NO_DATA when all data points have NO_DATA', () => {
    const result = computeWeightedSli(
      [
        { weight: 1, sliValue: NO_DATA },
        { weight: 2, sliValue: NO_DATA },
      ],
      { target: 0.99 }
    );

    expect(result.sliValue).toBe(NO_DATA);
    expect(result.status).toBe('NO_DATA');
    expect(result.errorBudget.initial).toBe(0);
  });

  it('returns NO_DATA when data points array is empty', () => {
    const result = computeWeightedSli([], { target: 0.99 });

    expect(result.sliValue).toBe(NO_DATA);
    expect(result.status).toBe('NO_DATA');
  });

  it('skips NO_DATA members and re-normalises weights', () => {
    const result = computeWeightedSli(
      [
        { weight: 3, sliValue: 0.995 },
        { weight: 7, sliValue: NO_DATA },
      ],
      { target: 0.99 }
    );

    // Only first member participates: totalWeight = 3, sli = 3 * 0.995 / 3 = 0.995
    expect(result.sliValue).toBeCloseTo(0.995, 4);
  });

  it('returns VIOLATED when SLI is well below target', () => {
    const result = computeWeightedSli([{ weight: 1, sliValue: 0.95 }], { target: 0.999 });

    // consumed = (1 - 0.95) / 0.001 = 50, remaining = 1 - 50 = -49
    expect(result.status).toBe('VIOLATED');
    expect(result.errorBudget.remaining).toBeLessThan(0);
  });

  it('handles target of 1.0 without division by zero', () => {
    const result = computeWeightedSli([{ weight: 1, sliValue: 0.999 }], { target: 1.0 });

    // initialErrorBudget = 0, so consumedErrorBudget is guarded to 0
    expect(result.sliValue).toBeCloseTo(0.999, 4);
    expect(result.errorBudget.consumed).toBe(0);
    expect(Number.isFinite(result.errorBudget.remaining)).toBe(true);
  });

  it('handles negative SLI values by clamping consumed budget to 0', () => {
    const result = computeWeightedSli([{ weight: 1, sliValue: -0.5 }], { target: 0.99 });

    expect(result.errorBudget.consumed).toBe(0);
  });
});

describe('computeNormalisedWeights', () => {
  it('normalises weights among active data points', () => {
    const weights = computeNormalisedWeights([
      { weight: 6, sliValue: 0.99 },
      { weight: 4, sliValue: 0.98 },
    ]);

    expect(weights[0]).toBeCloseTo(0.6, 4);
    expect(weights[1]).toBeCloseTo(0.4, 4);
  });

  it('assigns 0 weight to NO_DATA members', () => {
    const weights = computeNormalisedWeights([
      { weight: 3, sliValue: 0.99 },
      { weight: 7, sliValue: NO_DATA },
    ]);

    expect(weights[0]).toBe(1);
    expect(weights[1]).toBe(0);
  });

  it('returns all zeros when every member is NO_DATA', () => {
    const weights = computeNormalisedWeights([
      { weight: 5, sliValue: NO_DATA },
      { weight: 5, sliValue: NO_DATA },
    ]);

    expect(weights).toEqual([0, 0]);
  });

  it('handles single member', () => {
    const weights = computeNormalisedWeights([{ weight: 42, sliValue: 0.999 }]);

    expect(weights).toEqual([1]);
  });
});
