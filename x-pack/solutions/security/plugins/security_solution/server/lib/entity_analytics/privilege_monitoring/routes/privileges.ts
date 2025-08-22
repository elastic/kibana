/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { PrivMonPrivilegesResponse } from '../../../../../common/api/entity_analytics/privilege_monitoring/privileges.gen';
import {
  API_VERSIONS,
  APP_ID,
  PRIVILEGE_MONITORING_PRIVILEGE_CHECK_API,
} from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { getReadPrivilegeUserMonitoringPrivileges } from '../privilege_monitoring_privileges';

export const privilegesCheckPrivilegeMonitoringRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .get({
      access: 'public',
      path: PRIVILEGE_MONITORING_PRIVILEGE_CHECK_API,
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

      async (context, request, response): Promise<IKibanaResponse<PrivMonPrivilegesResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;
        const spaceId = secSol.getSpaceId();
        const [_, { security }] = await getStartServices();

        try {
          const body = await getReadPrivilegeUserMonitoringPrivileges(request, security, spaceId);
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);

          logger.error(`Error checking privilege monitoring privileges: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
