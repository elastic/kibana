/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { queryNumber, optionalQueryString, MAX_DATE_RANGE_LENGTH } from '../zod_query';
import { queryPings } from '../../queries/query_pings';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getPingsRouteQuerySchema = z.object({
  from: z.string().max(MAX_DATE_RANGE_LENGTH),
  to: z.string().max(MAX_DATE_RANGE_LENGTH),
  locations: optionalQueryString,
  excludedLocations: optionalQueryString,
  monitorId: optionalQueryString,
  index: queryNumber.optional(),
  size: queryNumber.optional(),
  pageIndex: queryNumber.optional(),
  sort: optionalQueryString,
  status: optionalQueryString,
  remoteName: z.string().max(256).optional(),
});

type GetPingsRouteRequest = z.infer<typeof getPingsRouteQuerySchema>;

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
      remoteName,
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
      remoteName,
    });
  },
});
