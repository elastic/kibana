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
  productDocumentationReference,
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
  result: { data: { alerts: string[] } },
  contentReferencesStore: ContentReferencesStore
): string => {
  const alerts = result.data.alerts || [];

  if (alerts.length === 0) {
    return '';
  }

  // Create a single citation that links to the alerts page
  // The SecurityAlertsPageContentReference will show open and acknowledged alerts
  // which should include the alerts that were queried
  const contentReference = contentReferencesStore.add((p) => ({
    type: 'SecurityAlertsPage' as const,
    id: p.id,
  }));

  const citation = `{reference(${contentReference?.id || ''})}`;
  return ` ${citation}`;
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
  logger: Logger,
  aiResponseMessage: string
): string => {
  // Parse the enriched documents from the tool result
  let enrichedDocs: Array<{
    id: string;
    pageContent: string;
    metadata: { name: string; citation: string };
  }> = [];

  if (result.data.content) {
    try {
      enrichedDocs = JSON.parse(result.data.content);
    } catch (error) {
      logger.error(`🔍 [KB_MATCHING] Failed to parse tool result content: ${error.message}`);
      return '';
    }
  }

  if (enrichedDocs.length === 0) {
    return '';
  }

  // Pre-register content references for all entries so they can be found by pruneContentReferences
  if (result.data.entries && result.data.entries.length > 0) {
    result.data.entries.forEach((entry) => {
      const placeholderId = `kb-${entry.id}`;
      contentReferencesStore.add((p) => ({
        type: 'KnowledgeBaseEntry' as const,
        id: placeholderId,
        knowledgeBaseEntryName: entry.name,
        knowledgeBaseEntryId: entry.id,
      }));
    });
  }

  // Find which documents the AI actually used (conservative matching)
  const usedDocuments = enrichedDocs.filter((doc) => {
    // 1. Extract clean content from document (remove citation placeholder)
    const docContent = doc.pageContent.replace(/\s*\{reference\(.*?\)\}\s*$/, '').trim();

    // 2. Check if AI response contains the document content (exact substring match)
    if (aiResponseMessage.includes(docContent)) {
      return true;
    }

    // 3. For very short content, also check if entry name matches query context
    // This handles cases like "ice cream" where the AI might say "Your favorite dessert is ice cream"
    const entryNameWords = doc.metadata.name.toLowerCase().split(/\s+/);
    const responseWords = aiResponseMessage.toLowerCase().split(/\s+/);
    if (entryNameWords.every((word) => responseWords.includes(word))) {
      return true;
    }

    return false;
  });

  // Append citations for matched documents
  const citations = usedDocuments.map((doc) => doc.metadata.citation).join(' ');

  return citations ? ` ${citations}` : '';
};

// Helper function to process knowledge base write results
const processKnowledgeBaseWriteResults = (
  result: { data: { entryId?: string; name: string; query: string } },
  contentReferencesStore: ContentReferencesStore
): string => {
  const { entryId, name } = result.data;

  if (!entryId) {
    return '';
  }

  // Create a content reference to the specific knowledge base entry that was created
  const reference = contentReferencesStore.add((p) => ({
    type: 'KnowledgeBaseEntry' as const,
    id: p.id,
    knowledgeBaseEntryName: name,
    knowledgeBaseEntryId: entryId,
  }));
  const citation = contentReferenceBlock(reference);
  return ` ${citation}`;
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
  contentReferencesStore: ContentReferencesStore
): string => {
  // Register all citations provided by the tool in the contentReferencesStore
  // This makes them available for pruneContentReferences to find and format
  if (result.data.citations && result.data.citations.length > 0) {
    result.data.citations.forEach((citation) => {
      contentReferencesStore.add((p) => ({
        type: 'Href' as const,
        id: citation.id,
        href: `https://www.elastic.co/security-labs/${citation.slug}`,
        title: `Security Labs: ${citation.title}`,
      }));
    });
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
  assistantContext: { getServerBasePath: () => string }
): string => {
  // Create references for each integration document
  const citations = result.data.documents.map((doc) => {
    const basePath = assistantContext.getServerBasePath();
    const reference = contentReferencesStore.add((p) => ({
      type: 'Href' as const,
      id: p.id,
      href: `${basePath}/app/integrations/detail/${doc.package_name}`,
      title: `${doc.package_name} integration (${doc.filename})`,
    }));
    return contentReferenceBlock(reference);
  });
  return citations.length > 0 ? ` ${citations.join(' ')}` : '';
};

// Helper function to process entity risk score results
const processEntityRiskScoreResults = (
  result: { data: { riskScore: number; entityName: string } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string }
): string => {
  // Create a reference to the entity details page
  const basePath = assistantContext.getServerBasePath();
  const reference = contentReferencesStore.add((p) => ({
    type: 'Href' as const,
    id: p.id,
    href: `${basePath}/app/security/entity_analytics/hosts/${result.data.entityName}`,
    title: `Entity Risk Score for ${result.data.entityName}`,
  }));
  const citation = contentReferenceBlock(reference);
  return ` ${citation}`;
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
          'core.security.security_labs_knowledge_base': 'SecurityLabsKnowledgeBaseTool',
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
    return processAlertResults(result as { data: { alerts: string[] } }, contentReferencesStore);
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
      logger,
      aiResponseMessage
    );
  }

  if (isKnowledgeBaseWriteResult(step, result)) {
    return processKnowledgeBaseWriteResults(
      result as { data: { entryId?: string; name: string; query: string } },
      contentReferencesStore
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
      contentReferencesStore
    );
  }

  if (isIntegrationKnowledgeResult(step, result)) {
    return processIntegrationKnowledgeResults(
      result as {
        data: { documents: Array<{ package_name: string; filename: string }>; question: string };
      },
      contentReferencesStore,
      assistantContext
    );
  }

  if (isEntityRiskScoreResult(step, result)) {
    return processEntityRiskScoreResults(
      result as { data: { riskScore: number; entityName: string } },
      contentReferencesStore,
      assistantContext
    );
  }

  // Only create content references for known tools that provide meaningful references
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
