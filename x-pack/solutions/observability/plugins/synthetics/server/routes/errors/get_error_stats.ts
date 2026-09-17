/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MAX_DATE_RANGE_LENGTH, MAX_ROUTE_STRING_LENGTH } from '../zod_query';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getErrorStats } from '../../queries/get_error_stats';
import { safeJsonParse } from './safe_json_parse';

export const getErrorStatsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.ERROR_STATS,
  validate: {
    query: z.object({
      // Datemath / ISO timestamps; same 256 cap as QuerySchema dateRangeStart.
      from: z.string().max(MAX_DATE_RANGE_LENGTH),
      to: z.string().max(MAX_DATE_RANGE_LENGTH),
      monitorTypes: z.string().max(MAX_ROUTE_STRING_LENGTH).optional(),
      locations: z.string().max(MAX_ROUTE_STRING_LENGTH).optional(),
      tags: z.string().max(MAX_ROUTE_STRING_LENGTH).optional(),
      projects: z.string().max(MAX_ROUTE_STRING_LENGTH).optional(),
      statusCodes: z.string().max(MAX_ROUTE_STRING_LENGTH).optional(),
      query: z.string().max(MAX_ROUTE_STRING_LENGTH).optional(),
    }),
  },
  handler: async ({ syntheticsEsClient, request, spaceId }) => {
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
      spaceId,
    });
  },
});
