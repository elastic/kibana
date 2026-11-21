/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatChange } from './compared_value';

const formatters = {
  formatNumber: (value: number) => String(Math.round(value * 10) / 10),
  formatPercent: (share: number) => `${Math.round(share * 100)}%`,
};

describe('formatChange', () => {
  it('is the change as a share of the previous value, signed', () => {
    expect(formatChange({ value: 12, previous: 10, delta: 2 }, 'relative', formatters)).toBe(
      '+20%'
    );
    expect(formatChange({ value: 8, previous: 10, delta: -2 }, 'relative', formatters)).toBe(
      '-20%'
    );
  });

  it('is the change in percentage points for shares', () => {
    expect(
      formatChange({ value: 0.995, previous: 0.98, delta: 0.015 }, 'percentagePoints', formatters)
    ).toBe('+1.5 pp');
  });

  it('is unknown without a previous value, or against 0', () => {
    expect(
      formatChange({ value: 12, previous: null, delta: null }, 'relative', formatters)
    ).toBeNull();
    expect(formatChange({ value: 12, previous: 0, delta: 12 }, 'relative', formatters)).toBeNull();
    expect(
      formatChange({ value: null, previous: 3, delta: null }, 'percentagePoints', formatters)
    ).toBeNull();
  });
});
