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
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,
  UpdateKnowledgeBaseEntryRequestParams,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  KnowledgeBaseEntryResponse,
  KnowledgeBaseEntryUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/knowledge_base/entries/common_attributes.gen';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';
import { performChecks } from '../../helpers';

export const updateKnowledgeBaseEntryRoute = (router: ElasticAssistantPluginRouter): void => {
  router.versioned
    .put({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,

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
            params: buildRouteValidationWithZod(UpdateKnowledgeBaseEntryRequestParams),
            body: buildRouteValidationWithZod(KnowledgeBaseEntryUpdateProps),
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

          logger.debug(() => `Updating KB Entry:\n${JSON.stringify(request.body)}`);

          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient();
          const updateResponse = await kbDataClient?.updateKnowledgeBaseEntry({
            knowledgeBaseEntry: { ...request.body, id: request.params.id },
            auditLogger: ctx.elasticAssistant.auditLogger,
          });

          if (updateResponse?.updatedEntry) {
            return response.ok({
              body: updateResponse?.updatedEntry,
            });
          }

          return assistantResponse.error({
            body: updateResponse?.errors?.[0].message ?? `Knowledge Base Entry was not created`,
            statusCode: 400,
          });
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
