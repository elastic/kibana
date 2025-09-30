/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InterruptResumeValue, Message, Replacements } from '@kbn/elastic-assistant-common';
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
  interruptResumeValue?: InterruptResumeValue;
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

  /**
   * Modified past messages in the conversation to ensure interrups are aligned.
   * 1. Addes the interruptResumeValue to the corresponding message if needed
   * 2. Expires messages with interrupts that have not been resumed
   */

  const modifiedConversation = existingConversation.messages?.map((message, i, arr): Message => {
    if (
      params.interruptResumeValue &&
      message.metadata?.interruptValue &&
      message.metadata.interruptValue.id === params.interruptResumeValue.interruptId &&
      i === arr.length - 1
    ) {
      // The graph is being resumed and this is the message that triggered the interrupt.
      return {
        ...message,
        metadata: {
          ...message.metadata,
          interruptResumeValue: params.interruptResumeValue,
        },
      };
    }

    if (
      message.metadata?.interruptValue !== undefined &&
      message.metadata.interruptResumeValue == null &&
      (params.interruptResumeValue == null ||
        message.metadata.interruptValue.id !== params.interruptResumeValue.interruptId ||
        i !== arr.length - 1)
    ) {
      // This is an old interrupt. It should be expired
      return {
        ...message,
        metadata: {
          ...message.metadata,
          interruptValue: {
            ...message.metadata.interruptValue,
            expired: true,
          },
        },
      };
    }
    return message;
  });

  const newMessages = params.newMessages.map((newMessage) => {
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
  });

  const updatedConversation = conversationsDataClient.updateConversation({
    conversationUpdateProps: {
      ...existingConversation,
      messages: [...(modifiedConversation ?? []), ...newMessages],
    },
  });

  if (!updatedConversation) {
    params.logger.debug('Conversation was not updated with new messages');
  }

  const filtered = existingConversation.messages?.filter((message) => {
    return message.metadata?.interruptValue === undefined;
  });

  // Anonymized conversation
  const conversationLangChainMessages = getLangChainMessages(filtered ?? []);
  // Anonymized new messages
  const newLangChainMessages = params.newMessages;

  // Combine both, return the whole conversation with new messages, all anonymized
  return [...conversationLangChainMessages, ...newLangChainMessages];
};
