/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../../common/constants';
import { createMaintenanceSystemRequest } from '../../maintenance/system_request';
import { pollUntil } from '../poll_until';

// The managed continuous onboarding and sync workflows, unsuffixed in the default space and later
// per space, are no longer registered: the workflows platform deletes their documents at startup.

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

/**
 * Cancels the executions of, and deletes, the unmanaged continuous KI extraction workflow that was
 * installed in the default space before continuous onboarding became a managed workflow.
 *
 * Fully best-effort: every failure is logged and swallowed, so it can run on each install without
 * ever blocking startup. It is idempotent, so a document that fails to go is retried on the next
 * startup.
 *
 * TODO: delete once no supported upgrade path can skip a version that runs it.
 * https://github.com/elastic/kibana/issues/294271
 */
export const removeLegacyDefaultSpaceWorkflows = async ({
  managementApi,
  logger,
}: {
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
