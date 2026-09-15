/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../types';

export const getMonitorsHealthRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_HEALTH,
  writeAccess: false,
  validate: {
    body: schema.object({
      monitorIds: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 500 }),
    }),
  },
  handler: async (routeContext) => {
    const { monitorIds } = routeContext.request.body;
    return routeContext.monitorIntegrationHealthApi.getHealth(monitorIds);
  },
});
