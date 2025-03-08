/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/core/public';
import type { ConversationEvent } from '../../../common/conversations';
import { getChartConversationItems } from '../utils/get_chart_conversation_items';
import { ChatMessage } from './chat_message';
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
      {conversationItems.map((message) => {
        return <ChatMessage message={message} currentUser={currentUser} />;
      })}
    </EuiCommentList>
  );
};
