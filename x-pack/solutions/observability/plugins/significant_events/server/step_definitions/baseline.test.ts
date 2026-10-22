/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkBaseline, observeMatchSeries } from './baseline';
import type { StoredQueryResult } from './run_probe';

const FILTER_QUERY = 'FROM $.a | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
const flat = (value: number, length = 60) => Array.from({ length }, () => value);

describe('checkBaseline', () => {
  it('is warming up until it has enough history', () => {
    expect(checkBaseline({ value: 100, history: flat(5, 9) })).toEqual({
      decision: 'warming_up',
      value: 100,
      samples: 9,
    });
  });

  it.each([
    ['within the floor above a flat history', 5, 'background'],
    ['past the floor above a flat history', 9, 'above_normal'],
  ])('is %s', (_name, value, decision) => {
    expect(checkBaseline({ value, history: flat(5) })).toMatchObject({
      decision,
      median: 5,
      threshold: 8,
    });
  });

  it('widens its band with the spread of the history', () => {
    const noisy = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 10 : 30));

    expect(checkBaseline({ value: 40, history: noisy })).toMatchObject({ decision: 'background' });
    expect(checkBaseline({ value: 100, history: noisy })).toMatchObject({
      decision: 'above_normal',
    });
  });
});

describe('observeMatchSeries', () => {
  // 12:07 UTC: the latest complete five-minute bucket starts at 12:00 and ends at 12:05.
  const now = Date.parse('2026-10-15T12:07:00.000Z');
  const okRun = (values: StoredQueryResult['values']) =>
    jest.fn(async (): Promise<StoredQueryResult> => ({ status: 'ok', values, durationMs: 1 }));

  it('queries the last hour of complete buckets with a bucketed count', async () => {
    const run = okRun([]);

    await observeMatchSeries({ query: FILTER_QUERY, now, run });

    expect(run).toHaveBeenCalledWith({
      query: FILTER_QUERY,
      tail: 'STATS c = COUNT(*) BY b = BUCKET(@timestamp, 5 minute) | KEEP b, c',
      window: { from: '2026-10-15T07:00:00.000Z', to: '2026-10-15T12:05:00.000Z' },
    });
  });

  it('fills the buckets ES|QL leaves out with zeros and compares the latest complete one', async () => {
    const run = okRun([['2026-10-15T12:00:00.000Z', 50]]);

    expect(await observeMatchSeries({ query: FILTER_QUERY, now, run })).toMatchObject({
      decision: 'above_normal',
      value: 50,
      samples: 60,
      median: 0,
    });
  });

  it.each([
    ['an aggregating query', 'FROM $.a | WHERE x == 1 | STATS c = COUNT(*)'],
    ['a missing query', undefined],
    ['a query that does not parse', 'FROM $.a | WHERE'],
  ])('observes nothing for %s, without running it', async (_name, query) => {
    const run = okRun([]);

    expect(await observeMatchSeries({ query, now, run })).toBeUndefined();
    expect(run).not.toHaveBeenCalled();
  });

  it('observes nothing when the query fails', async () => {
    const run = jest.fn(
      async (): Promise<StoredQueryResult> => ({ status: 'timeout', values: [], durationMs: 1 })
    );

    expect(await observeMatchSeries({ query: FILTER_QUERY, now, run })).toBeUndefined();
  });
});
