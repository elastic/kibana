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

export const createGetPingHistogramRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PING_HISTOGRAM,
  validate: {
    query: schema.object({
      dateStart: schema.string({ maxLength: 256 }),
      dateEnd: schema.string({ maxLength: 256 }),
      monitorId: schema.maybe(schema.string({ maxLength: 1024 })),
      filters: schema.maybe(schema.string({ maxLength: 1024 })),
      bucketSize: schema.maybe(schema.string({ maxLength: 50 })),
      query: schema.maybe(schema.string({ maxLength: 1024 })),
      timeZone: schema.string({ maxLength: 256 }),
    }),
  },
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { dateStart, dateEnd, monitorId, filters, bucketSize, query, timeZone } = request.query;

    return await libs.requests.getPingHistogram({
      uptimeEsClient,
      dateStart,
      dateEnd,
      monitorId,
      filters,
      bucketSize,
      query,
      timeZone,
    });
  },
});
