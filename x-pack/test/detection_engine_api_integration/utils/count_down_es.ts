/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/dev-utils';
import { countDownTest } from './count_down_test';

/**
 * Does a plain countdown and checks against es queries for either conflicts in the error
 * or for any over the wire issues such as timeouts or temp 404's to make the tests more
 * reliant.
 * @param esFunction The function to test against
 * @param esFunctionName The name of the function to print if we encounter errors
 * @param log The tooling logger
 * @param retryCount The number of times to retry before giving up (has default)
 * @param timeoutWait Time to wait before trying again (has default)
 */
export const countDownES = async (
  esFunction: () => Promise<TransportResult<Record<string, any>, unknown>>,
  esFunctionName: string,
  log: ToolingLog,
  retryCount: number = 50,
  timeoutWait = 250
): Promise<void> => {
  await countDownTest(
    async () => {
      const result = await esFunction();
      if (result.body.version_conflicts !== 0) {
        return {
          passed: false,
          errorMessage: 'Version conflicts for ${result.body.version_conflicts}',
        };
      } else {
        return { passed: true };
      }
    },
    esFunctionName,
    log,
    retryCount,
    timeoutWait
  );
};
