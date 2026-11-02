/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { SLOOperationTimeout } from '../errors';

export const REQUEST_DEADLINE_MS = 60_000;

/**
 * Runs an operation with a signal aborted after `ms`.
 */
export const withTimeoutSignal = async <T>(
  ms: number,
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

export const isAbortError = (err: unknown): boolean =>
  err instanceof errors.RequestAbortedError ||
  (typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError');

/**
 * Runs an operation with a signal aborted after `ms`; an abort error raised once the deadline is exceeded becomes an SLOOperationTimeout.
 */
export const withDeadline = <T>(
  ms: number,
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> =>
  withTimeoutSignal(ms, async (signal) => {
    try {
      return await operation(signal);
    } catch (err) {
      if (signal.aborted && isAbortError(err)) {
        throw new SLOOperationTimeout(`Operation did not complete within ${ms}ms`);
      }
      throw err;
    }
  });
