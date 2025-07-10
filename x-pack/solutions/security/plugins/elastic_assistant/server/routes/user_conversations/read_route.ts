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
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
} from '@kbn/elastic-assistant-common';
import {
  ConversationResponse,
  ReadConversationRequestParams,
} from '@kbn/elastic-assistant-common/impl/schemas';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { buildResponse } from '../utils';
import { ElasticAssistantPluginRouter } from '../../types';
import { performChecks } from '../helpers';

export const readConversationRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
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
            params: buildRouteValidationWithZod(ReadConversationRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const assistantResponse = buildResponse(response);

        const { id } = request.params;

        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const checkResponse = await performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }
          const authenticatedUser = checkResponse.currentUser;

          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();
          const conversation = await dataClient?.getConversation({ id, authenticatedUser });

          if (conversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" not found`,
              statusCode: 404,
            });
          }
          return response.ok({ body: conversation });
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
