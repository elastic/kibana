/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED } from '@kbn/management-settings-ids';
import {
  getNightshiftBoundKiContinuousOnboardingWorkflowId,
  getNightshiftBoundKiSyncWorkflowId,
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  getNightshiftBoundSourceReconciliationWorkflowId,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { StatusError } from '../errors/status_error';
import type { SignificantEventsKIsOnboardingClient } from '../workflows/onboarding_workflow_client';
import type { GetScopedClients } from '../../routes/types';
import {
  DETECTION_ENGINE_WORKLOAD_ID,
  DETECTION_ENGINE_WORKLOAD_TYPE,
  reassignRulesToAccount,
} from './detection_engine_account';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from '../workflows/managed_workflow_owner';
import { pollUntil } from '../workflows/poll_until';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import type { SignificantEventsMaintenanceSummary } from '../../../common/maintenance/types';

/** The ids of the accounts a space is set up with, as the service accounts backend assigned them. */
export interface DetectionEngineServiceAccountIds {
  detectionEngine: string;
}

/** Every workflow the setup binds to the space's account, installed per space. */
const BOUND_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
] as const;

const canManageSecurity = async (core: CoreStart, request: KibanaRequest): Promise<boolean> => {
  const { has_all_requested: allowed } = await core.elasticsearch.client
    .asScoped(request)
    .asCurrentUser.security.hasPrivileges({ cluster: ['manage_security'] });
  return allowed;
};

const assertSpaceExists = async ({
  spaces,
  request,
  spaceId,
}: {
  spaces: SpacesPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
}): Promise<void> => {
  if (!spaces) {
    return;
  }
  try {
    await spaces.spacesService.createSpacesClient(request).get(spaceId);
  } catch (error) {
    if (isBoom(error) && error.output.statusCode === 404) {
      throw new StatusError(`Space [${spaceId}] does not exist.`, 404);
    }
    throw error;
  }
};

/**
 * Sets a space up to run the detection engine as its service accounts. Binding a workload needs an
 * authenticated request with `manage_security`, so setup is an explicit admin action.
 */
export const createServiceAccountSetupService = ({
  core,
  spaces,
  workflowsExtensions,
  workflowsManagement,
  onboardingClient,
  getScopedClients,
  maintenanceService,
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  workflowsManagement: WorkflowsServerPluginSetup['management'] | undefined;
  onboardingClient: SignificantEventsKIsOnboardingClient | undefined;
  getScopedClients: GetScopedClients;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState' | 'pause'>;
}) => {
  /** Refuses before anything is written: 400 when service accounts are off, 403, then 404. */
  const assertCanSetUp = async (request: KibanaRequest, spaceId: string): Promise<void> => {
    if (!core.security.serviceAccounts.isEnabled()) {
      throw new StatusError(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.',
        400
      );
    }
    if (!(await canManageSecurity(core, request))) {
      throw new StatusError(
        'Setting up the detection engine service accounts requires the manage_security cluster privilege.',
        403
      );
    }
    await assertSpaceExists({ spaces, request, spaceId });
  };

  /** Enables an installed workflow that is off. */
  const switchOn = async ({
    management,
    request,
    spaceId,
    workflowId,
  }: {
    management: WorkflowsServerPluginSetup['management'];
    request: KibanaRequest;
    spaceId: string;
    workflowId: string;
  }): Promise<void> => {
    const workflow = await management.getWorkflow(workflowId, spaceId, request);
    if (workflow?.enabled === false) {
      await management.updateWorkflow(workflowId, { enabled: true }, spaceId, request);
    }
  };

  /** Waits until a workflow has no run going: a bound workflow cannot be deleted while it runs. */
  const waitForNoRuns = ({
    management,
    request,
    spaceId,
    workflowId,
  }: {
    management: WorkflowsServerPluginSetup['management'];
    request: KibanaRequest;
    spaceId: string;
    workflowId: string;
  }): Promise<unknown> =>
    pollUntil(
      () =>
        management.getWorkflowExecutions(
          { workflowId, request, statuses: [...NonTerminalExecutionStatuses] },
          spaceId
        ),
      ({ total }) => total === 0
    );

  const enable = async ({
    request,
    spaceId,
    serviceAccountIds,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountIds: DetectionEngineServiceAccountIds;
  }): Promise<{
    spaceId: string;
    serviceAccountIds: DetectionEngineServiceAccountIds;
    rules: { reassigned: number; failedIds: string[] };
  }> => {
    await assertCanSetUp(request, spaceId);
    if (!workflowsExtensions || !workflowsManagement) {
      throw new StatusError('Workflows are not available', 400);
    }
    // The space's bound workflows, installed with the caller's request: binding a workflow to the
    // account needs it. Installing again with another account rebinds them.
    const client = await workflowsExtensions.getClient(request);
    for (const id of BOUND_WORKFLOW_IDS) {
      await client.managedWorkflows.install(SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER, id, {
        spaceId,
        workflowIdSuffix: spaceId,
        values: { serviceAccountId: serviceAccountIds.detectionEngine },
      });
    }
    // The scheduled workflows are installed off. An installed one keeps its state, so a paused space
    // keeps them off until Resume. The sync runs whenever the space is not paused; continuous
    // onboarding also needs its setting on.
    if ((await maintenanceService.getState({ request })) !== 'paused') {
      await switchOn({
        management: workflowsManagement,
        request,
        spaceId,
        workflowId: getNightshiftBoundKiSyncWorkflowId(spaceId),
      });
      const { uiSettingsClient } = await getScopedClients({ request });
      if (
        await uiSettingsClient.get<boolean>(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)
      ) {
        await switchOn({
          management: workflowsManagement,
          request,
          spaceId,
          workflowId: getNightshiftBoundKiContinuousOnboardingWorkflowId(spaceId),
        });
      }
    }
    // What the detection engine does outside workflow runs, such as turning rules on, runs as the
    // account too. Binding again with another account rebinds it.
    await core.security.serviceAccounts.bindWorkload(request, {
      serviceAccountId: serviceAccountIds.detectionEngine,
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });
    // Rules created before the setup, or under another account, keep their old keys until they are
    // enabled again as this account.
    const rules = await reassignRulesToAccount({ core, spaceId, getScopedClients });
    return { spaceId, serviceAccountIds, rules };
  };

  /**
   * Removes the space's setup: pauses the space, so its rules and scheduled workflows stop, then
   * uninstalls the bound workflows and unbinds the detection engine, so nothing in the space can
   * run as the account. Resume is refused until the space is set up again. The account is shared
   * by every space and is kept.
   */
  const disable = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<{ spaceId: string; pause: SignificantEventsMaintenanceSummary }> => {
    await assertCanSetUp(request, spaceId);
    if (!workflowsExtensions || !workflowsManagement || !onboardingClient) {
      throw new StatusError('Workflows are not available', 400);
    }
    // Without the account the rules would keep running on its keys, so the space is paused first.
    // Pausing cancels the runs of the bound workflows and disables the sync.
    const pause = await maintenanceService.pause({
      request,
      updatedBy: core.security.authc.getCurrentUser(request)?.username,
    });
    // A workflow bound to a service account cannot be deleted while it runs.
    await onboardingClient.stopEntryPointRuns({ request });
    for (const workflowId of [
      getNightshiftBoundKiSyncWorkflowId(spaceId),
      getNightshiftBoundKiContinuousOnboardingWorkflowId(spaceId),
      getNightshiftBoundSourceReconciliationWorkflowId(spaceId),
    ]) {
      await waitForNoRuns({ management: workflowsManagement, request, spaceId, workflowId });
    }
    const client = await workflowsExtensions.getClient(request);
    for (const id of BOUND_WORKFLOW_IDS) {
      await client.managedWorkflows.uninstall(SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER, id, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
    }
    await core.security.serviceAccounts.unbindWorkload(request, {
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });
    return { spaceId, pause };
  };

  return { enable, disable };
};

export type ServiceAccountSetupService = ReturnType<typeof createServiceAccountSetupService>;
