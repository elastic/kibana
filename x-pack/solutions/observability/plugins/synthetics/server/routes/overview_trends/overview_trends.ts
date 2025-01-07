/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectType, schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { TrendRequest, TrendTable } from '../../../common/types';
import { getFetchTrendsQuery, TrendsQuery } from './fetch_trends';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SyntheticsEsClient } from '../../lib';

export const getIntervalForCheckCount = (schedule: string, numChecks = 50) =>
  Number(schedule) * numChecks;

export async function fetchTrends(
  esClient: SyntheticsEsClient,
  configs: Record<
    string,
    {
      locations: string[];
      interval: number;
    }
  >
): Promise<TrendTable> {
  const requests = Object.keys(configs).map(
    (key) => getFetchTrendsQuery(key, configs[key].locations, configs[key].interval).body
  );
  const results = await esClient.msearch<TrendsQuery>(requests);

  return results.responses.reduce((table, res): TrendTable => {
    res.aggregations?.byId.buckets.map(({ key, byLocation }) => {
      const nTable: TrendTable = {};
      for (const location of byLocation.buckets) {
        nTable[String(key) + String(location.key)] = {
          configId: String(key),
          locationId: String(location.key),
          data: location.last50.buckets.map((durationBucket, x) => ({
            x,
            y: durationBucket.max.value!,
          })),
          ...location.stats,
          median: location.median.values['50.0']!,
        };
      }
      table = { ...table, ...nTable };
    });
    return table;
  }, {});
}

export const createOverviewTrendsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  writeAccess: false,
  path: SYNTHETICS_API_URLS.OVERVIEW_TRENDS,
  validate: {
    body: schema.arrayOf(
      schema.object({
        configId: schema.string(),
        locationId: schema.string(),
        schedule: schema.string(),
      })
    ) as unknown as ObjectType,
  },
  handler: async (routeContext): Promise<TrendTable> => {
    const esClient = routeContext.syntheticsEsClient;
    const body = routeContext.request.body as TrendRequest[];

    const configs = body.reduce(
      (
        acc: Record<string, { locations: string[]; interval: number }>,
        { configId, locationId, schedule }
      ) => {
        if (!acc[configId]) {
          acc[configId] = { locations: [locationId], interval: getIntervalForCheckCount(schedule) };
        } else {
          acc[configId].locations.push(locationId);
        }
        return acc;
      },
      {}
    );

    return fetchTrends(esClient, configs);
  },
});
