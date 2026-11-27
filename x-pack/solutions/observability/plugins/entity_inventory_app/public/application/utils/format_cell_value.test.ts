/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatCellValue } from './format_cell_value';

describe('formatCellValue', () => {
  it.each([null, undefined, [], [null]])('returns null for the empty value %p', (value) => {
    expect(formatCellValue(value)).toBeNull();
  });

  it('joins multi-value cells with a comma, skipping nulls', () => {
    expect(formatCellValue(['10.0.0.1', null, 'fe80::1'])).toBe('10.0.0.1, fe80::1');
  });

  it.each([
    ['web-001', 'web-001'],
    [42, '42'],
    [0, '0'],
    [true, 'true'],
    [false, 'false'],
    ['', ''],
  ])('formats the scalar %p as %p', (value, expected) => {
    expect(formatCellValue(value)).toBe(expected);
  });
});
