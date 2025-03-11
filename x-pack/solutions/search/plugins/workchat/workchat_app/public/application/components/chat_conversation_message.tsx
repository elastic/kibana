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
import { ChatMessageText } from './chat_message_text';
import { ChatMessageAvatar } from './chat_message_avatar';
import {
  type UserMessageConversationItem,
  type AssistantMessageConversationItem,
  isUserMessageItem,
} from '../utils/conversation_items';

type UserOrAssistantMessageItem = UserMessageConversationItem | AssistantMessageConversationItem;

interface ChatConversationMessageProps {
  message: UserOrAssistantMessageItem;
  currentUser: AuthenticatedUser | undefined;
}

const getUserLabel = (item: UserOrAssistantMessageItem) => {
  if (isUserMessageItem(item)) {
    return i18n.translate('xpack.workchatApp.chat.messages.userLabel', {
      defaultMessage: 'You',
    });
  }
  return i18n.translate('xpack.workchatApp.chat.messages.assistantLabel', {
    defaultMessage: 'WorkChat',
  });
};

export const ChatConversationMessage: React.FC<ChatConversationMessageProps> = ({
  message,
  currentUser,
}) => {
  const userMessage = useMemo(() => {
    return isUserMessageItem(message);
  }, [message]);

  const messageContent = useMemo(() => {
    return message.message.content;
  }, [message]);

  return (
    <EuiComment
      username={getUserLabel(message)}
      timelineAvatar={
        <ChatMessageAvatar
          eventType={userMessage ? 'user' : 'assistant'}
          loading={message.loading}
          currentUser={currentUser}
        />
      }
      event=""
      eventColor={userMessage ? 'primary' : 'subdued'}
      actions={<></>}
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        <ChatMessageText content={messageContent} loading={message.loading} />
      </EuiPanel>
    </EuiComment>
  );
};
