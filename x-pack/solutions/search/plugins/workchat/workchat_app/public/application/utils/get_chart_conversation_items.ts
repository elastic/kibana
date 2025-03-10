/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ConversationEvent,
  isAssistantMessage,
  isUserMessage,
  createAssistantMessage,
} from '../../../common/conversation_events';
import type { ChatStatus } from '../hooks/use_chat';

// TODO: maybe composition from ConversationEvent?
export type ConversationItem = ConversationEvent & {
  loading: boolean;
};

/**
 * Utility function preparing the data to display the chat conversation
 */
export const getChartConversationItems = ({
  conversationEvents,
  chatStatus,
}: {
  conversationEvents: ConversationEvent[];
  chatStatus: ChatStatus;
}): ConversationItem[] => {
  const items = conversationEvents
    .filter((event) => isUserMessage(event) || isAssistantMessage(event))
    .map<ConversationItem>((event, index) => {
      return {
        ...event,
        loading: false,
      };
    });

  if (chatStatus === 'loading') {
    const lastItem = items[items.length - 1];
    if (isAssistantMessage(lastItem)) {
      lastItem.loading = true;
    } else {
      // need to insert loading placeholder
      items.push({
        ...createAssistantMessage({ content: '' }),
        loading: true,
      });
    }
  }

  return items;
};
