/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { queryPings } from '../../queries/query_pings';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  MAX_DATE_LENGTH,
  MAX_ENUM_LENGTH,
  MAX_ID_LENGTH,
  MAX_LABEL_LENGTH,
} from '../../constants/schema_validation';

export const getPingsRouteQuerySchema = schema.object({
  from: schema.string({ maxLength: MAX_DATE_LENGTH }),
  to: schema.string({ maxLength: MAX_DATE_LENGTH }),
  locations: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
  excludedLocations: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
  monitorId: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
  index: schema.maybe(schema.number()),
  size: schema.maybe(schema.number()),
  pageIndex: schema.maybe(schema.number()),
  sort: schema.maybe(schema.string({ maxLength: MAX_ENUM_LENGTH })),
  status: schema.maybe(schema.string({ maxLength: MAX_ENUM_LENGTH })),
  remoteName: schema.maybe(schema.string({ maxLength: MAX_LABEL_LENGTH })),
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
