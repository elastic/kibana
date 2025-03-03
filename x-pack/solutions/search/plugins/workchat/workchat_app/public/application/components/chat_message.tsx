/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComment, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Message } from '../../../common/messages';

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
  return (
    <EuiComment
      username={getUserLabel(message)}
      event=""
      eventColor={message.type === 'user' ? 'primary' : 'subdued'}
      actions={<></>}
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        {message.content}
      </EuiPanel>
    </EuiComment>
  );
};
