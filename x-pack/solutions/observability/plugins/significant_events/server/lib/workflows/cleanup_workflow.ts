/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { stateBlocksNewActivity } from '../../../common/maintenance/state_machine';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';

/**
 * Per-space workflows bootstrapped on every discovery execution. They are independent of the
 * scheduled-discovery toggle, so a space with events keeps cleaning up and progressing their
 * status even when scheduled discovery is off.
 */
const BOOTSTRAPPED_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_STATUS_RECONCILE_WORKFLOW_ID,
] as const;

export interface CleanupWorkflowService {
  /**
   * Ensures the per-space managed Significant Events cleanup and status reconciliation workflows
   * are installed and enabled.
   *
   * Enabling schedules the workflow's trigger task under the API key minted from
   * the discovery request. Idempotent: an already-enabled workflow returns after
   * one read, while a missing workflow is installed with the space ID suffix.
   */
  ensureEnabled(params: { request: KibanaRequest; spaceId: string }): Promise<void>;
}

/** Best-effort enables the cleanup and status workflows when Significant Events activity is allowed. */
export const bootstrapCleanupWorkflow = async ({
  cleanupWorkflowService,
  maintenanceService,
  request,
  spaceId,
  logger,
}: {
  cleanupWorkflowService: CleanupWorkflowService | undefined;
  maintenanceService: SignificantEventsMaintenanceService;
  request: KibanaRequest;
  spaceId: string;
  logger: Pick<Logger, 'warn'>;
}): Promise<void> => {
  if (!cleanupWorkflowService) {
    return;
  }
  try {
    const state = await maintenanceService.getState({ request });
    if (stateBlocksNewActivity(state)) {
      return;
    }
    await cleanupWorkflowService.ensureEnabled({ request, spaceId });
  } catch (error) {
    logger.warn(
      `Failed to ensure Significant Events cleanup and status workflows are enabled: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const createCleanupWorkflowService = ({
  logger,
  managementApi,
  getManagedWorkflowsClient,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
}): CleanupWorkflowService => {
  const log = logger.get('cleanup-workflow');

  const ensureWorkflowEnabled = async ({
    workflowId,
    request,
    spaceId,
  }: {
    workflowId: (typeof BOOTSTRAPPED_WORKFLOW_IDS)[number];
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void> => {
    const workflowDocumentId = `${workflowId}-${spaceId}`;
    let existing = await managementApi.getClient(request).getWorkflow(workflowDocumentId, spaceId);

    if (!existing) {
      const managedWorkflowsClient = await getManagedWorkflowsClient();
      await managedWorkflowsClient.install(workflowId, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
      existing = await managementApi.getClient(request).getWorkflow(workflowDocumentId, spaceId);
      if (!existing) {
        log.warn(`Managed workflow ${workflowDocumentId} was not installed; skipping enablement`);
        return;
      }
    }

    if (existing.enabled ?? false) {
      return;
    }

    await managementApi.updateWorkflow(workflowDocumentId, { enabled: true }, spaceId, request);

    log.info(`Enabled Significant Events workflow ${workflowDocumentId}`);
  };

  return {
    async ensureEnabled({ request, spaceId }) {
      // Attempt every workflow, so one failing install cannot keep the others from being enabled.
      const results = await Promise.allSettled(
        BOOTSTRAPPED_WORKFLOW_IDS.map((workflowId) =>
          ensureWorkflowEnabled({ workflowId, request, spaceId })
        )
      );
      const failure = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );
      if (failure) {
        throw failure.reason;
      }
    },
  };
};
