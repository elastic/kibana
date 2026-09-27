/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Response body for `GET /api/profiling/setup/es_resources`
 *
 * OAS documentation only: Kibana never applies `validate.response` to unversioned routes.
 *
 * Lazily loaded.
 */
export const setupStatusResponseSchema = () =>
  schema.object(
    {
      profiling_enabled: schema.boolean({
        meta: {
          description:
            'Whether the Universal Profiling plugin is enabled in the Elasticsearch cluster.',
        },
      }),
      has_setup: schema.boolean({
        meta: {
          description:
            'Whether every resource Universal Profiling requires has already been created.',
        },
      }),
      has_data: schema.boolean({
        meta: { description: 'Whether Universal Profiling has ingested any data.' },
      }),
      pre_8_9_1_data: schema.boolean({
        meta: {
          description:
            'Whether data ingested before version 8.9.1 is present. That data cannot be read by the current version.',
        },
      }),
      has_required_role: schema.boolean({
        meta: {
          description:
            'Whether the current user has the privileges required to run Universal Profiling setup.',
        },
      }),
    },
    { meta: { id: 'profiling_setup_status_response' } }
  );
