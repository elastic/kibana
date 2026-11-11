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
  MAX_DATE_RANGE_LENGTH,
  MAX_ID_LENGTH,
  MAX_LOCATION_LIST_LENGTH,
  MAX_SORT_LENGTH,
  MAX_STATUS_LENGTH,
  boundedString,
  optionalBoundedString,
} from '../schema_limits';

export const createGetPingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.PINGS,
  validate: {
    query: schema.object({
      from: boundedString(MAX_DATE_RANGE_LENGTH),
      to: boundedString(MAX_DATE_RANGE_LENGTH),
      locations: optionalBoundedString(MAX_LOCATION_LIST_LENGTH),
      excludedLocations: optionalBoundedString(MAX_LOCATION_LIST_LENGTH),
      monitorId: optionalBoundedString(MAX_ID_LENGTH),
      index: schema.maybe(schema.number()),
      size: schema.maybe(schema.number()),
      sort: optionalBoundedString(MAX_SORT_LENGTH),
      status: optionalBoundedString(MAX_STATUS_LENGTH),
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
