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
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../../telemetry/event_based/events';

export const upsertEntitiesBulk = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger
) => {
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
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
          });
          return response.ok();
        } catch (error) {
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
            error: (error as Error).message,
          });
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
