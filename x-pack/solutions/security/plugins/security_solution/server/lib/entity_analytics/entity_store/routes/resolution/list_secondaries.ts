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

import { LIST_SECONDARIES_URL } from '../../../../../../common/entity_analytics/entity_store/constants';
import type { ListSecondaryEntitiesResponse } from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_secondaries.gen';
import {
  ListSecondaryEntitiesRequestQuery,
  ListSecondaryEntitiesRequestParams,
} from '../../../../../../common/api/entity_analytics/entity_store/resolution/list_secondaries.gen';
import type { EntityType } from '../../../../../../common/search_strategy';
import { APP_ID } from '../../../../../../common';
import { API_VERSIONS } from '../../../../../../common/entity_analytics/constants';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../../telemetry/event_based/events';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const listSecondariesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: LIST_SECONDARIES_URL,
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
            params: buildRouteValidationWithZod(ListSecondaryEntitiesRequestParams),
            query: buildRouteValidationWithZod(ListSecondaryEntitiesRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ListSecondaryEntitiesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { entityType } = request.params;
          const { primary_entity_id: primaryEntityId } = request.query;

          const securitySolution = await context.securitySolution;
          const entityStoreClient = securitySolution.getEntityStoreDataClient();

          const { secondaries, total } = await entityStoreClient.listSecondaryEntities({
            entityType: entityType as EntityType,
            primaryEntityId,
          });

          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
          });

          return response.ok({
            body: {
              // Transform secondaries to match API schema (filter out deleted criticality)
              secondaries: secondaries.map((secondary) => ({
                ...secondary,
                // Only include asset if criticality is a valid AssetCriticalityLevel (not 'deleted')
                ...(secondary.asset?.criticality &&
                  secondary.asset.criticality !== 'deleted'
                  ? { asset: { criticality: secondary.asset.criticality } }
                  : { asset: undefined }),
              })),
              total,
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
