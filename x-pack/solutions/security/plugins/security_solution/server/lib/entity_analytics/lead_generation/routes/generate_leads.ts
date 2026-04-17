/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IKibanaResponse,
  KibanaRequest,
  Logger,
  StartServicesAccessor,
} from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GENERATE_LEADS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import { generateLeadsRequestSchema } from '../../../../../common/entity_analytics/lead_generation/types';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { fetchAllLeadEntities } from '../entity_conversion';
import { runLeadGenerationPipeline } from '../run_pipeline';
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
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const executionUuid = uuidv4();
          const riskScoreDataClient = secSol.getRiskScoreDataClient();

          const [, startPlugins] = await getStartServices();
          const crudClient = startPlugins.entityStore.createCRUDClient(esClient, spaceId);
          const { connectorId } = request.body;
          const chatModel = await resolveChatModel(
            startPlugins.inference,
            request,
            logger,
            connectorId
          );

          void (async () => {
            try {
              await runLeadGenerationPipeline({
                listEntities: () => fetchAllLeadEntities(crudClient, logger),
                esClient,
                logger,
                spaceId,
                riskScoreDataClient,
                executionId: executionUuid,
                sourceType: 'adhoc',
                chatModel,
              });
              logger.info(
                `[LeadGeneration] Background generation completed (executionUuid=${executionUuid})`
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
      })
    );
};

/**
 * Resolves an InferenceChatModel using the default configured inference connector.
 * Returns undefined if no default connector is configured, allowing the pipeline
 * to fall back to rule-based synthesis rather than failing the request.
 */
const resolveChatModel = async (
  inference: InferenceServerStart,
  request: KibanaRequest,
  logger: Logger,
  connectorId?: string
): Promise<InferenceChatModel | undefined> => {
  try {
    const resolvedConnectorId =
      connectorId ?? (await inference.getDefaultConnector(request)).connectorId;
    return await inference.getChatModel({
      request,
      connectorId: resolvedConnectorId,
      chatModelOptions: {
        temperature: 0, // structured JSON output — determinism preferred over creativity
        maxRetries: 0,
        telemetryMetadata: {
          pluginId: 'securitySolution',
        },
      },
    });
  } catch (e) {
    logger.warn(
      `[LeadGeneration] No default inference connector configured; falling back to rule-based synthesis: ${e.message}`
    );
    return undefined;
  }
};
