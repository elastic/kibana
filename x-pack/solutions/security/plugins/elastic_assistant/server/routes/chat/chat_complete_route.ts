/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { Replacements, ConversationResponse } from '@kbn/elastic-assistant-common';
import {
  ELASTIC_AI_ASSISTANT_CHAT_COMPLETE_URL,
  ChatCompleteProps,
  API_VERSIONS,
  transformRawData,
  getAnonymizedValue,
  newContentReferencesStore,
  pruneContentReferences,
  ChatCompleteRequestQuery,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { v4 as uuidv4 } from 'uuid';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../lib/telemetry/event_based_telemetry';
import type { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../../lib/build_response';
import {
  appendAssistantMessageToConversation,
  createConversationWithUserInput,
  getIsKnowledgeBaseInstalled,
  getSystemPromptFromPromptId,
  getSystemPromptFromUserConversation,
  langChainExecute,
  performChecks,
} from '../helpers';
import { transformESSearchToAnonymizationFields } from '../../ai_assistant_data_clients/anonymization_fields/helpers';
import type { EsAnonymizationFieldsSchema } from '../../ai_assistant_data_clients/anonymization_fields/types';
import { isOpenSourceModel } from '../utils';
import type { ConfigSchema } from '../../config_schema';
import type { OnLlmResponse } from '../../lib/langchain/executors/types';

export const SYSTEM_PROMPT_CONTEXT_NON_I18N = (context: string) => {
  return `CONTEXT:\n"""\n${context}\n"""`;
};

export const chatCompleteRoute = (
  router: ElasticAssistantPluginRouter,
  config?: ConfigSchema
): void => {
  const RESPONSE_TIMEOUT = config?.responseTimeout as number;

  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CHAT_COMPLETE_URL,

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
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ChatCompleteProps),
            query: buildRouteValidationWithZod(ChatCompleteRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);
        const assistantResponse = buildResponse(response);
        const { content_references_disabled: contentReferencesDisabled } = request.query;
        let telemetry;
        let actionTypeId;
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const logger: Logger = ctx.elasticAssistant.logger;
        try {
          telemetry = ctx.elasticAssistant.telemetry;
          const inference = ctx.elasticAssistant.inference;
          const productDocsAvailable =
            (await ctx.elasticAssistant.llmTasks.retrieveDocumentationAvailable({
              inferenceId: defaultInferenceEndpoints.ELSER,
            })) ?? false;

          // Perform license and authenticated user checks
          const checkResponse = await performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }

          const conversationsDataClient =
            await ctx.elasticAssistant.getAIAssistantConversationsDataClient();

          const anonymizationFieldsDataClient =
            await ctx.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient();

          const promptsDataClient = await ctx.elasticAssistant.getAIAssistantPromptsDataClient();

          let messages;
          const existingConversationId = request.body.conversationId;
          const connectorId = request.body.connectorId;

          let latestReplacements: Replacements = {};
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          const threadId = uuidv4();
          // get the actions plugin start contract from the request context:
          const actions = ctx.elasticAssistant.actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const connectors = await actionsClient.getBulk({ ids: [connectorId] });
          const connector = connectors.length > 0 ? connectors[0] : undefined;
          actionTypeId = connector?.actionTypeId ?? '.gen-ai';
          const isOssModel = isOpenSourceModel(connector);
          const savedObjectsClient = ctx.elasticAssistant.savedObjectsClient;

          // replacements
          const anonymizationFieldsRes =
            await anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
              perPage: 1000,
              page: 1,
            });

          let anonymizationFields = anonymizationFieldsRes
            ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
            : undefined;

          // anonymize messages before sending to LLM
          messages = request.body.messages.map((m) => {
            let content = m.content ?? '';
            if (m.data) {
              // includes/anonymize fields from the messages data
              if (m.fields_to_anonymize && m.fields_to_anonymize.length > 0) {
                anonymizationFields = anonymizationFields?.map((a) => {
                  if (m.fields_to_anonymize?.includes(a.field)) {
                    return {
                      ...a,
                      allowed: true,
                      anonymized: true,
                    };
                  }
                  return a;
                });
              }
              const anonymizedData = transformRawData({
                anonymizationFields,
                currentReplacements: latestReplacements,
                getAnonymizedValue,
                onNewReplacements,
                rawData: Object.keys(m.data).reduce(
                  (obj, key) => ({ ...obj, [key]: [m.data ? m.data[key] : ''] }),
                  {}
                ),
              });
              const wr = `${SYSTEM_PROMPT_CONTEXT_NON_I18N(anonymizedData)}\n`;
              content = `${wr}\n${m.content}`;
            }
            const transformedMessage = {
              role: m.role,
              content,
            };
            return transformedMessage;
          });

          let newConversation: ConversationResponse | undefined | null;
          if (conversationsDataClient && !existingConversationId && request.body.persist) {
            newConversation = await createConversationWithUserInput({
              actionTypeId,
              connectorId,
              conversationsDataClient,
              promptId: request.body.promptId,
              replacements: latestReplacements,
              newMessages: messages,
              model: request.body.model,
            });

            // messages are anonymized by conversationsDataClient
            messages = newConversation?.messages?.map((c) => ({
              role: c.role,
              content: c.content,
            }));
          }

          const timeout = new Promise((_, reject) => {
            setTimeout(() => {
              reject(
                new Error('Request timed out, increase xpack.elasticAssistant.responseTimeout')
              );
            }, config?.responseTimeout as number);
          }) as unknown as IKibanaResponse;

          // Do not persist conversation messages if `persist = false`
          const conversationId = request.body.persist
            ? existingConversationId ?? newConversation?.id
            : undefined;

          const systemPromptParts: string[] = [];

          if (conversationsDataClient && promptsDataClient && existingConversationId) {
            const conversationSystemPrompt = await getSystemPromptFromUserConversation({
              conversationsDataClient,
              conversationId: existingConversationId,
              promptsDataClient,
            });

            if (conversationSystemPrompt) {
              systemPromptParts.push(conversationSystemPrompt);
            }
          }

          if (promptsDataClient && request.body.promptId) {
            const requestSystemPrompt = await getSystemPromptFromPromptId({
              promptId: request.body.promptId,
              promptsDataClient,
            });

            if (requestSystemPrompt) {
              systemPromptParts.push(requestSystemPrompt);
            }
          }

          const systemPrompt =
            systemPromptParts.length > 0 ? systemPromptParts.join('\n\n') : undefined;

          const contentReferencesStore = newContentReferencesStore({
            disabled: contentReferencesDisabled ?? false,
          });

          const onLlmResponse: OnLlmResponse = async ({
            content,
            refusal,
            traceData = {},
            isError = false,
          }): Promise<void> => {
            if (conversationId && conversationsDataClient) {
              const { prunedContent, prunedContentReferencesStore } = pruneContentReferences(
                content,
                contentReferencesStore
              );

              await appendAssistantMessageToConversation({
                conversationId,
                conversationsDataClient,
                messageContent: prunedContent,
                messageRefusal: refusal,
                replacements: latestReplacements,
                isError,
                traceData,
                contentReferences: prunedContentReferencesStore,
              });
            }
          };

          return await Promise.race([
            langChainExecute({
              abortSignal,
              isStream: request.body.isStream ?? false,
              actionsClient,
              actionTypeId,
              connectorId,
              threadId,
              isOssModel,
              conversationId,
              context: ctx,
              logger,
              inference,
              messages: messages ?? [],
              onLlmResponse,
              onNewReplacements,
              replacements: latestReplacements,
              contentReferencesStore,
              request,
              response,
              telemetry,
              responseLanguage: request.body.responseLanguage,
              savedObjectsClient,
              systemPrompt,
              ...(productDocsAvailable ? { llmTasks: ctx.elasticAssistant.llmTasks } : {}),
            }),
            timeout,
          ]);
        } catch (err) {
          const error = transformError(err as Error);
          const kbDataClient =
            (await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient()) ?? undefined;
          const isKnowledgeBaseInstalled = await getIsKnowledgeBaseInstalled(kbDataClient);

          telemetry?.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
            actionTypeId: actionTypeId ?? '',
            model: request.body.model,
            errorMessage: error.message,
            assistantStreamingEnabled: request.body.isStream ?? false,
            isEnabledKnowledgeBase: isKnowledgeBaseInstalled,
            errorLocation: 'chatCompleteRoute',
          });
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
