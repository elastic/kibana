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
  boundedString,
  optionalBoundedString,
} from '../schema_limits';

export const createGetMonitorDetailsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_DETAILS,
  validate: {
    query: schema.object({
      monitorId: boundedString(MAX_ID_LENGTH),
      dateStart: optionalBoundedString(MAX_DATE_RANGE_LENGTH),
      dateEnd: optionalBoundedString(MAX_DATE_RANGE_LENGTH),
    }),
  },
  handler: async ({ uptimeEsClient, context, request }): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query;

    const rulesClient = await (await context.alerting)?.getRulesClient();

    return await libs.requests.getMonitorDetails({
      uptimeEsClient,
      monitorId,
      dateStart,
      dateEnd,
      rulesClient,
    });
  },
});
