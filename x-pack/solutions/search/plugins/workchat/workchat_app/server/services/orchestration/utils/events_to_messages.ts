/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import type { ConversationEvent, ConversationMessageEvent } from '../../../../common/conversations';
import { isMessageEvent } from '../../../../common/utils/conversation';
import { isUserMessage, isAssistantMessage } from '../../../../common/utils/messages';

export const conversationEventsToMessages = (events: ConversationEvent[]): BaseMessage[] => {
  return events
    .map((event) => {
      if (isMessageEvent(event)) {
        return [messageEventToLangchainMessage(event)];
      } else {
        // not handling other types for now.
        return [];
      }
    })
    .flat();
};

export const messageEventToLangchainMessage = (event: ConversationMessageEvent): BaseMessage => {
  const message = event.message;
  if (isUserMessage(message)) {
    return new HumanMessage({ content: message.content });
  }
  if (isAssistantMessage(message)) {
    return new AIMessage({ content: message.content });
  }
  throw new Error(`unsupported message type: ${event.message.type}`);
};
