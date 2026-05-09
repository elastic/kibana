/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  FINAL_SUMMARY_FILTER,
} from '../../../common/constants/client_defaults';
import type { SyntheticsRestApiRouteFactory } from '../types';

export interface MonitorSummaryStats {
  availability: number;
  medianDuration: number;
  errorCount: number;
  totalRuns: number;
}

export const getMonitorSummaryStatsRoute: SyntheticsRestApiRouteFactory<
  MonitorSummaryStats
> = () => ({
  method: 'GET',
  writeAccess: false,
  path: SYNTHETICS_API_URLS.MONITOR_SUMMARY_STATS,
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      locationLabel: schema.string(),
      from: schema.string({ defaultValue: 'now-30d' }),
      to: schema.string({ defaultValue: 'now' }),
    }),
  },
  handler: async ({ syntheticsEsClient, request }): Promise<MonitorSummaryStats> => {
    const { monitorId, locationLabel, from, to } = request.query as {
      monitorId: string;
      locationLabel: string;
      from: string;
      to: string;
    };

    const { body: result } = await syntheticsEsClient.search({
      size: 0,
      query: {
        bool: {
          filter: [
            FINAL_SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            { term: { 'monitor.id': monitorId } },
            { term: { 'observer.geo.name': locationLabel } },
            { range: { '@timestamp': { gte: from, lte: to } } },
          ],
        },
      },
      aggs: {
        total: { value_count: { field: 'summary.up' } },
        up: {
          filter: { term: { 'monitor.status': 'up' } },
        },
        down: {
          filter: { term: { 'monitor.status': 'down' } },
        },
        median_duration: {
          percentiles: { field: 'monitor.duration.us', percents: [50] },
        },
      },
    });

    const aggs = (result as any).aggregations;
    const total = aggs?.total?.value ?? 0;
    const upCount = aggs?.up?.doc_count ?? 0;
    const downCount = aggs?.down?.doc_count ?? 0;

    const availability = total > 0 ? (upCount / total) * 100 : 0;
    const medianUs = aggs?.median_duration?.values?.['50.0'] ?? 0;

    return {
      availability: Math.round(availability * 1000) / 1000,
      medianDuration: Math.round(medianUs / 1000),
      errorCount: downCount,
      totalRuns: total,
    };
  },
});
