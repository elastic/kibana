/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Response body for `GET /api/profiling/setup/es_resources`: the `ProfilingStatus`
 * returned by `profilingDataAccess.services.getStatus()` spread together with the
 * `has_required_role` flag the route adds unconditionally.
 *
 * Intentionally narrower than the `ProfilingStatus` TS type: `type` is required here
 * and `unauthorized` is absent, because the only code path that omits `type` / sets
 * `unauthorized` is the unreachable 403 branch in `profiling_data_access`. Safe because
 * Kibana never applies `validate.response` to unversioned routes — this is OAS
 * documentation only. Do not loosen it to match the TS type.
 *
 * Lazily loaded.
 */
export const setupStatusResponseSchema = () =>
  schema.object(
    {
      type: schema.oneOf(
        [schema.literal('cloud'), schema.literal('self-managed'), schema.literal('serverless')],
        { meta: { description: 'The kind of deployment Universal Profiling is running on.' } }
      ),
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
