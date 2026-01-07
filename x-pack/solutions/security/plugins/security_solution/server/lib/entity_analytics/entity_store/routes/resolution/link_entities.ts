/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { LinkEntitiesResponse } from '../../../../../../common/api/entity_analytics/entity_store/resolution/link_entities.gen';
import {
  LinkEntitiesRequestBody,
  LinkEntitiesRequestParams,
} from '../../../../../../common/api/entity_analytics/entity_store/resolution/link_entities.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { EngineNotRunningError, BadCRUDRequestError } from '../../errors';

export const linkEntities = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .put({
      access: 'public',
      path: '/api/entity_store/resolution/{entityType}',
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
            params: buildRouteValidationWithZod(LinkEntitiesRequestParams),
            body: buildRouteValidationWithZod(LinkEntitiesRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<LinkEntitiesResponse>> => {
        const secSol = await context.securitySolution;

        try {
          const resolutionClient = secSol.getEntityResolutionClient();
          const result = await resolutionClient.linkEntities(
            request.params.entityType,
            request.body.entities
          );

          return response.ok({ body: result });
        } catch (error) {
          if (error instanceof EngineNotRunningError) {
            return response.customError({ statusCode: 503, body: error as EngineNotRunningError });
          }

          if (error instanceof BadCRUDRequestError) {
            return response.badRequest({ body: error as BadCRUDRequestError });
          }

          logger.error(error);
          throw error;
        }
      }
    );
};
