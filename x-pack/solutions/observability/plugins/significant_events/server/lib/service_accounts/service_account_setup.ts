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
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import {
  getNightshiftBoundKiContinuousOnboardingWorkflowId,
  getNightshiftBoundCleanupWorkflowId,
  getNightshiftBoundKiSyncWorkflowId,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  getNightshiftBoundDiscoveryWorkflowId,
  getNightshiftBoundInvestigationCompletedWorkflowId,
  getNightshiftBoundKiOnboardingWorkflowId,
  NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
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
  canManageSecurity,
  getDetectionEngineAccountId,
  reassignRulesToAccount,
} from './detection_engine_account';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from '../workflows/managed_workflow_owner';
import { pollUntil } from '../workflows/poll_until';
import type { SignificantEventsScheduledWorkflowsService } from '../workflows/significant_events_scheduled_workflows';
import { resolveStoredScheduledConfig } from '../../routes/internal/scheduled_discovery/route';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import type { SignificantEventsMaintenanceSummary } from '../../../common/maintenance/types';
import {
  DETECTION_ENGINE_SERVICE_ACCOUNT_NAME,
  getDetectionEngineServiceAccountRoleName,
} from '../../../common/service_account';

/** The ids of the accounts a space is set up with, as the service accounts backend assigned them. */
export interface DetectionEngineServiceAccountIds {
  detectionEngine: string;
}

/** Bound workflows the setup installs in the space. */
const SETUP_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
] as const;

/** Bound workflows a setting installs once it is turned on; the setup only rebinds them. */
const SETTING_WORKFLOW_IDS = [NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID] as const;

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
/** How many failed targets the error of an incomplete pause names. */
const MAX_FAILED_TARGETS_IN_ERROR = 5;

export const createServiceAccountSetupService = ({
  core,
  spaces,
  workflowsExtensions,
  workflowsManagement,
  onboardingClient,
  getScopedClients,
  maintenanceService,
  scheduledWorkflowsService,
  isServerless,
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  workflowsManagement: WorkflowsServerPluginSetup['management'] | undefined;
  onboardingClient: SignificantEventsKIsOnboardingClient | undefined;
  getScopedClients: GetScopedClients;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState' | 'pause'>;
  scheduledWorkflowsService: Pick<SignificantEventsScheduledWorkflowsService, 'rebind'> | undefined;
  isServerless: boolean;
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

  /**
   * The account's role has to exist before the account does: an account holding a role that does not
   * exist has no privileges, and every run would then be refused. Kibana never creates the role.
   * Looked up with the query API: `getRole` answers 404 for the platform roles of Serverless.
   */
  const assertRoleExists = async (request: KibanaRequest, roleName: string): Promise<void> => {
    const { total } = await core.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.queryRole({
        query: { term: { name: roleName } },
        size: 1,
      });
    if (total === 0) {
      throw new StatusError(
        `The role [${roleName}] of the detection engine service account ` +
          'does not exist. Create it with the privileges of DETECTION_ENGINE_SERVICE_ACCOUNT_ROLE in ' +
          'common/service_account.ts (see the README, "Setting up a space"), then call _enable again.',
        400
      );
    }
  };

  /**
   * The account the space is already bound to, or a new `nightshift_detection_engine` account. The
   * account is shared by every space: another space passes its id, because an account of the same
   * name cannot be created again and there is no way to look one up by name.
   */
  const findOrCreateAccountId = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<string> => {
    const boundAccountId = await getDetectionEngineAccountId({ core, spaceId });
    if (boundAccountId !== undefined) {
      return boundAccountId;
    }
    const roleName = getDetectionEngineServiceAccountRoleName({ isServerless });
    await assertRoleExists(request, roleName);
    try {
      const account = await core.security.serviceAccounts.create(request, {
        name: DETECTION_ENGINE_SERVICE_ACCOUNT_NAME,
        description: 'The service account the Nightshift detection engine runs as.',
        roles: [roleName],
      });
      return account.id;
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 409) {
        throw new StatusError(
          `A service account named [${DETECTION_ENGINE_SERVICE_ACCOUNT_NAME}] already exists. ` +
            'Pass its id in serviceAccountIds.detectionEngine: the id is returned by _disable.',
          409
        );
      }
      throw error;
    }
  };

  const enable = async ({
    request,
    spaceId,
    serviceAccountIds: givenServiceAccountIds,
  }: {
    request: KibanaRequest;
    spaceId: string;
    /** Without it, the account the space is bound to, or a new one, is used. */
    serviceAccountIds?: DetectionEngineServiceAccountIds;
  }): Promise<{
    spaceId: string;
    serviceAccountIds: DetectionEngineServiceAccountIds;
    rules: { reassigned: number; failedIds: string[] };
  }> => {
    await assertCanSetUp(request, spaceId);
    if (!workflowsExtensions || !workflowsManagement) {
      throw new StatusError('Workflows are not available', 400);
    }
    const serviceAccountIds = givenServiceAccountIds ?? {
      detectionEngine: await findOrCreateAccountId({ request, spaceId }),
    };
    // What the detection engine does outside workflow runs, such as turning rules on, runs as the
    // account too. Bound first: the workflows a setting installs read the account from it. Binding
    // again with another account rebinds it.
    await core.security.serviceAccounts.bindWorkload(request, {
      serviceAccountId: serviceAccountIds.detectionEngine,
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });
    // The workflows of a setting that is on are installed here too, so the space ends up as its
    // settings say.
    const { uiSettingsClient } = await getScopedClients({ request });
    const continuousOnboardingOn = await uiSettingsClient.get<boolean>(
      OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED
    );
    const scheduledDiscoveryOn = await uiSettingsClient.get<boolean>(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
    );
    // The space's bound workflows, installed with the caller's request: binding a workflow to the
    // account needs it. Installing again with another account rebinds them.
    const client = await workflowsExtensions.getClient(request);
    const installedBySetting = await Promise.all(
      SETTING_WORKFLOW_IDS.map(async (id) =>
        continuousOnboardingOn ||
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
    await scheduledWorkflowsService?.rebind({
      request,
      spaceId,
      config: resolveStoredScheduledConfig(await uiSettingsClient.getAll()),
      installIfMissing: scheduledDiscoveryOn,
    });
    // An installed workflow keeps its state, so the ones `_disable` switched off are switched back
    // on here. The manually started ones are always on in a set-up space: the routes that start
    // onboarding are blocked while the space is paused. So is the investigation write-back.
    for (const workflowId of [
      getNightshiftBoundKiOnboardingWorkflowId(spaceId),
      getNightshiftBoundDiscoveryWorkflowId(spaceId),
      getNightshiftBoundInvestigationCompletedWorkflowId(spaceId),
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
    // A new sync or cleanup is installed off, and a paused space keeps the scheduled ones off until
    // Resume. They run whenever the space is not paused; continuous onboarding also needs its
    // setting on.
    if ((await maintenanceService.getState({ request })) !== 'paused') {
      for (const workflowId of [
        getNightshiftBoundKiSyncWorkflowId(spaceId),
        getNightshiftBoundCleanupWorkflowId(spaceId),
      ]) {
        await setEnabled({
          management: workflowsManagement,
          request,
          spaceId,
          workflowId,
          enabled: true,
        });
      }
      if (continuousOnboardingOn) {
        await setEnabled({
          management: workflowsManagement,
          request,
          spaceId,
          workflowId: getNightshiftBoundKiContinuousOnboardingWorkflowId(spaceId),
          enabled: true,
        });
      }
      if (scheduledDiscoveryOn) {
        for (const workflowId of [
          getNightshiftBoundScheduledDetectionWorkflowId(spaceId),
          getNightshiftBoundScheduledReviewWorkflowId(spaceId),
        ]) {
          await setEnabled({
            management: workflowsManagement,
            request,
            spaceId,
            workflowId,
            enabled: true,
          });
        }
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
   * again. The account is shared by every space and is kept. When the pause could not stop
   * everything the setup is kept and the call fails: calling it again retries what failed.
   */
  const disable = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<{
    spaceId: string;
    pause: SignificantEventsMaintenanceSummary;
    /** The account the space was bound to: pass it to `_enable` to set the space up again. */
    serviceAccountIds?: DetectionEngineServiceAccountIds;
  }> => {
    await assertCanSetUp(request, spaceId);
    if (!workflowsManagement || !onboardingClient) {
      throw new StatusError('Workflows are not available', 400);
    }
    const boundAccountId = await getDetectionEngineAccountId({ core, spaceId });
    // Without the account the rules would keep running on its keys, so the space is paused first.
    // Pausing cancels the runs of the bound workflows and switches the scheduled ones off.
    const pause = await maintenanceService.pause({
      request,
      updatedBy: core.security.authc.getCurrentUser(request)?.username,
    });
    // A rule or workflow the pause could not stop keeps running as the account, on a key or a
    // binding that unbinding the engine does not remove. Pausing again retries the ones that failed.
    if (pause.partialFailures.length > 0) {
      const targets = pause.partialFailures.map(({ target }) => target);
      const shown = targets.slice(0, MAX_FAILED_TARGETS_IN_ERROR).join(', ');
      const more =
        targets.length > MAX_FAILED_TARGETS_IN_ERROR
          ? ` and ${targets.length - MAX_FAILED_TARGETS_IN_ERROR} more`
          : '';
      throw new StatusError(
        `Pausing the space did not stop everything: ${shown}${more}. The space is still set up: ` +
          'call _disable again to retry.',
        500
      );
    }
    // The manually started ones too, so nothing can start a run as the account.
    for (const workflowId of [
      getNightshiftBoundKiOnboardingWorkflowId(spaceId),
      getNightshiftBoundDiscoveryWorkflowId(spaceId),
      getNightshiftBoundInvestigationCompletedWorkflowId(spaceId),
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
      getNightshiftBoundCleanupWorkflowId(spaceId),
      getNightshiftBoundKiContinuousOnboardingWorkflowId(spaceId),
      getNightshiftBoundSourceReconciliationWorkflowId(spaceId),
      getNightshiftBoundDiscoveryWorkflowId(spaceId),
      getNightshiftBoundScheduledDetectionWorkflowId(spaceId),
      getNightshiftBoundScheduledReviewWorkflowId(spaceId),
      getNightshiftBoundInvestigationCompletedWorkflowId(spaceId),
    ]) {
      await waitForNoRuns({ management: workflowsManagement, request, spaceId, workflowId });
    }
    await core.security.serviceAccounts.unbindWorkload(request, {
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });
    return {
      spaceId,
      pause,
      ...(boundAccountId !== undefined && {
        serviceAccountIds: { detectionEngine: boundAccountId },
      }),
    };
  };

  return { enable, disable };
};

export type ServiceAccountSetupService = ReturnType<typeof createServiceAccountSetupService>;
