/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoundCompleteEventData } from '@kbn/onechat-common';
import { isMessageChunkEvent, isRoundCompleteEvent, isToolCallEvent } from '@kbn/onechat-common';
import { streamFactory } from '@kbn/ml-response-stream/server';
import type { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import { isEmpty } from 'lodash';
import { pruneContentReferences } from '@kbn/elastic-assistant-common';
import { INVOKE_ASSISTANT_SUCCESS_EVENT } from '../telemetry/event_based_telemetry';
import type {
  StreamingExecutionParams,
  NonStreamingExecutionParams,
  ExtendedKibanaRequest,
} from './types';
import { processToolResults } from './processors';

// Helper function to handle streaming execution
export const executeStreaming = async ({
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
}: StreamingExecutionParams): Promise<StreamResponseWithHeaders> => {
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
          'core.security.ask_about_esql': 'AskAboutESQLTool',
          'core.security.entity_risk_score': 'EntityRiskScoreTool',
          'core.security.integration_knowledge': 'IntegrationKnowledgeTool',
          'core.security.security_labs_knowledge': 'SecurityLabsKnowledgeBaseTool',
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
        onEvent: (event) => {
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
        const processedContent = processToolResults({
          agentResult: { result: { round: (finalRoundData as RoundCompleteEventData).round } },
          contentReferencesStore,
          logger,
          assistantContext,
        });

        // Use the processed content (which contains reference text) for saving to conversation
        // This allows pruneContentReferences to extract the content references properly
        finalContent = processedContent;
      } else {
        // Fallback to processing the agent result directly if no round data
        finalContent = processToolResults({
          agentResult,
          contentReferencesStore,
          logger,
          assistantContext,
        });
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
export const executeNonStreaming = async ({
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
}: NonStreamingExecutionParams) => {
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
  const accumulatedContent = processToolResults({
    agentResult,
    contentReferencesStore,
    logger,
    assistantContext,
  });

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
