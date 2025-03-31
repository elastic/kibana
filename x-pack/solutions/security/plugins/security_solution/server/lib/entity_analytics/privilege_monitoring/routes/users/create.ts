/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { CreateUserRequestBody } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/create.gen';
import type { CreateUserResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/create.gen';
import { API_VERSIONS } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const createUserRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_analytics/monitoring/users',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: CreateUserRequestBody,
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreateUserResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          // Placeholder for actual implementation
          return response.ok({ body: { id: '123', user_name: 'test_user', is_monitored: true } });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error creating user: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
