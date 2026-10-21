/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { Logger } from '@kbn/logging';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';

export interface RetryOptions {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
}

// 2s, 4s, 8s, 16s, 32s
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 2000,
  maxDelayMs: 64000,
};

// 1s, 2s: keeps request handlers within their deadline
export const REQUEST_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  initialDelayMs: 1000,
  maxDelayMs: 2000,
};

/**
 * Retries any transient network or configuration issues encountered from Elasticsearch with an exponential backoff.
 * Should only be used to wrap operations that are idempotent and can be safely executed more than once.
 */
export const retryTransientEsErrors = async <T>(
  esCall: (attempt: number) => Promise<T>,
  {
    logger,
    retryOptions = DEFAULT_RETRY_OPTIONS,
    signal,
  }: { logger?: Logger; retryOptions?: RetryOptions; signal?: AbortSignal } = {}
): Promise<T> => {
  const { maxRetries, initialDelayMs, maxDelayMs } = retryOptions;

  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) {
      throw signal.reason;
    }
    try {
      return await esCall(attempt);
    } catch (e) {
      if (attempt >= maxRetries || !isRetryableEsClientError(e)) {
        throw e;
      }

      const retryDelayMs = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);

      logger?.warn(
        `Retrying Elasticsearch operation after [${
          retryDelayMs / 1000
        }s] due to error: ${e.toString()} ${e.stack}`
      );

      await setTimeout(retryDelayMs, undefined, { signal });
    }
  }
};
