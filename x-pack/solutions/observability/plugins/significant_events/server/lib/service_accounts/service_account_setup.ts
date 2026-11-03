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
  NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
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
 * The bound workflows every set-up space gets, installed per space with the space id as suffix. The
 * ones a setting turns on (continuous onboarding, the scheduled discovery pair) are installed by
 * their setting, bound to the space's account.
 */
export const SETUP_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
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

/** Creates the setup service for one deployment. `isServerless` picks the name of the account's role. */
export function createDetectionEngineSetupService({
  core,
  spaces,
  workflowsExtensions,
  isServerless,
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
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

  return {
    async enable({ request, spaceId, serviceAccountId }) {
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
      if (!workflowsExtensions) {
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
        await client.managedWorkflows.install(
          SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
          workflowId,
          {
            spaceId,
            workflowIdSuffix: spaceId,
            values: { serviceAccountId },
          }
        );
      }
      return { spaceId, serviceAccountId, workflowIds: [...SETUP_WORKFLOW_IDS] };
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
