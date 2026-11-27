/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { formatMetricValue } from './format_metric_value';

describe('formatMetricValue', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['en', 1234.5, 'count', '1,234.5'],
    ['de-DE', 1234.5, 'count', '1.234,5'],
    ['de-DE', 1500, 'bytes', '1,5 kB'],
    ['fr-FR', 0.951, 'percent', '95,1%'],
  ] as const)('formats with the active locale %p: %p %p as %p', (locale, value, unit, expected) => {
    jest.spyOn(i18n, 'getLocale').mockReturnValue(locale);
    expect(formatMetricValue(value, unit)).toBe(expected);
  });

  it.each([null, undefined, []])('returns null for the empty value %p', (value) => {
    expect(formatMetricValue(value, 'percent')).toBeNull();
  });

  it.each([
    [0.95, 'percent', '95%'],
    [0.951, 'percent', '95.1%'],
    [0.95, 'ratio', '0.95'],
    [1.25, 'ratio', '1.25'],
    [0, 'bytes', '0 B'],
    [512, 'bytes', '512 B'],
    [1500, 'bytes', '1.5 kB'],
    [319, 'ms', '319ms'],
    [1.5, 's', '1.5s'],
    [42, 'count', '42'],
    [0.95, undefined, '0.95'],
  ] as const)('formats %p with unit %p as %p', (value, unit, expected) => {
    expect(formatMetricValue(value, unit)).toBe(expected);
  });

  it('stringifies a non-numeric scalar when it cannot parse as a number', () => {
    expect(formatMetricValue('n/a', 'count')).toBe('n/a');
  });
});
