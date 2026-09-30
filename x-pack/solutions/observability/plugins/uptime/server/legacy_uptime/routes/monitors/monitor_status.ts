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

export const createGetStatusBarRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_STATUS,
  validate: {
    query: schema.object({
      monitorId: schema.string({ maxLength: 1024 }),
      dateStart: schema.string({ maxLength: 256 }),
      dateEnd: schema.string({ maxLength: 256 }),
    }),
  },
  handler: async ({ uptimeEsClient, request, server, savedObjectsClient }): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query;

    const latestMonitor = await libs.requests.getLatestMonitor({
      uptimeEsClient,
      monitorId,
      dateStart,
      dateEnd,
    });

    if (latestMonitor.docId) {
      return latestMonitor;
    }
  },
});
