/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingStatus } from '@kbn/profiling-utils';

type SetupStatusResponse = ProfilingStatus & { has_required_role: boolean };

const setupStatusExample = (summary: string, description: string, value: SetupStatusResponse) => ({
  summary,
  description,
  value,
});

/** OAS examples merged into the generated `GET /api/profiling/setup/es_resources` operation. */
export const setupStatusOASOperationObject = {
  responses: {
    200: {
      content: {
        'application/json': {
          examples: {
            setUpWithData: setupStatusExample(
              'Set up and receiving data',
              'Universal Profiling is set up and profiling data has been ingested.',
              {
                profiling_enabled: true,
                has_setup: true,
                has_data: true,
                pre_8_9_1_data: false,
                has_required_role: true,
              }
            ),
            notSetUp: setupStatusExample(
              'Not set up yet',
              'The Elasticsearch profiling plugin is enabled, but the required resources have not been created. Call `POST /api/profiling/setup/es_resources` to set them up.',
              {
                profiling_enabled: true,
                has_setup: false,
                has_data: false,
                pre_8_9_1_data: false,
                has_required_role: true,
              }
            ),
            profilingDisabled: setupStatusExample(
              'Disabled in Elasticsearch',
              'The Universal Profiling plugin is disabled in the Elasticsearch cluster, so setup cannot complete until it is enabled.',
              {
                profiling_enabled: false,
                has_setup: false,
                has_data: false,
                pre_8_9_1_data: false,
                has_required_role: true,
              }
            ),
          },
        },
      },
    },
  },
};
