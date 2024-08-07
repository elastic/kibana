/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

// Number of times to retry when conflicts occur
const RETRY_ATTEMPTS = 2;

// Delay between retries when conflicts occur
const RETRY_DELAY = 200;

/*
 * Retry a request if it runs into 409 Conflicts,
 * up to a maximum number of attempts.
 */
export const retryRequestIfConflicts = async (
  logger: ToolingLog,
  name: string,
  sendRequest: () => Promise<any>,
  retries: number = RETRY_ATTEMPTS,
  retryDelay: number = RETRY_DELAY
): Promise<any> => {
  const response = await sendRequest();
  if (response.statusCode !== 409) {
    return response;
  }

  // If no retries left, throw it
  if (retries <= 0) {
    logger.error(`${name} conflict, exceeded retries`);
    throw new Error(`${name} conflict, exceeded retries`);
  }

  // Otherwise, delay a bit before retrying
  logger.debug(`${name} conflict, retrying ...`);
  await waitBeforeNextRetry(retryDelay);
  return await retryRequestIfConflicts(logger, name, sendRequest, retries - 1);
};

async function waitBeforeNextRetry(retryDelay: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, retryDelay));
}
