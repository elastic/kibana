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
  MAX_FILTER_LENGTH,
  boundedString,
  optionalBoundedString,
} from '../schema_limits';

export const createGetSnapshotCount: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.SNAPSHOT_COUNT,
  validate: {
    query: schema.object({
      dateRangeStart: boundedString(MAX_DATE_RANGE_LENGTH),
      dateRangeEnd: boundedString(MAX_DATE_RANGE_LENGTH),
      filters: optionalBoundedString(MAX_FILTER_LENGTH),
      query: optionalBoundedString(MAX_FILTER_LENGTH),
    }),
  },
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { dateRangeStart, dateRangeEnd, filters, query } = request.query;

    return await libs.requests.getSnapshotCount({
      uptimeEsClient,
      dateRangeStart,
      dateRangeEnd,
      filters,
      query,
    });
  },
});
