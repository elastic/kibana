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
import {
  MAX_BUCKET_SIZE_LENGTH,
  MAX_DATE_RANGE_LENGTH,
  MAX_FILTER_LENGTH,
  MAX_ID_LENGTH,
  MAX_TIME_ZONE_LENGTH,
  boundedString,
  optionalBoundedString,
} from '../schema_limits';

export const createGetPingHistogramRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PING_HISTOGRAM,
  validate: {
    query: schema.object({
      dateStart: boundedString(MAX_DATE_RANGE_LENGTH),
      dateEnd: boundedString(MAX_DATE_RANGE_LENGTH),
      monitorId: optionalBoundedString(MAX_ID_LENGTH),
      filters: optionalBoundedString(MAX_FILTER_LENGTH),
      bucketSize: optionalBoundedString(MAX_BUCKET_SIZE_LENGTH),
      query: optionalBoundedString(MAX_FILTER_LENGTH),
      timeZone: boundedString(MAX_TIME_ZONE_LENGTH),
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
