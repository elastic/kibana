/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/knowledge_base/entries/common_attributes.gen';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';
import { performChecks } from '../../helpers';

export const createKnowledgeBaseEntryRoute = (router: ElasticAssistantPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,

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
            body: buildRouteValidationWithZod(KnowledgeBaseEntryCreateProps),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<KnowledgeBaseEntryResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const logger = ctx.elasticAssistant.logger;

          // Perform license, authenticated user and FF checks
          const checkResponse = performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }

          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient();

          logger.debug(() => `Creating KB Entry:\n${JSON.stringify(request.body)}`);
          const createResponse = await kbDataClient?.createKnowledgeBaseEntry({
            knowledgeBaseEntry: request.body,
            global: request.body.users != null && request.body.users.length === 0,
            auditLogger: ctx.elasticAssistant.auditLogger,
            telemetry: ctx.elasticAssistant.telemetry,
          });

          if (createResponse == null) {
            return assistantResponse.error({
              body: `Knowledge Base Entry was not created`,
              statusCode: 400,
            });
          }
          return response.ok({ body: createResponse });
        } catch (err) {
          const error = transformError(err as Error);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
