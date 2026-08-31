/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, ExecutionStatus } from '@kbn/workflows';
import type { FpTpWorkflowsManagementApi } from './types';

const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_MAX_POLL_INTERVAL_MS = 3000;
const POLL_BACKOFF_MULTIPLIER = 1.5;
const DEFAULT_MAX_WAIT_MS = 15 * 60 * 1000;

const delay = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export const pollForFpTpWorkflowCompletion = async ({
  executionId,
  logger,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  spaceId,
  workflowsManagementApi,
}: {
  executionId: string;
  logger: Logger;
  maxWaitMs?: number;
  spaceId: string;
  workflowsManagementApi: FpTpWorkflowsManagementApi;
}): Promise<WorkflowExecutionDto> => {
  const startTime = Date.now();

  const fetchExecution = async (includeOutput: boolean): Promise<WorkflowExecutionDto> => {
    const execution = await workflowsManagementApi.getWorkflowExecution(executionId, spaceId, {
      includeOutput,
    });

    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    return execution;
  };

  for (let attempt = 0; ; attempt += 1) {
    const current = await fetchExecution(false);

    if (isTerminalStatus(current.status as ExecutionStatus)) {
      break;
    }

    if (Date.now() - startTime >= maxWaitMs) {
      throw new Error(`Workflow timed out after ${maxWaitMs}ms (execution: ${executionId})`);
    }

    const nextPollInMs = Math.min(
      DEFAULT_MAX_POLL_INTERVAL_MS,
      Math.round(DEFAULT_POLL_INTERVAL_MS * POLL_BACKOFF_MULTIPLIER ** attempt)
    );

    logger.debug(
      () =>
        `Waiting for FP/TP analysis workflow to complete (execution: ${executionId}, status: ${current.status}, nextPollInMs: ${nextPollInMs})`
    );

    await delay(nextPollInMs);
  }

  return fetchExecution(true);
};
