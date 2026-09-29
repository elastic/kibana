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
  type ManagedWorkflowId,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../../common/constants';
import { createMaintenanceSystemRequest } from '../../maintenance/system_request';

// The managed continuous and sync workflows used to be single unsuffixed documents in the default
// space. They are now installed per space as `${id}-${spaceId}`.
const DEFAULT_SPACE_SYNC_WORKFLOW_ID = `${SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID}-${DEFAULT_SPACE_ID}`;

const continuousOnboardingResetWarning = (id: string): string =>
  `Removed enabled legacy continuous KI onboarding workflow ${id} from the default space. ` +
  'Continuous onboarding is now a per-space setting and stays off until it is turned on again ' +
  'in each space.';

/**
 * Cancels the executions of, and deletes, the workflows that were installed in the default space
 * before continuous onboarding and sync became per-space.
 *
 * Continuous onboarding is not carried over: turning its workflow on needs a user API key, which
 * startup does not have, so an enabled legacy document is removed with a warning.
 *
 * The legacy sync document is kept until `${id}-default` is enabled. It already runs under a user
 * API key and startup upgrades it to the per-space YAML, so it keeps reconciling the default space
 * in the meantime. Removing it sooner would leave the space unreconciled until the next inferred
 * identification there.
 *
 * Fully best-effort: every failure is logged and swallowed, so it can run on each install without
 * ever blocking startup. It is idempotent, so a document that fails to go is retried on the next
 * startup.
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

  const isEnabled = async (id: string): Promise<boolean> =>
    (await managementApi.getWorkflow(id, DEFAULT_SPACE_ID, request))?.enabled === true;

  const uninstallManaged = async (id: ManagedWorkflowId): Promise<void> => {
    await cancelExecutions(id);
    const client = await getManagedWorkflowsClient();
    await client.uninstall(id, { spaceId: DEFAULT_SPACE_ID });
  };

  await attempt(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, async () => {
    const wasEnabled = await isEnabled(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID);
    await uninstallManaged(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID);
    if (wasEnabled) {
      logger.warn(
        continuousOnboardingResetWarning(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID)
      );
    }
  });

  await attempt(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, async () => {
    if (!(await isEnabled(DEFAULT_SPACE_SYNC_WORKFLOW_ID))) {
      return;
    }
    await uninstallManaged(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID);
  });

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

    if (existing.enabled) {
      logger.warn(continuousOnboardingResetWarning(LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID));
    } else {
      logger.info(`Deleted legacy workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
    }
  });
};
