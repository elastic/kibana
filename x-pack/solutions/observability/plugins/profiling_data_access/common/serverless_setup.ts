/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ProfilingESClient } from './profiling_es_client';
import type { SetupState } from './setup';

export interface ProfilingSetupOptions {
  client: ProfilingESClient;
  clientWithProfilingAuth: ProfilingESClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  spaceId: string;
}

export interface ServerlessSetupStateType {
  type: 'serverless';
  setupState: SetupState;
}

export function areServerlessResourcesSetup(state: SetupState): boolean {
  return state.profiling.enabled;
}
