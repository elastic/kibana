/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';

export interface RetryOptions {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 2_000,
  maxDelayMs: 64_000,
};

export const REQUEST_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  initialDelayMs: 1_000,
  maxDelayMs: 2_000,
};

/**
 * Retries any transient network or configuration issues encountered from Elasticsearch with an exponential backoff.
 * Should only be used to wrap operations that are idempotent and can be safely executed more than once.
 */
export const retryTransientEsErrors = async <T>(
  esCall: () => Promise<T>,
  {
    logger,
    retryOptions = DEFAULT_RETRY_OPTIONS,
    signal,
  }: { logger?: Logger; retryOptions?: RetryOptions; signal?: AbortSignal } = {}
): Promise<T> => {
  const { maxRetries, initialDelayMs, maxDelayMs } = retryOptions;

  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await esCall();
    } catch (e) {
      if (attempt >= maxRetries || signal?.aborted || !isRetryableEsClientError(e)) {
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

// Failures where the request may have reached Elasticsearch and been applied.
const AMBIGUOUS_STATUS_CODES = [408, 502, 504];

const isAmbiguousFailure = (err: Error): boolean =>
  err instanceof EsErrors.TimeoutError ||
  err instanceof EsErrors.ConnectionError ||
  (err instanceof EsErrors.ResponseError && AMBIGUOUS_STATUS_CODES.includes(err.statusCode ?? 0));

/**
 * Treats "already exists" as success only once a previous attempt failed in a way that may have created the resource.
 */
export const ignoreAlreadyExistsAfterAmbiguousFailure = <T>(
  esCall: () => Promise<T>
): (() => Promise<T | undefined>) => {
  let mayHaveBeenCreated = false;

  return async () => {
    try {
      return await esCall();
    } catch (err) {
      if (
        mayHaveBeenCreated &&
        err.meta?.body?.error?.type === 'resource_already_exists_exception'
      ) {
        return undefined;
      }
      mayHaveBeenCreated = mayHaveBeenCreated || isAmbiguousFailure(err);
      throw err;
    }
  };
};
