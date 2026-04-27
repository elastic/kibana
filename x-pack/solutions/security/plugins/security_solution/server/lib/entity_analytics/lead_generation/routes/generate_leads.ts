/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IKibanaResponse, Logger, StartServicesAccessor } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { GENERATE_LEADS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import { generateLeadsRequestSchema } from '../../../../../common/entity_analytics/lead_generation/types';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { fetchCandidateEntities } from '../entity_conversion';
import { runLeadGenerationPipeline } from '../run_pipeline';
import { upsertLeadGenerationConfig } from '../saved_object';
import { resolveChatModel } from '../utils';
import { withMinimumLicense } from '../../utils/with_minimum_license';

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

      withMinimumLicense(async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const spaceId = secSol.getSpaceId();
          const coreCtx = await context.core;
          const esClient = coreCtx.elasticsearch.client.asCurrentUser;
          const soClient = coreCtx.savedObjects.client;
          const executionUuid = uuidv4();
          const riskScoreDataClient = secSol.getRiskScoreDataClient();

          const [coreStart, startPlugins] = await getStartServices();
          const crudClient = startPlugins.entityStore.createCRUDClient(esClient, spaceId);
          const { connectorId } = request.body;

          await upsertLeadGenerationConfig(soClient, spaceId, { connectorId });
          logger.info(
            `[LeadGeneration] Resolving connector (connectorId=${connectorId}, executionUuid=${executionUuid})`
          );
          const chatModel = await resolveChatModel(startPlugins.inference, request, connectorId);
          logger.info(
            `[LeadGeneration] Connector resolved successfully (connectorId=${connectorId}, executionUuid=${executionUuid})`
          );

          void (async () => {
            try {
              await runLeadGenerationPipeline({
                listEntities: () => fetchCandidateEntities(crudClient, logger),
                esClient,
                logger,
                spaceId,
                riskScoreDataClient,
                executionId: executionUuid,
                sourceType: 'adhoc',
                analytics: coreStart.analytics,
                chatModel,
              });
              await upsertLeadGenerationConfig(soClient, spaceId, {
                connectorId,
                lastExecutionUuid: executionUuid,
                lastError: null,
              }).catch((soErr: Error) =>
                logger.warn(
                  `[LeadGeneration] Failed to persist success status (executionUuid=${executionUuid}): ${soErr.message}`
                )
              );
              logger.info(
                `[LeadGeneration] Background generation completed (connectorId=${connectorId}, executionUuid=${executionUuid})`
              );
            } catch (pipelineError) {
              const errorMessage =
                pipelineError instanceof Error ? pipelineError.message : String(pipelineError);
              logger.error(
                `[LeadGeneration] Background generation failed (executionUuid=${executionUuid}): ${errorMessage}`
              );
              await upsertLeadGenerationConfig(soClient, spaceId, {
                connectorId,
                lastExecutionUuid: executionUuid,
                lastError: errorMessage,
              }).catch((e) =>
                logger.warn(`[LeadGeneration] Failed to persist execution error: ${e.message}`)
              );
            }
          })();

          return response.ok({ body: { executionUuid } });
        } catch (e) {
          logger.error(`[LeadGeneration] Error initiating lead generation: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      })
    );
};
