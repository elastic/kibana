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
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  DeleteKnowledgeBaseEntryRequestParams,
  DeleteKnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/knowledge_base/entries/crud_knowledge_base_entries_route.gen';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';
import { performChecks } from '../../helpers';

export const deleteKnowledgeBaseEntryRoute = (router: ElasticAssistantPluginRouter): void => {
  router.versioned
    .delete({
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
            params: buildRouteValidationWithZod(DeleteKnowledgeBaseEntryRequestParams),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<DeleteKnowledgeBaseEntryResponse>> => {
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

          logger.debug(() => `Deleting KB Entry:\n${JSON.stringify(request.body)}`);

          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient();
          const deleteResponse = await kbDataClient?.deleteKnowledgeBaseEntry({
            knowledgeBaseEntryId: request.params.id,
            auditLogger: ctx.elasticAssistant.auditLogger,
          });

          if (deleteResponse?.docsDeleted) {
            return response.ok({
              body: {
                id: deleteResponse?.docsDeleted[0],
              },
            });
          }

          return assistantResponse.error({
            body: deleteResponse?.errors?.[0].message ?? `Knowledge Base Entry was not deleted`,
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
