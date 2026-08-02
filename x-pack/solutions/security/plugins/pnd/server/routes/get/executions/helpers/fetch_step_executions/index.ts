/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';

export interface FetchStepExecutionsParams {
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  /** Incoming request, forwarded so the management client can assert managed-execution read. */
  request?: KibanaRequest;
  /** Workflow execution (run) ids to read step executions from — the correlated Deep/Detection runs. */
  runIds: readonly string[];
  /** Space resolved from the request (security finding S9); enforced by `getWorkflowExecution`. */
  spaceId: string;
}

/**
 * Read the step executions for a set of correlated runs and flatten them into one list. The runs
 * list correlation returns list items (no step executions), so the four-phase projection re-reads
 * each correlated run's full execution once to get its `stepExecutions`. `getWorkflowExecution`
 * enforces exact `spaceId` equality (S9), so no run from another space leaks. A per-run failure
 * degrades to an empty contribution rather than failing the whole projection.
 */
export const fetchStepExecutions = async ({
  logger,
  managementClient,
  request,
  runIds,
  spaceId,
}: FetchStepExecutionsParams): Promise<WorkflowStepExecutionDto[]> => {
  const perRun = await Promise.all(
    runIds.map(async (runId): Promise<WorkflowStepExecutionDto[]> => {
      try {
        const full =
          request == null
            ? await managementClient.getWorkflowExecution(runId, spaceId)
            : await managementClient.getWorkflowExecution(runId, spaceId, { request });
        return full?.stepExecutions ?? [];
      } catch (error) {
        logger.debug(
          () =>
            `Failed to read step executions for run "${runId}": ${
              error instanceof Error ? error.message : String(error)
            }`
        );
        return [];
      }
    })
  );

  return perRun.flat();
};
