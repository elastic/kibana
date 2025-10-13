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
  replaceAnonymizedValuesWithOriginalValues,
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

// Symbol for passing anonymization fields through the request object
export const ANONYMIZATION_FIELDS_SYMBOL = Symbol('anonymizationFields');
// Symbol for collecting replacements from onechat tools
export const REPLACEMENTS_SYMBOL = Symbol('replacements');
// Symbol for passing tool parameters through the request object
export const TOOL_PARAMS_SYMBOL = Symbol('toolParams');

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
  const startTime = Date.now(); // Track start time for telemetry

  const assistantContext = await context.elasticAssistant;
  const onechatAgents = assistantContext.getOnechatAgents();

  // Start title generation immediately (non-blocking)
  let titleGenerationPromise: Promise<void> | undefined;
  if (conversationId && messages.length > 0) {
    titleGenerationPromise = (async () => {
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

  // Get data clients for anonymization and conversation handling
  const anonymizationFieldsDataClient =
    await assistantContext.getAIAssistantAnonymizationFieldsDataClient();

  // Fetch anonymization fields exactly like langChainExecute does
  let anonymizationFields: Array<{
    id: string;
    field: string;
    allowed: boolean;
    anonymized: boolean;
    timestamp: string;
    createdAt: string;
    updatedAt?: string;
    namespace: string;
  }> = [];

  if (anonymizationFieldsDataClient) {
    try {
      const anonymizationFieldsRes = await anonymizationFieldsDataClient.findDocuments<
        import('../ai_assistant_data_clients/anonymization_fields/types').EsAnonymizationFieldsSchema
      >({
        perPage: 1000,
        page: 1,
      });

      if (anonymizationFieldsRes?.data) {
        // Transform exactly like langChainExecute does
        const { transformESSearchToAnonymizationFields } = await import(
          '../ai_assistant_data_clients/anonymization_fields/helpers'
        );
        const transformedFields = transformESSearchToAnonymizationFields(
          anonymizationFieldsRes.data
        );

        // Map to the expected format
        anonymizationFields = transformedFields.map((field) => ({
          id: field.id,
          field: field.field,
          allowed: field.allowed ?? false,
          anonymized: field.anonymized ?? false,
          timestamp: field.timestamp ?? new Date().toISOString(),
          createdAt: field.createdAt ?? new Date().toISOString(),
          updatedAt: field.updatedAt,
          namespace: field.namespace ?? 'default',
        }));
      }
    } catch (error) {}
  }

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

    // Attach anonymization fields, existing replacements, and tool parameters to the request in a way that doesn't break user context
    // We'll use symbols to avoid conflicts with existing request properties
    (request as any)[ANONYMIZATION_FIELDS_SYMBOL] = anonymizationFields;
    (request as any)[REPLACEMENTS_SYMBOL] = replacements;

    // Pass tool parameters exactly like langChainExecute does
    const toolParams = {
      alertsIndexPattern:
        (request.body as any).alertsIndexPattern || '.alerts-security.alerts-default',
      size: (request.body as any).size || 10,
    };
    (request as any)[TOOL_PARAMS_SYMBOL] = toolParams;

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

    // Collect any new replacements that were created by the onechat tools
    const newReplacements = (request as any)[REPLACEMENTS_SYMBOL] ?? {};

    // If there are new replacements, call onNewReplacements to update the conversation
    if (Object.keys(newReplacements).length > 0) {
      await onNewReplacements(newReplacements);
    }

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
        if (step.type === 'tool_call' && step.results && step.results.length > 0) {
          for (const result of step.results) {
            if (result.type === 'other' && result.data) {
              // Handle different types of tool results
              if (
                step.tool_id === 'core.security.product_documentation' &&
                result.data.content?.documents
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
              } else if (step.tool_id === 'core.security.alert_counts' && result.data.result) {
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
                step.tool_id === 'core.security.open_and_acknowledged_alerts' &&
                result.data.alerts
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
              } else {
                // Generic tool result handling
                const reference = contentReferencesStore.add((p) => ({
                  type: 'Href' as const,
                  id: p.id,
                  href: `#tool-result-${step.tool_id || 'unknown_tool'}`,
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

    // Apply anonymization replacements if needed
    // Use the new replacements that were collected from onechat tools
    if (newReplacements && Object.keys(newReplacements).length > 0) {
      finalResponse = replaceAnonymizedValuesWithOriginalValues({
        messageContent: finalResponse,
        replacements: newReplacements,
      });
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
    const toolsInvoked = {
      // TODO: Get actual tool invocation counts from onechat agent execution
      // This would require onechat to expose tool usage statistics
    };

    telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
      actionTypeId,
      model: (request.body as any).model,
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
          replacements: newReplacements, // Use the new replacements from onechat tools
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
