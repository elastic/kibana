/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComment, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChatMessageText } from './chat_message_text';
import { ChatMessageAvatar } from './chat_message_avatar';
import type { ConversationItem } from '../utils/get_chart_conversation_items';

interface ChatMessageProps {
  message: ConversationItem;
}

const getUserLabel = (message: ConversationItem) => {
  if (message.user === 'user') {
    return i18n.translate('xpack.workchatApp.chat.messages.userLabel', {
      defaultMessage: 'You',
    });
  }
  return i18n.translate('xpack.workchatApp.chat.messages.assistantLabel', {
    defaultMessage: 'WorkChat',
  });
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUserMessage = useMemo(() => {
    return message.user === 'user';
  }, [message]);

  return (
    <EuiComment
      username={getUserLabel(message)}
      timelineAvatar={<ChatMessageAvatar role={message.user} loading={message.loading} />}
      event=""
      eventColor={isUserMessage ? 'primary' : 'subdued'}
      actions={<></>}
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        <ChatMessageText content={message.content} loading={message.loading} />
      </EuiPanel>
    </EuiComment>
  );
};
