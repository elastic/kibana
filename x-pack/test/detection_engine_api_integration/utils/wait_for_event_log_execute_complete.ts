/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';

import { waitFor } from './wait_for';
import { getEventLogExecuteCompleteById } from './get_event_log_execute_complete_by_id';

/**
 * Waits for the event-log execution completed doc count to be greater than the
 * supplied number before continuing with a default of at least one execution
 * @param es The ES client
 * @param log
 * @param ruleId The id of rule to check execution logs for
 * @param totalExecutions The number of executions to wait for, default is 1
 */
export const waitForEventLogExecuteComplete = async (
  es: Client,
  log: ToolingLog,
  ruleId: string,
  totalExecutions = 1
): Promise<void> => {
  await waitFor(
    async () => {
      const executionCount = await getEventLogExecuteCompleteById(es, log, ruleId);
      return executionCount >= totalExecutions;
    },
    'waitForEventLogExecuteComplete',
    log
  );
};
