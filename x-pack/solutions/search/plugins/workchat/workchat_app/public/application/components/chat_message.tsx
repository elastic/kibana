/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComment, EuiPanel, EuiAvatar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Message } from '../../../common/messages';
import { ChatMessageText } from './chat_message_text';

interface ChatMessageProps {
  message: Message;
}

const getUserLabel = (message: Message) => {
  if (message.type === 'user') {
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
    return message.type === 'user';
  }, [message]);

  return (
    <EuiComment
      username={getUserLabel(message)}
      timelineAvatar={
        isUserMessage ? (
          <EuiAvatar name="User" initials="Y" color="subdued" />
        ) : (
          <EuiAvatar iconType="agentApp" name="WorkChat" color="subdued" />
        )
      }
      event=""
      eventColor={isUserMessage ? 'primary' : 'subdued'}
      actions={<></>}
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        <ChatMessageText content={message.content} loading={false} />
      </EuiPanel>
    </EuiComment>
  );
};
