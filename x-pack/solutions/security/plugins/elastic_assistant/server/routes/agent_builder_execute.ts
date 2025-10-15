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
import type { ElasticAssistantRequestHandlerContext } from '../types';

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

// Helper function to generate conversation title
const generateConversationTitle = async (
  conversationId: string,
  messages: Array<Pick<Message, 'content' | 'role'>>,
  request: KibanaRequest,
  connectorId: string,
  context: ElasticAssistantRequestHandlerContext,
  logger: Logger
) => {
  if (!conversationId || messages.length === 0) return;

  try {
    const assistantContext = await context.elasticAssistant;
    const onechatAgents = assistantContext.getOnechatAgents();
    const conversationsDataClient = await assistantContext.getAIAssistantConversationsDataClient();

    if (!conversationsDataClient) return;

    const titlePrompt = `Generate a concise, descriptive title (max 60 characters) for this conversation based on the user's first message: "${
      messages[0]?.content || 'New conversation'
    }"`;

    const titleResult = await onechatAgents.execute({
      request,
      agentId: 'siem-security-analyst',
      agentParams: {
        nextInput: { message: titlePrompt },
        conversation: [],
        capabilities: {},
      },
      abortSignal: new AbortController().signal,
      defaultConnectorId: connectorId,
    });

    const generatedTitle = titleResult.result.round.response.message;
    await conversationsDataClient.updateConversation({
      conversationUpdateProps: {
        id: conversationId,
        title: generatedTitle.slice(0, 60),
      },
    });
  } catch (error) {
    logger.error(`Failed to generate chat title: ${error.message}`);
  }
};

// Helper function to convert messages to conversation rounds
const convertMessagesToConversationRounds = (
  messages: Array<Pick<Message, 'content' | 'role'>>
): ConversationRound[] => {
  const conversationRounds: ConversationRound[] = [];
  for (let i = 0; i < messages.length - 1; i += 2) {
    const userMessage = messages[i];
    const assistantMessage = messages[i + 1];

    if (userMessage.role === 'user' && assistantMessage.role === 'assistant') {
      conversationRounds.push({
        id: `round-${i}`,
        input: { message: userMessage.content },
        steps: [],
        response: { message: assistantMessage.content },
      });
    }
  }
  return conversationRounds;
};

// Helper function to process product documentation results
const processProductDocumentationResults = (
  result: { data: { content: { documents: Array<{ url?: string; title?: string }> } } },
  contentReferencesStore: ContentReferencesStore
): string => {
  let citations = '';
  const documents = result.data.content.documents;
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (doc.url) {
      const reference = contentReferencesStore.add((p) =>
        productDocumentationReference(p.id, doc.title || 'Product Documentation', doc.url || '')
      );
      const citation = contentReferenceBlock(reference);
      citations += ` ${citation}`;
    }
  }
  return citations;
};

// Helper function to process alert results
const processAlertResults = (
  result: { data: { alerts: Array<{ _id?: string }> } },
  contentReferencesStore: ContentReferencesStore
): string => {
  let citations = '';
  const alerts = result.data.alerts;
  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    if (alert._id) {
      const referenceId = contentReferencesStore.add((p) => ({
        type: 'SecurityAlert' as const,
        id: p.id,
        alertId: alert._id || '',
      }));
      const citation = `[${referenceId || ''}]`;
      citations += ` ${citation}`;
    }
  }
  return citations;
};

// Helper function to check if result is product documentation
const isProductDocumentationResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.product_documentation' &&
      result.data &&
      typeof result.data === 'object' &&
      'content' in result.data &&
      result.data.content &&
      typeof result.data.content === 'object' &&
      'documents' in result.data.content &&
      Array.isArray(result.data.content.documents)
  );
};

// Helper function to check if result is alert counts
const isAlertCountsResult = (step: { tool_id?: string }, result: { data?: unknown }): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.alert_counts' &&
      result.data &&
      typeof result.data === 'object' &&
      'result' in result.data
  );
};

// Helper function to check if result is open and acknowledged alerts
const isOpenAndAcknowledgedAlertsResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.open_and_acknowledged_alerts' &&
      result.data &&
      typeof result.data === 'object' &&
      'alerts' in result.data &&
      Array.isArray(result.data.alerts)
  );
};

// Helper function to process individual tool result
const processToolResult = (
  step: { type: string; tool_id?: string; results?: Array<{ type: string; data?: unknown }> },
  result: { type: string; data?: unknown },
  contentReferencesStore: ContentReferencesStore
): string => {
  // Skip content references for assistant_settings tool
  if ('tool_id' in step && step.tool_id === 'core.security.assistant_settings') {
    return '';
  }

  // Handle different types of tool results
  if (isProductDocumentationResult(step, result)) {
    return processProductDocumentationResults(
      result as { data: { content: { documents: Array<{ url?: string; title?: string }> } } },
      contentReferencesStore
    );
  }

  if (isAlertCountsResult(step, result)) {
    const reference = contentReferencesStore.add((p) => ({
      type: 'SecurityAlertsPage' as const,
      id: p.id,
    }));
    const citation = contentReferenceBlock(reference);
    return ` ${citation}`;
  }

  if (isOpenAndAcknowledgedAlertsResult(step, result)) {
    return processAlertResults(
      result as { data: { alerts: Array<{ _id?: string }> } },
      contentReferencesStore
    );
  }

  // Generic tool result handling
  if ('tool_id' in step && step.tool_id && step.tool_id.includes('assistant_settings')) {
    return '';
  }

  const reference = contentReferencesStore.add((p) => ({
    type: 'Href' as const,
    id: p.id,
    href: `#tool-result-${('tool_id' in step ? step.tool_id : 'unknown_tool') || 'unknown_tool'}`,
  }));
  const citation = contentReferenceBlock(reference);
  return ` ${citation}`;
};

// Helper function to process tool results and add content references
const processToolResults = (
  agentResult: {
    result: {
      round: {
        response: { message: string };
        steps?: Array<{
          type: string;
          tool_id?: string;
          results?: Array<{ type: string; data?: unknown }>;
        }>;
      };
    };
  },
  contentReferencesStore: ContentReferencesStore
): string => {
  let accumulatedContent = agentResult.result.round.response.message;

  if (!agentResult.result.round.steps || agentResult.result.round.steps.length === 0) {
    return accumulatedContent;
  }

  for (const step of agentResult.result.round.steps) {
    if (step.type === 'tool_call' && 'results' in step && step.results && step.results.length > 0) {
      for (const result of step.results) {
        if (result.type === 'other' && result.data) {
          accumulatedContent += processToolResult(step, result, contentReferencesStore);
        }
      }
    }
  }

  return accumulatedContent;
};

export async function agentBuilderExecute({
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
}: AgentBuilderExecuteParams) {
  const startTime = Date.now();

  // Start title generation immediately (non-blocking)
  if (conversationId && messages.length > 0) {
    generateConversationTitle(conversationId, messages, request, connectorId, context, logger);
  }

  logger.debug(
    `🚀 [AGENT_BUILDER] Messages received: ${JSON.stringify(
      messages.map((m) => ({ role: m.role, content: m.content })),
      null,
      2
    )}`
  );

  // Get the last message as the next input
  let nextInput: RoundInput | undefined;
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      nextInput = {
        message: lastMessage.content,
      };
    }
  }

  if (!nextInput) {
    throw new Error('No user message found to process');
  }

  // Initialize variables for response processing
  const finalTraceData: unknown = {};
  let collectedReplacements: Replacements = {};

  try {
    // Convert existing messages to conversation rounds for onechat
    const conversationRounds = convertMessagesToConversationRounds(messages);

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

    // Call the onechat agent via agents service
    const assistantContext = await context.elasticAssistant;
    const onechatAgents = assistantContext.getOnechatAgents();

    const agentResult = await onechatAgents.execute({
      request,
      agentId: 'siem-security-analyst',
      agentParams: {
        nextInput,
        conversation: conversationRounds,
        capabilities: {},
      },
      abortSignal,
      defaultConnectorId: connectorId,
    });

    logger.debug(
      `Onechat agent execution completed successfully: ${JSON.stringify(agentResult, null, 2)}`
    );

    // Process tool results to add content references
    const accumulatedContent = processToolResults(agentResult, contentReferencesStore);

    // Process the final response with content references and anonymization
    let finalResponse = accumulatedContent;

    // Apply content references pruning if needed
    if (contentReferencesStore) {
      const { prunedContent } = pruneContentReferences(finalResponse, contentReferencesStore);
      finalResponse = prunedContent;
    }

    // Collect replacements from tools that stored them in request context
    const toolReplacements = (request as ExtendedKibanaRequest).__toolReplacements;
    if (toolReplacements && typeof toolReplacements === 'object') {
      collectedReplacements = { ...collectedReplacements, ...toolReplacements };
    }

    // Pass collected replacements to the conversation
    if (Object.keys(collectedReplacements).length > 0) {
      onNewReplacements(collectedReplacements);
    }

    // Call onLlmResponse with the final processed content
    if (onLlmResponse) {
      await onLlmResponse(finalResponse, finalTraceData, false);
    }

    // Report telemetry with required fields
    const durationMs = Date.now() - startTime;
    const toolsInvoked: Record<string, number> = {};

    telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
      actionTypeId,
      model: (request.body as { model?: string }).model,
      assistantStreamingEnabled: isStream,
      isEnabledKnowledgeBase: false,
      durationMs,
      toolsInvoked,
    });

    // Return response based on streaming preference
    if (isStream) {
      const {
        end: streamEnd,
        push,
        responseWithHeaders,
      } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

      push({ payload: finalResponse, type: 'content' });
      streamEnd();

      return responseWithHeaders;
    } else {
      const contentReferences = contentReferencesStore.getStore();
      const metadata = !isEmpty(contentReferences) ? { contentReferences } : {};

      return response.ok({
        body: {
          connector_id: connectorId,
          data: finalResponse,
          trace_data: finalTraceData,
          replacements: collectedReplacements,
          status: 'ok',
          ...(conversationId ? { conversationId } : {}),
          ...(!isEmpty(metadata) ? { metadata } : {}),
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
}
