/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus, isTerminalStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import pLimit from 'p-limit';
import {
  INVESTIGATE_STEP_ID,
  investigationStateSchema,
  type InvestigationRunStatus,
} from '@kbn/significant-events-schema';

const INVESTIGATION_STATUS_READ_CONCURRENCY = 5;

export const resolveStatusFromExecution = (
  execution: Pick<WorkflowExecutionDto, 'status' | 'stepExecutions'>
): InvestigationRunStatus => {
  if (!isTerminalStatus(execution.status)) {
    return 'pending';
  }

  const stepExecution = (execution.stepExecutions ?? [])
    .filter((step) => step.stepId === INVESTIGATE_STEP_ID)
    .sort((a, b) => a.stepExecutionIndex - b.stepExecutionIndex)
    .at(-1);

  if (stepExecution?.error) {
    return 'failed';
  }

  const output = stepExecution?.output as { structured_output?: unknown } | undefined;
  if (investigationStateSchema.safeParse(output?.structured_output).success) {
    return 'complete';
  }

  if (execution.status !== ExecutionStatus.COMPLETED) {
    return 'failed';
  }

  return 'pending';
};

export const resolveInvestigationStatuses = async ({
  workflowsManagement,
  spaceId,
  workflowExecutionIds,
  logger,
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaceId: string;
  workflowExecutionIds: string[];
  logger: Logger;
}): Promise<Record<string, InvestigationRunStatus>> => {
  const uniqueIds = [...new Set(workflowExecutionIds.filter(Boolean))];

  if (!workflowsManagement) {
    logger.debug('Workflows management not available, cannot resolve investigation statuses');
    return Object.fromEntries(uniqueIds.map((id) => [id, 'unavailable'] as const));
  }

  const limit = pLimit(INVESTIGATION_STATUS_READ_CONCURRENCY);
  const entries = await Promise.all(
    uniqueIds.map((id) =>
      limit(async () => {
        try {
          const execution = await workflowsManagement.management.getWorkflowExecution(id, spaceId, {
            includeOutput: true,
          });
          return execution ? ([id, resolveStatusFromExecution(execution)] as const) : undefined;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          logger.debug(
            `Could not resolve investigation status for workflow execution "${id}": ${reason}`
          );
          return [id, 'unavailable'] as const;
        }
      })
    )
  );

  return Object.fromEntries(entries.filter((entry) => entry != null));
};
