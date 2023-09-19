/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Does a plain countdown and checks against a boolean to determine if to wait and try again.
 * This is useful for over the wire things that can cause issues such as conflict or timeouts
 * for testing resiliency.
 * @param functionToTest The function to test against
 * @param name The name of the function to print if we encounter errors
 * @param log The tooling logger
 * @param retryCount The number of times to retry before giving up (has default)
 * @param timeoutWait Time to wait before trying again (has default)
 */
export const countDownTest = async <T>(
  functionToTest: () => Promise<{
    passed: boolean;
    returnValue?: T | undefined;
    errorMessage?: string;
  }>,
  name: string,
  log: ToolingLog,
  retryCount: number = 50,
  timeoutWait = 250,
  ignoreThrow: boolean = false
): Promise<T | undefined> => {
  if (retryCount > 0) {
    try {
      const testReturn = await functionToTest();
      if (!testReturn.passed) {
        const error = testReturn.errorMessage != null ? ` error: ${testReturn.errorMessage},` : '';
        log.error(`Failure trying to ${name},${error} retries left are: ${retryCount - 1}`);
        // retry, counting down, and delay a bit before
        await new Promise((resolve) => setTimeout(resolve, timeoutWait));
        const returnValue = await countDownTest(
          functionToTest,
          name,
          log,
          retryCount - 1,
          timeoutWait,
          ignoreThrow
        );
        return returnValue;
      } else {
        return testReturn.returnValue;
      }
    } catch (err) {
      if (ignoreThrow) {
        throw err;
      } else {
        log.error(
          `Failure trying to ${name}, with exception message of: ${
            err.message
          }, retries left are: ${retryCount - 1}`
        );
        // retry, counting down, and delay a bit before
        await new Promise((resolve) => setTimeout(resolve, timeoutWait));
        const returnValue = await countDownTest(
          functionToTest,
          name,
          log,
          retryCount - 1,
          timeoutWait,
          ignoreThrow
        );
        return returnValue;
      }
    }
  } else {
    log.error(`Could not ${name}, no retries are left`);
    return undefined;
  }
};
