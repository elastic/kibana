/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import {
  UpsertEntitiesBulkRequestBody,
  UpsertEntitiesBulkRequestQuery,
} from '../../../../../../common/api/entity_analytics/entity_store/entities/upsert_entities_bulk.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { BadCRUDRequestError, EngineNotRunningError } from '../../errors';
import { CapabilityNotEnabledError } from '../../errors/capability_not_enabled_error';

export const upsertEntitiesBulk = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .put({
      access: 'public',
      path: '/api/entity_store/entities/bulk',
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
            query: buildRouteValidationWithZod(UpsertEntitiesBulkRequestQuery),
            body: buildRouteValidationWithZod(UpsertEntitiesBulkRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const secSol = await context.securitySolution;

        try {
          await secSol
            .getEntityStoreCrudClient()
            .upsertEntitiesBulk(request.body.entities, request.query.force);

          return response.ok();
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

          logger.error(error);
          throw error;
        }
      }
    );
};
