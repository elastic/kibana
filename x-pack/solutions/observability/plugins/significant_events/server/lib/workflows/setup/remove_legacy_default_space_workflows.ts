/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  type ManagedWorkflowId,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../../common/constants';
import { createMaintenanceSystemRequest } from '../../maintenance/system_request';
import { pollUntil } from '../poll_until';

// The managed continuous and sync workflows used to be single unsuffixed documents in the default
// space. They are now installed per space as `${id}-${spaceId}`.
const DEFAULT_SPACE_SYNC_WORKFLOW_ID = `${SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID}-${DEFAULT_SPACE_ID}`;

const continuousOnboardingResetWarning = (id: string): string =>
  `Removed enabled legacy continuous KI onboarding workflow ${id} from the default space. ` +
  'Continuous onboarding is now a per-space setting and stays off until it is turned on again ' +
  'in each space.';

type ManagementApi = WorkflowsServerPluginSetup['management'];

/**
 * Disables a default-space workflow and waits until none of its executions is still active.
 *
 * Force-delete rejects a workflow that has a non-terminal execution, and a cancel only flags
 * running and waiting executions: they turn terminal when the execution loop next wakes up.
 * Disabling first keeps the schedule from starting a new run while this waits.
 */
const stopAndDrain = async ({
  managementApi,
  id,
  request,
}: {
  managementApi: ManagementApi;
  id: string;
  request: KibanaRequest;
}): Promise<{ exists: boolean; wasEnabled: boolean }> => {
  const existing = await managementApi.getWorkflow(id, DEFAULT_SPACE_ID, request);
  if (!existing) {
    return { exists: false, wasEnabled: false };
  }

  if (existing.enabled) {
    await managementApi.updateWorkflow(id, { enabled: false }, DEFAULT_SPACE_ID, request);
  }
  await managementApi.cancelAllActiveWorkflowExecutions(id, DEFAULT_SPACE_ID, request);
  await pollUntil(
    () =>
      managementApi.getWorkflowExecutions(
        { workflowId: id, request, statuses: [...NonTerminalExecutionStatuses] },
        DEFAULT_SPACE_ID
      ),
    ({ total }) => total === 0
  );

  return { exists: true, wasEnabled: existing.enabled === true };
};

const uninstallLegacyManagedWorkflow = async ({
  getManagedWorkflowsClient,
  managementApi,
  id,
  request,
}: {
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  managementApi: ManagementApi;
  id: ManagedWorkflowId;
  request: KibanaRequest;
}): Promise<boolean> => {
  const { exists, wasEnabled } = await stopAndDrain({ managementApi, id, request });
  if (exists) {
    const client = await getManagedWorkflowsClient();
    await client.uninstall(id, { spaceId: DEFAULT_SPACE_ID });
  }
  return wasEnabled;
};

/**
 * Stops and uninstalls the unsuffixed continuous onboarding document of the default space, once
 * its active executions have finished cancelling. A missing document is a no-op.
 *
 * Resolves to whether the document was enabled. Throws when it could not be removed.
 *
 * TODO: delete with {@link removeLegacyDefaultSpaceWorkflows}.
 * https://github.com/elastic/kibana/issues/294271
 */
export const removeLegacyContinuousOnboardingWorkflow = ({
  getManagedWorkflowsClient,
  managementApi,
  request,
}: {
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  managementApi: ManagementApi;
  request: KibanaRequest;
}): Promise<boolean> =>
  uninstallLegacyManagedWorkflow({
    getManagedWorkflowsClient,
    managementApi,
    id: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    request,
  });

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
 *
 * TODO: delete once no supported upgrade path can skip a version that runs it.
 * https://github.com/elastic/kibana/issues/294271
 */
export const removeLegacyDefaultSpaceWorkflows = async ({
  getManagedWorkflowsClient,
  managementApi,
  logger,
}: {
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  managementApi: ManagementApi;
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

  await attempt(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, async () => {
    const wasEnabled = await removeLegacyContinuousOnboardingWorkflow({
      getManagedWorkflowsClient,
      managementApi,
      request,
    });
    if (wasEnabled) {
      logger.warn(
        continuousOnboardingResetWarning(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID)
      );
    }
  });

  await attempt(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, async () => {
    const replacement = await managementApi.getWorkflow(
      DEFAULT_SPACE_SYNC_WORKFLOW_ID,
      DEFAULT_SPACE_ID,
      request
    );
    if (replacement?.enabled !== true) {
      return;
    }
    await uninstallLegacyManagedWorkflow({
      getManagedWorkflowsClient,
      managementApi,
      id: SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      request,
    });
  });

  await attempt(LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID, async () => {
    const { exists, wasEnabled } = await stopAndDrain({
      managementApi,
      id: LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
      request,
    });
    if (!exists) {
      return;
    }

    const { deleted, failures } = await managementApi.deleteWorkflows(
      [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      DEFAULT_SPACE_ID,
      request,
      { force: true }
    );
    if (deleted === 0 && failures.length > 0) {
      throw new Error(failures.map(({ id, error }) => `${id}: ${error}`).join('; '));
    }

    if (wasEnabled) {
      logger.warn(continuousOnboardingResetWarning(LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID));
    } else {
      logger.info(`Deleted legacy workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
    }
  });
};
