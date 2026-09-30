/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import { areCloudResourcesSetup } from '../../../common/cloud_setup';
import type { SetupState } from '../../../common/setup';
import { areResourcesSetup } from '../../../common/setup';
import type { RegisterServicesParams } from '../register_services';
import { getCloudSetupState, getSelfManagedSetupState } from '../setup_state';

export interface HasSetupParams {
  soClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  spaceId?: string;
}

function toProfilingStatus(setupState: SetupState, hasSetup: boolean): ProfilingStatus {
  return {
    profiling_enabled: setupState.profiling.enabled,
    has_setup: hasSetup,
    has_data: setupState.data.available,
    pre_8_9_1_data: setupState.resources.pre_8_9_1_data,
  };
}

export function createGetStatusService(params: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: HasSetupParams): Promise<ProfilingStatus> => {
    const setupStateParams = { ...params, esClient, soClient, spaceId };

    if (params.deps.cloud?.isCloudEnabled) {
      const setupState = await getCloudSetupState(setupStateParams);
      params.logger.debug(() => `Cloud set up state: ${JSON.stringify(setupState, null, 2)}`);
      return toProfilingStatus(setupState, areCloudResourcesSetup(setupState));
    }

    const setupState = await getSelfManagedSetupState(setupStateParams);
    params.logger.debug(() => `Self-managed set up state: ${JSON.stringify(setupState, null, 2)}`);
    return toProfilingStatus(setupState, areResourcesSetup(setupState));
  };
}
