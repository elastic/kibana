/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEvent } from '../../../common/conversations';
import { isMessageEvent } from '../../../common/utils/conversation';

export interface ConversationItem {
  type: 'message';
  user: 'user' | 'assistant';
  loading: false;
  id: string;
  createdAt: string;
  content: string;
}

/**
 * Utility function preparing the data to display the chat conversation
 */
export const getChartConversationItems = ({
  conversationEvents,
}: {
  conversationEvents: ConversationEvent[];
}): ConversationItem[] => {
  return conversationEvents.filter(isMessageEvent).map<ConversationItem>((event) => {
    // TODO: maybe composition from ConversationEvent?
    return {
      type: 'message',
      user: event.message.type,
      loading: false,
      id: event.id,
      createdAt: event.createdAt,
      content: event.message.content,
    };
  });
};
