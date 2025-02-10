/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';

import { schema } from '@kbn/config-schema';
import {
  API_VERSIONS,
  newContentReferencesStore,
  ExecuteConnectorRequestBody,
  Message,
  Replacements,
  pruneContentReferences,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../lib/telemetry/event_based_telemetry';
import { POST_ACTIONS_CONNECTOR_EXECUTE } from '../../common/constants';
import { buildResponse } from '../lib/build_response';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../types';
import {
  appendAssistantMessageToConversation,
  DEFAULT_PLUGIN_NAME,
  getIsKnowledgeBaseInstalled,
  getSystemPromptFromUserConversation,
  langChainExecute,
  performChecks,
} from './helpers';
import { isOpenSourceModel } from './utils';

export const postActionsConnectorExecuteRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  getElser: GetElser
) => {
  router.versioned
    .post({
      access: 'internal',
      path: POST_ACTIONS_CONNECTOR_EXECUTE,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ExecuteConnectorRequestBody),
            params: schema.object({
              connectorId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;
        let onLlmResponse;

        try {
          const checkResponse = performChecks({
            context: ctx,
            request,
            response,
          });

          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }

          let latestReplacements: Replacements = request.body.replacements;
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          let messages;
          let newMessage: Pick<Message, 'content' | 'role'> | undefined;
          const conversationId = request.body.conversationId;
          const actionTypeId = request.body.actionTypeId;
          const connectorId = decodeURIComponent(request.params.connectorId);

          // if message is undefined, it means the user is regenerating a message from the stored conversation
          if (request.body.message) {
            newMessage = {
              content: request.body.message,
              role: 'user',
            };
          }

          // get the actions plugin start contract from the request context:
          const actions = ctx.elasticAssistant.actions;
          const inference = ctx.elasticAssistant.inference;
          const savedObjectsClient = ctx.elasticAssistant.savedObjectsClient;
          const productDocsAvailable =
            (await ctx.elasticAssistant.llmTasks.retrieveDocumentationAvailable()) ?? false;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const connectors = await actionsClient.getBulk({ ids: [connectorId] });
          const connector = connectors.length > 0 ? connectors[0] : undefined;
          const isOssModel = isOpenSourceModel(connector);

          const contentReferencesEnabled =
            assistantContext.getRegisteredFeatures(DEFAULT_PLUGIN_NAME).contentReferencesEnabled;

          const conversationsDataClient =
            await assistantContext.getAIAssistantConversationsDataClient({
              contentReferencesEnabled,
            });
          const promptsDataClient = await assistantContext.getAIAssistantPromptsDataClient();

          const contentReferencesStore = contentReferencesEnabled
            ? newContentReferencesStore()
            : undefined;

          onLlmResponse = async (
            content: string,
            traceData: Message['traceData'] = {},
            isError = false
          ): Promise<void> => {
            if (conversationsDataClient && conversationId) {
              const contentReferences =
                contentReferencesStore && pruneContentReferences(content, contentReferencesStore);

              await appendAssistantMessageToConversation({
                conversationId,
                conversationsDataClient,
                messageContent: content,
                replacements: latestReplacements,
                isError,
                traceData,
                contentReferences,
              });
            }
          };
          let systemPrompt;
          if (conversationsDataClient && promptsDataClient && conversationId) {
            systemPrompt = await getSystemPromptFromUserConversation({
              conversationsDataClient,
              conversationId,
              promptsDataClient,
            });
          }
          return await langChainExecute({
            abortSignal,
            isStream: request.body.subAction !== 'invokeAI',
            actionsClient,
            actionTypeId,
            connectorId,
            contentReferencesStore,
            isOssModel,
            conversationId,
            context: ctx,
            getElser,
            logger,
            inference,
            messages: (newMessage ? [newMessage] : messages) ?? [],
            onLlmResponse,
            onNewReplacements,
            replacements: latestReplacements,
            request,
            response,
            telemetry,
            savedObjectsClient,
            systemPrompt,
            ...(productDocsAvailable ? { llmTasks: ctx.elasticAssistant.llmTasks } : {}),
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          if (onLlmResponse) {
            await onLlmResponse(error.message, {}, true);
          }

          const kbDataClient =
            (await assistantContext.getAIAssistantKnowledgeBaseDataClient()) ?? undefined;
          const isKnowledgeBaseInstalled = await getIsKnowledgeBaseInstalled(kbDataClient);
          telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
            actionTypeId: request.body.actionTypeId,
            model: request.body.model,
            errorMessage: error.message,
            assistantStreamingEnabled: request.body.subAction !== 'invokeAI',
            isEnabledKnowledgeBase: isKnowledgeBaseInstalled,
          });

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
