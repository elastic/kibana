/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  SERIES_BUCKET_COLUMN,
  buildSeriesBucketExpression,
  buildSeriesDotWindow,
  getSeriesWindow,
  readSeriesDots,
  seriesFetchHours,
} from './tile_series_window';

const response = (columns: string[], values: unknown[][]) =>
  ({ columns: columns.map((name) => ({ name })), values } as unknown as ESQLSearchResponse);

describe('tile series window', () => {
  it('has the step and the number of dots of each range, covering exactly the range', () => {
    expect(getSeriesWindow('24h')).toEqual({ stepHours: 1, dots: 24 });
    expect(getSeriesWindow('7d')).toEqual({ stepHours: 6, dots: 28 });
    expect(getSeriesWindow('30d')).toEqual({ stepHours: 24, dots: 30 });
  });

  it('reads back far enough for the oldest dot to cover a full window', () => {
    expect(seriesFetchHours('24h')).toBe(47);
    expect(seriesFetchHours('7d')).toBe(55 * 6);
    expect(seriesFetchHours('30d')).toBe(59 * 24);
  });

  it('numbers buckets in whole steps back from NOW(), 0 being the newest', () => {
    expect(buildSeriesBucketExpression('7d')).toBe('DATE_DIFF("hour", @timestamp, NOW()) / 6');
    expect(SERIES_BUCKET_COLUMN).toBe('bucket');
  });

  it('can number buckets from another time field, such as first_seen', () => {
    expect(buildSeriesBucketExpression('30d', 'entity.lifecycle.first_seen')).toBe(
      'DATE_DIFF("hour", entity.lifecycle.first_seen, NOW()) / 24'
    );
  });

  it('keeps the buckets of dot k: the range ending k steps back', () => {
    expect(buildSeriesDotWindow('24h', 0)).toBe('bucket >= 0 AND bucket <= 23');
    expect(buildSeriesDotWindow('7d', 3)).toBe('bucket >= 3 AND bucket <= 30');
  });

  describe('readSeriesDots', () => {
    const columnOf = (k: number) => `dot_${k}`;

    it('returns the dots oldest first, from the column of each dot', () => {
      const columns = Array.from({ length: 24 }, (_, k) => columnOf(k));
      const values = [columns.map((_, k) => k * 10)];
      const dots = readSeriesDots(response(columns, values), '24h', columnOf);
      expect(dots).toHaveLength(24);
      expect(dots[0]).toBe(230);
      expect(dots[23]).toBe(0);
    });

    it('reads a null value as 0', () => {
      const columns = Array.from({ length: 24 }, (_, k) => columnOf(k));
      const dots = readSeriesDots(response(columns, [columns.map(() => null)]), '24h', columnOf);
      expect(dots.every((dot) => dot === 0)).toBe(true);
    });

    it('throws when a dot column is missing instead of drawing a zero', () => {
      expect(() => readSeriesDots(response(['dot_0'], [[1]]), '24h', columnOf)).toThrow(/dot_23/);
    });

    it('throws on an empty response', () => {
      expect(() => readSeriesDots(response([], []), '24h', columnOf)).toThrow();
    });
  });
});
