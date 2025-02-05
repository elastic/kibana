/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MonitorStatusHeatmapBucket } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { queryMonitorHeatmap } from '../../common/pings/monitor_status_heatmap';
import { SyntheticsRestApiRouteFactory } from '../types';

export const syntheticsGetPingHeatmapRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MONITOR_STATUS_HEATMAP,
  validate: {
    query: schema.object({
      from: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
      to: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
      interval: schema.number(),
      monitorId: schema.string(),
      location: schema.string(),
    }),
  },
  handler: async ({
    syntheticsEsClient,
    request,
  }): Promise<{ result: MonitorStatusHeatmapBucket[] } | undefined> => {
    const { from, to, interval: intervalInMinutes, monitorId, location } = request.query;

    const result = await queryMonitorHeatmap({
      syntheticsEsClient,
      from,
      to,
      monitorId,
      location,
      intervalInMinutes,
    });

    return { result: result.body.aggregations?.heatmap?.buckets as MonitorStatusHeatmapBucket[] };
  },
});
