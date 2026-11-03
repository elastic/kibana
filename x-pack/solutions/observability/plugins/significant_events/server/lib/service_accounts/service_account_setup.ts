/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { getNightshiftRoleName } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  DetectionEngineEnableResponse,
  DetectionEngineServiceAccountStatus,
} from '../../../common';
import { StatusError } from '../errors/status_error';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from '../workflows/managed_workflow_owner';
import {
  DETECTION_ENGINE_WORKLOAD_ID,
  DETECTION_ENGINE_WORKLOAD_TYPE,
  canManageSecurity,
  getDetectionEngineAccountId,
} from './detection_engine_account';

/**
 * The bound workflows every set-up space gets, installed per space with the space id as suffix.
 * Left out until the switch-on: the bound investigation-completed workflow, which reacts to events
 * the existing global one already handles, so installing it now would attach every investigation
 * twice, and the ones a setting turns on (continuous onboarding, the scheduled discovery pair).
 */
export const SETUP_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
] as const;

/** Sets a space up to run the detection engine as the deployment's `nightshift_detection` account. */
export interface DetectionEngineSetupService {
  /**
   * Binds the account to the space's detection engine. Binding needs an authenticated user with
   * `manage_security`, so setup is an explicit admin action and cannot happen at startup. Idempotent:
   * binding again with another account rebinds the space.
   */
  enable: (params: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }) => Promise<DetectionEngineEnableResponse>;
  /** What the current user can see about the space's setup. */
  getStatus: (params: {
    request: KibanaRequest;
    spaceId: string;
  }) => Promise<DetectionEngineServiceAccountStatus>;
}

// The service is created per request, so the queue of a space's setups lives here. Setups of one
// space run one after another, so two clicks cannot interleave their installs.
const enableQueues = new Map<string, Promise<unknown>>();

/** Creates the setup service for one deployment. `isServerless` picks the name of the account's role. */
export function createDetectionEngineSetupService({
  core,
  spaces,
  workflowsExtensions,
  workflowsManagement,
  isServerless,
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  workflowsManagement: WorkflowsServerPluginSetup | undefined;
  isServerless: boolean;
}): DetectionEngineSetupService {
  const role = getNightshiftRoleName('detection', { isServerless });

  const assertSpaceExists = async ({
    request,
    spaceId,
  }: {
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

  // An account holding a role that does not exist has no privileges, and every run would then be
  // refused. Kibana never creates the role. Looked up with the query API: `getRole` answers 404
  // for the predefined roles of Serverless.
  const assertRoleExists = async (request: KibanaRequest): Promise<void> => {
    const { total } = await core.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.queryRole({ query: { term: { name: role } }, size: 1 });
    if (total === 0) {
      throw new StatusError(
        `The role [${role}] of the detection engine service account does not exist. ` +
          'Create it (see the Significant Events README, "Setting up a space"), then call _enable again.',
        400
      );
    }
  };

  const runEnable = async ({
    request,
    spaceId,
    serviceAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }): Promise<DetectionEngineEnableResponse> => {
    if (!core.security.serviceAccounts.isEnabled()) {
      throw new StatusError(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.',
        400
      );
    }
    if (!(await canManageSecurity({ core, request }))) {
      throw new StatusError(
        'Setting up the detection engine service account requires the manage_security cluster privilege.',
        403
      );
    }
    if (!workflowsExtensions || !workflowsManagement) {
      throw new StatusError('Workflows are not available', 400);
    }
    await assertSpaceExists({ request, spaceId });
    await assertRoleExists(request);
    // Bound first, so what the engine does outside workflow runs is tied to the account before
    // any workflow is. Binding again with another account rebinds the space.
    await core.security.serviceAccounts.bindWorkload(request, {
      serviceAccountId,
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });
    // Installed with the caller's request: binding a workflow to an account needs the caller's
    // `manage_security`, which the workflows plugin enforces. Installing again with another
    // account rebinds an installed workflow and keeps its enabled state.
    const client = await workflowsExtensions.getClient(request);
    for (const workflowId of SETUP_WORKFLOW_IDS) {
      try {
        await client.managedWorkflows.install(
          SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
          workflowId,
          { spaceId, workflowIdSuffix: spaceId, values: { serviceAccountId } }
        );
      } catch (error) {
        // The space is bound already, and installing is repeatable: calling _enable again retries.
        throw new StatusError(
          `Installing workflow [${workflowId}] failed: ${
            error instanceof Error ? error.message : String(error)
          }. The space is bound; call _enable again to retry.`,
          500
        );
      }
    }
    // Installing is best-effort in the workflows plugin, so check that every workflow ended up
    // bound to the account instead of answering with ids that were never installed.
    const unbound: string[] = [];
    for (const workflowId of SETUP_WORKFLOW_IDS) {
      const document = await workflowsManagement.management.getWorkflow(
        `${workflowId}-${spaceId}`,
        spaceId,
        request
      );
      if (document?.definition?.settings?.run_as !== serviceAccountId) {
        unbound.push(workflowId);
      }
    }
    if (unbound.length > 0) {
      throw new StatusError(
        `Setting up space [${spaceId}] did not bind ${unbound
          .map((id) => `[${id}]`)
          .join(', ')} to [${serviceAccountId}]. The space is bound; call _enable again to retry.`,
        500
      );
    }
    return { spaceId, serviceAccountId, workflowIds: [...SETUP_WORKFLOW_IDS] };
  };

  return {
    enable(params) {
      const previous = enableQueues.get(params.spaceId) ?? Promise.resolve();
      const run = previous.catch(() => undefined).then(() => runEnable(params));
      enableQueues.set(params.spaceId, run);
      run
        .catch(() => undefined)
        .finally(() => {
          if (enableQueues.get(params.spaceId) === run) {
            enableQueues.delete(params.spaceId);
          }
        });
      return run;
    },

    async getStatus({ request, spaceId }) {
      const serviceAccountsEnabled = core.security.serviceAccounts.isEnabled();
      const [serviceAccountId, canSetUp] = await Promise.all([
        getDetectionEngineAccountId({ core, spaceId }),
        // A failing privilege probe must not fail a read: it reads as "cannot set up".
        serviceAccountsEnabled ? canManageSecurity({ core, request }).catch(() => false) : false,
      ]);
      return {
        serviceAccountsEnabled,
        canSetUp,
        role,
        serviceAccountId: serviceAccountId ?? null,
      };
    },
  };
}
