/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { getGateDefinition } from '@kbn/pnd-common';

import {
  listPendingPndGates,
  PND_PENDING_GATES_MAX_RUNS,
} from '../../../../../lib/list_pending_pnd_gates';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';

/**
 * Upper bound on parked runs read per request. The HITL queue is a transient working set (a
 * handful of live incidents), so a single bounded page with no cursor is enough — the same bound
 * the proposals list uses.
 */
export const PND_PENDING_GATES_PAGE_SIZE = PND_PENDING_GATES_MAX_RUNS;

export interface ResolvePendingGateStepExecutionIdsParams {
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  /** Space resolved from the request (security finding S9). */
  spaceId: string;
}

/**
 * Address the pending HITL gates parked on each workflow run in the space, as
 * `workflowRunId → step execution ids`, so a run card can both badge how many humans it is waiting
 * on and — when there is exactly one — deep-link to that gate's step (plan F1). The count is the
 * array's length, so the badge and the link can never disagree.
 *
 * Reads the space's pending PND gates once via {@link listPendingPndGates} — which starts from the
 * watches' parked runs, so gates owned by a global (`'*'`) managed watch are found rather than
 * silently dropped (bead `kibana-idjb.21`) — and buckets them by `workflowRunId`, keeping only
 * steps that resolve to a registered PND gate via `getGateDefinition(workflowId, stepId)`. That
 * check is retained as defense in depth even though {@link listPendingPndGates} now filters to
 * registered gates itself (D4): two independent barriers, not redundancy. A failing listing
 * degrades to an empty map (every run reported as `0` pending, every link execution-level) rather
 * than failing the whole runs listing.
 */
export const resolvePendingGateStepExecutionIds = async ({
  logger,
  managementClient,
  spaceId,
}: ResolvePendingGateStepExecutionIdsParams): Promise<Map<string, readonly string[]>> => {
  try {
    const { results } = await listPendingPndGates({
      logger,
      managementClient,
      size: PND_PENDING_GATES_PAGE_SIZE,
      spaceId,
    });

    return results.reduce<Map<string, readonly string[]>>((byRunId, step) => {
      if (getGateDefinition(step.workflowId, step.stepId) == null) {
        return byRunId;
      }
      return byRunId.set(step.workflowRunId, [...(byRunId.get(step.workflowRunId) ?? []), step.id]);
    }, new Map());
  } catch (error) {
    logger.debug(
      () =>
        `Failed to resolve pending gate step executions: ${
          error instanceof Error ? error.message : String(error)
        }`
    );
    return new Map();
  }
};
