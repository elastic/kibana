/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { ToolingLog } from '@kbn/tooling-log';

// Number of times to retry when conflicts occur
const RETRY_ATTEMPTS = 2;

// Delay between retries when conflicts occur
const RETRY_DELAY = 200;

/*
 * Retry an Elasticsearch deleteByQuery operation if it runs into 409 Conflicts,
 * up to a maximum number of attempts.
 */
export async function retryIfDeleteByQueryConflicts<T>(
  logger: ToolingLog,
  name: string,
  operation: () => Promise<DeleteByQueryResponse>,
  retries: number = RETRY_ATTEMPTS,
  retryDelay: number = RETRY_DELAY
): Promise<DeleteByQueryResponse> {
  const operationResult = await operation();
  if (!operationResult.failures || operationResult.failures?.length === 0) {
    return operationResult;
  }

  for (const failure of operationResult.failures) {
    if (failure.status === 409) {
      // if no retries left, throw it
      if (retries <= 0) {
        logger.error(`${name} conflict, exceeded retries`);
        throw new Error(`${name} conflict, exceeded retries`);
      }

      // Otherwise, delay a bit before retrying
      logger.debug(`${name} conflict, retrying ...`);
      await waitBeforeNextRetry(retryDelay);
      return await retryIfDeleteByQueryConflicts(logger, name, operation, retries - 1);
    }
  }

  return operationResult;
}

async function waitBeforeNextRetry(retryDelay: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, retryDelay));
}
