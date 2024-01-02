/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RetryService } from '@kbn/ftr-common-functional-services';

/*
 * Retry wrapper for async supertests, with a maximum number of retries
 */
export const retry = async <T>({
  test,
  retryService,
  retries,
}: {
  test: () => Promise<T>;
  retryService: RetryService;
  retries: number;
}): Promise<T | Error> => {
  let retryAttempt = 0;
  const response = await retryService.try(
    async () => {
      if (retryAttempt > retries) {
        // Log error message if we reached the maximum number of retries
        // but don't throw an error, return it to break the retry loop.
        return new Error('Reached maximum number of retries for test.');
      }

      retryAttempt = retryAttempt + 1;

      return test();
    },
    undefined,
    200
  );

  // Now throw the error in order to fail the test.
  if (response instanceof Error) {
    throw response;
  }

  return response;
};
