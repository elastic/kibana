/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How long a tile query may run. Kibana's own `search:timeout` (20 minutes by default) still
 * applies when it is shorter. The slowest query measured on a large space took about 70 s alone
 * (the 30 day alerts sparkline over alerts without `kibana.alert.entity.id`).
 */
export const TILE_QUERY_TIMEOUT_MS = 90_000;

/** A tile query was stopped because it ran longer than {@link TILE_QUERY_TIMEOUT_MS}. */
export class TileQueryTimeoutError extends Error {
  constructor() {
    super(`The query took longer than ${TILE_QUERY_TIMEOUT_MS / 1000} seconds`);
    this.name = 'TileQueryTimeoutError';
  }
}

export const isTileQueryTimeout = (error: unknown): error is TileQueryTimeoutError =>
  error instanceof TileQueryTimeoutError;

/**
 * Runs a tile query with a signal that aborts after {@link TILE_QUERY_TIMEOUT_MS}, or when
 * `signal` aborts (a refetch or a range change). Aborting cancels the async search in
 * Elasticsearch. Only the timeout turns into a {@link TileQueryTimeoutError}.
 */
export const runWithTileTimeout = async <T>(
  signal: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController();
  const abortWithCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abortWithCaller);
  let isTimedOut = false;
  const timer = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, TILE_QUERY_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } catch (error) {
    throw isTimedOut ? new TileQueryTimeoutError() : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortWithCaller);
  }
};

/** React Query `retry`: one retry as before, but none after a timeout, which would only double the wait. */
export const retryUnlessTimedOut = (failureCount: number, error: unknown): boolean =>
  !isTileQueryTimeout(error) && failureCount < 1;
