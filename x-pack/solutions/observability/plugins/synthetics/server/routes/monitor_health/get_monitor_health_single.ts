/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { routeId } from '../zod_query';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../types';

export const getMonitorHealthRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_HEALTH,
  writeAccess: false,
  validate: {
    params: z.object({
      monitorId: routeId,
    }),
  },
  handler: async (routeContext) => {
    const { monitorId } = routeContext.request.params;
    const { monitors, errors } = await routeContext.monitorIntegrationHealthApi.getHealth([
      monitorId,
    ]);

    if (monitors.length === 0) {
      const error = errors.find((e) => e.configId === monitorId);

      if (!error || error.statusCode === 404) {
        return routeContext.response.notFound({
          body: { message: error?.message ?? `Monitor ${monitorId} not found` },
        });
      }

      return routeContext.response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }

    return monitors[0];
  },
});
