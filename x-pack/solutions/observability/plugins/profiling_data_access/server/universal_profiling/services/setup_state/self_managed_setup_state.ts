/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateMaximumBuckets,
  validateProfilingStatus,
  validateResourceManagement,
} from '../../lib/cluster_settings';
import { hasProfilingData } from '../../lib/has_profiling_data';
import type { ProfilingSetupOptions, SetupState } from '../../lib/setup';
import { createDefaultSetupState, mergePartialSetupStates } from '../../lib/setup';

export async function selfManagedSetupState(params: ProfilingSetupOptions): Promise<SetupState> {
  const state = createDefaultSetupState();

  const verifyFunctions = [
    validateProfilingStatus,
    validateMaximumBuckets,
    validateResourceManagement,
    hasProfilingData,
  ];

  const partialStates = await Promise.all(verifyFunctions.map((fn) => fn(params)));

  return mergePartialSetupStates(state, partialStates);
}
