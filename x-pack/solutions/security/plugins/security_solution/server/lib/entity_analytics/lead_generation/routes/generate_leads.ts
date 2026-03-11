/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IKibanaResponse, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { GENERATE_LEADS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import { generateLeadsRequestSchema } from '../../../../../common/entity_analytics/lead_generation/types';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { createLeadGenerationEngine } from '../engine/lead_generation_engine';
import { createRiskScoreModule } from '../observation_modules/risk_score_module';
import { createTemporalStateModule } from '../observation_modules/temporal_state_module';
import { createBehavioralAnalysisModule } from '../observation_modules/alert_analysis_module';
import { createEntityRetriever } from '../entity_retriever';
import { createLeadDataClient } from '../lead_data_client';

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
            body: buildRouteValidationWithZod(generateLeadsRequestSchema),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const executionUuid = uuidv4();

          const { connectorId } = request.body;

          // Fire-and-forget: run the pipeline in the background, return executionUuid immediately
          (async () => {
            const routeStart = Date.now();

            try {
              let chatModel: InferenceChatModel | undefined;
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

              const retriever = createEntityRetriever({ esClient, logger, spaceId });
              const fetchStart = Date.now();
              const leadEntities = await retriever.fetchAllEntities();
              logger.info(
                `[LeadGeneration][Telemetry] Entity fetch: ${Date.now() - fetchStart}ms (${
                  leadEntities.length
                } records)`
              );

              if (leadEntities.length === 0) {
                logger.info(
                  `[LeadGeneration] No entities found — skipping generation (executionUuid=${executionUuid})`
                );
                return;
              }

              const engine = createLeadGenerationEngine({ logger });
              engine.registerModule(createRiskScoreModule({ esClient, logger, spaceId }));
              engine.registerModule(createTemporalStateModule({ esClient, logger, spaceId }));
              engine.registerModule(
                createBehavioralAnalysisModule({
                  esClient,
                  logger,
                  alertsIndexPattern: getAlertsIndex(spaceId),
                })
              );

              const generateStart = Date.now();
              const leads = await engine.generateLeads(leadEntities, { chatModel });
              logger.info(
                `[LeadGeneration][Telemetry] Engine pipeline: ${Date.now() - generateStart}ms (${
                  leads.length
                } leads)`
              );

              const leadDataClient = createLeadDataClient({ esClient, logger, spaceId });
              const persistStart = Date.now();

              const leadsWithMeta = leads.map((lead) => ({
                ...lead,
                status: 'active' as const,
                executionUuid,
                sourceType: 'adhoc' as const,
              }));

              await leadDataClient.createLeads({
                leads: leadsWithMeta,
                executionId: executionUuid,
                sourceType: 'adhoc',
              });

              logger.info(
                `[LeadGeneration][Telemetry] Persistence: ${Date.now() - persistStart}ms (${
                  leads.length
                } leads to adhoc index)`
              );
              logger.info(
                `[LeadGeneration][Telemetry] Total pipeline: ${
                  Date.now() - routeStart
                }ms (executionUuid=${executionUuid})`
              );
            } catch (pipelineError) {
              logger.error(
                `[LeadGeneration] Background generation failed (executionUuid=${executionUuid}): ${pipelineError}`
              );
            }
          })();

          return response.ok({ body: { executionUuid } });
        } catch (e) {
          logger.error(`[LeadGeneration] Error initiating lead generation: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
