/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

// Similar to ReactJs's waitFor from here: https://testing-library.com/docs/dom-testing-library/api-async#waitfor
export const waitFor = async (
  functionToTest: () => Promise<boolean>,
  functionName: string,
  log: ToolingLog,
  maxTimeout: number = 400000,
  timeoutWait: number = 250
): Promise<void> => {
  let found = false;
  let numberOfTries = 0;
  const maxTries = Math.floor(maxTimeout / timeoutWait);
  while (!found && numberOfTries < maxTries) {
    if (await functionToTest()) {
      found = true;
    } else {
      log.debug(`Try number ${numberOfTries} out of ${maxTries} for function ${functionName}`);
      numberOfTries++;
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, timeoutWait));
  }

  if (!found) {
    throw new Error(`timed out waiting for function condition to be true within ${functionName}`);
  }
};
