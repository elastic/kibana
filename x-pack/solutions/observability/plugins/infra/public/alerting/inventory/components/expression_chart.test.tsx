/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The component applies headroom multipliers to the output of calculateDomain:
 *
 *   max: Math.max(dataDomain.max, last(thresholds) || dataDomain.max) * 1.1
 *   min: Math.min(dataDomain.min, first(thresholds) || dataDomain.min) * 0.9
 *
 * For negative data, `* 0.9` moves min toward zero while `* 1.1` moves max
 * further negative, which can produce max < min and throw:
 *   Error: [Axis values]: custom domain is invalid, min is greater than max
 */

const first = <T>(arr: T[]): T | undefined => arr[0];
const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

/** Mirrors expression_chart.tsx:151-158 verbatim */
function buildDomain(
  dataDomain: { min: number; max: number },
  thresholds: number[]
): { min: number; max: number } {
  const domain = {
    max: Math.max(dataDomain.max, last(thresholds) || dataDomain.max) * 1.1,
    min: Math.min(dataDomain.min, first(thresholds) || dataDomain.min) * 0.9,
  };
  if (domain.min === first(thresholds)) {
    domain.min = domain.min * 0.9;
  }
  return domain;
}

describe('expression_chart.tsx — chart domain for negative data', () => {
  it('produces a valid domain (max >= min) for a flat negative series with no thresholds', () => {
    // calculateDomain returns { min: -5, max: -5 } for a flat negative series.
    const domain = buildDomain({ min: -5, max: -5 }, []);
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain for a negative series when the threshold is zero (falsy)', () => {
    // A zero threshold is falsy, so `last(thresholds) || dataDomain.max` silently
    // falls back to dataDomain.max, leaving the negative max to be multiplied by 1.1.
    const domain = buildDomain({ min: -1, max: -1 }, [0]);
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain for a negative range with no thresholds', () => {
    const domain = buildDomain({ min: -10, max: -2 }, []);
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain for positive data (existing behaviour must not regress)', () => {
    const domain = buildDomain({ min: 0, max: 100 }, [80, 90]);
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });
});
