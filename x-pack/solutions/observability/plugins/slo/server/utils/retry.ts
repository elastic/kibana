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

const MAX_ATTEMPTS = 5;

/**
 * Retries any transient network or configuration issues encountered from Elasticsearch with an exponential backoff.
 * Should only be used to wrap operations that are idempotent and can be safely executed more than once.
 */
export const retryTransientEsErrors = async <T>(
  esCall: () => Promise<T>,
  { logger, attempt = 0 }: { logger?: Logger; attempt?: number } = {}
): Promise<T> => {
  try {
    return await esCall();
  } catch (e) {
    if (attempt < MAX_ATTEMPTS && isRetryableEsClientError(e)) {
      const retryCount = attempt + 1;
      const retryDelaySec = Math.min(Math.pow(2, retryCount), 64); // 2s, 4s, 8s, 16s, 32s, 64s, 64s, 64s ...

      logger?.warn(
        `Retrying Elasticsearch operation after [${retryDelaySec}s] due to error: ${e.toString()} ${
          e.stack
        }`
      );

      await setTimeout(retryDelaySec * 1000);
      return retryTransientEsErrors(esCall, { logger, attempt: retryCount });
    }

    throw e;
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
