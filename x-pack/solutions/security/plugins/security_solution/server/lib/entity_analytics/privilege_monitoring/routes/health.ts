/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { PrivMonHealthResponse } from '../../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID, PRIVMON_HEALTH_URL } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createEngineStatusService } from '../engine/status_service';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../constants';
import { withMinimumLicense } from '../../utils/with_minimum_license';

export const healthCheckPrivilegeMonitoringRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: PRIVMON_HEALTH_URL,
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

      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<PrivMonHealthResponse>> => {
          const siemResponse = buildSiemResponse(response);
          const secSol = await context.securitySolution;

          const dataClient = secSol.getPrivilegeMonitoringDataClient();
          const soClient = dataClient.getScopedSoClient(request);
          const config = secSol.getConfig();
          const maxUsersAllowed =
            config.entityAnalytics.monitoring.privileges.users.maxPrivilegedUsersAllowed;

          const statusService = createEngineStatusService(dataClient, soClient);

          try {
            const body = await statusService.get();

            // Only include user count if engine status is "started"
            if (body.status === PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED) {
              const userCountResponse = await statusService.getCurrentUserCount();
              return response.ok({
                body: {
                  ...body,
                  users: {
                    current_count: userCountResponse.count,
                    max_allowed: maxUsersAllowed,
                  },
                },
              });
            } else {
              return response.ok({ body });
            }
          } catch (e) {
            const error = transformError(e);

            logger.error(`Error checking privilege monitoring health: ${error.message}`);
            return siemResponse.error({
              statusCode: error.statusCode,
              body: error.message,
            });
          }
        },
        'platinum'
      )
    );
};
