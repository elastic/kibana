/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import type { DeleteEntityEngineResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/delete.gen';
import {
  DeleteEntityEngineRequestQuery,
  DeleteEntityEngineRequestParams,
} from '../../../../../common/api/entity_analytics/entity_store/engine/delete.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from '../../risk_engine/routes/translations';

export const deleteEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .delete({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}',
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
            query: buildRouteValidationWithZod(DeleteEntityEngineRequestQuery),
            params: buildRouteValidationWithZod(DeleteEntityEngineRequestParams),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<DeleteEntityEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const [_, { taskManager }] = await getStartServices();
        if (!taskManager) {
          return siemResponse.error({
            statusCode: 400,
            body: TASK_MANAGER_UNAVAILABLE_ERROR,
          });
        }
        try {
          const secSol = await context.securitySolution;
          const body = await secSol
            .getEntityStoreDataClient()
            .delete(request.params.entityType, taskManager, {
              deleteData: !!request.query.data,
              deleteEngine: true,
            });

          return response.ok({ body });
        } catch (e) {
          logger.error('Error in DeleteEntityEngine:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
