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
  getNightshiftBoundKiOnboardingWorkflowId,
  getNightshiftBoundScheduledDetectionWorkflowId,
  getNightshiftBoundScheduledReviewWorkflowId,
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
import type { SignificantEventsScheduledWorkflowsService } from '../workflows/significant_events_scheduled_workflows';
import { resolveStoredScheduledConfig } from '../../routes/internal/scheduled_discovery/route';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import type { SignificantEventsMaintenanceSummary } from '../../../common/maintenance/types';

/** The ids of the accounts a space is set up with, as the service accounts backend assigned them. */
export interface DetectionEngineServiceAccountIds {
  detectionEngine: string;
}

/** Bound workflows the setup installs in the space. */
const SETUP_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
] as const;

/** Bound workflows a setting installs once it is turned on; the setup only rebinds them. */
const SETTING_WORKFLOW_IDS = [NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID] as const;

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
  scheduledWorkflowsService,
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  workflowsManagement: WorkflowsServerPluginSetup['management'] | undefined;
  onboardingClient: SignificantEventsKIsOnboardingClient | undefined;
  getScopedClients: GetScopedClients;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState' | 'pause'>;
  scheduledWorkflowsService: Pick<SignificantEventsScheduledWorkflowsService, 'rebind'> | undefined;
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

  /** Switches an installed workflow on or off; a missing one is left alone. */
  const setEnabled = async ({
    management,
    request,
    spaceId,
    workflowId,
    enabled,
  }: {
    management: WorkflowsServerPluginSetup['management'];
    request: KibanaRequest;
    spaceId: string;
    workflowId: string;
    enabled: boolean;
  }): Promise<void> => {
    const workflow = await management.getWorkflow(workflowId, spaceId, request);
    if (workflow && workflow.enabled !== enabled) {
      await management.updateWorkflow(workflowId, { enabled }, spaceId, request);
    }
  };

  /** Waits until a workflow has no run going. */
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
    // What the detection engine does outside workflow runs, such as turning rules on, runs as the
    // account too. Bound first: the workflows a setting installs read the account from it. Binding
    // again with another account rebinds it.
    await core.security.serviceAccounts.bindWorkload(request, {
      serviceAccountId: serviceAccountIds.detectionEngine,
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });
    // The space's bound workflows, installed with the caller's request: binding a workflow to the
    // account needs it. Installing again with another account rebinds them.
    const client = await workflowsExtensions.getClient(request);
    const installedBySetting = await Promise.all(
      SETTING_WORKFLOW_IDS.map(async (id) =>
        (await workflowsManagement.getWorkflow(`${id}-${spaceId}`, spaceId, request))
          ? id
          : undefined
      )
    );
    for (const id of [...SETUP_WORKFLOW_IDS, ...installedBySetting]) {
      if (id === undefined) {
        continue;
      }
      await client.managedWorkflows.install(SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER, id, {
        spaceId,
        workflowIdSuffix: spaceId,
        values: { serviceAccountId: serviceAccountIds.detectionEngine },
      });
    }
    // The scheduled discovery workflows are installed by their setting, with its intervals.
    const { uiSettingsClient } = await getScopedClients({ request });
    await scheduledWorkflowsService?.rebind({
      request,
      spaceId,
      config: resolveStoredScheduledConfig(await uiSettingsClient.getAll()),
    });
    // An installed workflow keeps its state, so the ones `_disable` switched off are switched back
    // on here. The manually started ones are always on in a set-up space: the routes that start
    // onboarding are blocked while the space is paused.
    for (const workflowId of [
      getNightshiftBoundKiOnboardingWorkflowId(spaceId),
      getNightshiftBoundSourceReconciliationWorkflowId(spaceId),
    ]) {
      await setEnabled({
        management: workflowsManagement,
        request,
        spaceId,
        workflowId,
        enabled: true,
      });
    }
    // A new sync is installed off, and a paused space keeps the scheduled ones off until Resume.
    // The sync runs whenever the space is not paused; continuous onboarding also needs its setting
    // on.
    if ((await maintenanceService.getState({ request })) !== 'paused') {
      await setEnabled({
        management: workflowsManagement,
        request,
        spaceId,
        workflowId: getNightshiftBoundKiSyncWorkflowId(spaceId),
        enabled: true,
      });
      if (
        await uiSettingsClient.get<boolean>(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)
      ) {
        await setEnabled({
          management: workflowsManagement,
          request,
          spaceId,
          workflowId: getNightshiftBoundKiContinuousOnboardingWorkflowId(spaceId),
          enabled: true,
        });
      }
    }
    // Rules created before the setup, or under another account, keep their old keys until they are
    // enabled again as this account.
    const rules = await reassignRulesToAccount({ core, spaceId, getScopedClients });
    return { spaceId, serviceAccountIds, rules };
  };

  /**
   * Removes the space's setup: pauses the space, so its rules and scheduled workflows stop, then
   * switches its bound workflows off, waits for their runs to stop and unbinds the detection
   * engine, so nothing in the space runs as the account. The workflows are kept, with their run
   * history, and `_enable` switches them back on. Resume is refused until the space is set up
   * again. The account is shared by every space and is kept.
   */
  const disable = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<{ spaceId: string; pause: SignificantEventsMaintenanceSummary }> => {
    await assertCanSetUp(request, spaceId);
    if (!workflowsManagement || !onboardingClient) {
      throw new StatusError('Workflows are not available', 400);
    }
    // Without the account the rules would keep running on its keys, so the space is paused first.
    // Pausing cancels the runs of the bound workflows and switches the scheduled ones off.
    const pause = await maintenanceService.pause({
      request,
      updatedBy: core.security.authc.getCurrentUser(request)?.username,
    });
    // The manually started ones too, so nothing can start a run as the account.
    for (const workflowId of [
      getNightshiftBoundKiOnboardingWorkflowId(spaceId),
      getNightshiftBoundSourceReconciliationWorkflowId(spaceId),
    ]) {
      await setEnabled({
        management: workflowsManagement,
        request,
        spaceId,
        workflowId,
        enabled: false,
      });
    }
    await onboardingClient.stopEntryPointRuns({ request });
    for (const workflowId of [
      getNightshiftBoundKiSyncWorkflowId(spaceId),
      getNightshiftBoundKiContinuousOnboardingWorkflowId(spaceId),
      getNightshiftBoundSourceReconciliationWorkflowId(spaceId),
      getNightshiftBoundScheduledDetectionWorkflowId(spaceId),
      getNightshiftBoundScheduledReviewWorkflowId(spaceId),
    ]) {
      await waitForNoRuns({ management: workflowsManagement, request, spaceId, workflowId });
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
