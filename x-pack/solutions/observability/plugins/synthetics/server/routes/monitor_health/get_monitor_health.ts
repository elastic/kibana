/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MAX_MONITOR_BATCH_SIZE, MAX_MONITOR_FANOUT_SIZE, routeId } from '../zod_query';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../types';

export const getMonitorsHealthRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_HEALTH,
  writeAccess: false,
  validate: {
    body: z.strictObject({
      monitorIds: z.array(routeId).min(1).max(MAX_MONITOR_FANOUT_SIZE).optional(),
      locationIds: z.array(routeId).min(1).max(MAX_MONITOR_BATCH_SIZE).optional(),
    }),
  },
  handler: async (routeContext) => {
    const { monitorIds, locationIds } = routeContext.request.body;
    if (monitorIds && !locationIds) {
      return routeContext.monitorIntegrationHealthApi.getHealth(monitorIds);
    }
    if (locationIds && !monitorIds) {
      return routeContext.monitorIntegrationHealthApi.getHealthForLocations(locationIds);
    }
    return routeContext.response.badRequest({
      body: { message: 'Provide either monitorIds or locationIds.' },
    });
  },
});
