/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComment, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/core/public';
import { isUserMessage, isAssistantMessage } from '../../../common/conversation_events';
import { ChatMessageText } from './chat_message_text';
import { ChatMessageAvatar } from './chat_message_avatar';
import type { ConversationItem } from '../utils/get_chart_conversation_items';

interface ChatConversationItemProps {
  item: ConversationItem;
  currentUser: AuthenticatedUser | undefined;
}

const getUserLabel = (item: ConversationItem) => {
  if (isUserMessage(item)) {
    return i18n.translate('xpack.workchatApp.chat.messages.userLabel', {
      defaultMessage: 'You',
    });
  }
  if (isAssistantMessage(item)) {
    return i18n.translate('xpack.workchatApp.chat.messages.assistantLabel', {
      defaultMessage: 'WorkChat',
    });
  }
  return i18n.translate('xpack.workchatApp.chat.messages.unknownLabel', {
    defaultMessage: 'Unknown',
  });
};

export const ChatConversationItem: React.FC<ChatConversationItemProps> = ({
  item,
  currentUser,
}) => {
  const userMessage = useMemo(() => {
    return isUserMessage(item);
  }, [item]);

  const messageContent = useMemo(() => {
    return isUserMessage(item) || isAssistantMessage(item) ? item.content : '';
  }, [item]);

  return (
    <EuiComment
      username={getUserLabel(item)}
      timelineAvatar={
        <ChatMessageAvatar
          role={userMessage ? 'user' : 'assistant'}
          loading={item.loading}
          currentUser={currentUser}
        />
      }
      event=""
      eventColor={userMessage ? 'primary' : 'subdued'}
      actions={<></>}
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        <ChatMessageText content={messageContent} loading={item.loading} />
      </EuiPanel>
    </EuiComment>
  );
};
