/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComment } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ToolCallConversationItem } from '../../utils/conversation_items';
import { useIntegrationToolView } from '../../hooks/use_integration_tool_view';
import { ChatMessageAvatar } from './chat_message_avatar';

interface ChatConversationMessageProps {
  toolCall: ToolCallConversationItem;
}

const assistantLabel = i18n.translate('xpack.workchatApp.chat.messages.assistantLabel', {
  defaultMessage: 'WorkChat',
});

export const ChatConversationToolCall: React.FC<ChatConversationMessageProps> = ({ toolCall }) => {
  const ToolView = useIntegrationToolView(toolCall.toolCall.toolName);

  return (
    <EuiComment
      username={assistantLabel}
      timelineAvatar={
        <ChatMessageAvatar eventType="tool" loading={toolCall.loading} currentUser={undefined} />
      }
      event={<ToolView toolCall={toolCall.toolCall} toolResult={toolCall.toolResult} />}
      eventColor="transparent"
      actions={<></>}
    />
  );
};
