/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  changeSinceJudged,
  checkBaseline,
  countAt,
  countsAfter,
  hasRowsAt,
  observationAt,
  seenAt,
  observeMatchSeries,
  shiftFrom,
  type MatchSeries,
} from './baseline';
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
  const shape = { bucketMinutes: 5, windowMinutes: 300 };

  it('queries the window of complete buckets with a bucketed count, keeping every bucket', async () => {
    const run = okRun([]);

    await observeMatchSeries({ query: FILTER_QUERY, now, run, ...shape });

    expect(run).toHaveBeenCalledWith({
      query: FILTER_QUERY,
      tail: 'STATS c = COUNT(*) BY b = BUCKET(@timestamp, 5 minute) | KEEP b, c | SORT b DESC | LIMIT 61',
      window: { from: '2026-10-15T07:00:00.000Z', to: '2026-10-15T12:05:00.000Z' },
    });
  });

  it('takes its bucket size and window from its parameters', async () => {
    const run = okRun([]);

    await observeMatchSeries({
      query: FILTER_QUERY,
      now,
      run,
      bucketMinutes: 15,
      windowMinutes: 600,
    });

    expect(run).toHaveBeenCalledWith({
      query: FILTER_QUERY,
      tail: 'STATS c = COUNT(*) BY b = BUCKET(@timestamp, 15 minute) | KEEP b, c | SORT b DESC | LIMIT 41',
      window: { from: '2026-10-15T01:45:00.000Z', to: '2026-10-15T12:00:00.000Z' },
    });
  });

  it('fills the buckets ES|QL leaves out with zeros and compares the latest complete one', async () => {
    const run = okRun([['2026-10-15T12:00:00.000Z', 50]]);

    const result = await observeMatchSeries({ query: FILTER_QUERY, now, run, ...shape });

    expect(result?.observation).toMatchObject({
      decision: 'above_normal',
      value: 50,
      samples: 60,
      median: 0,
    });
    expect(result?.series).toMatchObject({
      firstStart: Date.parse('2026-10-15T07:00:00.000Z'),
      bucketMs: 300_000,
    });
    expect(result?.series.counts).toHaveLength(61);
    expect(result?.series.counts.at(-1)).toBe(50);
  });

  it.each([
    ['an aggregating query', 'FROM $.a | WHERE x == 1 | STATS c = COUNT(*)'],
    ['a missing query', undefined],
    ['a query that does not parse', 'FROM $.a | WHERE'],
  ])('observes nothing for %s, without running it', async (_name, query) => {
    const run = okRun([]);

    expect(await observeMatchSeries({ query, now, run, ...shape })).toBeUndefined();
    expect(run).not.toHaveBeenCalled();
  });

  it('observes nothing when the query fails', async () => {
    const run = jest.fn(
      async (): Promise<StoredQueryResult> => ({ status: 'timeout', values: [], durationMs: 1 })
    );

    expect(await observeMatchSeries({ query: FILTER_QUERY, now, run, ...shape })).toBeUndefined();
  });
});

describe('reading a match series at a point in time', () => {
  // Buckets of 5 minutes from 07:00; the last (index 60) is 12:00.
  const firstStart = Date.parse('2026-10-15T07:00:00.000Z');
  const at = (hhmm: string) => Date.parse(`2026-10-15T${hhmm}:00.000Z`);
  const series = (counts: number[]): MatchSeries => ({ firstStart, bucketMs: 300_000, counts });
  const quietThenSpike = series([...Array(57).fill(5), 0, 0, 0, 40]);

  it('reads the count of the bucket that holds a time, and nothing outside the series', () => {
    expect(countAt(quietThenSpike, at('12:03'))).toBe(40);
    expect(countAt(quietThenSpike, at('11:45'))).toBe(0);
    expect(countAt(quietThenSpike, at('06:55'))).toBeUndefined();
    expect(countAt(quietThenSpike, at('12:05'))).toBeUndefined();
  });

  it('reads the counts after the bucket that holds a time, up to the latest', () => {
    expect(countsAfter(quietThenSpike, at('11:45'))).toEqual([0, 0, 40]);
    expect(countsAfter(quietThenSpike, at('12:00'))).toEqual([]);
    expect(countsAfter(quietThenSpike, at('06:55'))).toEqual([]);
  });

  it('reads whether a span of buckets ending at a time has matches', () => {
    expect(hasRowsAt({ series: quietThenSpike, time: at('11:55'), spanBuckets: 3 })).toBe(false);
    expect(hasRowsAt({ series: quietThenSpike, time: at('11:55'), spanBuckets: 4 })).toBe(true);
    expect(
      hasRowsAt({ series: quietThenSpike, time: at('07:05'), spanBuckets: 4 })
    ).toBeUndefined();
  });

  it('observes a bucket against the buckets before it, and only with enough history', () => {
    expect(observationAt(quietThenSpike, at('12:00'))).toMatchObject({
      decision: 'above_normal',
      value: 40,
      samples: 60,
    });
    expect(observationAt(quietThenSpike, at('07:45'))).toBeUndefined();
    expect(observationAt(quietThenSpike, at('07:50'))).toMatchObject({ samples: 10 });
  });

  it('reads what something at a time could have seen: the bucket before the one that holds it', () => {
    const seen = seenAt(quietThenSpike, at('12:00'));

    expect(countAt(quietThenSpike, seen)).toBe(0);
    expect(observationAt(quietThenSpike, seen)).toMatchObject({ decision: 'background', value: 0 });
    expect(observationAt(quietThenSpike, at('12:00'))).toMatchObject({ value: 40 });
  });
});

describe('shiftFrom', () => {
  it('needs a doubling up, a halving down, or a Poisson margin on small counts', () => {
    expect(shiftFrom({ value: 421, from: 210 })).toBe('up');
    expect(shiftFrom({ value: 420, from: 210 })).toBeUndefined();
    expect(shiftFrom({ value: 104, from: 210 })).toBe('down');
    expect(shiftFrom({ value: 10, from: 4 })).toBeUndefined();
    expect(shiftFrom({ value: 11, from: 4 })).toBe('up');
  });
});

describe('changeSinceJudged', () => {
  const quiet = (length: number) => Array.from({ length }, (_, i) => (i % 3 === 0 ? 6 : 5));
  const spike = (length: number) => Array.from({ length }, () => 50);

  it('recovers a short spike judged at its peak once the count is back to the quiet normal', () => {
    // Four quiet hours, then 30 minutes at 50: judged at the peak.
    const judged = checkBaseline({ value: 50, history: quiet(60) });
    // Back to 5 after the spike: the trailing window now holds it.
    const observed = checkBaseline({ value: 5, history: [...quiet(54), ...spike(6)] });

    expect(judged.decision).toBe('above_normal');
    expect(observed.decision).toBe('background');
    expect(changeSinceJudged({ observed, judged })).toBe('recovered');
  });

  it('does not recover a spike that only halved', () => {
    const judged = checkBaseline({ value: 50, history: quiet(60) });
    const observed = checkBaseline({ value: 20, history: [...quiet(54), ...spike(6)] });

    expect(changeSinceJudged({ observed, judged })).toBeUndefined();
  });

  it('rises on any count above normal when the verdict was made at a normal level', () => {
    const judged = checkBaseline({ value: 5, history: quiet(60) });
    const observed = checkBaseline({ value: 9, history: quiet(60) });

    expect(judged.decision).toBe('background');
    expect(changeSinceJudged({ observed, judged })).toBe('rose');
  });

  it('rises on any count above normal when no level was judged', () => {
    const observed = checkBaseline({ value: 9, history: quiet(60) });

    expect(changeSinceJudged({ observed, judged: undefined })).toBe('rose');
  });

  it('does not rise while a plateau stays at the abnormal level it was judged at', () => {
    const judged = checkBaseline({ value: 210, history: quiet(60) });
    const observed = checkBaseline({ value: 214, history: [...quiet(48), ...spike(12)] });

    expect(observed.decision).toBe('above_normal');
    expect(changeSinceJudged({ observed, judged })).toBeUndefined();
  });

  it('rises again once a plateau more than doubles the abnormal level it was judged at', () => {
    const judged = checkBaseline({ value: 210, history: quiet(60) });
    const observed = checkBaseline({ value: 430, history: [...quiet(48), ...spike(12)] });

    expect(changeSinceJudged({ observed, judged })).toBe('rose');
  });

  it('never recovers a rule judged at a normal level, so a cycle low phase stays quiet', () => {
    const cycle = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 230 : 620));
    const judged = checkBaseline({ value: 507, history: cycle });
    const observed = checkBaseline({ value: 229, history: cycle });

    expect(judged.decision).toBe('background');
    expect(changeSinceJudged({ observed, judged })).toBeUndefined();
  });
});
