/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { queryPings } from '../../queries/query_pings';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getPingsRouteQuerySchema = schema.object({
  from: schema.string(),
  to: schema.string(),
  locations: schema.maybe(schema.string()),
  excludedLocations: schema.maybe(schema.string()),
  monitorId: schema.maybe(schema.string()),
  index: schema.maybe(schema.number()),
  size: schema.maybe(schema.number()),
  pageIndex: schema.maybe(schema.number()),
  sort: schema.maybe(schema.string()),
  status: schema.maybe(schema.string()),
});

type GetPingsRouteRequest = TypeOf<typeof getPingsRouteQuerySchema>;

export const syntheticsGetPingsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PINGS,
  validate: {
    query: getPingsRouteQuerySchema,
  },
  handler: async ({ syntheticsEsClient, request, response }): Promise<any> => {
    const {
      from,
      to,
      index,
      monitorId,
      status,
      sort,
      size,
      pageIndex,
      locations,
      excludedLocations,
    } = request.query as GetPingsRouteRequest;

    return await queryPings({
      syntheticsEsClient,
      dateRange: { from, to },
      index,
      monitorId,
      status,
      sort,
      size,
      pageIndex,
      locations: locations ? JSON.parse(locations) : [],
      excludedLocations,
    });
  },
});
