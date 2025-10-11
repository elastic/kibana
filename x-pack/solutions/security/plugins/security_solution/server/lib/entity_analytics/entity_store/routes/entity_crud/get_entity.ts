/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { GetEntityResponse } from '../../../../../../common/api/entity_analytics/entity_store/entities/get_entity.gen';
import { GetEntityRequestParams } from '../../../../../../common/api/entity_analytics/entity_store/entities/get_entity.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { BadCRUDRequestError, EngineNotRunningError } from '../../errors';
import { CapabilityNotEnabledError } from '../../errors/capability_not_enabled_error';

export const getEntity = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_store/entities/{entityType}/{entityId}',
      options: {
        availability: {
          stability: 'beta',
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
            params: buildRouteValidationWithZod(GetEntityRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetEntityResponse>> => {
        const secSol = await context.securitySolution;

        try {
          const entity = await secSol
            .getEntityStoreCrudClient()
            .getEntity(request.params.entityType, request.params.entityId);

          return response.ok({ body: entity });
        } catch (error) {
          if (
            error instanceof EngineNotRunningError ||
            error instanceof CapabilityNotEnabledError
          ) {
            // Service Unavailable 503
            return response.customError({ statusCode: 503, body: error as EngineNotRunningError });
          }

          if (error instanceof BadCRUDRequestError) {
            return response.badRequest({ body: error as BadCRUDRequestError });
          }

          if (error.message && error.message.includes('not found')) {
            return response.notFound({ body: { message: error.message } });
          }

          logger.error(error);
          throw error;
        }
      }
    );
};
