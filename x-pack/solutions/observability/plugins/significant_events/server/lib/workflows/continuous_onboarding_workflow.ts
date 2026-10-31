/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import {
  getNightshiftBoundKiContinuousOnboardingWorkflowId,
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { SignificantEventsServer } from '../../types';
import type { SignificantEventsKIsOnboardingClient } from './onboarding_workflow_client';
import { pollUntil } from './poll_until';
import { requireDetectionEngineAccountId } from '../service_accounts/detection_engine_account';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from './managed_workflow_owner';

export interface ContinuousOnboardingWorkflowService {
  /**
   * Reconciles the continuous onboarding workflow of a space when the user
   * toggles the feature on or off there. The workflow is bound to the space's
   * detection engine service account, so changing it needs `manage_security`.
   *
   * - Enabling installs the `<id>-<spaceId>` document bound to the account and
   *   enables it (which schedules its trigger). A space that is not set up has no
   *   account, and is refused.
   * - Disabling disables the document and cancels any in-flight executions. The
   *   document is kept so its execution history survives, and the next enable
   *   reuses it.
   *
   * Should be invoked only on an actual enabled-state transition.
   */
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void>;
}

export const createContinuousOnboardingWorkflowService = ({
  logger,
  managementApi,
  streamsKIsOnboardingClient,
  server,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  server: Pick<SignificantEventsServer, 'core' | 'workflowsExtensions'>;
}): ContinuousOnboardingWorkflowService => {
  const log = logger.get('continuous-ki-onboarding-workflow');

  const getNonTerminalExecutions = async ({
    workflowId,
    spaceId,
    request,
  }: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
  }) => {
    const { results, total } = await managementApi.getWorkflowExecutions(
      {
        workflowId,
        request,
        statuses: [...NonTerminalExecutionStatuses],
      },
      spaceId
    );
    return { results, total };
  };

  const cancelAndAwaitTermination = async ({
    workflowId,
    spaceId,
    request,
  }: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
  }) => {
    const { results } = await getNonTerminalExecutions({ workflowId, spaceId, request });
    if (results.length === 0) {
      return;
    }

    await Promise.all(
      results.map((result) => managementApi.cancelWorkflowExecution(result.id, spaceId, request))
    );

    log.debug(() => `Requested cancellation for ${results.length} running workflow execution(s)`);

    await pollUntil(
      () => getNonTerminalExecutions({ workflowId, spaceId, request }),
      ({ total }) => total === 0
    );
  };

  const setManagedEnabled = async ({
    enabled,
    workflowId,
    spaceId,
    request,
  }: {
    enabled: boolean;
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
  }) => {
    const existing = await managementApi.getClient(request).getWorkflow(workflowId, spaceId);

    if (!existing) {
      if (enabled) {
        throw new Error(
          `Managed continuous onboarding workflow ${workflowId} is not installed yet`
        );
      }
      return;
    }

    if ((existing.enabled ?? false) === enabled) {
      return;
    }

    await managementApi.updateWorkflow(workflowId, { enabled }, spaceId, request);
  };

  return {
    async ensureWorkflow({ enabled, request, spaceId }) {
      const workflowId = getNightshiftBoundKiContinuousOnboardingWorkflowId(spaceId);

      if (enabled) {
        const serviceAccountId = await requireDetectionEngineAccountId({
          core: server.core,
          spaceId,
        });
        if (!server.workflowsExtensions) {
          throw new Error('Workflows are not available');
        }
        // Installed with the caller's request: binding a workflow to the account needs it.
        const client = await server.workflowsExtensions.getClient(request);
        await client.managedWorkflows.install(
          SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
          NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
          { spaceId, workflowIdSuffix: spaceId, values: { serviceAccountId } }
        );
        await setManagedEnabled({ enabled: true, workflowId, spaceId, request });
        log.info(`Enabled continuous KI onboarding workflow in space ${spaceId}`);
        return;
      }

      // Disabling: stop scheduling new runs and drain in-flight work. The document
      // stays: uninstalling force-deletes it, which purges its execution history.
      await setManagedEnabled({ enabled: false, workflowId, spaceId, request });

      await cancelAndAwaitTermination({ workflowId, spaceId, request }).catch((err) =>
        log.warn(`Failed to cancel running continuous onboarding executions: ${err}`)
      );

      await streamsKIsOnboardingClient
        .cancelAllRunning({ request })
        .catch((err) => log.warn(`Failed to cancel running onboarding workflows: ${err}`));

      log.info(`Disabled continuous KI onboarding workflow in space ${spaceId}`);
    },
  };
};
