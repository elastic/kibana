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
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { runLeadGenerationPipeline } from '../run_pipeline';

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

          (async () => {
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

              await runLeadGenerationPipeline({
                esClient,
                logger,
                spaceId,
                chatModel,
                executionId: executionUuid,
                sourceType: 'adhoc',
              });
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
