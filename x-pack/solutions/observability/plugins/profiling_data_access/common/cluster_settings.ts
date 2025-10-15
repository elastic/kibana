/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialSetupState, ProfilingSetupOptions } from './setup';

export const MAX_BUCKETS = 150000;

export async function validateResourceManagement({
  client,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  try {
    const statusResponse = await client.profilingStatus();
    return {
      resource_management: {
        enabled: statusResponse.resource_management.enabled,
      },
      resources: {
        // If the flag is true, that means that all index templates / data streams and indices have been created
        created: statusResponse.resources.created,
        pre_8_9_1_data: statusResponse.resources.pre_8_9_1_data,
      },
    };
  } catch (error) {
    // If the profiling plugin is not available or any error occurs,
    // we assume resource management is not enabled and resources are not created
    return {
      resource_management: {
        enabled: false,
      },
      resources: {
        created: false,
        pre_8_9_1_data: false,
      },
    };
  }
}
