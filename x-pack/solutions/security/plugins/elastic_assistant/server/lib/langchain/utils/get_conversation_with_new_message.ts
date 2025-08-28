/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Replacements, TypedInterruptResumeValue } from '@kbn/elastic-assistant-common';
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
  threadId: string;
  resumeValue?: TypedInterruptResumeValue 
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
    existingConversation: {
      ...existingConversation,
      messages: existingConversation.messages?.map((message) => {
        if(message.metadata?.typedInterrupt && message.metadata?.typedInterrupt.expired !== true && message.metadata.typedInterrupt.threadId === params.threadId && params.resumeValue) {
          return {
            ...message,
            metadata:{
              ...message.metadata,
              typedInterruptResumeValue: params.resumeValue
            }
          }
        }

        if(message.metadata?.typedInterrupt !== undefined && message.metadata.typedInterrupt.threadId !== params.threadId &&  message.metadata.typedInterruptResumeValue === undefined){
          // This is an old interrupt
          return {
            ...message,
            metadata: {
              ...message.metadata,
              typedInterrupt: {
                ...message.metadata.typedInterrupt,
                expired: true
              }
            }
          }
        }
        return message
      })
    },
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
    params.logger.debug('Conversation was not updated with new messages');
  }

  const filtered = existingConversation.messages?.filter((message) => {
    return message.metadata?.typedInterrupt === undefined;
  });

  // Anonymized conversation
  const conversationLangChainMessages = getLangChainMessages(filtered ?? []);
  // Anonymized new messages
  const newLangChainMessages = params.newMessages;

  // Combine both, return the whole conversation with new messages, all anonymized
  return [...conversationLangChainMessages, ...newLangChainMessages];
};
