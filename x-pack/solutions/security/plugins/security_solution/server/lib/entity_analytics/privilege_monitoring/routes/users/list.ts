/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { ListPrivMonUsersRequestQuery } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/list.gen';
import type { ListPrivMonUsersResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/list.gen';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const listUsersRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/monitoring/users/list',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: ListPrivMonUsersRequestQuery,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ListPrivMonUsersResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const body = await secSol.getPrivilegeMonitoringDataClient().listUsers(request.query.kql);
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error listing users: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
