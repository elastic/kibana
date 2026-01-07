/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { GetResolutionResponse } from '../../../../../../common/api/entity_analytics/entity_store/resolution/get_resolution.gen';
import { GetResolutionRequestParams } from '../../../../../../common/api/entity_analytics/entity_store/resolution/get_resolution.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { EngineNotRunningError, BadCRUDRequestError } from '../../errors';

export const getResolution = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_store/resolution/{entityType}/{entityId}',
      options: {
        availability: {
          stability: 'experimental',
        },
      },
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
            params: buildRouteValidationWithZod(GetResolutionRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetResolutionResponse>> => {
        const secSol = await context.securitySolution;

        try {
          const resolutionClient = secSol.getEntityResolutionClient();
          const result = await resolutionClient.getResolution(
            request.params.entityType,
            request.params.entityId
          );

          return response.ok({ body: result });
        } catch (error) {
          if (error instanceof EngineNotRunningError) {
            return response.customError({ statusCode: 503, body: error as EngineNotRunningError });
          }

          if (error instanceof BadCRUDRequestError) {
            return response.notFound({ body: { message: error.message } });
          }

          logger.error(error);
          throw error;
        }
      }
    );
};
