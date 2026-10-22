/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { Logger } from '@kbn/logging';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';

const MAX_ATTEMPTS = 5;

/**
 * Retries any transient network or configuration issues encountered from Elasticsearch with an exponential backoff.
 * Should only be used to wrap operations that are idempotent and can be safely executed more than once.
 */
export const retryTransientEsErrors = async <T>(
  esCall: (attempt: number) => Promise<T>,
  { logger, attempt = 0 }: { logger?: Logger; attempt?: number } = {}
): Promise<T> => {
  try {
    return await esCall(attempt);
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

/**
 * Treats "already exists" as success on retries, since a previous attempt may have created the resource before timing out client-side.
 */
export const ignoreAlreadyExistsOnRetry = async <T>(
  attempt: number,
  esCall: () => Promise<T>
): Promise<T | undefined> => {
  try {
    return await esCall();
  } catch (err) {
    if (attempt > 0 && err.meta?.body?.error?.type === 'resource_already_exists_exception') {
      return undefined;
    }
    throw err;
  }
};
