/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SetupState } from './setup';

export interface ServerlessSetupStateType {
  type: 'serverless';
  setupState: SetupState;
}

export function areServerlessResourcesSetup(state: SetupState): boolean {
  return state.profiling.enabled;
}
