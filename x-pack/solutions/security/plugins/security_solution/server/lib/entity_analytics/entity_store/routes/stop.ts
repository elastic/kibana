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

import type { StopEntityEngineResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/stop.gen';
import { StopEntityEngineRequestParams } from '../../../../../common/api/entity_analytics/entity_store/engine/stop.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { ENGINE_STATUS } from '../constants';

export const stopEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}/stop',
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
            params: buildRouteValidationWithZod(StopEntityEngineRequestParams),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<StopEntityEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const engine = await secSol.getEntityStoreDataClient().stop(request.params.entityType);

          return response.ok({ body: { stopped: engine.status === ENGINE_STATUS.STOPPED } });
        } catch (e) {
          logger.error(`Error in StopEntityEngine: ${e.message}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
