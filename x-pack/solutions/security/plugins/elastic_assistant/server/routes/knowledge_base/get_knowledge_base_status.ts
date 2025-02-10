/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
  ReadKnowledgeBaseRequestParams,
  ReadKnowledgeBaseResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { KibanaRequest } from '@kbn/core/server';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter } from '../../types';

/**
 * Get the status of the Knowledge Base index, pipeline, and resources (collection of documents)
 *
 * @param router IRouter for registering routes
 */
export const getKnowledgeBaseStatusRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ReadKnowledgeBaseRequestParams),
          },
        },
      },
      async (context, request: KibanaRequest<ReadKnowledgeBaseRequestParams>, response) => {
        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const logger = ctx.elasticAssistant.logger;

        try {
          const kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient();
          if (!kbDataClient) {
            return response.custom({ body: { success: false }, statusCode: 500 });
          }

          const indexExists = true; // Installed at startup, always true
          const pipelineExists = true; // Installed at startup, always true
          const modelExists = await kbDataClient.isModelInstalled();
          const setupAvailable = await kbDataClient.isSetupAvailable();
          const isInferenceEndpointExists = await kbDataClient.isInferenceEndpointExists();

          const body: ReadKnowledgeBaseResponse = {
            elser_exists: modelExists,
            index_exists: indexExists,
            is_setup_in_progress: kbDataClient.isSetupInProgress,
            is_setup_available: setupAvailable,
            pipeline_exists: pipelineExists,
          };

          if (indexExists && isInferenceEndpointExists) {
            const securityLabsExists = await kbDataClient.isSecurityLabsDocsLoaded();
            const userDataExists = await kbDataClient.isUserDataExists();

            return response.ok({
              body: {
                ...body,
                security_labs_exists: securityLabsExists,
                user_data_exists: userDataExists,
              },
            });
          }

          return response.ok({ body });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
