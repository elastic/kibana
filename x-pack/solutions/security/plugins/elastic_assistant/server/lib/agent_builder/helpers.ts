/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ConversationRound } from '@kbn/onechat-common';
import type { Message } from '@kbn/elastic-assistant-common';
import type { ElasticAssistantRequestHandlerContext } from '../../types';

// Helper function to generate conversation title
export const generateConversationTitle = async (
  conversationId: string,
  messages: Array<Pick<Message, 'content' | 'role'>>,
  request: KibanaRequest,
  connectorId: string,
  context: Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>,
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
export const convertMessagesToConversationRounds = (
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
