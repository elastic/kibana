/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MAX_MONITOR_BULK_SIZE, routeId } from '../zod_query';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../types';

export const getMonitorsHealthRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_HEALTH,
  writeAccess: false,
  validate: {
    body: z.object({
      monitorIds: z.array(routeId).min(1).max(MAX_MONITOR_BULK_SIZE),
    }),
  },
  handler: async (routeContext) => {
    const { monitorIds } = routeContext.request.body;
    return routeContext.monitorIntegrationHealthApi.getHealth(monitorIds);
  },
});
