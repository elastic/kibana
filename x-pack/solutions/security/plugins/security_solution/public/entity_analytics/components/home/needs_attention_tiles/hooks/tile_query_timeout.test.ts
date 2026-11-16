/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TILE_QUERY_TIMEOUT_MS,
  TileQueryTimeoutError,
  isTileQueryTimeout,
  retryUnlessTimedOut,
  runWithTileTimeout,
} from './tile_query_timeout';

/** A query that resolves only when told to, and rejects as a search does when its signal aborts. */
const pendingQuery = () => {
  let resolve: (value: string) => void = () => {};
  let seen: AbortSignal | undefined;
  const run = (signal: AbortSignal) =>
    new Promise<string>((res, rej) => {
      seen = signal;
      resolve = res;
      signal.addEventListener('abort', () => rej(new Error('Aborted')));
    });
  return { run, resolve: (value: string) => resolve(value), signal: () => seen };
};

describe('runWithTileTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('gives up after 90 seconds, aborting the query, and says it timed out', async () => {
    expect(TILE_QUERY_TIMEOUT_MS).toBe(90_000);
    const query = pendingQuery();
    const result = runWithTileTimeout(undefined, query.run);
    jest.advanceTimersByTime(TILE_QUERY_TIMEOUT_MS - 1);
    expect(query.signal()?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    await expect(result).rejects.toBeInstanceOf(TileQueryTimeoutError);
    expect(query.signal()?.aborted).toBe(true);
  });

  it('returns the result of a query that finishes in time', async () => {
    const query = pendingQuery();
    const result = runWithTileTimeout(undefined, query.run);
    query.resolve('done');
    await expect(result).resolves.toBe('done');
    // The timer is cleared: nothing aborts later.
    jest.advanceTimersByTime(TILE_QUERY_TIMEOUT_MS);
    expect(query.signal()?.aborted).toBe(false);
  });

  it('passes a cancel (a refetch or a range change) on, without calling it a timeout', async () => {
    const caller = new AbortController();
    const query = pendingQuery();
    const result = runWithTileTimeout(caller.signal, query.run);
    caller.abort();
    const error = await result.catch((e: unknown) => e);
    expect(query.signal()?.aborted).toBe(true);
    expect(isTileQueryTimeout(error)).toBe(false);
  });
});

describe('retryUnlessTimedOut', () => {
  it('retries an error once, as before', () => {
    expect(retryUnlessTimedOut(0, new Error('boom'))).toBe(true);
    expect(retryUnlessTimedOut(1, new Error('boom'))).toBe(false);
  });

  it('does not retry a timeout, which would only double the wait', () => {
    expect(retryUnlessTimedOut(0, new TileQueryTimeoutError())).toBe(false);
  });
});
