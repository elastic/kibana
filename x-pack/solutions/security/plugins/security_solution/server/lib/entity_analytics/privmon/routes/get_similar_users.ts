/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { PRIVMON_SIMILAR_USERS_URL } from '../../../../../common/entity_analytics/privmon';
import {
  PrivilegedUserIdentityFields,
  type PrivmonGetSimilarUsersResponse,
} from '../../../../../common/api/entity_analytics/privmon';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from '../../risk_engine/routes/translations';

export const privmonGetSimilarUsersRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: PRIVMON_SIMILAR_USERS_URL,
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
            body: buildRouteValidationWithZod(PrivilegedUserIdentityFields),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PrivmonGetSimilarUsersResponse>> => {
        const securitySolution = await context.securitySolution;
        const siemResponse = buildSiemResponse(response);
        const [_, { taskManager }] = await getStartServices();
        const privmonDataClient = securitySolution.getPrivmonDataClient();
        try {
          if (!taskManager) {
            return siemResponse.error({
              statusCode: 400,
              body: TASK_MANAGER_UNAVAILABLE_ERROR,
            });
          }

          const { users } = await privmonDataClient.findSimilarUsers(request.body);

          return response.ok({
            body: {
              users,
            },
          });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
