/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The component applies a 10% headroom multiplier to the max from calculateDomain:
 *
 *   max: dataDomain.max * 1.1
 *   min: dataDomain.min
 *
 * For negative data, `dataDomain.max * 1.1` makes max more negative, which can
 * push it below min and throw:
 *   Error: [Axis values]: custom domain is invalid, min is greater than max
 */

/** Mirrors timeline.tsx:154-159 verbatim */
function buildDomain(dataDomain: { min: number; max: number } | null): {
  min: number;
  max: number;
} {
  return dataDomain ? { max: dataDomain.max * 1.1, min: dataDomain.min } : { max: 0, min: 0 };
}

describe('timeline.tsx — chart domain for negative data', () => {
  it('produces a valid domain (max >= min) for a flat negative series', () => {
    // calculateDomain returns { min: -1, max: -1 } when all values are -1.
    // -1 * 1.1 = -1.1 which is less than min (-1) — inverted without a fix.
    const domain = buildDomain({ min: -1, max: -1 });
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain when the negative range is narrower than 10% of max', () => {
    // max * 1.1 crosses below min when the spread is less than 10% of |max|.
    // e.g. { min: -10.05, max: -10 }: -10 * 1.1 = -11 < -10.05
    const domain = buildDomain({ min: -10.05, max: -10 });
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain when the negative range is wide enough (must not regress)', () => {
    // { min: -20, max: -10 }: -10 * 1.1 = -11, which is still above -20 — safe.
    const domain = buildDomain({ min: -20, max: -10 });
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain for positive data (existing behaviour must not regress)', () => {
    const domain = buildDomain({ min: 0, max: 100 });
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain when dataDomain is null', () => {
    const domain = buildDomain(null);
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });
});
