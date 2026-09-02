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
 * This is identical logic to timeline.tsx. For negative data, multiplying a
 * negative max by 1.1 makes it more negative and can push it below min, throwing:
 *   Error: [Axis values]: custom domain is invalid, min is greater than max
 */

/** Mirrors process_row_charts.tsx:164-169 verbatim */
function buildDomain(dataDomain: { min: number; max: number } | null): {
  min: number;
  max: number;
} {
  return dataDomain ? { max: dataDomain.max * 1.1, min: dataDomain.min } : { max: 0, min: 0 };
}

describe('process_row_charts.tsx — chart domain for negative data', () => {
  it('produces a valid domain (max >= min) for a flat negative series', () => {
    // A process metric normalised to -1 on all ticks: { min: -1, max: -1 }.
    // -1 * 1.1 = -1.1 which is less than min (-1) — inverted without a fix.
    const domain = buildDomain({ min: -1, max: -1 });
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain when the spread is smaller than 10% of the negative max', () => {
    // { min: -0.54, max: -0.5 }: -0.5 * 1.1 = -0.55 < -0.54 — inverted.
    const domain = buildDomain({ min: -0.54, max: -0.5 });
    expect(domain.max).toBeGreaterThanOrEqual(domain.min);
  });

  it('produces a valid domain when the negative range is wide enough (must not regress)', () => {
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
