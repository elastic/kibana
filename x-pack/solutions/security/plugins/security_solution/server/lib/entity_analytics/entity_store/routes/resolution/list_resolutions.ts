/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { ListResolutionsResponse } from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_resolutions.gen';
import { ListResolutionsRequestParams } from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_resolutions.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { EngineNotRunningError } from '../../errors';

export const listResolutions = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .get({
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
            params: buildRouteValidationWithZod(ListResolutionsRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ListResolutionsResponse>> => {
        const secSol = await context.securitySolution;

        try {
          const resolutionClient = secSol.getEntityResolutionClient();
          const result = await resolutionClient.listResolutions(request.params.entityType);

          return response.ok({ body: result });
        } catch (error) {
          if (error instanceof EngineNotRunningError) {
            return response.customError({ statusCode: 503, body: error as EngineNotRunningError });
          }

          logger.error(error);
          throw error;
        }
      }
    );
};
