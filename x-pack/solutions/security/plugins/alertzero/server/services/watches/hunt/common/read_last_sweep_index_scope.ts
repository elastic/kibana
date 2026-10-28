/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { HuntScope } from '@kbn/alertzero-common';
import type { WatchWorkflowsManagementClient } from '../../watch_workflows_management_client';

/** The Hunt worker's gate step; its output is the `HuntScope` the sweep evaluated. */
export const CHECK_INDEX_SCOPE_STEP_ID = 'check_index_scope';

export interface LastSweepIndexScope {
  /** When the gate step finished (or started, when it has no finish time). */
  checkedAt: string;
  executionId: string;
  /** The scope the service account saw; undefined when the step left no readable output. */
  scope: HuntScope | undefined;
}

interface ReadLastSweepIndexScopeParams {
  management: WatchWorkflowsManagementClient;
  executionId: string;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Reads the worker service account's own view of the hunt universe from one sweep execution:
 * the stored `check_index_scope` step output. Returns `undefined` when the execution is
 * missing or the read fails, so callers degrade instead of throwing.
 */
export const readLastSweepIndexScope = async ({
  management,
  executionId,
  spaceId,
  request,
  logger,
}: ReadLastSweepIndexScopeParams): Promise<LastSweepIndexScope | undefined> => {
  try {
    const execution = await management.getWorkflowExecution(executionId, spaceId, request, {
      includeOutput: true,
    });
    if (!execution) return undefined;

    const step = execution.stepExecutions.find(
      ({ stepId }) => stepId === CHECK_INDEX_SCOPE_STEP_ID
    );
    if (!step)
      return {
        checkedAt: execution.finishedAt ?? execution.startedAt,
        executionId,
        scope: undefined,
      };

    const parsed = HuntScope.safeParse(step.output);
    return {
      checkedAt: step.finishedAt ?? step.startedAt,
      executionId,
      scope: parsed.success ? parsed.data : undefined,
    };
  } catch (err) {
    logger.debug(
      `Reading the index scope of hunt execution ${executionId} failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return undefined;
  }
};

/**
 * The index scope of the newest finished sweep of one workflow, or `undefined` when no sweep has
 * finished or the lookup fails (logged at debug). `skipped` and in-progress runs never count.
 */
export const readLatestFinishedSweepIndexScope = async ({
  management,
  workflowId,
  spaceId,
  request,
  logger,
}: {
  management: WatchWorkflowsManagementClient;
  workflowId: string;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<LastSweepIndexScope | undefined> => {
  let latest: { id: string } | undefined;
  try {
    latest = await management.getLatestFinishedWorkflowExecution(workflowId, spaceId, request);
  } catch (err) {
    logger.debug(
      `Reading the latest finished hunt execution of ${workflowId} failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return undefined;
  }
  if (!latest) return undefined;
  return readLastSweepIndexScope({ management, executionId: latest.id, spaceId, request, logger });
};
