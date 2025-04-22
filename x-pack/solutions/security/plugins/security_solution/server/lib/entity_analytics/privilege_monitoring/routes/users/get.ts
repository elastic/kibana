/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { GetPrivMonUserRequestParams } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/get.gen';
import type { GetPrivMonUserResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/get.gen';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const getUserRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/monitoring/users/{id}',
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
            params: GetPrivMonUserRequestParams,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetPrivMonUserResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const body = await secSol.getPrivilegeMonitoringDataClient().getUser(request.params.id);
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving user: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
