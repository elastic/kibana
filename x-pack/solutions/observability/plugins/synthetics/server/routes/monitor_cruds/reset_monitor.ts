/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import { ResetMonitorAPI } from './services/reset_monitor_api';

export const resetSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_RESET,
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
    query: schema.object({
      force: schema.boolean({ defaultValue: false }),
    }),
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response, server } = routeContext;
    const { monitorId } = request.params;
    const { force } = request.query;

    try {
      const resetAPI = new ResetMonitorAPI(routeContext, force);
      const { result, errors } = await resetAPI.execute({ monitorIds: [monitorId] });

      const monitorResult = result[0];

      if (monitorResult && !monitorResult.reset && monitorResult.error?.includes('not found')) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      if (monitorResult && !monitorResult.reset && monitorResult.error) {
        return response.forbidden({ body: { message: monitorResult.error } });
      }

      if (errors && errors.length > 0) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'error resetting monitor Fleet resources',
            attributes: { errors },
          },
        });
      }

      return { id: monitorResult?.id ?? monitorId, reset: true };
    } catch (error) {
      server.logger.error(`Unable to reset Synthetics monitor ${monitorId}: ${error.message}`, {
        error,
      });

      return response.customError({
        body: { message: error.message },
        statusCode: 500,
      });
    }
  },
});
