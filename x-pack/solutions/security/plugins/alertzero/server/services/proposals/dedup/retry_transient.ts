/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Statuses that say "not now" rather than "no": throttled, or the cluster briefly unavailable. */
const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/** The Elasticsearch client's own names for a request that never got an answer. */
const TRANSIENT_ERROR_NAMES = new Set([
  'TimeoutError',
  'ConnectionError',
  'NoLivingConnectionsError',
  'RequestAbortedError',
]);

/**
 * Whether trying the same read again could plausibly succeed. Deliberately narrow: a refusal, a
 * missing document or a malformed request will fail the same way next time, and retrying one only
 * delays the answer.
 */
export const isTransientError = (error: unknown): boolean => {
  const candidate = error as
    | { statusCode?: number; meta?: { statusCode?: number }; name?: string }
    | undefined;
  const status = candidate?.statusCode ?? candidate?.meta?.statusCode;
  return (
    (status !== undefined && TRANSIENT_STATUS_CODES.has(status)) ||
    TRANSIENT_ERROR_NAMES.has(candidate?.name ?? '')
  );
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `attempt`, and runs it again after each delay while it fails with a transient error. Any
 * other failure, or the last transient one, is thrown as it was.
 *
 * Packaging fails closed on a lookup it cannot make, and a run that does is not retried by the
 * next sweep (its hunt is already marked hunted), so one throttled request among the many a run
 * now makes should not be what loses its findings. Three tries, a quarter and then half a second
 * apart, ride out a brief blip without holding a run up for long.
 */
export const retryTransient = async <T>(
  attempt: () => Promise<T>,
  {
    delaysMs = [250, 500],
    sleep = defaultSleep,
  }: { delaysMs?: number[]; sleep?: (ms: number) => Promise<void> } = {}
): Promise<T> => {
  for (let tries = 0; ; tries++) {
    try {
      return await attempt();
    } catch (error) {
      if (tries >= delaysMs.length || !isTransientError(error)) {
        throw error;
      }
      await sleep(delaysMs[tries]);
    }
  }
};
