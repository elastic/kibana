/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract, AnalyticsServiceSetup } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { RoundInput, ConversationRound } from '@kbn/onechat-common';
import { streamFactory } from '@kbn/ml-response-stream/server';
import { isEmpty } from 'lodash';
import {
  pruneContentReferences,
  productDocumentationReference,
  contentReferenceBlock,
  type Replacements,
  type ContentReferencesStore,
  type Message,
} from '@kbn/elastic-assistant-common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { INVOKE_ASSISTANT_SUCCESS_EVENT } from '../lib/telemetry/event_based_telemetry';
import { getPrompt } from '../lib/prompt/get_prompt';
import { getModelOrOss } from '../lib/prompt/helpers';
import type { ElasticAssistantRequestHandlerContext } from '../types';
import { getLlmType } from './utils';

// Extended request type to store tool replacements temporarily
interface ExtendedKibanaRequest {
  __toolReplacements?: Replacements;
}

// Note: Removed hacky symbol-based parameter passing approach
// Tools now use proper parameters and defaults that work for A2A interactions

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
  onLlmResponse?: (content: string, traceData: unknown, isError: boolean) => Promise<void>;
  response: KibanaResponseFactory;
  responseLanguage?: string;
  isStream?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  screenContext?: unknown;
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
  const startTime = Date.now(); // Track start time for telemetry

  const assistantContext = await context.elasticAssistant;
  const onechatAgents = assistantContext.getOnechatAgents();

  // Start title generation immediately (non-blocking)
  if (conversationId && messages.length > 0) {
    (async () => {
      try {
        const conversationsDataClient =
          await assistantContext.getAIAssistantConversationsDataClient();
        if (conversationsDataClient) {
          // Create a title generation prompt
          const titlePrompt = `Generate a concise, descriptive title (max 60 characters) for this conversation based on the user's first message: "${
            messages[0]?.content || 'New conversation'
          }"`;

          // Use onechat agent to generate title
          const titleResult = await onechatAgents.execute({
            request,
            agentId: 'siem-security-analyst',
            agentParams: {
              nextInput: { message: titlePrompt },
              conversation: [], // No conversation history for title generation
              capabilities: {},
            },
            abortSignal: new AbortController().signal, // Use a new signal for title generation
            defaultConnectorId: connectorId,
          });

          const generatedTitle = titleResult.result.round.response.message;

          // Update the conversation with the generated title
          await conversationsDataClient.updateConversation({
            conversationUpdateProps: {
              id: conversationId,
              title: generatedTitle.slice(0, 60), // Ensure max 60 characters
            },
          });
        }
      } catch (error) {
        logger.error(`Failed to generate chat title: ${error.message}`);
      }
    })();
  }

  // Note: anonymizationFields are now handled by individual tools

  logger.debug(
    `🚀 [AGENT_BUILDER] Messages received: ${JSON.stringify(
      messages.map((m) => ({ role: m.role, content: m.content })),
      null,
      2
    )}`
  );

  // Get the last message as the next input
  let nextInput: RoundInput | undefined;

  // Get the last message as the next input
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      // Apply anonymization to the user message if needed
      let messageContent = lastMessage.content;

      // For now, we'll pass the message as-is since onechat will handle anonymization
      // through its own tools. The SIEM agent has access to anonymization tools.
      messageContent = lastMessage.content;

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
  const finalTraceData: unknown = {};
  let collectedReplacements: Replacements = {};

  try {
    // Resolve model-aware prompts for tools before calling the onechat agent
    // This is similar to how the default assistant graph handles model-aware prompts
    const modelType = getLlmType(actionTypeId);
    const modelForPrompts = getModelOrOss(
      modelType,
      isOssModel,
      (request.body as { model?: string }).model
    );

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

    logger.debug(
      `🚀 [AGENT_BUILDER] Conversation history: ${JSON.stringify(
        conversationRounds.map((r) => ({
          id: r.id,
          input: r.input.message,
          response: r.response.message,
        })),
        null,
        2
      )}`
    );
    logger.debug(`🚀 [AGENT_BUILDER] Next input: ${JSON.stringify(nextInput, null, 2)}`);

    // Note: Removed hacky parameter passing through request symbols
    // Tools now handle their own parameters and defaults for A2A compatibility

    // Call the onechat agent via agents service
    const agentResult = await onechatAgents.execute({
      request,
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

    // Note: Removed hacky replacements collection from request symbols
    // Replacements should be handled at the agent level for A2A compatibility

    logger.debug(
      `Onechat agent execution completed successfully: ${JSON.stringify(agentResult, null, 2)}`
    );

    // Extract the response content from the agent result
    const agentResponse = agentResult.result.round.response.message;
    accumulatedContent = agentResponse;

    // Process tool results to add content references
    // The onechat agent execution returns tool results that we need to process

    if (agentResult.result.round.steps && agentResult.result.round.steps.length > 0) {
      // Process each tool step to extract content references
      for (const step of agentResult.result.round.steps) {
        if (
          step.type === 'tool_call' &&
          'results' in step &&
          step.results &&
          step.results.length > 0
        ) {
          for (const result of step.results) {
            if (result.type === 'other' && result.data) {
              // Skip content references for assistant_settings tool - it's just configuration
              if ('tool_id' in step && step.tool_id === 'core.security.assistant_settings') {
                // Skip content reference for assistant_settings tool
                // eslint-disable-next-line no-continue
                continue;
              }

              // Handle different types of tool results
              if (
                'tool_id' in step &&
                step.tool_id === 'core.security.product_documentation' &&
                result.data &&
                typeof result.data === 'object' &&
                'content' in result.data &&
                result.data.content &&
                typeof result.data.content === 'object' &&
                'documents' in result.data.content &&
                Array.isArray(result.data.content.documents)
              ) {
                // Process product documentation results
                const documents = result.data.content.documents;
                for (let i = 0; i < documents.length; i++) {
                  const doc = documents[i];
                  if (doc.url) {
                    // Add content reference for product documentation using the same approach as the original tool
                    const reference = contentReferencesStore.add((p) =>
                      productDocumentationReference(
                        p.id,
                        doc.title || 'Product Documentation',
                        doc.url
                      )
                    );

                    // Add citation to the response content
                    const citation = contentReferenceBlock(reference);
                    accumulatedContent += ` ${citation}`;
                  }
                }
              } else if (
                'tool_id' in step &&
                step.tool_id === 'core.security.alert_counts' &&
                result.data &&
                typeof result.data === 'object' &&
                'result' in result.data
              ) {
                // Process alert counts results
                // Add content reference for alert counts using SecurityAlertsPage type
                const reference = contentReferencesStore.add((p) => ({
                  type: 'SecurityAlertsPage' as const,
                  id: p.id,
                }));

                // Add citation to the response content using contentReferenceBlock
                const citation = contentReferenceBlock(reference);
                accumulatedContent += ` ${citation}`;
              } else if (
                'tool_id' in step &&
                step.tool_id === 'core.security.open_and_acknowledged_alerts' &&
                result.data &&
                typeof result.data === 'object' &&
                'alerts' in result.data &&
                Array.isArray(result.data.alerts)
              ) {
                // Process alert results
                const alerts = result.data.alerts;
                for (let i = 0; i < alerts.length; i++) {
                  const alert = alerts[i];
                  if (alert._id) {
                    // Add content reference for alerts
                    const referenceId = contentReferencesStore.add((p) => ({
                      type: 'SecurityAlert' as const,
                      id: p.id,
                      alertId: alert._id,
                    }));

                    // Add citation to the response content
                    const citation = `[${referenceId}]`;
                    accumulatedContent += ` ${citation}`;
                  }
                }

                // Note: replacements are not collected from tool result data
                // to prevent them from being passed to the LLM
                // They should be collected at the conversation level instead
              } else {
                // Generic tool result handling - skip for configuration tools
                if (
                  'tool_id' in step &&
                  step.tool_id &&
                  step.tool_id.includes('assistant_settings')
                ) {
                  // Skip content reference for configuration tool
                  // eslint-disable-next-line no-continue
                  continue;
                }

                const reference = contentReferencesStore.add((p) => ({
                  type: 'Href' as const,
                  id: p.id,
                  href: `#tool-result-${
                    ('tool_id' in step ? step.tool_id : 'unknown_tool') || 'unknown_tool'
                  }`,
                }));

                // Add citation to the response content using contentReferenceBlock
                const citation = contentReferenceBlock(reference);
                accumulatedContent += ` ${citation}`;
              }
            }
          }
        }
      }
    }

    // Process the final response with content references and anonymization
    let finalResponse = accumulatedContent;

    // Apply content references pruning if needed
    if (contentReferencesStore) {
      const { prunedContent } = pruneContentReferences(finalResponse, contentReferencesStore);
      finalResponse = prunedContent;
    }

    // Collect replacements from tools that stored them in request context
    // This is a temporary solution until onechat provides a proper way to pass replacements
    const toolReplacements = (request as ExtendedKibanaRequest).__toolReplacements;
    if (toolReplacements && typeof toolReplacements === 'object') {
      collectedReplacements = { ...collectedReplacements, ...toolReplacements };
    }

    // Pass collected replacements to the conversation
    if (Object.keys(collectedReplacements).length > 0) {
      onNewReplacements(collectedReplacements);
    }

    // Call onLlmResponse with the final processed content to ensure conversation updates happen properly
    if (onLlmResponse) {
      await onLlmResponse(finalResponse, finalTraceData, false);
    }

    // Title generation is already running in parallel (started at the beginning)
    // No need to start it again here

    // Report telemetry with required fields
    const durationMs = Date.now() - startTime;

    // For now, we don't have access to tool invocation counts from onechat agent execution
    // This would need to be tracked by the onechat agent itself
    const toolsInvoked: Record<string, number> = {
      // TODO: Get actual tool invocation counts from onechat agent execution
      // This would require onechat to expose tool usage statistics
    };

    telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
      actionTypeId,
      model: (request.body as { model?: string }).model,
      assistantStreamingEnabled: isStream,
      isEnabledKnowledgeBase: false, // Agent builder doesn't use KB directly
      durationMs,
      toolsInvoked,
    });

    // For streaming, we need to return a proper streaming response
    if (isStream) {
      // Create a streaming response similar to the langchain execution
      const {
        end: streamEnd,
        push,
        responseWithHeaders,
      } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

      // Push the final response as a content chunk
      push({ payload: finalResponse, type: 'content' });

      // End the stream
      streamEnd();

      return responseWithHeaders;
    } else {
      // Return static response format (matching langchain execution format)
      const contentReferences = contentReferencesStore.getStore();
      const metadata = !isEmpty(contentReferences) ? { contentReferences } : {};

      return response.ok({
        body: {
          connector_id: connectorId,
          data: finalResponse, // ← Changed from "response" to "data"
          trace_data: finalTraceData,
          replacements: collectedReplacements, // Include collected replacements
          status: 'ok',
          ...(conversationId ? { conversationId } : {}),
          ...(!isEmpty(metadata) ? { metadata } : {}), // ← Content references go in metadata
        },
        headers: {
          'content-type': 'application/json',
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
