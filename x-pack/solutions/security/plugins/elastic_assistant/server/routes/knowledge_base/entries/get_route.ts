/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,
  ReadKnowledgeBaseEntryRequestParams,
  ReadKnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';

import { performChecks } from '../../helpers';
import { transformESSearchToKnowledgeBaseEntry } from '../../../ai_assistant_data_clients/knowledge_base/transforms';
import { EsKnowledgeBaseEntrySchema } from '../../../ai_assistant_data_clients/knowledge_base/types';
import { getKBUserFilter } from './utils';

export const getKnowledgeBaseEntryRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
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
            params: buildRouteValidationWithZod(ReadKnowledgeBaseEntryRequestParams),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ReadKnowledgeBaseEntryResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);

          // Perform license, authenticated user and FF checks
          const checkResponse = await performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }

          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient();
          const currentUser = checkResponse.currentUser;
          const userFilter = getKBUserFilter(currentUser);
          const systemFilter = ` AND _id: "${request.params.id}"`;

          const result = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
            perPage: 1,
            page: 1,
            sortField: 'created_at',
            sortOrder: 'desc',
            filter: `${userFilter}${systemFilter}`,
            fields: ['*'],
          });

          if (!result?.data?.hits.hits.length) {
            return response.notFound();
          }

          return response.ok({
            body: transformESSearchToKnowledgeBaseEntry(result.data)[0],
          });
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
