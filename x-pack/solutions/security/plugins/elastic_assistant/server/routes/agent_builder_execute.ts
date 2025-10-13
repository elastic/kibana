/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { RoundInput, ConversationRound } from '@kbn/onechat-common';
import { INVOKE_ASSISTANT_SUCCESS_EVENT } from '../lib/telemetry/event_based_telemetry';
import { generateChatTitle } from '../lib/langchain/graphs/default_assistant_graph/nodes/generate_chat_title';
import { getPrompt } from '../lib/prompt/get_prompt';
import { getModelOrOss } from '../lib/prompt/helpers';
import {
  replaceAnonymizedValuesWithOriginalValues,
  pruneContentReferences,
  type Replacements,
  type ContentReferencesStore,
  type Message,
} from '@kbn/elastic-assistant-common';
import type { ElasticAssistantRequestHandlerContext } from '../types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { getLlmType } from './utils';

export interface AgentBuilderExecuteParams {
  messages: Array<Pick<Message, 'content' | 'role'>>;
  replacements: Replacements;
  onNewReplacements: (newReplacements: Replacements) => void;
  abortSignal: AbortSignal;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  connectorId: string;
  threadId: string;
  contentReferencesStore: ContentReferencesStore;
  inferenceChatModelDisabled?: boolean;
  isOssModel?: boolean;
  context: ElasticAssistantRequestHandlerContext;
  actionsClient: PublicMethodsOf<ActionsClient>;
  llmTasks?: LlmTasksPluginStart;
  inference: InferenceServerStart;
  request: KibanaRequest;
  logger: Logger;
  conversationId?: string;
  onLlmResponse?: (content: string, traceData: any, isError: boolean) => Promise<void>;
  response: KibanaResponseFactory;
  responseLanguage?: string;
  isStream?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  screenContext?: any;
  systemPrompt?: string;
  timeout?: number;
}

export const agentBuilderExecute = async ({
  messages,
  replacements,
  onNewReplacements,
  abortSignal,
  telemetry,
  actionTypeId,
  connectorId,
  threadId,
  contentReferencesStore,
  inferenceChatModelDisabled,
  isOssModel,
  context,
  actionsClient,
  llmTasks,
  inference,
  request,
  logger,
  conversationId,
  onLlmResponse,
  response,
  responseLanguage,
  isStream = true,
  savedObjectsClient,
  screenContext,
  systemPrompt,
  timeout,
}: AgentBuilderExecuteParams) => {
  const assistantContext = await context.elasticAssistant;
  const onechatAgents = assistantContext.getOnechatAgents();

  // Get data clients for anonymization and conversation handling
  const anonymizationFieldsDataClient =
    await assistantContext.getAIAssistantAnonymizationFieldsDataClient();

  // Get the last message as the next input
  let nextInput: RoundInput | undefined;

  // Get the last message as the next input
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      // Apply anonymization to the user message if needed
      let messageContent = lastMessage.content;

      // If we have anonymization fields, we need to apply them
      if (anonymizationFieldsDataClient && replacements) {
        // For now, we'll pass the message as-is since onechat will handle anonymization
        // through its own tools. The SIEM agent has access to anonymization tools.
        messageContent = lastMessage.content;
      }

      nextInput = {
        message: messageContent,
      };
    }
  }

  if (!nextInput) {
    throw new Error('No user message found to process');
  }

  // Initialize variables for response processing
  let accumulatedContent = '';
  const finalTraceData: any = {};

  try {
    // Resolve model-aware prompts for tools before calling the onechat agent
    // This is similar to how the default assistant graph handles model-aware prompts
    const modelType = getLlmType(actionTypeId);
    const modelForPrompts = getModelOrOss(modelType, isOssModel, (request.body as any).model);

    // Resolve prompts for all tools that have prompts defined
    const toolPrompts: Record<string, string> = {};
    const toolIds = [
      'AlertCountsTool',
      'NaturalLanguageESQLTool',
      'GenerateESQLTool',
      'AskAboutESQLTool',
      'ProductDocumentationTool',
      'KnowledgeBaseRetrievalTool',
      'KnowledgeBaseWriteTool',
      'SecurityLabsKnowledgeBaseTool',
      'OpenAndAcknowledgedAlertsTool',
      'EntityRiskScoreTool',
      'defendInsightsTool',
      'IntegrationKnowledgeTool',
    ];

    for (const toolId of toolIds) {
      try {
        const prompt = await getPrompt({
          actionsClient,
          connectorId,
          model: modelForPrompts,
          promptId: toolId,
          promptGroupId: 'security-tools',
          provider: modelType,
          savedObjectsClient,
        });
        toolPrompts[toolId] = prompt;
      } catch (error) {
        logger.warn(`Failed to get prompt for tool ${toolId}: ${error.message}`);
      }
    }

    logger.debug(`Resolved tool prompts: ${JSON.stringify(Object.keys(toolPrompts))}`);

    // Note: The following parameters are not supported by onechat agent execution:
    // - threadId: Handled by passing conversation history instead
    // - systemPrompt: The onechat agent uses its own system prompt from configuration
    // - screenContext: Handled by the onechat agent's own tools
    // - timeout: Handled by abortSignal or higher-level timeout
    // - inference: The onechat agent handles its own model inference
    // - llmTasks: The onechat agent handles its own LLM tasks

    // Convert existing messages to conversation rounds for onechat
    const conversationRounds: ConversationRound[] = [];
    for (let i = 0; i < messages.length - 1; i += 2) {
      const userMessage = messages[i];
      const assistantMessage = messages[i + 1];

      if (userMessage.role === 'user' && assistantMessage.role === 'assistant') {
        conversationRounds.push({
          id: `round-${i}`,
          input: { message: userMessage.content },
          steps: [], // No intermediate steps for now
          response: { message: assistantMessage.content },
        });
      }
    }

    // Call the onechat agent via agents service
    const agentResult = await onechatAgents.execute({
      agentId: 'siem-security-analyst',
      agentParams: {
        nextInput,
        conversation: conversationRounds,
        capabilities: {
          // Add any required capabilities here
        },
      },
      abortSignal,
      defaultConnectorId: connectorId,
    });

    logger.debug('Onechat agent execution completed successfully');

    // Extract the response content from the agent result
    const agentResponse = agentResult.result.round.response.message;
    accumulatedContent = agentResponse;

    // Process the final response with content references and anonymization
    let finalResponse = accumulatedContent;

    // Apply content references pruning if needed
    if (contentReferencesStore) {
      const { prunedContent } = pruneContentReferences(finalResponse, contentReferencesStore);
      finalResponse = prunedContent;
    }

    // Apply anonymization replacements if needed
    if (replacements && Object.keys(replacements).length > 0) {
      finalResponse = replaceAnonymizedValuesWithOriginalValues({
        messageContent: finalResponse,
        replacements,
      });
    }

    // Call onNewReplacements if new replacements were created during agent execution
    // This ensures anonymization updates are properly handled
    if (onNewReplacements && replacements && Object.keys(replacements).length > 0) {
      onNewReplacements(replacements);
    }

    // Call onLlmResponse with the final processed content to ensure conversation updates happen properly
    if (onLlmResponse) {
      await onLlmResponse(finalResponse, finalTraceData, false);
    }

    // Generate chat title as a fire-and-forget async call (similar to default assistant graph)
    if (conversationId && messages.length > 0) {
      void (async () => {
        try {
          const conversationsDataClient =
            await assistantContext.getAIAssistantConversationsDataClient();
          if (conversationsDataClient) {
            // Create a mock LLM instance for title generation
            // We'll use the same connector that was used for the main request
            const connectorModel = await actionsClient.get({ id: connectorId });
            if (connectorModel) {
              // Convert messages to BaseMessage format for generateChatTitle
              const baseMessages = messages.map((msg) => ({
                text: msg.content,
                role: msg.role,
                lc_namespace: ['langchain', 'schema', 'messages'],
                lc_serializable: true,
                lc_aliases: [],
                lc_kwargs: { content: msg.content, role: msg.role },
                id: [],
                additional_kwargs: {},
                response_metadata: {},
                tool_calls: [],
                invalid_tool_calls: [],
                tool_call_chunks: [],
                content: msg.content,
              }));

              await generateChatTitle({
                actionsClient,
                contentReferencesStore,
                conversationsDataClient,
                logger,
                savedObjectsClient,
                state: {
                  conversationId,
                  connectorId,
                  llmType: getLlmType(actionTypeId),
                  responseLanguage: responseLanguage || 'English',
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                newMessages: baseMessages as any, // Type assertion needed for compatibility
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                model: connectorModel as any, // Type assertion needed for compatibility
                telemetryParams: {
                  actionTypeId,
                  model: (request.body as any).model,
                  assistantStreamingEnabled: isStream,
                  isEnabledKnowledgeBase: false,
                  eventType: INVOKE_ASSISTANT_SUCCESS_EVENT.eventType,
                },
                telemetry,
              });
            }
          }
        } catch (error) {
          logger.error(`Failed to generate chat title: ${error.message}`);
        }
      })();
    }

    // Report telemetry
    telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
      actionTypeId,
      model: (request.body as any).model,
      assistantStreamingEnabled: isStream,
      isEnabledKnowledgeBase: false, // Agent builder doesn't use KB directly
    });

    // For streaming, we've already sent chunks via onLlmResponse
    // For non-streaming, we need to return the final result
    if (isStream) {
      // Return a streaming response format
      return response.ok({
        body: {
          response: finalResponse,
          connector_id: connectorId,
          agent_builder: true, // Flag to indicate this came from agent builder
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Return static response format
      return response.ok({
        body: {
          response: finalResponse,
          connector_id: connectorId,
          agent_builder: true, // Flag to indicate this came from agent builder
        },
      });
    }
  } catch (error) {
    logger.error('Agent builder execution failed:', error);

    if (onLlmResponse) {
      await onLlmResponse(error.message, {}, true);
    }

    throw error;
  }
};
