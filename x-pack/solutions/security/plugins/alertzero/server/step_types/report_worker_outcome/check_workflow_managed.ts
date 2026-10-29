/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { ManagedWorkflowStateApi } from '@kbn/workflows/server/types';
import { describeError } from './describe_error';
import type { ReportWorkerOutcomeSkipReason } from './skip_reasons';
import { withTimeout } from './with_timeout';

export interface CheckWorkflowManagedParams {
  abortSignal: AbortSignal;
  /** Whether Kibana service accounts are on; AlertZero starts no managed workflows client without them. */
  areServiceAccountsEnabled: () => boolean;
  getManagedWorkflowState: () => Promise<ManagedWorkflowStateApi | undefined>;
  hopTimeoutMs: number;
  /** Says at debug why the check failed; the caller logs only the skip reason. */
  logger: Logger;
  spaceId: string;
  workflowId: string;
}

/**
 * Checks, through AlertZero's owner-bound managed workflows client, that the reporting workflow id
 * is one AlertZero installed: in the execution space, else in the global space its shared Workers
 * live in. Returns the skip reason when it is not, or cannot be verified. It is a cheap pre-check,
 * not the authorization: an inline run can carry an installed id, so `verifyWorkerChain` decides
 * from the persisted executions' managed fields.
 */
export const checkWorkflowManaged = async ({
  abortSignal,
  areServiceAccountsEnabled,
  getManagedWorkflowState,
  hopTimeoutMs,
  logger,
  spaceId,
  workflowId,
}: CheckWorkflowManagedParams): Promise<ReportWorkerOutcomeSkipReason | undefined> => {
  if (abortSignal.aborted) {
    return 'aborted';
  }
  try {
    const managedWorkflowState = await withTimeout(
      getManagedWorkflowState(),
      hopTimeoutMs,
      abortSignal
    );
    if (!managedWorkflowState) {
      // With service accounts off, AlertZero never starts its managed workflows client, so no
      // run can be verified, and saying so is more accurate than a lineage failure.
      return areServiceAccountsEnabled() ? 'lineage_unavailable' : 'service_accounts_disabled';
    }
    const readState = (inSpaceId: string) =>
      withTimeout(
        managedWorkflowState.getInstalledWorkflowState(workflowId, inSpaceId),
        hopTimeoutMs,
        abortSignal
      );

    const installed =
      (await readState(spaceId)) ??
      (spaceId === GLOBAL_WORKFLOW_SPACE_ID ? null : await readState(GLOBAL_WORKFLOW_SPACE_ID));
    return installed ? undefined : 'not_managed';
  } catch (error) {
    if (abortSignal.aborted) {
      return 'aborted';
    }
    logger.debug(() => `Could not check that ${workflowId} is managed: ${describeError(error)}`);
    return 'lineage_unavailable';
  }
};
