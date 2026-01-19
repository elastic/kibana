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

import { LIST_PRIMARIES_URL } from '../../../../../../common/entity_analytics/entity_store/constants';
import type { ListPrimaryEntitiesResponse } from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_primaries.gen';
import {
  ListPrimaryEntitiesRequestQuery,
  ListPrimaryEntitiesRequestParams,
} from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_primaries.gen';
import type { EntityType } from '../../../../../../common/search_strategy';
import { APP_ID } from '../../../../../../common';
import { API_VERSIONS } from '../../../../../../common/entity_analytics/constants';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../../telemetry/event_based/events';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const listPrimariesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: LIST_PRIMARIES_URL,
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
            params: buildRouteValidationWithZod(ListPrimaryEntitiesRequestParams),
            query: buildRouteValidationWithZod(ListPrimaryEntitiesRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ListPrimaryEntitiesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { entityType } = request.params;
          const { page, per_page: perPage, sort_field: sortField, sort_order: sortOrder, filter_query: filterQuery } =
            request.query;

          const securitySolution = await context.securitySolution;
          const entityStoreClient = securitySolution.getEntityStoreDataClient();

          const { primaries, total, inspect } = await entityStoreClient.listPrimaryEntities({
            entityType: entityType as EntityType,
            page,
            perPage,
            sortField,
            sortOrder,
            filterQuery,
          });

          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
          });

          return response.ok({
            body: {
              primaries: primaries.map((primary) => {
                // Build response object for API (handles EntityRecord union type)
                const result: Record<string, unknown> = {
                  '@timestamp': primary['@timestamp'],
                  entity: primary.entity,
                  resolved_count: primary.resolved_count,
                };

                // Add entity-type-specific field (union type: HostEntityRecord | UserEntityRecord)
                if ('user' in primary && primary.user) {
                  result.user = primary.user;
                }
                if ('host' in primary && primary.host) {
                  result.host = primary.host;
                }

                // Only include asset if criticality is a valid AssetCriticalityLevel (not 'deleted')
                if (primary.asset?.criticality && primary.asset.criticality !== 'deleted') {
                  result.asset = { criticality: primary.asset.criticality };
                }

                return result as ListPrimaryEntitiesResponse['primaries'][number];
              }),
              total,
              inspect,
            },
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
