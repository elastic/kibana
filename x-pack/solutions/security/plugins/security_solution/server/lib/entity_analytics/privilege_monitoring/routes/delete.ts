/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { DeleteEntityEngineRequestQuery } from '../../../../../common/api/entity_analytics';
import type { DeleteMonitoringEngineResponse } from '../../../../../common/api/entity_analytics/privilege_monitoring/engine/delete.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const deletePrivilegeMonitoringEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .delete({
      access: 'public',
      path: '/api/entity_analytics/monitoring/engine/delete',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      options: {
        availability: {
          since: '9.1.0',
          stability: 'stable',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DeleteEntityEngineRequestQuery),
          },
        },
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<DeleteMonitoringEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        try {
          const body = await secSol.getPrivilegeMonitoringDataClient().delete(request.query.data);
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error deleting privilege monitoring engine: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
