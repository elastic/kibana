/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { CloudSetupState } from '../../../common/cloud_setup';
import type { SetupState } from '../../../common/setup';
import type { RegisterServicesParams } from '../register_services';
import { cloudSetupState } from './cloud_setup_state';
import { selfManagedSetupState } from './self_managed_setup_state';

export interface SetupStateParams {
  soClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  spaceId?: string;
}

type GetSetupStateParams = RegisterServicesParams & SetupStateParams;

function getProfilingClients({ createProfilingEsClient, esClient }: GetSetupStateParams) {
  return {
    client: createProfilingEsClient({ esClient: esClient.asInternalUser }),
    clientWithProfilingAuth: createProfilingEsClient({ esClient: esClient.asCurrentUser }),
  };
}

/** Reads the Universal Profiling setup state of a cloud deployment, which requires Fleet. */
export async function getCloudSetupState(params: GetSetupStateParams): Promise<CloudSetupState> {
  const { deps, logger, soClient, spaceId } = params;

  if (!deps.fleet) {
    throw new Error('Elastic Fleet is required to set up Universal Profiling on Cloud');
  }

  return cloudSetupState({
    ...getProfilingClients(params),
    logger,
    soClient,
    spaceId: spaceId ?? DEFAULT_SPACE_ID,
    packagePolicyClient: deps.fleet.packagePolicyService,
    isCloudEnabled: Boolean(deps.cloud?.isCloudEnabled),
  });
}

/** Reads the Universal Profiling setup state of a self-managed deployment. */
export async function getSelfManagedSetupState(params: GetSetupStateParams): Promise<SetupState> {
  const { logger, soClient, spaceId } = params;

  return selfManagedSetupState({
    ...getProfilingClients(params),
    logger,
    soClient,
    spaceId: spaceId ?? DEFAULT_SPACE_ID,
  });
}

export function createCloudSetupState(params: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: SetupStateParams) =>
    getCloudSetupState({ ...params, esClient, soClient, spaceId });
}

export function createSelfManagedSetupState(params: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: SetupStateParams) =>
    getSelfManagedSetupState({ ...params, esClient, soClient, spaceId });
}
