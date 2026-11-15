/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { HUNT_LABEL_OWNER_ID } from './execution_labels';
import {
  HANDOFF_CLEANUP_EXHAUSTED,
  HANDOFF_CLEANUP_REQUIRED,
  HANDOFF_PENDING,
  isStalePendingHandoff,
} from './handoff_cleanup';
import { MANUAL_SESSION_IMMUTABLE_LABEL_KEYS } from './manual_session';

export const HANDOFF_SWEEPER_TASK_TYPE = 'alertzero:hunt_handoff_sweeper';
export const HANDOFF_SWEEPER_TASK_ID = 'alertzero-hunt-handoff-sweeper';
/** Next sweep while any handoff is pending or flagged for cleanup. */
export const HANDOFF_SWEEP_BUSY_INTERVAL_MS = 60 * 1000;
/** Next sweep when nothing is stuck. */
export const HANDOFF_SWEEP_IDLE_INTERVAL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 100;

export interface HandoffSweepResult {
  /** Stale pending handoffs this sweep flagged for cleanup. */
  flagged: number;
  /** Sessions awaiting cleanup after this sweep. */
  cleanupRequired: number;
  /** Sessions whose cleanup gave up and need an operator. */
  exhausted: number;
  nextRunInMs: number;
}

/**
 * Finds Hunt sessions whose handoff did not complete, and flags the abandoned ones. It works from
 * execution labels alone and runs with no user request, so it cannot read or delete Investigations:
 * that is done under a user request, by the session owner's next preservation or an operator's retry.
 * What it adds is visibility: an abandoned `pending_handoff` becomes `handoff_cleanup_required`, which
 * run history shows and the phase exit checks block on, and sessions needing an operator are counted.
 */
export const runHandoffSweep = async ({
  listSpaceIds,
  management,
  logger,
  now = () => new Date(),
}: {
  listSpaceIds: () => Promise<string[]>;
  management: WatchWorkflowsManagementClient;
  logger: Logger;
  now?: () => Date;
}): Promise<HandoffSweepResult> => {
  let flagged = 0;
  let freshPending = 0;
  let cleanupRequired = 0;
  let exhausted = 0;

  const find = (spaceId: string, outcome: string) =>
    management.findExecutionsByLabel({
      workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
      key: 'hunt.outcome',
      value: outcome,
      spaceId,
      request: undefined,
      size: PAGE_SIZE,
    });

  for (const spaceId of await listSpaceIds()) {
    try {
      for (const { id, labels } of await find(spaceId, HANDOFF_PENDING)) {
        if (!labels) continue;
        if (!isStalePendingHandoff(labels, now())) {
          freshPending++;
          continue;
        }
        await management.updateExecutionLabels({
          executionId: id,
          spaceId,
          workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
          labelOwnerId: HUNT_LABEL_OWNER_ID,
          labels: {
            'hunt.outcome': HANDOFF_CLEANUP_REQUIRED,
            ...(labels['hunt.preservation_id']
              ? { 'hunt.cleanup_operation_id': labels['hunt.preservation_id'] }
              : {}),
          },
          immutableKeys: MANUAL_SESSION_IMMUTABLE_LABEL_KEYS,
        });
        flagged++;
      }
      cleanupRequired += (await find(spaceId, HANDOFF_CLEANUP_REQUIRED)).length;
      exhausted += (await find(spaceId, HANDOFF_CLEANUP_EXHAUSTED)).length;
    } catch (error) {
      logger.warn(
        `Hunt handoff sweep could not read space ${spaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (exhausted > 0) {
    logger.warn(
      `${exhausted} Hunt session(s) have a handoff cleanup that gave up. Retry it with POST /internal/alertzero/hunt/handoff_cleanup/retry.`
    );
  }

  const busy = freshPending > 0 || flagged > 0 || cleanupRequired > 0;
  return {
    flagged,
    cleanupRequired,
    exhausted,
    nextRunInMs: busy ? HANDOFF_SWEEP_BUSY_INTERVAL_MS : HANDOFF_SWEEP_IDLE_INTERVAL_MS,
  };
};
