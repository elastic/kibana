/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  Replacements,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/elastic-assistant-common';
import { BaseMessage, _isMessageFieldWithRole } from '@langchain/core/messages';
import { AIAssistantConversationsDataClient } from '../../../ai_assistant_data_clients/conversations';
import { getLangChainMessages } from '../helpers';

interface Params {
  logger: Logger;
  conversationsDataClient?: AIAssistantConversationsDataClient;
  conversationId?: string;
  replacements?: Replacements;
  newMessages: BaseMessage[];
}
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
        timestamp: new Date().toISOString(),
      };
    }),
  });

  if (!updatedConversation) {
    params.logger.debug('Not updated conversation');
    return params.newMessages;
  }

  const langChainMessages = getLangChainMessages(updatedConversation.messages ?? []);

  return langChainMessages;
};
