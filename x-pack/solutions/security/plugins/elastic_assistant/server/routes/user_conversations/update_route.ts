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
  ConversationSharedState,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
  getConversationSharedState,
  getIsConversationOwner,
} from '@kbn/elastic-assistant-common';
import type { ConversationResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import {
  ConversationUpdateProps,
  UpdateConversationRequestParams,
} from '@kbn/elastic-assistant-common/impl/schemas';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  CONVERSATION_SHARED_ERROR_EVENT,
  CONVERSATION_SHARED_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import type { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { performChecks } from '../helpers';

export const updateConversationRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .put({
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
            body: buildRouteValidationWithZod(ConversationUpdateProps),
            params: buildRouteValidationWithZod(UpdateConversationRequestParams),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ConversationResponse>> => {
        const assistantResponse = buildResponse(response);
        const { id } = request.params;
        let telemetry;
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          telemetry = ctx.elasticAssistant.telemetry;
          // Perform license and authenticated user checks
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

          const existingConversation = await dataClient?.getConversation({ id, authenticatedUser });
          if (existingConversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" not found`,
              statusCode: 404,
            });
          }
          if (
            !getIsConversationOwner(existingConversation, {
              name: authenticatedUser?.username,
              id: authenticatedUser?.profile_uid,
            })
          ) {
            return assistantResponse.error({
              body: `conversation id: "${id}". Updating a conversation is only allowed for the owner of the conversation.`,
              statusCode: 403,
            });
          }
          const conversation = await dataClient?.updateConversation({
            conversationUpdateProps: { ...request.body, id },
          });
          if (request.body.users) {
            const conversationSharedState = getConversationSharedState({
              users: request.body.users,
              id,
            });
            telemetry.reportEvent(CONVERSATION_SHARED_SUCCESS_EVENT.eventType, {
              sharing: conversationSharedState,
              ...(conversationSharedState === ConversationSharedState.Restricted
                ? // if restricted, track number of additional users added (minus the owner)
                  { total: request.body.users.length - 1 }
                : {}),
            });
          }
          if (conversation == null) {
            return assistantResponse.error({
              body: `conversation id: "${id}" was not updated`,
              statusCode: 400,
            });
          }
          return response.ok({
            body: conversation,
          });
        } catch (err) {
          const error = transformError(err);
          if (request.body.users) {
            telemetry?.reportEvent(CONVERSATION_SHARED_ERROR_EVENT.eventType, {
              sharing: getConversationSharedState({ users: request.body.users, id }),
              errorMessage: error.message,
            });
          }
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
