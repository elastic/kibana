/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { ResetMonitorAPI } from '../services/reset_monitor_api';

export const resetSyntheticsMonitorBulkRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_RESET,
  validate: {
    body: schema.object({
      ids: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 500 }),
    }),
  },
  handler: async (routeContext): Promise<any> => {
    const { request } = routeContext;
    const { ids } = request.body || {};

    const resetAPI = new ResetMonitorAPI(routeContext);
    const { result, errors } = await resetAPI.execute({ monitorIds: ids });

    return { result, errors };
  },
});
