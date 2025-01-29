/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  CreateKnowledgeBaseRequestParams,
  CreateKnowledgeBaseResponse,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
  CreateKnowledgeBaseRequestQuery,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { IKibanaResponse } from '@kbn/core/server';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter } from '../../types';

// Since we're awaiting on ELSER setup, this could take a bit (especially if ML needs to autoscale)
// Consider just returning if attempt was successful, and switch to client polling
const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

/**
 * Load Knowledge Base index, pipeline, and resources (collection of documents)
 * @param router
 */
export const postKnowledgeBaseRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
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
            params: buildRouteValidationWithZod(CreateKnowledgeBaseRequestParams),
            query: buildRouteValidationWithZod(CreateKnowledgeBaseRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreateKnowledgeBaseResponse>> => {
        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const core = ctx.core;
        const soClient = core.savedObjects.getClient();
        const ignoreSecurityLabs = request.query.ignoreSecurityLabs;

        try {
          const knowledgeBaseDataClient =
            await assistantContext.getAIAssistantKnowledgeBaseDataClient({
              modelIdOverride: request.query.modelId,
            });
          if (!knowledgeBaseDataClient) {
            return response.custom({ body: { success: false }, statusCode: 500 });
          }

          await knowledgeBaseDataClient.setupKnowledgeBase({
            soClient,
            ignoreSecurityLabs,
          });

          return response.ok({ body: { success: true } });
        } catch (error) {
          return resp.error({
            body: error.message,
            statusCode: 500,
          });
        }
      }
    );
};
