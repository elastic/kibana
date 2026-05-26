/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getErrorStats } from '../../queries/get_error_stats';
import { safeJsonParse } from './safe_json_parse';

export const getErrorStatsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.ERROR_STATS,
  validate: {
    query: schema.object({
      from: schema.string(),
      to: schema.string(),
      monitorTypes: schema.maybe(schema.string()),
      locations: schema.maybe(schema.string()),
      tags: schema.maybe(schema.string()),
      projects: schema.maybe(schema.string()),
      statusCodes: schema.maybe(schema.string()),
      query: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ syntheticsEsClient, request }) => {
    const { from, to, monitorTypes, locations, tags, projects, statusCodes, query } = request.query;

    return await getErrorStats({
      syntheticsEsClient,
      from,
      to,
      monitorTypes: safeJsonParse(monitorTypes),
      locations: safeJsonParse(locations),
      tags: safeJsonParse(tags),
      projects: safeJsonParse(projects),
      statusCodes: safeJsonParse(statusCodes),
      query: query || undefined,
    });
  },
});
