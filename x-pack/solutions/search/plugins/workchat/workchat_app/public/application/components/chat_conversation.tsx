/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/core/public';
import type { ConversationEvent } from '../../../common/conversation_events';
import { getChartConversationItems } from '../utils/get_chart_conversation_items';
import { ChatConversationItem } from './chat_conversation_item';
import type { ChatStatus } from '../hooks/use_chat';

interface ChatConversationProps {
  conversationEvents: ConversationEvent[];
  chatStatus: ChatStatus;
  currentUser: AuthenticatedUser | undefined;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  conversationEvents,
  chatStatus,
  currentUser,
}) => {
  const conversationItems = useMemo(() => {
    return getChartConversationItems({ conversationEvents, chatStatus });
  }, [conversationEvents, chatStatus]);

  return (
    <EuiCommentList>
      {conversationItems.map((conversationItem) => {
        return (
          <ChatConversationItem
            key={conversationItem.id}
            item={conversationItem}
            currentUser={currentUser}
          />
        );
      })}
    </EuiCommentList>
  );
};
