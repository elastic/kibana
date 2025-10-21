/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ConversationRound } from '@kbn/onechat-common';
import type { Message, Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import type { AwaitedProperties } from '@kbn/utility-types';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticAssistantRequestHandlerContext } from '../../types';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../telemetry/event_based_telemetry';
import { getPrompt, promptDictionary } from '../prompt';
import { promptGroupId } from '../prompt/local_prompt_object';
import { getActionTypeId } from '../../routes/utils';

// Helper function to generate conversation title
export const generateConversationTitle = async ({
  actionsClient,
  connectorId,
  context,
  conversationId,
  isEnabledKnowledgeBase,
  isStream,
  llmType,
  logger,
  messages,
  request,
  responseLanguage,
  savedObjectsClient,
  telemetry,
}: {
  connectorId: string;
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >;
  actionsClient: ActionsClient;
  conversationId: string;
  isEnabledKnowledgeBase?: boolean;
  isStream?: boolean;
  llmType?: string;
  logger: Logger;
  messages: Array<Pick<Message, 'content' | 'role'>>;
  request: KibanaRequest;
  responseLanguage?: string;
  savedObjectsClient: SavedObjectsClientContract;
  telemetry: AnalyticsServiceSetup;
}) => {
  if (!conversationId || messages.length === 0) return;

  try {
    const assistantContext = context.elasticAssistant;
    const onechatServices = assistantContext.getOnechatServices();
    const conversationsDataClient = await assistantContext.getAIAssistantConversationsDataClient();

    if (!conversationsDataClient) return;

    // Get the current conversation to check if it already has a title
    let conversation;
    try {
      conversation = await conversationsDataClient.getConversation({
        id: conversationId,
      });
    } catch (error) {
      logger.debug(
        `Failed to get conversation ${conversationId}: ${error.message}, skipping title generation`
      );
      return;
    }

    if (!conversation) {
      logger.debug('No conversation found, skipping chat title generation');
      return;
    }
    // Check if conversation already has a meaningful title
    // Only generate title if the current title is empty (new conversation)
    if (conversation.title && conversation.title.trim() !== '') {
      return;
    }

    logger.debug('Generating new conversation title...');

    // Get the model-specific prompt for title generation
    const titlePrompt = await getPrompt({
      actionsClient,
      connectorId,
      promptId: promptDictionary.chatTitle,
      promptGroupId: promptGroupId.aiAssistant,
      provider: llmType,
      savedObjectsClient,
    });

    const titleResult = await onechatServices.agents.execute({
      request,
      agentId: 'siem-security-analyst',
      agentParams: {
        nextInput: { message: `${titlePrompt}\nPlease create the title in ${responseLanguage}` },
        conversation: [],
        capabilities: {},
      },
      abortSignal: new AbortController().signal,
      defaultConnectorId: connectorId,
    });

    const generatedTitle = titleResult.result.round.response.message;
    logger.debug(`Generated title: "${generatedTitle}"`);

    await conversationsDataClient.updateConversation({
      conversationUpdateProps: {
        id: conversationId,
        title: generatedTitle.slice(0, 60),
      },
    });

    logger.debug('Conversation title updated successfully');
  } catch (error) {
    // Report telemetry event for error
    telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
      actionTypeId: getActionTypeId(llmType ?? 'openai'),
      model: llmType,
      errorMessage: error.message ?? error.toString(),
      assistantStreamingEnabled: isStream ?? true,
      isEnabledKnowledgeBase: isEnabledKnowledgeBase ?? false,
      errorLocation: 'generateConversationTitle',
    });

    // Update conversation with error title
    try {
      const assistantContext = context.elasticAssistant;
      const conversationsDataClient =
        await assistantContext.getAIAssistantConversationsDataClient();
      if (conversationsDataClient) {
        await conversationsDataClient.updateConversation({
          conversationUpdateProps: {
            id: conversationId,
            title: (error.name ?? error.message ?? error.toString()).slice(0, 60),
          },
        });
      }
    } catch (updateError) {
      logger.error(`Failed to update conversation with error title: ${updateError.message}`);
    }

    logger.error(`Failed to generate chat title: ${error.message}`);
  }
};

// Helper function to convert messages to conversation rounds
export const convertMessagesToConversationRounds = (
  messages: Array<Pick<Message, 'content' | 'role'>>,
  replacements?: Replacements
): ConversationRound[] => {
  const conversationRounds: ConversationRound[] = [];
  for (let i = 0; i < messages.length - 1; i += 2) {
    const userMessage = messages[i];
    const assistantMessage = messages[i + 1];

    if (userMessage.role === 'user' && assistantMessage.role === 'assistant') {
      // De-anonymize message content using replacements if provided
      const deAnonymizedUserContent = replacements
        ? replaceAnonymizedValuesWithOriginalValues({
            messageContent: userMessage.content,
            replacements,
          })
        : userMessage.content;

      const deAnonymizedAssistantContent = replacements
        ? replaceAnonymizedValuesWithOriginalValues({
            messageContent: assistantMessage.content,
            replacements,
          })
        : assistantMessage.content;

      conversationRounds.push({
        id: `round-${i}`,
        input: { message: deAnonymizedUserContent },
        steps: [],
        response: { message: deAnonymizedAssistantContent },
      });
    }
  }
  return conversationRounds;
};

// Helper function to check if result is product documentation
export const isProductDocumentationResult = (
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
export const isAlertCountsResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  return Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.alert_counts' &&
      result.data &&
      typeof result.data === 'object' &&
      'result' in result.data
  );
};

// Helper function to check if result is open and acknowledged alerts
export const isOpenAndAcknowledgedAlertsResult = (
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
export const isKnowledgeBaseRetrievalResult = (
  step: { tool_id?: string },
  result: { data?: unknown }
): boolean => {
  const isMatch = Boolean(
    'tool_id' in step &&
      step.tool_id === 'core.security.knowledge_base_retrieval' &&
      result.data &&
      typeof result.data === 'object' &&
      'query' in result.data &&
      ('content' in result.data || 'message' in result.data)
  );

  return isMatch;
};

// Helper function to check if result is knowledge base write
export const isKnowledgeBaseWriteResult = (
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
export const isSecurityLabsKnowledgeResult = (
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
export const isIntegrationKnowledgeResult = (
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
export const isEntityRiskScoreResult = (
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
