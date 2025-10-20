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
import type {
  RoundInput,
  ConversationRound,
  ChatAgentEvent,
  RoundCompleteEventData,
} from '@kbn/onechat-common';
import { isMessageChunkEvent, isRoundCompleteEvent, isToolCallEvent } from '@kbn/onechat-common';
import { streamFactory } from '@kbn/ml-response-stream/server';
import type { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import { isEmpty } from 'lodash';
import {
  pruneContentReferences,
  contentReferenceBlock,
  type Replacements,
  type ContentReferencesStore,
  type Message,
  type ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf, AwaitedProperties } from '@kbn/utility-types';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/server';
import { INVOKE_ASSISTANT_SUCCESS_EVENT } from '../lib/telemetry/event_based_telemetry';
import type { ElasticAssistantRequestHandlerContext } from '../types';
import { getIsKnowledgeBaseAvailable } from './helpers';

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
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >;
  actionsClient: PublicMethodsOf<ActionsClient>;
  llmTasks?: LlmTasksPluginStart;
  inference: InferenceServerStart;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  logger: Logger;
  conversationId?: string;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
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
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >,
  logger: Logger
) => {
  if (!conversationId || messages.length === 0) return;

  try {
    const assistantContext = await context.elasticAssistant;
    const onechatServices = assistantContext.getOnechatServices();
    const conversationsDataClient = await assistantContext.getAIAssistantConversationsDataClient();

    if (!conversationsDataClient) return;

    const titlePrompt = `Generate a concise, descriptive title (max 60 characters) for this conversation based on the user's first message: "${
      messages[0]?.content || 'New conversation'
    }"`;

    const titleResult = await onechatServices.agents.execute({
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
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool
  logger.debug(
    `🔍 [PROCESS_PRODUCT_DOCS] About to register citations for product documentation results`,
    {
      resultData: result.data,
    } as Record<string, unknown>
  );

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  // Tools embed citations inline, agent just registers them
  return '';
};

// Helper function to process alert results
const processAlertResults = (
  result: { data: { alerts: string[] } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool
  logger.debug(`🔍 [PROCESS_ALERT_RESULTS] About to register citations for alert results`, {
    resultData: result.data,
  } as Record<string, unknown>);

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to process knowledge base retrieval results
const processKnowledgeBaseRetrievalResults = (
  result: {
    data: {
      content?: string;
      message?: string;
      query: string;
      entries?: Array<{ id: string; name: string }>;
    };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger,
  aiResponseMessage: string
): string => {
  // Register any citations provided by the tool
  logger.debug(
    `🔍 [PROCESS_KB_RETRIEVAL] About to register citations for knowledge base retrieval results`,
    {
      resultData: result.data,
    } as Record<string, unknown>
  );

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  // The tool already embeds citations inline in the content
  return '';
};

// Helper function to process knowledge base write results
const processKnowledgeBaseWriteResults = (
  result: { data: { entryId?: string; name: string; query: string } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool
  logger.debug(
    `🔍 [PROCESS_KB_WRITE] About to register citations for knowledge base write results`,
    {
      resultData: result.data,
    } as Record<string, unknown>
  );

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to process security labs knowledge results
const processSecurityLabsKnowledgeResults = (
  result: {
    data: {
      content?: string;
      message?: string;
      question: string;
      citations?: Array<{ id: string; slug: string; title: string }>;
    };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool
  logger.debug(`🔍 [PROCESS_SECURITY_LABS] About to register citations for security labs results`, {
    resultData: result.data,
  } as Record<string, unknown>);

  // Convert Security Labs citations to the standard format
  if (result.data.citations && result.data.citations.length > 0) {
    const standardCitations = result.data.citations.map((citation) => ({
      id: citation.id,
      type: 'Href' as const,
      metadata: {
        href: `https://www.elastic.co/security-labs/${citation.slug}`,
        title: `Security Labs: ${citation.title}`,
      },
    }));

    // Use the standard citation registration function
    registerCitationsFromToolResult(
      {
        data: {
          citations: standardCitations,
        },
      },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  // Return empty string - let the AI intelligently place citations based on the content
  // The tool has already embedded {reference(...)} placeholders in the content
  // pruneContentReferences will extract and format any citations the AI includes
  return '';
};

// Helper function to process integration knowledge results
const processIntegrationKnowledgeResults = (
  result: {
    data: { documents: Array<{ package_name: string; filename: string }>; question: string };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool
  logger.debug(
    `🔍 [PROCESS_INTEGRATION_KNOWLEDGE] About to register citations for integration knowledge results`,
    {
      resultData: result.data,
    } as Record<string, unknown>
  );

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to process entity risk score results
const processEntityRiskScoreResults = (
  result: { data: { riskScore: number; entityName: string } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool
  logger.debug(
    `🔍 [PROCESS_ENTITY_RISK] About to register citations for entity risk score results`,
    {
      resultData: result.data,
    } as Record<string, unknown>
  );

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to register citations from tool results
const registerCitationsFromToolResult = (
  result: {
    data?: {
      citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }>;
    };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): void => {
  logger.debug(`🔍 [CITATION_REGISTRATION] Checking for citations in result:`, {
    hasData: !!result.data,
    hasCitations: !!result.data?.citations,
    citationsArray: result.data?.citations,
    citationsLength: result.data?.citations?.length,
  } as Record<string, unknown>);

  if (!result.data?.citations || !Array.isArray(result.data.citations)) {
    logger.debug(`🔍 [CITATION_REGISTRATION] No citations found or not an array`);
    return;
  }

  const basePath = assistantContext.getServerBasePath();
  logger.debug(
    `🔍 [CITATION_REGISTRATION] Processing ${result.data.citations.length} citations with basePath: ${basePath}`
  );

  result.data.citations.forEach((citation, index) => {
    logger.debug(`🔍 [CITATION_REGISTRATION] Processing citation ${index + 1}:`, {
      id: citation.id,
      type: citation.type,
      metadata: citation.metadata,
    } as Record<string, unknown>);

    // Register each citation in the store with the exact ID from the tool
    // This allows the frontend to resolve {reference(id)} placeholders
    const registeredRef = contentReferencesStore.add((p) => {
      // Create the base reference object
      const baseRef: Record<string, unknown> = {
        id: citation.id,
        type: citation.type,
        ...citation.metadata,
      };

      // Add basePath to Href types if href is relative
      if (
        citation.type === 'Href' &&
        typeof citation.metadata.href === 'string' &&
        citation.metadata.href.startsWith('/')
      ) {
        baseRef.href = `${basePath}${citation.metadata.href}`;
        logger.debug(`🔍 [CITATION_REGISTRATION] Added basePath to Href citation: ${baseRef.href}`);
      }

      return baseRef as Parameters<typeof contentReferencesStore.add>[0] extends (
        p: infer P
      ) => infer R
        ? R
        : never;
    });

    logger.debug(`🔍 [CITATION_REGISTRATION] Registered citation ${index + 1}:`, {
      registeredRef,
      citationId: citation.id,
    } as Record<string, unknown>);
  });

  logger.debug(`🔍 [CITATION_REGISTRATION] Completed processing all citations`);
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

// Helper function to check if result is knowledge base retrieval
const isKnowledgeBaseRetrievalResult = (
  step: { tool_id?: string },
  result: { data?: unknown },
  logger: Logger
): boolean => {
  const isMatch = Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.knowledge_base_retrieval' &&
      result.data &&
      typeof result.data === 'object' &&
      'query' in result.data &&
      ('content' in result.data || 'message' in result.data)
  );

  // Debug logging
  if ('tool_id' in step && step.tool_id === 'core.security.knowledge_base_retrieval') {
    logger.debug(
      `🔍 [KB_RETRIEVAL] Checking knowledge base retrieval result: toolId=${
        step.tool_id
      }, hasData=${!!result.data}, dataType=${typeof result.data}, dataKeys=[${
        result.data && typeof result.data === 'object' ? Object.keys(result.data).join(', ') : ''
      }], isMatch=${isMatch}`
    );
  }

  return isMatch;
};

// Helper function to check if result is knowledge base write
const isKnowledgeBaseWriteResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.knowledge_base_write' &&
      result.data &&
      typeof result.data === 'object' &&
      'entryId' in result.data &&
      'name' in result.data &&
      'query' in result.data
  );
};

// Helper function to check if result is security labs knowledge
const isSecurityLabsKnowledgeResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.security_labs_knowledge' &&
      result.data &&
      typeof result.data === 'object' &&
      'content' in result.data &&
      'question' in result.data
  );
};

// Helper function to check if result is integration knowledge
const isIntegrationKnowledgeResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.integration_knowledge' &&
      result.data &&
      typeof result.data === 'object' &&
      'documents' in result.data &&
      'question' in result.data
  );
};

// Helper function to check if result is entity risk score
const isEntityRiskScoreResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.entity_risk_score' &&
      result.data &&
      typeof result.data === 'object' &&
      'riskScore' in result.data
  );
};

// Helper function to handle streaming execution
const executeStreaming = async ({
  onechatServices,
  connectorId,
  conversationRounds,
  nextInput,
  request,
  abortSignal,
  contentReferencesStore,
  onNewReplacements,
  onLlmResponse,
  telemetry,
  actionTypeId,
  startTime,
  logger,
  isEnabledKnowledgeBase,
  assistantContext,
}: {
  onechatServices: OnechatPluginStart;
  connectorId: string;
  conversationRounds: ConversationRound[];
  nextInput: RoundInput;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  abortSignal: AbortSignal;
  contentReferencesStore: ContentReferencesStore;
  onNewReplacements: (newReplacements: Replacements) => void;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  startTime: number;
  logger: Logger;
  isEnabledKnowledgeBase: boolean;
  assistantContext: { getServerBasePath: () => string };
}): Promise<StreamResponseWithHeaders> => {
  logger.debug(`🚀 [AGENT_BUILDER] Starting streaming agent execution`);

  // Initialize stream factory and get response headers
  const {
    end: streamEnd,
    push,
    responseWithHeaders,
  } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

  let didEnd = false;
  const handleStreamEnd = (finalResponse: string, isError = false) => {
    if (didEnd) {
      return;
    }
    if (isError) {
      telemetry.reportEvent('invoke_assistant_error', {
        actionTypeId,
        model: 'unknown',
        errorMessage: finalResponse,
        assistantStreamingEnabled: true,
        isEnabledKnowledgeBase: false,
        errorLocation: 'handleStreamEnd',
      });
    }
    if (onLlmResponse) {
      onLlmResponse(finalResponse, {}, isError).catch(() => {});
    }
    streamEnd();
    didEnd = true;
  };

  // Set up streaming asynchronously (fire and forget)
  const pushStreamUpdate = async () => {
    try {
      let accumulatedContent = '';
      let finalRoundData: RoundCompleteEventData | null = null;
      const toolsInvoked: Record<string, number> = {};

      // Helper function to map tool names to telemetry format
      const mapToolNameToTelemetry = (toolName: string): string => {
        const toolMapping: Record<string, string> = {
          'core.security.product_documentation': 'ProductDocumentationTool',
          'core.security.knowledge_base_retrieval': 'KnowledgeBaseRetrievalTool',
          'core.security.knowledge_base_write': 'KnowledgeBaseWriteTool',
          'core.security.open_and_acknowledged_alerts': 'OpenAndAcknowledgedAlertsTool',
          'core.security.alert_counts': 'AlertCountsTool',
          'core.security.generate_esql': 'GenerateESQLTool',
          'core.security.ask_about_esql': 'AskAboutESQLTool',
          'core.security.entity_risk_score': 'EntityRiskScoreTool',
          'core.security.integration_knowledge': 'IntegrationKnowledgeTool',
          'core.security.security_labs_knowledge': 'SecurityLabsKnowledgeTool',
        };
        return toolMapping[toolName] || 'CustomTool';
      };

      // Use agents.execute with onEvent callback for fake streaming
      const agentResult = await onechatServices.agents.execute({
        request,
        agentId: 'siem-security-analyst',
        agentParams: {
          nextInput,
          conversation: conversationRounds,
          capabilities: {},
        },
        abortSignal,
        defaultConnectorId: connectorId,
        onEvent: (event: ChatAgentEvent) => {
          if (isMessageChunkEvent(event)) {
            // Stream message chunks as they arrive
            const chunk = event.data.text_chunk;
            accumulatedContent += chunk;
            if (!didEnd) {
              push({ payload: chunk, type: 'content' });
            }
          } else if (isRoundCompleteEvent(event)) {
            // Store the final round data for processing
            finalRoundData = event.data as RoundCompleteEventData;
          } else if (isToolCallEvent(event)) {
            // Track tool usage for telemetry
            const toolId = event.data.tool_id;
            const telemetryToolName = mapToolNameToTelemetry(toolId);
            toolsInvoked[telemetryToolName] = (toolsInvoked[telemetryToolName] || 0) + 1;
          }
        },
      });

      logger.debug(
        `🚀 [AGENT_BUILDER] Agent execution completed: ${JSON.stringify(agentResult, null, 2)}`
      );

      let finalContent = accumulatedContent;

      // Process final round data for content references and replacements
      if (finalRoundData) {
        // Process tool results to add content references
        const processedContent = processToolResults(
          { result: { round: (finalRoundData as RoundCompleteEventData).round } },
          contentReferencesStore,
          logger,
          assistantContext
        );

        // Use the processed content (which contains reference text) for saving to conversation
        // This allows pruneContentReferences to extract the content references properly
        finalContent = processedContent;
      } else {
        // Fallback to processing the agent result directly if no round data
        finalContent = processToolResults(
          agentResult,
          contentReferencesStore,
          logger,
          assistantContext
        );
      }

      // Collect replacements from tools that stored them in request context
      const toolReplacements = (request as ExtendedKibanaRequest).__toolReplacements;
      if (toolReplacements && typeof toolReplacements === 'object') {
        onNewReplacements(toolReplacements);
      }

      // Report telemetry
      const durationMs = Date.now() - startTime;
      telemetry.reportEvent('invoke_assistant_success', {
        assistantStreamingEnabled: true,
        actionTypeId,
        isEnabledKnowledgeBase,
        durationMs,
        toolsInvoked,
        model: 'unknown', // TODO: Get this from the response
      });

      // Apply content references pruning if needed
      let processedFinalContent = finalContent;
      if (contentReferencesStore) {
        const { prunedContent } = pruneContentReferences(finalContent, contentReferencesStore);
        processedFinalContent = prunedContent;
      }

      logger.debug(`🚀 [AGENT_BUILDER] Streaming execution completed`);

      handleStreamEnd(processedFinalContent);
    } catch (error) {
      logger.error(`Failed to execute agent: ${error.message}`);
      logger.error(`Agent execution error stack: ${error.stack}`);
      handleStreamEnd(error.message, true);
    }
  };

  // Start streaming asynchronously (fire and forget)
  pushStreamUpdate().catch((err) => {
    logger.error(`Error streaming: ${err}`);
    handleStreamEnd(err.message, true);
  });

  // Return the response with headers immediately
  return responseWithHeaders;
};

// Helper function to handle non-streaming execution
const executeNonStreaming = async ({
  onechatServices,
  connectorId,
  conversationRounds,
  nextInput,
  request,
  abortSignal,
  contentReferencesStore,
  onNewReplacements,
  onLlmResponse,
  telemetry,
  actionTypeId,
  startTime,
  logger,
  response,
  conversationId,
  isEnabledKnowledgeBase,
  assistantContext,
}: {
  onechatServices: OnechatPluginStart;
  connectorId: string;
  conversationRounds: ConversationRound[];
  nextInput: RoundInput;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  abortSignal: AbortSignal;
  contentReferencesStore: ContentReferencesStore;
  onNewReplacements: (newReplacements: Replacements) => void;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  startTime: number;
  logger: Logger;
  response: KibanaResponseFactory;
  conversationId?: string;
  isEnabledKnowledgeBase: boolean;
  assistantContext: { getServerBasePath: () => string };
}) => {
  logger.debug(`🚀 [AGENT_BUILDER] Starting non-streaming agent execution`);

  const agentResult = await onechatServices.agents.execute({
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
    `🚀 [AGENT_BUILDER] Agent execution completed: ${JSON.stringify(agentResult, null, 2)}`
  );

  // Process tool results to add content references
  const accumulatedContent = processToolResults(
    agentResult,
    contentReferencesStore,
    logger,
    assistantContext
  );

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
    onNewReplacements(toolReplacements);
  }

  // Call onLlmResponse with the final processed content
  if (onLlmResponse) {
    await onLlmResponse(finalResponse, {}, false);
  }

  // Report telemetry with required fields
  const durationMs = Date.now() - startTime;
  const toolsInvoked: Record<string, number> = {};

  telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
    actionTypeId,
    model: (request.body as { model?: string }).model,
    assistantStreamingEnabled: false,
    isEnabledKnowledgeBase,
    durationMs,
    toolsInvoked,
  });

  const contentReferences = contentReferencesStore.getStore();
  const metadata = !isEmpty(contentReferences) ? { contentReferences } : {};

  return response.ok({
    body: {
      connector_id: connectorId,
      data: finalResponse,
      trace_data: {},
      replacements: toolReplacements || {},
      status: 'ok',
      ...(conversationId ? { conversationId } : {}),
      ...(!isEmpty(metadata) ? { metadata } : {}),
    },
    headers: {
      'content-type': 'application/json',
    },
  });
};

// Helper function to process individual tool result
const processToolResult = (
  step: { type: string; tool_id?: string; results?: Array<{ type: string; data?: unknown }> },
  result: { type: string; data?: unknown },
  contentReferencesStore: ContentReferencesStore,
  logger: Logger,
  aiResponseMessage: string,
  assistantContext: { getServerBasePath: () => string }
): string => {
  logger.debug(`🔍 [PROCESS_TOOL_RESULT] Processing tool: ${step.tool_id}`, {
    stepType: step.type,
    toolId: step.tool_id,
    resultType: result.type,
    hasData: !!result.data,
  } as Record<string, unknown>);

  // Skip content references for assistant_settings tool
  if ('tool_id' in step && step.tool_id === 'core.security.assistant_settings') {
    logger.debug(`🔍 [PROCESS_TOOL_RESULT] Skipping assistant_settings tool`);
    return '';
  }

  // Handle different types of tool results
  if (isProductDocumentationResult(step, result)) {
    return processProductDocumentationResults(
      result as { data: { content: { documents: Array<{ url?: string; title?: string }> } } },
      contentReferencesStore,
      assistantContext,
      logger
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
      result as { data: { alerts: string[] } },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isKnowledgeBaseRetrievalResult(step, result, logger)) {
    return processKnowledgeBaseRetrievalResults(
      result as {
        data: {
          content?: string;
          message?: string;
          query: string;
          entries?: Array<{ id: string; name: string }>;
        };
      },
      contentReferencesStore,
      assistantContext,
      logger,
      aiResponseMessage
    );
  }

  if (isKnowledgeBaseWriteResult(step, result)) {
    return processKnowledgeBaseWriteResults(
      result as { data: { entryId?: string; name: string; query: string } },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isSecurityLabsKnowledgeResult(step, result)) {
    return processSecurityLabsKnowledgeResults(
      result as {
        data: {
          content?: string;
          message?: string;
          question: string;
          citations?: Array<{ id: string; slug: string; title: string }>;
        };
      },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isIntegrationKnowledgeResult(step, result)) {
    return processIntegrationKnowledgeResults(
      result as {
        data: { documents: Array<{ package_name: string; filename: string }>; question: string };
      },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isEntityRiskScoreResult(step, result)) {
    return processEntityRiskScoreResults(
      result as { data: { riskScore: number; entityName: string } },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  // Register any citations provided by the tool
  logger.debug(`🔍 [PROCESS_TOOL_RESULT] About to register citations for tool: ${step.tool_id}`, {
    resultData: result.data,
  } as Record<string, unknown>);

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Return empty string since citations are already inline in the content
  // The agent should not append additional citation text
  return '';
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
  contentReferencesStore: ContentReferencesStore,
  logger: Logger,
  assistantContext: { getServerBasePath: () => string }
): string => {
  const aiResponseMessage = agentResult.result.round.response.message;
  let accumulatedContent = aiResponseMessage;

  if (!agentResult.result.round.steps || agentResult.result.round.steps.length === 0) {
    return accumulatedContent;
  }

  for (const step of agentResult.result.round.steps) {
    if (step.type === 'tool_call' && 'results' in step && step.results && step.results.length > 0) {
      for (const result of step.results) {
        if (result.type === 'other' && result.data) {
          accumulatedContent += processToolResult(
            step,
            result,
            contentReferencesStore,
            logger,
            aiResponseMessage,
            assistantContext
          );
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

  try {
    // Convert existing messages to conversation rounds for onechat
    const conversationRounds = convertMessagesToConversationRounds(messages);

    // Get the onechat services
    const assistantContext = context.elasticAssistant;
    const onechatServices = assistantContext.getOnechatServices();

    // Check if knowledge base is available for telemetry
    const kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient();
    const isEnabledKnowledgeBase = await getIsKnowledgeBaseAvailable(kbDataClient);

    // Execute based on streaming preference
    if (isStream) {
      const result = await executeStreaming({
        onechatServices,
        connectorId,
        conversationRounds,
        nextInput,
        request,
        abortSignal,
        contentReferencesStore,
        onNewReplacements,
        onLlmResponse,
        telemetry,
        actionTypeId,
        startTime,
        logger,
        isEnabledKnowledgeBase,
        assistantContext,
      });
      return response.ok<StreamResponseWithHeaders['body']>(result);
    } else {
      return await executeNonStreaming({
        onechatServices,
        connectorId,
        conversationRounds,
        nextInput,
        request,
        abortSignal,
        contentReferencesStore,
        onNewReplacements,
        onLlmResponse,
        telemetry,
        actionTypeId,
        startTime,
        logger,
        response,
        conversationId,
        isEnabledKnowledgeBase,
        assistantContext,
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
