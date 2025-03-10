/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import {
  type ConversationEvent,
  type UserMessage,
  type AssistantMessage,
  isUserMessage,
  isAssistantMessage,
} from '../../../../common/conversation_events';

export const conversationEventsToMessages = (events: ConversationEvent[]): BaseMessage[] => {
  return events
    .map((event) => {
      if (isUserMessage(event)) {
        return [userMessageToLangchain(event)];
      }
      if (isAssistantMessage(event)) {
        return [assistantMessageToLangchain(event)];
      } else {
        // not handling other types for now.
        return [];
      }
    })
    .flat();
};

export const userMessageToLangchain = (message: UserMessage): BaseMessage => {
  return new HumanMessage({ content: message.content });
};

export const assistantMessageToLangchain = (message: AssistantMessage): BaseMessage => {
  return new AIMessage({ content: message.content });
};
