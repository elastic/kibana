/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ArrayFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { APP_ID } from '../../../../../common/constants';
import {
  API_VERSIONS,
  GET_ENRICHED_ENTITIES_URL,
} from '../../../../../common/entity_analytics/constants';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import { entityDetailsHighlightsServiceFactory } from '../../entity_details/entity_details_highlights_service';
import type { EntityAnalyticsRoutesDeps } from '../../types';

const entityTypeSchema = z.enum(['user', 'host', 'service', 'generic']);

const querySchema = z.object({
  entity_types: ArrayFromString(entityTypeSchema)
    .optional()
    .describe('Entity types to include in the results.'),
  filterQuery: z
    .string()
    .optional()
    .describe('An Elasticsearch query string to filter entities in page mode.'),
  page: z.coerce.number().int().min(1).optional().describe('Page number to return (1-indexed).'),
  per_page: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional()
    .describe('Number of entities per page.'),
  sort_field: z.string().optional().describe('Field to sort results by.'),
  sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order.'),
  from: z.coerce
    .number()
    .int()
    .optional()
    .describe('Start of the time range for enrichment data (epoch milliseconds).'),
  to: z.coerce
    .number()
    .int()
    .optional()
    .describe('End of the time range for enrichment data (epoch milliseconds).'),
});

const getIdentifierValue = (entity: Record<string, unknown>, entityType: EntityType) => {
  const identifierPath = EntityTypeToIdentifierField[entityType]; // e.g. 'host.name'
  const [topKey, subKey] = identifierPath.split('.');
  const top = entity[topKey];
  if (top != null && typeof top === 'object') {
    return (top as Record<string, unknown>)[subKey] as string | undefined;
  }
  return undefined;
};

export const getEnrichedEntitiesRoute = ({
  router,
  logger,
  getStartServices,
  ml,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_ENRICHED_ENTITIES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [coreStart, { entityStore }] = await getStartServices();
          const [securitySolution, coreContext] = await Promise.all([
            context.securitySolution,
            context.core,
          ]);
          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const spaceId = securitySolution.getSpaceId();

          const crudClient = entityStore.createCRUDClient(esClient, spaceId);
          const riskEngineClient = securitySolution.getRiskEngineDataClient();
          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();
          const soClient = coreContext.savedObjects.client;
          const uiSettingsClient = coreContext.uiSettings.client;

          const fromDate = request.query.from ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
          const toDate = request.query.to ?? Date.now();

          const listResult = await crudClient.listEntities({
            entityTypes: request.query.entity_types ?? [],
            filterQuery: request.query.filterQuery,
            page: request.query.page ?? 1,
            perPage: request.query.per_page ?? 10,
            sortField: request.query.sort_field ?? '@timestamp',
            sortOrder: request.query.sort_order ?? 'desc',
          });

          const enrichedEntities = await Promise.all(
            listResult.entities.map(async (entity) => {
              const entityType = entity.entity?.type as EntityType | undefined;
              if (!entityType || !EntityTypeToIdentifierField[entityType]) {
                return { entity, enrichment: null };
              }

              const entityIdentifier = getIdentifierValue(
                entity as Record<string, unknown>,
                entityType
              );
              if (!entityIdentifier) {
                return { entity, enrichment: null };
              }

              const { getV2Data } = entityDetailsHighlightsServiceFactory({
                logger,
                riskEngineClient,
                entityStoreClient: crudClient,
                spaceId,
                esClient,
                assetCriticalityClient,
                soClient,
                uiSettingsClient,
                ml,
                anonymizationFields: [],
              });

              const enrichment = await getV2Data({
                request,
                entityType,
                entityIdentifier,
                fromDate,
                toDate,
              });

              return { entity, enrichment };
            })
          );

          return response.ok({
            body: {
              entities: enrichedEntities,
              total: listResult.total,
              page: listResult.page,
              per_page: listResult.per_page,
              inspect: listResult.inspect,
            },
          });
        } catch (e) {
          logger.error(`Error fetching enriched entities: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
