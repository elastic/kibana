/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../../common/constants';
import { createMaintenanceSystemRequest } from '../../maintenance/system_request';

// The managed continuous and sync workflows used to be single unsuffixed documents in the default
// space. They are now installed per space as `${id}-${spaceId}`.
const LEGACY_MANAGED_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
] as const;

/**
 * Cancels the executions of, and deletes, the workflows that were installed in the default space
 * before continuous onboarding and sync became per-space.
 *
 * Fully best-effort: every failure is logged and swallowed, so it can run on each install without
 * ever blocking startup. It is idempotent, so a document that survives one attempt goes on the
 * next one.
 */
export const removeLegacyDefaultSpaceWorkflows = async ({
  getManagedWorkflowsClient,
  managementApi,
  logger,
}: {
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  managementApi: WorkflowsServerPluginSetup['management'];
  logger: Pick<Logger, 'info' | 'warn'>;
}): Promise<void> => {
  const request = createMaintenanceSystemRequest();

  const attempt = async (label: string, run: () => Promise<void>): Promise<void> => {
    try {
      await run();
    } catch (error) {
      logger.warn(
        `Failed to remove legacy workflow ${label}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const cancelExecutions = async (id: string): Promise<void> => {
    try {
      await managementApi.cancelAllActiveWorkflowExecutions(id, DEFAULT_SPACE_ID, request);
    } catch (error) {
      if (!(error instanceof WorkflowNotFoundError)) {
        throw error;
      }
    }
  };

  for (const id of LEGACY_MANAGED_WORKFLOW_IDS) {
    await attempt(id, async () => {
      await cancelExecutions(id);
      const client = await getManagedWorkflowsClient();
      await client.uninstall(id, { spaceId: DEFAULT_SPACE_ID });
    });
  }

  await attempt(LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID, async () => {
    const existing = await managementApi.getWorkflow(
      LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
      DEFAULT_SPACE_ID,
      request
    );
    if (!existing) {
      return;
    }

    await cancelExecutions(LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID);

    const { deleted, failures } = await managementApi.deleteWorkflows(
      [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      DEFAULT_SPACE_ID,
      request,
      { force: true }
    );
    if (deleted === 0 && failures.length > 0) {
      throw new Error(failures.map(({ id, error }) => `${id}: ${error}`).join('; '));
    }

    logger.info(`Deleted legacy workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
  });
};
