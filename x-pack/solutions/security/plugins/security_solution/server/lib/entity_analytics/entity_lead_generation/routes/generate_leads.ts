/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  Logger,
  StartServicesAccessor,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';

import {
  GENERATE_LEADS_URL,
  getLeadsIndexName,
  type LeadGenerationMode,
} from '../../../../../common/entity_analytics/entity_lead_generation/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { createLeadGenerationEngine } from '../engine/lead_generation_engine';
import { createRiskScoreModule } from '../observation_modules/risk_score_module';
import { createTemporalStateModule } from '../observation_modules/temporal_state_module';
import { createBehavioralAnalysisModule } from '../observation_modules/alert_analysis_module';
import type { Entity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { LeadEntity, Lead } from '../types';

const GenerateLeadsRequestBody = z.object({
  connectorId: z.string().optional(),
  mode: z.enum(['adhoc', 'scheduled']).optional().default('adhoc'),
});

export const generateLeadsRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: GENERATE_LEADS_URL,
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
            body: buildRouteValidationWithZod(GenerateLeadsRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // Optionally create an LLM chat model when a connectorId is provided
          let chatModel: InferenceChatModel | undefined;
          const { connectorId, mode } = request.body;
          const generationMode: LeadGenerationMode = mode ?? 'adhoc';

          if (connectorId) {
            try {
              const [, startPlugins] = await getStartServices();
              chatModel = await startPlugins.inference.getChatModel({
                request,
                connectorId,
                chatModelOptions: {
                  temperature: 0.3,
                  maxRetries: 1,
                  disableStreaming: true,
                },
              });
              logger.debug(
                `[LeadGeneration] Created LLM chat model with connector "${connectorId}"`
              );
            } catch (chatModelError) {
              logger.warn(
                `[LeadGeneration] Failed to create chat model for connector "${connectorId}", proceeding with rule-based synthesis: ${chatModelError}`
              );
            }
          }

          const routeStart = Date.now();

          // Fetch entities from Entity Store V2
          const fetchStart = Date.now();
          const entityRecords = await fetchAllEntityStoreRecords(esClient, spaceId, logger);
          const fetchMs = Date.now() - fetchStart;
          logger.info(
            `[LeadGeneration][Telemetry] Entity fetch: ${fetchMs}ms (${entityRecords.length} records)`
          );

          if (entityRecords.length === 0) {
            return response.ok({
              body: {
                leads: [],
                total: 0,
              },
            });
          }

          // Convert to LeadEntity format
          const leadEntities: LeadEntity[] = entityRecords.map((record) =>
            entityRecordToLeadEntity(record)
          );

          // Build the engine and register modules
          const engine = createLeadGenerationEngine({ logger });

          engine.registerModule(createRiskScoreModule({ esClient, logger, spaceId }));

          engine.registerModule(createTemporalStateModule({ esClient, logger, spaceId }));

          engine.registerModule(
            createBehavioralAnalysisModule({
              esClient,
              logger,
              alertsIndexPattern: '.alerts-security.alerts-*',
            })
          );

          // Generate leads (with optional LLM synthesis)
          const generateStart = Date.now();
          const leads = await engine.generateLeads(leadEntities, { chatModel });
          const generateMs = Date.now() - generateStart;
          logger.info(
            `[LeadGeneration][Telemetry] Engine pipeline: ${generateMs}ms (${leads.length} leads)`
          );

          // Persist leads to ES index for fast retrieval on subsequent page loads
          const persistStart = Date.now();
          const formattedLeads = leads.map((lead) => formatLeadForResponse(lead));
          await persistLeads(esClient, spaceId, generationMode, formattedLeads, logger);
          const persistMs = Date.now() - persistStart;
          logger.info(
            `[LeadGeneration][Telemetry] Persistence: ${persistMs}ms (${formattedLeads.length} leads to "${generationMode}" index)`
          );

          const totalMs = Date.now() - routeStart;
          logger.info(
            `[LeadGeneration][Telemetry] Total route: ${totalMs}ms | Fetch: ${fetchMs}ms | Generate: ${generateMs}ms | Persist: ${persistMs}ms`
          );

          return response.ok({
            body: {
              leads: formattedLeads,
              total: formattedLeads.length,
            },
          });
        } catch (e) {
          logger.error(`[LeadGeneration] Error generating leads: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};

/**
 * Fetch all entity records from Entity Store V2 indices.
 * Queries both user and host entity indices.
 */
const fetchAllEntityStoreRecords = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  logger: Logger
): Promise<Entity[]> => {
  const results: Entity[] = [];
  const entityTypes = ['user', 'host'];

  for (const entityType of entityTypes) {
    const indexPattern = `.entities.v1.latest.security_${entityType}_${spaceId}`;

    try {
      const resp = await esClient.search<Entity>({
        index: indexPattern,
        size: 100,
        ignore_unavailable: true,
        query: { match_all: {} },
        sort: [{ '@timestamp': { order: 'desc' } }],
      });

      for (const hit of resp.hits.hits) {
        if (hit._source) {
          results.push(hit._source);
        }
      }
    } catch (error) {
      logger.warn(
        `[LeadGeneration] Failed to fetch ${entityType} records from index ${indexPattern}: ${error}`
      );
    }
  }

  return results;
};

/**
 * Convert Entity Store V2 record into a LeadEntity.
 */
const entityRecordToLeadEntity = (record: Entity): LeadEntity => {
  const entityField = (record as Record<string, unknown>).entity as
    | { name?: string; type?: string }
    | undefined;

  return {
    record,
    type: entityField?.type ?? 'unknown',
    name: entityField?.name ?? 'unknown',
  };
};

/**
 * Format a Lead for the HTTP response body (and persistence).
 */
const formatLeadForResponse = (lead: Lead) => ({
  id: lead.id,
  title: lead.title,
  byline: lead.byline,
  description: lead.description,
  entities: lead.entities.map((entity) => ({
    type: entity.type,
    name: entity.name,
  })),
  tags: lead.tags,
  priority: lead.priority,
  staleness: lead.staleness,
  chatRecommendations: lead.chatRecommendations,
  observations: lead.observations.map((obs) => ({
    entityId: obs.entityId,
    type: obs.type,
    moduleId: obs.moduleId,
    score: obs.score,
    severity: obs.severity,
    confidence: obs.confidence,
    description: obs.description,
    metadata: obs.metadata,
  })),
  timestamp: new Date().toISOString(),
});

/**
 * Persist leads into an ES index so the GET route can serve them instantly.
 * Uses a delete-then-bulk-index approach to replace all leads atomically.
 */
const persistLeads = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  mode: LeadGenerationMode,
  leads: ReturnType<typeof formatLeadForResponse>[],
  pLogger: Logger
): Promise<void> => {
  const indexName = getLeadsIndexName(spaceId, mode);

  try {
    const indexExists = await esClient.indices.exists({ index: indexName });

    if (indexExists) {
      await esClient.deleteByQuery({
        index: indexName,
        body: { query: { match_all: {} } },
        refresh: true,
        conflicts: 'proceed',
      });
    }

    if (leads.length === 0) {
      return;
    }

    const bulkBody = leads.flatMap((lead) => [
      { index: { _index: indexName, _id: lead.id } },
      lead,
    ]);

    await esClient.bulk({ body: bulkBody, refresh: 'wait_for' });

    pLogger.debug(`[LeadGeneration] Persisted ${leads.length} leads to index "${indexName}"`);
  } catch (persistError) {
    pLogger.warn(`[LeadGeneration] Failed to persist leads to "${indexName}": ${persistError}`);
  }
};
