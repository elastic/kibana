/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ToolingLog } from '@kbn/tooling-log';

type RetryableForConflicts<T> = () => Promise<T>;

// Number of times to retry when conflicts occur
export const RetryForConflictsAttempts = 2;

/*
 * Retry an operation if it runs into 409 Conflicts,
 * up to a maximum number of attempts.
 */
export async function retryIfConflicts<T>(
  logger: ToolingLog,
  name: string,
  operation: RetryableForConflicts<T>,
  retries: number = RetryForConflictsAttempts
): Promise<T> {
  // run the operation, return if no errors or throw if not a conflict error
  try {
    return await operation();
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isConflictError(err)) {
      throw err;
    }
    // must be a conflict; if no retries left, throw it
    if (retries <= 0) {
      logger.error(`${name} conflict, exceeded retries`);
      throw err;
    }

    // delay a bit before retrying
    logger.debug(`${name} conflict, retrying ...`);
    await waitBeforeNextRetry();
    return await retryIfConflicts(logger, name, operation, retries - 1);
  }
}

async function waitBeforeNextRetry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
}
