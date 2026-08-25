/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import type { BaseMessage } from '@langchain/core/messages';
import { _isMessageFieldWithRole } from '@langchain/core/messages';
import type { AIAssistantConversationsDataClient } from '../../../ai_assistant_data_clients/conversations';
import { getLangChainMessages } from '../helpers';

interface Params {
  logger: Logger;
  conversationsDataClient?: AIAssistantConversationsDataClient;
  conversationId?: string;
  replacements?: Replacements;
  newMessages: BaseMessage[];
}

/**
 * Fetches a conversation by its ID and appends new messages to it.
 * If the conversation does not exist, it returns the new messages as is.
 * If the conversation exists, it appends the new messages to the existing conversation.
 * The returned messages are anonymized.
 */
export const getConversationWithNewMessage = async (params: Params) => {
  const { conversationsDataClient, conversationId } = params;
  if (!conversationsDataClient || !conversationId) {
    params.logger.debug(
      'No conversationsDataClient or conversationId provided, returning empty messages array'
    );
    return params.newMessages;
  }
  const existingConversation = await conversationsDataClient.getConversation({
    id: conversationId,
  });
  if (!existingConversation) {
    params.logger.debug(`No conversation found for id: ${conversationId}`);
    return params.newMessages;
  }
  const updatedConversation = await conversationsDataClient.appendConversationMessages({
    existingConversation,
    messages: params.newMessages.map((newMessage) => {
      const role = _isMessageFieldWithRole(newMessage)
        ? (newMessage.role as 'assistant' | 'user')
        : 'user';
      return {
        content: replaceAnonymizedValuesWithOriginalValues({
          messageContent: newMessage.text,
          replacements: params.replacements,
        }),
        role,
        user:
          existingConversation.createdBy ??
          (existingConversation.users?.length === 1
            ? // no createdBy indicates legacy conversation, assign the sole user in the user list
              existingConversation.users?.[0]
            : undefined),
        timestamp: new Date().toISOString(),
      };
    }),
  });

  if (!updatedConversation) {
    params.logger.debug('Conversation was not updated with new messages');
  }

  // Anonymized conversation
  const conversationLangChainMessages = getLangChainMessages(existingConversation.messages ?? []);
  // Anonymized new messages
  const newLangChainMessages = params.newMessages;

  // Combine both, return the whole conversation with new messages, all anonymized
  return [...conversationLangChainMessages, ...newLangChainMessages];
};
