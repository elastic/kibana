/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMeasureChange, formatMeasureValue } from './format_measure';

const formatters = {
  formatNumber: (value: number) => String(value),
  formatPercent: (share: number) => `${(share * 100).toFixed(1)}%`,
};

describe('formatMeasureValue', () => {
  it.each([
    [1234, 'count', '1234'],
    [850, 'ms', '850 ms'],
    [2500, 'ms', '2.50 s'],
    [0.1234, 'score', '0.123'],
    [1.26, 'rate', '1.3'],
    [0.015, 'ratio', '1.5%'],
  ] as const)('formats %s as %s', (value, unit, expected) => {
    expect(formatMeasureValue(value, unit, formatters)).toBe(expected);
  });

  it('shows a dash without a value', () => {
    expect(formatMeasureValue(null, 'count', formatters)).toBe('–');
  });
});

describe('formatMeasureChange', () => {
  it('signs a rise and a drop', () => {
    expect(formatMeasureChange(0.25, formatters)).toBe('+25.0%');
    expect(formatMeasureChange(-0.1, formatters)).toBe('−10.0%');
  });

  it('shows no sign for a change that rounds to zero', () => {
    expect(formatMeasureChange(-0.00001, formatters)).toBe('0.0%');
  });

  it('shows a dash without a change', () => {
    expect(formatMeasureChange(null, formatters)).toBe('–');
  });
});
