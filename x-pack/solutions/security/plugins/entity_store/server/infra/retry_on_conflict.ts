/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

/** Runs `fn`, retrying only on a saved-object version conflict (a concurrent write); other errors fail fast. */
export const retryOnConflict = <T>(fn: () => Promise<T>, retries = 3): Promise<T> =>
  pRetry(
    async () => {
      try {
        return await fn();
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isConflictError(error)) {
          throw new pRetry.AbortError(error as Error);
        }
        throw error;
      }
    },
    { retries }
  );
