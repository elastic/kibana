/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RecursivePartial } from '@elastic/eui';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingESClient } from './profiling_es_client';

export interface ProfilingSetupOptions {
  client: ProfilingESClient;
  clientWithProfilingAuth: ProfilingESClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  spaceId: string;
}

export interface ServerlessSetupStateType {
  type: 'serverless';
  setupState: ServerlessSetupState;
}

interface ServerlessSetupState {
  data: {
    available: boolean;
  };
  resource_management: {
    enabled: boolean;
  };
  resources: {
    created: boolean;
    pre_8_9_1_data: boolean;
  };
}

export type PartialServerlessSetupState = RecursivePartial<ServerlessSetupState>;

export function createDefaultServerlessSetupState(): ServerlessSetupState {
  return {
    data: {
      available: false,
    },
    resource_management: {
      enabled: false,
    },
    resources: {
      created: false,
      pre_8_9_1_data: false,
    },
  };
}

export function areServerlessResourcesSetup(state: ServerlessSetupState): boolean {
  // TODO: Check for Profiling plugin being enabled
  return true;
}
