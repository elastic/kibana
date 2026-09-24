/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import { areCloudResourcesSetup } from '../../../common/cloud_setup';
import { areResourcesSetup } from '../../../common/setup';
import type { RegisterServicesParams } from '../register_services';
import { getSetupState } from '../setup_state';
import { areServerlessResourcesSetup } from '../../../common/serverless_setup';

export interface HasSetupParams {
  soClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  spaceId?: string;
  isServerless?: boolean;
}

export function createGetStatusService(params: RegisterServicesParams) {
  return async ({
    esClient,
    soClient,
    spaceId,
    isServerless,
  }: HasSetupParams): Promise<ProfilingStatus> => {
    const { type, setupState } = await getSetupState({
      ...params,
      esClient,
      soClient,
      spaceId,
      isServerless,
    });

    params.logger.debug(() => `Set up state for: ${type}: ${JSON.stringify(setupState, null, 2)}`);

    let hasSetup = false;
    switch (type) {
      case 'cloud':
        hasSetup = areCloudResourcesSetup(setupState);
        break;
      case 'self-managed':
        hasSetup = areResourcesSetup(setupState);
        break;
      case 'serverless':
        hasSetup = areServerlessResourcesSetup(setupState);
        break;
    }

    return {
      type,
      profiling_enabled: setupState.profiling.enabled,
      has_setup: hasSetup,
      has_data: setupState.data.available,
      pre_8_9_1_data: setupState.resources.pre_8_9_1_data,
    };
  };
}
