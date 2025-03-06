/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCommentList } from '@elastic/eui';
import type { ConversationEvent } from '../../../common/conversations';
import { getChartConversationItems } from '../utils/get_chart_conversation_items';
import { ChatMessage } from './chat_message';

interface ChatConversationProps {
  conversationEvents: ConversationEvent[];
}

export const ChatConversation: React.FC<ChatConversationProps> = ({ conversationEvents }) => {
  const conversationItems = useMemo(() => {
    return getChartConversationItems({ conversationEvents });
  }, [conversationEvents]);

  return (
    <EuiCommentList>
      {conversationItems.map((message) => {
        return <ChatMessage message={message} />;
      })}
    </EuiCommentList>
  );
};
