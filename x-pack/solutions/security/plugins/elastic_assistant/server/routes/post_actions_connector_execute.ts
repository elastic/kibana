/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
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
  ExecuteConnectorRequestQuery,
  POST_ACTIONS_CONNECTOR_EXECUTE,
  INFERENCE_CHAT_MODEL_DISABLED_FEATURE_FLAG,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getPrompt } from '../lib/prompt';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../lib/telemetry/event_based_telemetry';
import { buildResponse } from '../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../types';
import {
  appendAssistantMessageToConversation,
  getIsKnowledgeBaseInstalled,
  getSystemPromptFromUserConversation,
  langChainExecute,
  performChecks,
} from './helpers';
import { isOpenSourceModel } from './utils';
import { ConfigSchema } from '../config_schema';

export const postActionsConnectorExecuteRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  config: ConfigSchema
) => {
  const RESPONSE_TIMEOUT = config?.responseTimeout;

  router.versioned
    .post({
      access: 'internal',
      path: POST_ACTIONS_CONNECTOR_EXECUTE,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
      options: {
        timeout: {
          // Add extra time to the timeout to account for the time it takes to process the request
          idleSocket: RESPONSE_TIMEOUT + 30 * 1000,
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
            query: buildRouteValidationWithZod(ExecuteConnectorRequestQuery),
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

        const coreContext = await context.core;
        const inferenceChatModelDisabled =
          (await coreContext?.featureFlags?.getBooleanValue(
            INFERENCE_CHAT_MODEL_DISABLED_FEATURE_FLAG,
            false
          )) ?? false;

        try {
          const checkResponse = await performChecks({
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
          const screenContext = request.body.screenContext;
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
            (await ctx.elasticAssistant.llmTasks.retrieveDocumentationAvailable({
              inferenceId: defaultInferenceEndpoints.ELSER,
            })) ?? false;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const connectors = await actionsClient.getBulk({ ids: [connectorId] });
          const connector = connectors.length > 0 ? connectors[0] : undefined;
          const isOssModel = isOpenSourceModel(connector);

          const conversationsDataClient =
            await assistantContext.getAIAssistantConversationsDataClient();
          const promptsDataClient = await assistantContext.getAIAssistantPromptsDataClient();
          const contentReferencesStore = newContentReferencesStore({
            disabled: request.query.content_references_disabled,
          });

          onLlmResponse = async (
            content: string,
            traceData: Message['traceData'] = {},
            isError = false
          ): Promise<void> => {
            if (conversationsDataClient && conversationId) {
              const { prunedContent, prunedContentReferencesStore } = pruneContentReferences(
                content,
                contentReferencesStore
              );

              await appendAssistantMessageToConversation({
                conversationId,
                conversationsDataClient,
                messageContent: prunedContent,
                replacements: latestReplacements,
                isError,
                traceData,
                contentReferences: prunedContentReferencesStore,
              });
            }
          };
          const promptIds = request.body.promptIds;
          let systemPrompt;
          if (conversationsDataClient && promptsDataClient && conversationId) {
            systemPrompt = await getSystemPromptFromUserConversation({
              conversationsDataClient,
              conversationId,
              promptsDataClient,
            });
          }
          if (promptIds) {
            const additionalSystemPrompt = await getPrompt({
              actionsClient,
              connectorId,
              // promptIds is promptId and promptGroupId
              ...promptIds,
              savedObjectsClient,
            });

            systemPrompt =
              systemPrompt && systemPrompt.length
                ? `${systemPrompt}\n\n${additionalSystemPrompt}`
                : additionalSystemPrompt;
          }

          const timeout = new Promise((_, reject) => {
            setTimeout(() => {
              reject(
                new Error('Request timed out, increase xpack.elasticAssistant.responseTimeout')
              );
            }, config?.responseTimeout as number);
          }) as unknown as IKibanaResponse;

          return await Promise.race([
            langChainExecute({
              abortSignal,
              isStream: request.body.subAction !== 'invokeAI',
              actionsClient,
              actionTypeId,
              connectorId,
              contentReferencesStore,
              isOssModel,
              inferenceChatModelDisabled,
              conversationId,
              context: ctx,
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
              screenContext,
              systemPrompt,
              ...(productDocsAvailable ? { llmTasks: ctx.elasticAssistant.llmTasks } : {}),
            }),
            timeout,
          ]);
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
            errorLocation: 'postActionsConnectorExecuteRoute',
          });

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
