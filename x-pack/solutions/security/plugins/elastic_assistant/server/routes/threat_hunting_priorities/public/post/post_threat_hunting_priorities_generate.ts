/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, IKibanaResponse } from '@kbn/core/server';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { RiskScoreDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/risk_score_data_client';
import { RiskEngineDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/risk_engine_data_client';
import { AssetCriticalityDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/asset_criticality/asset_criticality_data_client';
import { entityDetailsHighlightsServiceFactory } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_details/entity_details_highlights_service';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { z } from '@kbn/zod';
import { transformError } from '@kbn/securitysolution-es-utils';
import { v4 as uuidv4 } from 'uuid';
import { transformESSearchToAnonymizationFields } from '../../../../ai_assistant_data_clients/anonymization_fields/helpers';
import type { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';

import { performChecks } from '../../../helpers';

import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { invokeThreatHuntingPrioritiesGraph } from '../../helpers/invoke_threat_hunting_priorities_graph';
import { THREAT_HUNTING_PRIORITIES_GENERATE } from '../../constants';
import type { EntityDetailsHighlightsService } from '../../../../lib/entity_prioritization/graphs/default_entity_prioritization_graph/nodes/enrich_entities/types';
import type { ThreatHuntingPriority } from '../../../../lib/entity_prioritization/state';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

// Request body schema - simplified version for now
const PostThreatHuntingPrioritiesGenerateRequestBody = z.object({
  apiConfig: z.object({
    connectorId: z.string(),
    actionTypeId: z.string(),
    model: z.string().optional(),
  }),
  end: z.string().optional(),
  filter: z.record(z.unknown()).optional(),
  start: z.string().optional(),
  langSmithProject: z.string().optional(),
  langSmithApiKey: z.string().optional(),
  replacements: z.record(z.string()).optional(),
});

// Response schema
const PostThreatHuntingPrioritiesGenerateResponse = z.object({
  priorities: z
    .array(
      z.object({
        title: z.string(),
        byline: z.string(),
        description: z.string(),
        entities: z.array(
          z.object({
            type: z.enum(['user', 'host']),
            idField: z.string(),
            idValue: z.string(),
          })
        ),
        tags: z.array(z.string()),
        priority: z.number().min(1).max(10),
        chatRecommendations: z.array(z.string()),
      })
    )
    .nullable(),
});

type PostThreatHuntingPrioritiesGenerateRequestBody = z.infer<
  typeof PostThreatHuntingPrioritiesGenerateRequestBody
>;
type PostThreatHuntingPrioritiesGenerateResponse = z.infer<
  typeof PostThreatHuntingPrioritiesGenerateResponse
>;

export const postThreatHuntingPrioritiesGenerateRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  kibanaVersion: string,
  ml: MlPluginSetup
) => {
  router.versioned
    .post({
      access: 'public',
      path: THREAT_HUNTING_PRIORITIES_GENERATE,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostThreatHuntingPrioritiesGenerateRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(PostThreatHuntingPrioritiesGenerateResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PostThreatHuntingPrioritiesGenerateResponse>> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;

        const logger: Logger = assistantContext.logger;
        const savedObjectsClient = assistantContext.savedObjectsClient;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const authenticatedUser = await assistantContext.getCurrentUser();

          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }

          // get parameters from the request body
          const { apiConfig, end, filter, start, langSmithProject, langSmithApiKey, replacements } =
            request.body;

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // Get space ID for risk score queries
          const spaceId = (await context.elasticAssistant).getSpaceId();

          // Initialize risk score data client and entity details highlights service for entity prioritization
          // These services are used to fetch and enrich entity data
          let entityDetailsHighlightsService: EntityDetailsHighlightsService | undefined;
          let riskScoreDataClient: RiskScoreDataClient | undefined;

          try {
            // Instantiate RiskScoreDataClient directly since we have all required dependencies
            riskScoreDataClient = new RiskScoreDataClient({
              logger,
              kibanaVersion,
              esClient,
              namespace: spaceId,
              soClient: savedObjectsClient,
            });

            // Get anonymization fields for entity details highlights service
            const anonymizationFieldsDataClient =
              await assistantContext.getAIAssistantAnonymizationFieldsDataClient();
            const anonymizationFieldsRes =
              await anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
                perPage: 1000,
                page: 1,
              });
            const anonymizationFields = anonymizationFieldsRes
              ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
              : [];

            // Get core context for UI settings client
            const coreContext = await context.core;

            // Instantiate RiskEngineDataClient
            const riskEngineClient = new RiskEngineDataClient({
              logger,
              kibanaVersion,
              esClient,
              namespace: spaceId,
              soClient: savedObjectsClient,
              auditLogger: assistantContext.auditLogger,
            });

            // Instantiate AssetCriticalityDataClient
            const assetCriticalityClient = new AssetCriticalityDataClient({
              logger,
              auditLogger: assistantContext.auditLogger,
              esClient,
              namespace: spaceId,
            });

            // Create entity details highlights service using the factory
            entityDetailsHighlightsService = entityDetailsHighlightsServiceFactory({
              riskEngineClient,
              spaceId,
              logger,
              esClient,
              assetCriticalityClient,
              soClient: savedObjectsClient,
              uiSettingsClient: coreContext.uiSettings.client,
              ml,
              anonymizationFields,
            });
          } catch (error) {
            // If we can't initialize the clients or service, log a warning and continue with undefined
            logger.warn(
              `Failed to initialize entity details services: ${
                error instanceof Error ? error.message : String(error)
              }. Entity enrichment will be limited.`
            );
            entityDetailsHighlightsService = undefined;
            // riskScoreDataClient may still be undefined if initialization failed
          }

          // callback to accumulate the latest replacements:
          let latestReplacements: Record<string, string> = { ...(replacements || {}) };
          const onNewReplacements = (newReplacements: Record<string, string>) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          const CONNECTOR_TIMEOUT = 300000; // 5 minutes
          const executionUuid = uuidv4();
          const internalEsClient = (await context.core).elasticsearch.client.asInternalUser;
          const eventsIndexName = '.entity_analytics.priorities_events';

          // Helper function to write events
          const writeEvent = async (
            eventType: 'started' | 'finished' | 'error',
            metadata?: {
              error?: string;
              prioritiesCount?: number;
              durationMs?: number;
            }
          ) => {
            try {
              const now = new Date().toISOString();
              const event = {
                '@timestamp': now,
                execution_uuid: executionUuid,
                event_type: eventType,
                namespace: spaceId,
                api_config: {
                  connector_id: apiConfig.connectorId,
                  action_type_id: apiConfig.actionTypeId,
                  model: apiConfig.model,
                },
                user: authenticatedUser
                  ? {
                      id: authenticatedUser.profile_uid,
                      name: authenticatedUser.username,
                    }
                  : undefined,
                start,
                end,
                filter,
                ...(metadata || {}),
              };

              await internalEsClient.index({
                index: eventsIndexName,
                body: event,
                refresh: false, // Don't refresh on each event for performance
              });
            } catch (eventError) {
              // Log but don't fail the request
              logger.error(() => `Failed to write ${eventType} event: ${eventError}`);
            }
          };

          // Write "started" event
          const startTime = Date.now();
          await writeEvent('started');

          let priorities: ThreatHuntingPriority[] | null = null;
          try {
            const result = await invokeThreatHuntingPrioritiesGraph({
              actionsClient,
              apiConfig: {
                connectorId: apiConfig.connectorId,
                actionTypeId: apiConfig.actionTypeId,
                model: apiConfig.model,
              },
              connectorTimeout: CONNECTOR_TIMEOUT,
              end,
              entityDetailsHighlightsService,
              esClient,
              filter,
              langSmithProject,
              langSmithApiKey,
              latestReplacements,
              logger,
              namespace: spaceId,
              onNewReplacements,
              request,
              riskScoreDataClient,
              savedObjectsClient,
              start,
            });
            priorities = result.priorities;
          } catch (graphError) {
            const durationMs = Date.now() - startTime;
            await writeEvent('error', {
              error: graphError instanceof Error ? graphError.message : String(graphError),
              durationMs,
            });
            throw graphError;
          }

          // Write priorities to index using system user and bulk API
          if (priorities && priorities.length > 0) {
            try {
              const indexName = '.entity_analytics.priorities';
              const now = new Date().toISOString();

              // Prepare bulk operations - one document per priority
              const bulkBody = priorities.flatMap((priority) => {
                const priorityId = `${executionUuid}-${priority.title
                  .replace(/[^a-zA-Z0-9]/g, '-')
                  .toLowerCase()}`;
                return [
                  {
                    index: {
                      _index: indexName,
                      _id: priorityId,
                    },
                  },
                  {
                    '@timestamp': now,
                    execution_uuid: executionUuid,
                    created_at: now,
                    namespace: spaceId,
                    title: priority.title,
                    byline: priority.byline,
                    description: priority.description,
                    entities: priority.entities,
                    tags: priority.tags,
                    priority: priority.priority,
                    chat_recommendations: priority.chatRecommendations,
                    enriched_data: priority.enrichedData,
                    api_config: {
                      connector_id: apiConfig.connectorId,
                      action_type_id: apiConfig.actionTypeId,
                      model: apiConfig.model,
                    },
                    user: authenticatedUser
                      ? {
                          id: authenticatedUser.profile_uid,
                          name: authenticatedUser.username,
                        }
                      : undefined,
                    start,
                    end,
                    filter,
                  },
                ];
              });

              const bulkResponse = await internalEsClient.bulk({
                body: bulkBody,
                refresh: true,
              });

              if (bulkResponse.errors) {
                const errorDetails = bulkResponse.items
                  .filter((item) => item.index?.error)
                  .map((item) => item.index?.error?.reason || 'Unknown error');
                logger.error(
                  () => `Failed to write some priorities to index: ${errorDetails.join(', ')}`
                );
              } else {
                logger.debug(() => `Wrote ${priorities.length} priorities to index ${indexName}`);
              }
            } catch (indexError) {
              // Log error but don't fail the request
              logger.error(() => `Failed to write priorities to index: ${indexError}`);
            }
          }

          // Write "finished" event
          const durationMs = Date.now() - startTime;
          await writeEvent('finished', {
            prioritiesCount: priorities?.length || 0,
            durationMs,
          });

          // Refresh events index to make events searchable
          await internalEsClient.indices.refresh({
            index: eventsIndexName,
            ignore_unavailable: true,
          });

          return response.ok({
            body: {
              priorities,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          // Write "error" event if not already written (only if executionUuid wasn't set)
          // Note: If we reach here, the error happened before executionUuid was set,
          // so we can't write a proper error event. This is a fallback for unexpected errors.

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
