/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import type { AgentBuilderExecuteParams } from './types';
import { generateConversationTitle, convertMessagesToConversationRounds } from './helpers';
import { executeStreaming, executeNonStreaming } from './execution';
import { getIsKnowledgeBaseAvailable } from '../../routes/helpers';
import { getLlmType } from '../../routes/utils';

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

  // Check if knowledge base is available for telemetry (needed for title generation)
  const assistantContext = context.elasticAssistant;
  const kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient();
  const isEnabledKnowledgeBase = await getIsKnowledgeBaseAvailable(kbDataClient);

  // Start title generation immediately (non-blocking)
  if (conversationId && messages.length > 0) {
    generateConversationTitle({
      conversationId,
      messages,
      request,
      connectorId,
      context,
      logger,
      actionsClient,
      savedObjectsClient,
      telemetry,
      llmType: getLlmType(actionTypeId),
      responseLanguage,
      isStream,
      isEnabledKnowledgeBase,
    });
  }

  // Get the last message as the next input
  let nextInput;
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
    // De-anonymize conversation history using replacements if provided
    const conversationRounds = convertMessagesToConversationRounds(messages, replacements);

    // Get the onechat services
    const onechatServices = assistantContext.getOnechatServices();

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
