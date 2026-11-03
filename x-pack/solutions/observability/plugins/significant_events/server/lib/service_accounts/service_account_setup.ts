/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { getNightshiftRoleName } from '@kbn/nightshift-shared';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { DetectionEngineServiceAccountStatus } from '../../../common';
import { StatusError } from '../errors/status_error';
import {
  DETECTION_ENGINE_WORKLOAD_ID,
  DETECTION_ENGINE_WORKLOAD_TYPE,
  canManageSecurity,
  getDetectionEngineAccountId,
} from './detection_engine_account';

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
  }) => Promise<{ spaceId: string; serviceAccountId: string }>;
  /** What the current user can see about the space's setup. */
  getStatus: (params: {
    request: KibanaRequest;
    spaceId: string;
  }) => Promise<DetectionEngineServiceAccountStatus>;
}

export function createDetectionEngineSetupService({
  core,
  spaces,
  isServerless,
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  isServerless: boolean;
}): DetectionEngineSetupService {
  const role = getNightshiftRoleName('detection', { isServerless });

  const assertSpaceExists = async (request: KibanaRequest, spaceId: string): Promise<void> => {
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
      if (!(await canManageSecurity(core, request))) {
        throw new StatusError(
          'Setting up the detection engine service account requires the manage_security cluster privilege.',
          403
        );
      }
      await assertSpaceExists(request, spaceId);
      await assertRoleExists(request);
      await core.security.serviceAccounts.bindWorkload(request, {
        serviceAccountId,
        workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
        workloadId: DETECTION_ENGINE_WORKLOAD_ID,
      });
      return { spaceId, serviceAccountId };
    },

    async getStatus({ request, spaceId }) {
      const serviceAccountsEnabled = core.security.serviceAccounts.isEnabled();
      const [serviceAccountId, canSetUp] = await Promise.all([
        getDetectionEngineAccountId({ core, spaceId }),
        serviceAccountsEnabled ? canManageSecurity(core, request) : false,
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
