/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { parseTrailingDots, trailingDotFilter } from './tile_trailing_dots';

const response = (columns: string[], row: Array<number | null>): ESQLSearchResponse =>
  ({
    columns: columns.map((name) => ({ name, type: 'long' })),
    values: [row],
  } as unknown as ESQLSearchResponse);

const columnOf = (k: number) => `dot_${k}`;

describe('trailingDotFilter', () => {
  it.each([
    ['24h', 0, 'WHERE bucket >= 0 AND bucket <= 23'],
    ['24h', 5, 'WHERE bucket >= 5 AND bucket <= 28'],
    ['7d', 0, 'WHERE bucket >= 0 AND bucket <= 27'],
    ['30d', 29, 'WHERE bucket >= 29 AND bucket <= 58'],
  ] as const)('restricts %s dot %i to its own window', (range, k, expected) => {
    expect(trailingDotFilter(range, k)).toBe(expected);
  });
});

describe('parseTrailingDots', () => {
  it('returns the dots oldest first, so the last value is the newest dot (0)', () => {
    const dots = parseTrailingDots(
      response(['dot_0', 'dot_1', 'dot_2'], [10, 20, 30]),
      '24h',
      columnOf
    );
    expect(dots).toHaveLength(24);
    expect(dots.slice(-3)).toEqual([30, 20, 10]);
  });

  it.each([
    ['24h', 24],
    ['7d', 28],
    ['30d', 30],
  ] as const)('returns %s dots (%i)', (range, dots) => {
    expect(parseTrailingDots(response([], []), range, columnOf)).toHaveLength(dots);
  });

  it('counts a missing column or a null value as 0', () => {
    const dots = parseTrailingDots(response(['dot_0', 'dot_1'], [null, 4]), '24h', columnOf);
    expect(dots.slice(-2)).toEqual([4, 0]);
    expect(dots.slice(0, -2).every((value) => value === 0)).toBe(true);
  });

  it('returns all zeros for an empty response', () => {
    const dots = parseTrailingDots(
      { columns: [], values: [] } as unknown as ESQLSearchResponse,
      '30d',
      columnOf
    );
    expect(dots.every((value) => value === 0)).toBe(true);
  });
});
