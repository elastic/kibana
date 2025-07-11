/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { DisableMonitoringEngineResponse } from '../../../../../common/api/entity_analytics/privilege_monitoring/engine/disable.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const disablePrivilegeMonitoringEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_analytics/monitoring/engine/disable',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<DisableMonitoringEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        try {
          const body = await secSol.getPrivilegeMonitoringDataClient().disable();
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error disabling privilege monitoring engine: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
