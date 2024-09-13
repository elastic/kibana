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
export async function retryIfDeleteByQueryConflicts(
  logger: ToolingLog,
  name: string,
  operation: () => Promise<DeleteByQueryResponse>,
  retries: number = RETRY_ATTEMPTS,
  retryDelay: number = RETRY_DELAY
): Promise<DeleteByQueryResponse> {
  for (let retriesLeft = retries; retriesLeft > 0; retriesLeft--) {
    const operationResult = await operation();

    if (!operationResult.failures || operationResult.failures?.length === 0) {
      logger.info(`${name} finished successfully`);
      return operationResult;
    }

    const failureCause = operationResult.failures.map((failure) => failure.cause).join(', ');

    logger.warning(`Unable to delete by query ${name}. Caused by: "${failureCause}". Retrying ...`);

    await waitBeforeNextRetry(retryDelay);
  }

  throw new Error(`${name} failed, exceeded retries`);
}

async function waitBeforeNextRetry(retryDelay: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, retryDelay));
}
