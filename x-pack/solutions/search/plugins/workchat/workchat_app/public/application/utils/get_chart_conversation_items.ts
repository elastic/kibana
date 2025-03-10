/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEvent } from '../../../common/conversations';
import { isMessageEvent } from '../../../common/utils/conversation';
import type { ChatStatus } from '../hooks/use_chat';

// TODO: maybe composition from ConversationEvent?
export interface ConversationItem {
  type: 'message';
  user: 'user' | 'assistant';
  loading: boolean;
  id: string;
  createdAt: string;
  content: string;
}

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
  const items = conversationEvents.filter(isMessageEvent).map<ConversationItem>((event, index) => {
    return {
      type: 'message',
      user: event.message.type,
      loading: false,
      id: event.id,
      createdAt: event.createdAt,
      content: event.message.content,
    };
  });

  if (chatStatus === 'loading') {
    const lastItem = items[items.length - 1];
    if (lastItem.user === 'assistant') {
      lastItem.loading = true;
    } else {
      // need to insert loading placeholder
      items.push({
        type: 'message',
        user: 'assistant',
        loading: true,
        id: '__placeholder__',
        createdAt: '',
        content: '',
      });
    }
  }

  return items;
};
