/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/server';
import type { BuildFlavor } from '@kbn/config';
import type { Logger } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { createFetchFlamechart } from './fetch_flamechart';
import { createGetProfilingStatusService } from './status';
import { createGetOtelStatusService } from '../otel/services/status';
import { createGetStatusService } from '../universal_profiling/services/status';
import type { CreateProfilingEsClient } from '../utils/profiling_es_client';
import { createFetchFunctions } from './functions';
import {
  createCloudSetupState,
  createSelfManagedSetupState,
} from '../universal_profiling/services/setup_state';
import { createFetchESFunctions } from './functions/es_functions';

export interface RegisterServicesParams {
  createProfilingEsClient: CreateProfilingEsClient;
  logger: Logger;
  buildFlavor: BuildFlavor;
  deps: {
    fleet?: FleetStartContract;
    cloud?: CloudStart;
  };
}

export function registerServices(params: RegisterServicesParams) {
  return {
    fetchFlamechartData: createFetchFlamechart(params),
    getStatus: createGetProfilingStatusService(params),
    otel: {
      getStatus: createGetOtelStatusService(params),
    },
    universalProfiling: {
      getStatus: createGetStatusService(params),
      getCloudSetupState: createCloudSetupState(params),
      getSelfManagedSetupState: createSelfManagedSetupState(params),
    },
    // Legacy fetch functions api based on stacktraces
    fetchFunctions: createFetchFunctions(params),
    fetchESFunctions: createFetchESFunctions(params),
  };
}
