/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UMServerLibs } from '../../lib/lib';
import type { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../../common/constants';

export const createGetPingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PINGS,
  validate: {
    query: schema.object({
      from: schema.string({ maxLength: 256 }),
      to: schema.string({ maxLength: 256 }),
      locations: schema.maybe(schema.string({ maxLength: 1024 })),
      excludedLocations: schema.maybe(schema.string({ maxLength: 1024 })),
      monitorId: schema.maybe(schema.string({ maxLength: 1024 })),
      index: schema.maybe(schema.number()),
      size: schema.maybe(schema.number()),
      sort: schema.maybe(schema.string({ maxLength: 50 })),
      status: schema.maybe(schema.string({ maxLength: 50 })),
    }),
  },
  handler: async ({ uptimeEsClient, request, response }): Promise<any> => {
    const { from, to, index, monitorId, status, sort, size, locations, excludedLocations } =
      request.query;

    return await libs.requests.getPings({
      uptimeEsClient,
      dateRange: { from, to },
      index,
      monitorId,
      status,
      sort,
      size,
      locations: locations ? JSON.parse(locations) : [],
      excludedLocations,
    });
  },
});
