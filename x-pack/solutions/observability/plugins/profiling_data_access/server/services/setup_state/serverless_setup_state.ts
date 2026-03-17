/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateProfilingStatus } from '../../../common/cluster_settings';
import { hasProfilingData } from '../../../common/has_profiling_data';
import type { ProfilingSetupOptions, SetupState } from '../../../common/setup';
import { createDefaultSetupState, mergePartialSetupStates } from '../../../common/setup';

export async function serverlessSetupState(params: ProfilingSetupOptions): Promise<SetupState> {
  const state = createDefaultSetupState();

  const verifyFunctions = [validateProfilingStatus, hasProfilingData];

  const partialStates = await Promise.all(verifyFunctions.map((fn) => fn(params)));

  return mergePartialSetupStates(state, partialStates);
}
