/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { queryNumber, routeId, MAX_DATE_RANGE_LENGTH, MAX_ROUTE_ID_LENGTH } from '../zod_query';
import type { MonitorStatusHeatmapBucket } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { queryMonitorHeatmap } from '../../common/pings/monitor_status_heatmap';
import type { SyntheticsRestApiRouteFactory } from '../types';

export const syntheticsGetPingHeatmapRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MONITOR_STATUS_HEATMAP,
  validate: {
    query: z.strictObject({
      // Query values are strings; keep datemath (`now-1h`) rather than coercing to NaN.
      from: z.union([z.string().max(MAX_DATE_RANGE_LENGTH), queryNumber]).optional(),
      to: z.union([z.string().max(MAX_DATE_RANGE_LENGTH), queryNumber]).optional(),
      interval: queryNumber,
      monitorId: routeId,
      location: z.string().max(MAX_ROUTE_ID_LENGTH),
      remoteName: z.string().max(256).optional(),
    }),
  },
  handler: async ({
    syntheticsEsClient,
    request,
  }): Promise<{ result: MonitorStatusHeatmapBucket[] } | undefined> => {
    const {
      from,
      to,
      interval: intervalInMinutes,
      monitorId,
      location,
      remoteName,
    } = request.query;

    const result = await queryMonitorHeatmap({
      syntheticsEsClient,
      from,
      to,
      monitorId,
      location,
      intervalInMinutes,
      remoteName,
    });

    return { result: result.body.aggregations?.heatmap?.buckets as MonitorStatusHeatmapBucket[] };
  },
});
