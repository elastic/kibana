/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecursivePartial } from '@elastic/eui';
import type { CloudSetupState, ProfilingCloudSetupOptions } from '../../lib/cloud_setup';
import { createDefaultCloudSetupState } from '../../lib/cloud_setup';
import {
  validateMaximumBuckets,
  validateProfilingStatus,
  validateResourceManagement,
} from '../../lib/cluster_settings';
import {
  validateCollectorPackagePolicy,
  validateProfilingInApmPackagePolicy,
  validateSymbolizerPackagePolicy,
} from '../../lib/fleet_policies';
import { hasProfilingData } from '../../lib/has_profiling_data';
import { mergePartialSetupStates } from '../../lib/setup';

export async function cloudSetupState(
  params: ProfilingCloudSetupOptions
): Promise<CloudSetupState> {
  const state = createDefaultCloudSetupState();
  state.cloud.available = params.isCloudEnabled;

  const verifyFunctions = [
    validateProfilingStatus,
    validateMaximumBuckets,
    validateResourceManagement,
    validateCollectorPackagePolicy,
    validateSymbolizerPackagePolicy,
    validateProfilingInApmPackagePolicy,
    hasProfilingData,
  ];

  const partialStates = (await Promise.all(verifyFunctions.map((fn) => fn(params)))) as Array<
    RecursivePartial<CloudSetupState>
  >;

  return mergePartialSetupStates(state, partialStates);
}
