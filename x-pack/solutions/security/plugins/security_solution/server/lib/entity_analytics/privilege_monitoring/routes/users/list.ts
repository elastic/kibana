/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { getPrivilegedMonitorUsersIndex } from '../../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import {
  ListPrivMonUsersRequestQuery,
  type ListPrivMonUsersResponse,
} from '../../../../../../common/api/entity_analytics';
import {
  API_VERSIONS,
  APP_ID,
  MONITORING_USERS_LIST_URL,
} from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { createPrivilegedUsersCrudService } from '../../users/privileged_users_crud';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

export const listUsersRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: MONITORING_USERS_LIST_URL,
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
      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<ListPrivMonUsersResponse>> => {
          const siemResponse = buildSiemResponse(response);
          try {
            const secSol = await context.securitySolution;
            const { elasticsearch } = await context.core;
            const crudService = createPrivilegedUsersCrudService({
              esClient: elasticsearch.client.asCurrentUser,
              index: getPrivilegedMonitorUsersIndex(secSol.getSpaceId()),
              logger: secSol.getLogger(),
            });

            const body = await crudService.list(request.query.kql);
            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error listing users: ${error.message}`);
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
