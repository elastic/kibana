/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { InitMonitoringEngineResponse } from '../../../../../common/api/entity_analytics/privilege_monitoring/engine/init.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const padPrecheckAndInstallRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/api/entity_analytics/monitoring/pad/install',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<InitMonitoringEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        try {
          const clientResponse = await secSol
            .getPadPrecheckAndInstallClient()
            .padPrecheckAndInstall();
          logger.info(`PAD precheck and installation status: ${JSON.stringify(clientResponse)}`);
          return response.ok({
            body: {
              status: 'installing',
              data: clientResponse,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error PAD precheck and installation: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
