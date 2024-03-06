/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RetryService } from '@kbn/ftr-common-functional-services';
import type { ToolingLog } from '@kbn/tooling-log';
/**
 * Retry wrapper for async supertests, with a maximum number of retries.
 * You can pass in a function that executes a supertest test, and make assertions
 * on the response. If the test fails, it will retry the test the number of retries
 * that are passed in.
 * 
 * Example usage:
 * ```ts
  const fleetResponse = await retry<InstallPackageResponse>({
    test: async () => {
      const testResponse = await supertest
        .post(`/api/fleet/epm/packages/security_detection_engine`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/json')
        .send({ force: true })
        .expect(200);
      expect((testResponse.body as InstallPackageResponse).items).toBeDefined();
      expect((testResponse.body as InstallPackageResponse).items.length).toBeGreaterThan(0);

      return testResponse.body;
    },
    retryService,
    retries: MAX_RETRIES,
    timeout: ATTEMPT_TIMEOUT,
  });
 * ```
 * @param test The function containing a test to run
 * @param retryService The retry service to use
 * @param retries The maximum number of retries
 * @param timeout The timeout for each retry
 * @param retryDelay The delay between each retry
 * @returns The response from the test
 */
export const retry = async <T>({
  test,
  retryService,
  utilityName,
  retries = 2,
  timeout = 30000,
  retryDelay = 200,
  log,
}: {
  test: () => Promise<T>;
  utilityName: string;
  retryService: RetryService;
  retries?: number;
  timeout?: number;
  retryDelay?: number;
  log: ToolingLog;
}): Promise<T> => {
  let retryAttempt = 0;
  const response = await retryService.tryForTime(
    timeout,
    async () => {
      if (retryAttempt > retries) {
        // Log error message if we reached the maximum number of retries
        // but don't throw an error, return it to break the retry loop.
        const errorMessage = `Reached maximum number of retries for test: ${
          retryAttempt - 1
        }/${retries}`;
        log?.error(errorMessage);
        return new Error(JSON.stringify(errorMessage));
      }

      retryAttempt = retryAttempt + 1;

      // Catch the error thrown by the test and log it, then throw it again
      // to cause `tryForTime` to retry.
      try {
        return await test();
      } catch (error) {
        log.error(`Retrying ${utilityName}: ${error}`);
        throw error;
      }
    },
    undefined,
    retryDelay
  );

  // Now throw the error in order to fail the test.
  if (response instanceof Error) {
    throw response;
  }

  return response;
};
