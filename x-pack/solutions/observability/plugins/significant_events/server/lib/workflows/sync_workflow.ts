/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { removeLegacySyncWorkflow } from './setup/remove_legacy_default_space_workflows';

export interface SyncWorkflowService {
  /**
   * Ensures the per-space managed KI sync (groundedness) sweep workflow is
   * installed and enabled.
   *
   * Enabling schedules the workflow's trigger task under the API key minted from
   * the given request (the install path only writes the document and never
   * schedules the trigger). Idempotent: a single `getWorkflow` read short-
   * circuits when the workflow is already enabled, so it is cheap to call from
   * the hot extraction path, while a missing workflow is installed with the space
   * ID suffix. Once enabled, the persisted Task Manager task keeps firing on its
   * own schedule, independent of extraction.
   */
  ensureEnabled(params: { request: KibanaRequest; spaceId: string }): Promise<void>;
}

export const createSyncWorkflowService = ({
  logger,
  managementApi,
  getManagedWorkflowsClient,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
}): SyncWorkflowService => {
  const log = logger.get('ki-sync-workflow');

  return {
    async ensureEnabled({ request, spaceId }) {
      const workflowDocumentId = `${SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID}-${spaceId}`;
      let existing = await managementApi
        .getClient(request)
        .getWorkflow(workflowDocumentId, spaceId);

      if (!existing) {
        const managedWorkflowsClient = await getManagedWorkflowsClient();
        await managedWorkflowsClient.install(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        existing = await managementApi.getClient(request).getWorkflow(workflowDocumentId, spaceId);
        if (!existing) {
          log.warn(
            `Managed KI sync workflow ${workflowDocumentId} was not installed; skipping enablement`
          );
          return;
        }
      }

      if (existing.enabled ?? false) {
        return;
      }

      await managementApi.updateWorkflow(workflowDocumentId, { enabled: true }, spaceId, request);

      log.info(`Enabled KI sync workflow in space ${spaceId}`);

      // Retire the pre-per-space legacy document now that its replacement is live.
      // The legacy doc (no suffix, default space) was kept by startup until here to
      // avoid a gap in default-space reconciliation. A bare uninstall is rejected
      // while a sweep is still running, so this waits for its cancelled runs first.
      // Best-effort: a failed removal is not worth re-trying — the next restart will
      // clean it up again.
      if (spaceId === DEFAULT_SPACE_ID) {
        await removeLegacySyncWorkflow({
          getManagedWorkflowsClient,
          managementApi,
          request,
        }).catch((error: unknown) => {
          log.warn(
            `Failed to uninstall legacy default-space sync workflow after enabling its replacement: ${error}`
          );
        });
      }
    },
  };
};
