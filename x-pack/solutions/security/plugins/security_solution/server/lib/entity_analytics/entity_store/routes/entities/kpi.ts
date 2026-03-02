/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ArrayFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { EntityType } from '../../../../../../common/search_strategy';
import { ENTITIES_KPI_URL } from '../../../../../../common/entity_analytics/entity_store/constants';
import { APP_ID } from '../../../../../../common';
import { API_VERSIONS } from '../../../../../../common/entity_analytics/constants';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../../telemetry/event_based/events';
import { EntityType as EntityTypeSchema } from '../../../../../../common/api/entity_analytics/entity_store/common.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

const ListEntitiesKpiRequestQuery = z.object({
  filterQuery: z.string().optional(),
  entity_types: ArrayFromString(EntityTypeSchema),
});

export const listEntitiesKpiRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ENTITIES_KPI_URL,
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
            query: buildRouteValidationWithZod(ListEntitiesKpiRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { entity_types: entityTypes, filterQuery } = request.query;

          const securitySolution = await context.securitySolution;
          const entityStoreClient = securitySolution.getEntityStoreDataClient();
          const { severityCount } = await entityStoreClient.searchEntitiesKpi({
            entityTypes: entityTypes as EntityType[],
            filterQuery,
          });

          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
          });

          return response.ok({
            body: { severityCount },
          });
        } catch (e) {
          logger.error(e);
          const error = transformError(e);
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
            error: error.message,
          });
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
