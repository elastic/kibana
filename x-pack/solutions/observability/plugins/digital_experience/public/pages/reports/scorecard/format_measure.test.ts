/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMeasureChange, formatMeasureValue } from './format_measure';

const formatters = {
  formatNumber: (value: number) => String(value),
  formatDecimal: (value: number, decimals: number) => value.toFixed(decimals),
  formatKpiPercent: (share: number) => `${(share * 100).toFixed(1)}%`,
  formatSignedPercent: (share: number) => `${share > 0 ? '+' : ''}${(share * 100).toFixed(1)}%`,
};

describe('formatMeasureValue', () => {
  it.each([
    [1234, 'count', '1234'],
    [1362.75, 'count', '1363'],
    [0.25, 'count', '0.25'],
    [850, 'ms', '850 ms'],
    [2500, 'ms', '2.50 s'],
    [0.1234, 'score', '0.123'],
    [1.26, 'rate', '1.3'],
    [0.015, 'ratio', '1.5%'],
    [0, 'ratio', '0.0%'],
    [1, 'ratio', '100.0%'],
    [0.0001, 'ratio', '<0.1%'],
    [0.9999, 'ratio', '>99.9%'],
    [0.001, 'ratio', '0.1%'],
  ] as const)('formats %s as %s', (value, unit, expected) => {
    expect(formatMeasureValue(value, unit, formatters)).toBe(expected);
  });
});

describe('formatMeasureChange', () => {
  const signedFormatters = {
    formatSignedNumber: (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`,
    formatSignedPercent: formatters.formatSignedPercent,
  };

  it('formats a relative change with the signed percent format', () => {
    expect(
      formatMeasureChange({ value: 125, previous: 100, changeUnit: 'relative' }, signedFormatters)
    ).toBe('+25.0%');
  });

  it('formats the change of a share in percentage points, as the Overview does', () => {
    expect(
      formatMeasureChange(
        { value: 0.985, previous: 0.99, changeUnit: 'percentagePoints' },
        signedFormatters
      )
    ).toMatch(/-0\.5/);
  });

  it('has no change without both values', () => {
    expect(
      formatMeasureChange({ value: null, previous: 1, changeUnit: 'relative' }, signedFormatters)
    ).toBeUndefined();
  });
});
