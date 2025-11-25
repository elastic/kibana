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
  getConversationSharedState,
  getIsConversationOwner,
} from '@kbn/elastic-assistant-common';
import type { ConversationResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { ReadConversationRequestParams } from '@kbn/elastic-assistant-common/impl/schemas';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { SHARED_CONVERSATION_ACCESSED_EVENT } from '../../lib/telemetry/event_based_telemetry';
import { buildResponse } from '../utils';
import type { ElasticAssistantPluginRouter } from '../../types';
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

          // First check if the conversation exists at all
          const conversationExists = await dataClient?.conversationExists({ id });
          if (!conversationExists) {
            return assistantResponse.error({
              body: `conversation id: "${id}" not found`,
              statusCode: 404,
            });
          }

          // Then check if the user has access to the conversation
          const conversation = await dataClient?.getConversation({ id, authenticatedUser });
          if (conversation == null) {
            return assistantResponse.error({
              body: `Access denied to conversation id: "${id}"`,
              statusCode: 403,
            });
          }
          const isConversationOwner = getIsConversationOwner(conversation, {
            name: checkResponse.currentUser?.username,
            id: checkResponse.currentUser?.profile_uid,
          });

          if (!isConversationOwner) {
            const telemetry = ctx.elasticAssistant.telemetry;
            telemetry.reportEvent(SHARED_CONVERSATION_ACCESSED_EVENT.eventType, {
              sharing: getConversationSharedState({
                users: conversation.users,
                id: conversation.id,
              }),
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
