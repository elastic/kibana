/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ElasticsearchClient,
  IKibanaResponse,
  Logger,
  StartServicesAccessor,
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
} from '../../../../../common/entity_analytics/lead_generation/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { createLeadGenerationEngine } from '../engine/lead_generation_engine';
import { createRiskScoreModule } from '../observation_modules/risk_score_module';
import { createTemporalStateModule } from '../observation_modules/temporal_state_module';
import { createBehavioralAnalysisModule } from '../observation_modules/alert_analysis_module';
import { createEntityRetriever } from '../entity_retriever';
import type { Lead } from '../types';

const ALERTS_INDEX_PATTERN = '.alerts-security.alerts-*';

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

          let chatModel: InferenceChatModel | undefined;
          const { connectorId, mode } = request.body;
          const generationMode: LeadGenerationMode = mode ?? 'adhoc';

          if (connectorId) {
            try {
              const [, startPlugins] = await getStartServices();
              chatModel = await startPlugins.inference.getChatModel({
                request,
                connectorId,
                chatModelOptions: { temperature: 0.3, maxRetries: 1, disableStreaming: true },
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

          const retriever = createEntityRetriever({ esClient, logger, spaceId });
          const fetchStart = Date.now();
          const leadEntities = await retriever.fetchAllEntities();
          logger.info(
            `[LeadGeneration][Telemetry] Entity fetch: ${Date.now() - fetchStart}ms (${
              leadEntities.length
            } records)`
          );

          if (leadEntities.length === 0) {
            return response.ok({ body: { leads: [], total: 0 } });
          }

          const engine = createLeadGenerationEngine({ logger });
          engine.registerModule(createRiskScoreModule({ esClient, logger, spaceId }));
          engine.registerModule(createTemporalStateModule({ esClient, logger, spaceId }));
          engine.registerModule(
            createBehavioralAnalysisModule({
              esClient,
              logger,
              alertsIndexPattern: ALERTS_INDEX_PATTERN,
            })
          );

          const generateStart = Date.now();
          const leads = await engine.generateLeads(leadEntities, { chatModel });
          logger.info(
            `[LeadGeneration][Telemetry] Engine pipeline: ${Date.now() - generateStart}ms (${
              leads.length
            } leads)`
          );

          // Tag every lead with this run's execution ID so we can delete stale
          // docs atomically after the new set is visible.
          const executionId = uuidv4();
          const formattedLeads = leads.map((lead) => formatLeadForResponse(lead, executionId));

          const persistStart = Date.now();
          await persistLeads(
            esClient,
            spaceId,
            generationMode,
            formattedLeads,
            executionId,
            logger
          );
          logger.info(
            `[LeadGeneration][Telemetry] Persistence: ${Date.now() - persistStart}ms (${
              formattedLeads.length
            } leads to "${generationMode}" index)`
          );

          logger.info(`[LeadGeneration][Telemetry] Total route: ${Date.now() - routeStart}ms`);

          return response.ok({ body: { leads: formattedLeads, total: formattedLeads.length } });
        } catch (e) {
          logger.error(`[LeadGeneration] Error generating leads: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};

// ---------------------------------------------------------------------------
// Lead formatting
// ---------------------------------------------------------------------------

const formatLeadForResponse = (lead: Lead, executionId: string) => ({
  id: lead.id,
  title: lead.title,
  byline: lead.byline,
  description: lead.description,
  entities: lead.entities.map(({ type, name }) => ({ type, name })),
  tags: lead.tags,
  priority: lead.priority,
  staleness: lead.staleness,
  chatRecommendations: lead.chatRecommendations,
  observations: lead.observations.map(
    ({ entityId, type, moduleId, score, severity, confidence, description, metadata }) => ({
      entityId,
      type,
      moduleId,
      score,
      severity,
      confidence,
      description,
      metadata,
    })
  ),
  timestamp: lead.timestamp,
  executionId,
});

type FormattedLead = ReturnType<typeof formatLeadForResponse>;

// ---------------------------------------------------------------------------
// Persistence — gap-free replace pattern:
//   1. Bulk upsert new leads (visible immediately).
//   2. Delete any docs whose executionId differs (stale from previous runs).
// ---------------------------------------------------------------------------

const persistLeads = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  mode: LeadGenerationMode,
  leads: FormattedLead[],
  executionId: string,
  pLogger: Logger
): Promise<void> => {
  const indexName = getLeadsIndexName(spaceId, mode);

  try {
    if (leads.length > 0) {
      const bulkBody = leads.flatMap((lead) => [
        { index: { _index: indexName, _id: lead.id } },
        lead,
      ]);
      await esClient.bulk({ body: bulkBody, refresh: 'wait_for' });
      pLogger.debug(`[LeadGeneration] Persisted ${leads.length} leads to "${indexName}"`);
    }

    // Delete leads from previous runs — only after the new ones are searchable
    await esClient.deleteByQuery({
      index: indexName,
      body: { query: { bool: { must_not: [{ term: { executionId } }] } } },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });
  } catch (persistError) {
    pLogger.warn(`[LeadGeneration] Failed to persist leads to "${indexName}": ${persistError}`);
  }
};
