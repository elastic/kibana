/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { SignificantEventsKIsOnboardingClient } from './onboarding_workflow_client';
import { pollUntil } from './poll_until';
import { removeLegacyContinuousOnboardingWorkflow } from './setup/remove_legacy_default_space_workflows';

export interface ContinuousOnboardingWorkflowService {
  /**
   * Reconciles the continuous onboarding workflow of a space when the user
   * toggles the feature on or off there.
   *
   * - Enabling installs the `<id>-<spaceId>` document and enables it (which
   *   schedules its trigger).
   * - Disabling disables the document and cancels any in-flight executions. The
   *   document is kept so its execution history survives, and the next enable
   *   reuses it.
   * - In the default space, either transition also removes the unsuffixed
   *   pre-per-space document if startup has not removed it yet.
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
  getManagedWorkflowsClient,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
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
      const workflowId = `${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${spaceId}`;
      const managedWorkflowOptions = { spaceId, workflowIdSuffix: spaceId };

      // Startup removes the unsuffixed default-space document, but that cleanup is best-effort
      // and runs in the background, so the document can still be there when the setting is
      // toggled. Keeping it next to `${id}-default` shows two "Continuous KI Onboarding"
      // workflows, and an enabled leftover keeps scheduling runs whatever the setting says.
      // TODO: remove with the legacy default-space cleanup.
      // https://github.com/elastic/kibana/issues/294271
      if (spaceId === DEFAULT_SPACE_ID) {
        await removeLegacyContinuousOnboardingWorkflow({
          getManagedWorkflowsClient,
          managementApi,
          request,
        }).catch((error: unknown) =>
          log.warn(`Failed to remove legacy default-space continuous onboarding workflow: ${error}`)
        );
      }

      if (enabled) {
        const managedWorkflowsClient = await getManagedWorkflowsClient();
        await managedWorkflowsClient.install(
          SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
          managedWorkflowOptions
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
