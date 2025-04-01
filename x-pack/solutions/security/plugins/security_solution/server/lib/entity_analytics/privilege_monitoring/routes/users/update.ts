/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  UpdateUserRequestParams,
  UpdateUserRequestBody,
} from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/update.gen';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const updateUserRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .put({
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
            params: UpdateUserRequestParams,
            body: UpdateUserRequestBody,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          // Placeholder for actual implementation
          return response.ok({
            body: { id: request.params.id, user_name: 'updated_user', is_monitored: true },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error updating user: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
