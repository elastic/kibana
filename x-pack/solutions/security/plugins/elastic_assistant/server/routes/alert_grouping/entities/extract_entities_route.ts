/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, IKibanaResponse, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildResponse } from '../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { EntityExtractionService, ObservableTypeKey } from '../../../lib/alert_grouping';
import { performChecks } from '../../helpers';

// Route path
export const EXTRACT_ENTITIES_ROUTE = '/api/security/alert_grouping/alerts/_extract_entities';

// Request schema
const ExtractEntitiesRequestSchema = z.object({
  alert_ids: z.array(z.string()).optional(),
  filter: z.record(z.unknown()).optional(),
  entity_types: z.array(z.string()).optional(),
  max_alerts: z.number().min(1).max(10000).optional(),
  alerts_index_pattern: z.string().optional(),
});

/**
 * Register entity extraction route
 */
export const registerExtractEntitiesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'public',
      path: EXTRACT_ENTITIES_ROUTE,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ExtractEntitiesRequestSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const {
            alert_ids: alertIds,
            filter,
            entity_types: entityTypes,
            max_alerts: maxAlerts = 1000,
            alerts_index_pattern: alertsIndexPattern = '.alerts-security.alerts-*',
          } = request.body;

          // Build query
          const mustClauses: object[] = [];

          if (alertIds && alertIds.length > 0) {
            mustClauses.push({
              ids: { values: alertIds },
            });
          }

          if (filter) {
            mustClauses.push(filter);
          }

          const query =
            mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

          // Fetch alerts
          const searchResponse = await esClient.search<Record<string, unknown>>({
            index: alertsIndexPattern,
            size: maxAlerts,
            query,
            _source: true,
          });

          const alerts = searchResponse.hits.hits.map((hit) => ({
            _id: hit._id!,
            _source: hit._source ?? {},
          }));

          if (alerts.length === 0) {
            return response.ok({
              body: {
                alerts_processed: 0,
                entities: [],
                entity_summary: {},
              },
            });
          }

          // Extract entities
          const entityService = new EntityExtractionService({ logger });
          const validEntityTypes = entityTypes?.filter((t) =>
            Object.values(ObservableTypeKey).includes(t as ObservableTypeKey)
          ) as ObservableTypeKey[] | undefined;

          const result = entityService.extractEntities(alerts, validEntityTypes);

          return response.ok({
            body: {
              alerts_processed: result.alertsProcessed,
              entities: result.entities.map((entity) => ({
                type: entity.type,
                value: entity.value,
                alert_ids: entity.alertIds,
                source_fields: entity.sourceFields,
                first_seen: entity.firstSeen,
                last_seen: entity.lastSeen,
              })),
              entity_summary: result.entitySummary,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return resp.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );
};
