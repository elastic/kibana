/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { UpdateSingleEntityResponse } from '../../../../../../common/api/entity_analytics';
import {
  UpdateSingleEntityRequestBody,
  UpdateSingleEntityRequestParams,
  UpdateSingleEntityRequestQuery,
} from '../../../../../../common/api/entity_analytics';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { BadCRUDRequestError, DocumentNotFoundError, EngineNotRunningError } from '../../errors';

export const updateSingleEntity = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .put({
      access: 'public',
      path: '/api/entity_store/entities/{entityType}/{entityId}',
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
            query: buildRouteValidationWithZod(UpdateSingleEntityRequestQuery),
            params: buildRouteValidationWithZod(UpdateSingleEntityRequestParams),
            body: buildRouteValidationWithZod(UpdateSingleEntityRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<UpdateSingleEntityResponse>> => {
        const secSol = await context.securitySolution;
        // todo implement force
        try {
          await secSol
            .getEntityStoreCrudClient()
            .singleUpdateEntity(request.params.entityType, request.params.entityId, request.body);

          return response.ok();
        } catch (error) {
          if (error instanceof EngineNotRunningError) {
            return response.badRequest({ body: error as EngineNotRunningError });
          }

          if (error instanceof BadCRUDRequestError) {
            return response.badRequest({ body: error as BadCRUDRequestError });
          }

          if (error instanceof DocumentNotFoundError) {
            return response.notFound({ body: error as DocumentNotFoundError });
          }

          logger.error(error);
          throw error;
        }
      }
    );
};
