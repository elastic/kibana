/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { StatusError } from '../errors/status_error';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from '../workflows/managed_workflow_owner';

/** The ids of the accounts a space is set up with, as the service accounts backend assigned them. */
export interface DetectionEngineServiceAccountIds {
  kiExtraction: string;
}

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
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
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

  const enable = async ({
    request,
    spaceId,
    serviceAccountIds,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountIds: DetectionEngineServiceAccountIds;
  }): Promise<{ spaceId: string; serviceAccountIds: DetectionEngineServiceAccountIds }> => {
    await assertCanSetUp(request, spaceId);
    if (!workflowsExtensions) {
      throw new StatusError('Workflows are not available', 400);
    }
    // The space's KI onboarding entry point, installed with the caller's request: binding the
    // workflow to the account needs it. Installing again with another account rebinds it.
    const client = await workflowsExtensions.getClient(request);
    await client.managedWorkflows.install(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
      NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
      {
        spaceId,
        workflowIdSuffix: spaceId,
        values: { serviceAccountId: serviceAccountIds.kiExtraction },
      }
    );
    return { spaceId, serviceAccountIds };
  };

  return { enable };
};

export type ServiceAccountSetupService = ReturnType<typeof createServiceAccountSetupService>;
