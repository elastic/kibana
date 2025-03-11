/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { EuiComment, EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ToolCall } from '../../../common/conversation_events';
import type { ToolCallConversationItem } from '../utils/conversation_items';
import { ChatMessageAvatar } from './chat_message_avatar';

interface ChatConversationMessageProps {
  toolCall: ToolCallConversationItem;
}

const assistantLabel = i18n.translate('xpack.workchatApp.chat.messages.assistantLabel', {
  defaultMessage: 'WorkChat',
});

const bold = css`
  font-weight: bold;
`;

const italic = css`
  font-style: italic;
`;

export const ChatConversationToolCall: React.FC<ChatConversationMessageProps> = ({ toolCall }) => {
  /*
        {toolCall.toolResult ? (
        <EuiPanel hasShadow={false} paddingSize="s" color="transparent">
          {toolCall.toolResult}
        </EuiPanel>
      ) : undefined}
   */

  return (
    <EuiComment
      username={assistantLabel}
      timelineAvatar={
        <ChatMessageAvatar eventType="tool" loading={toolCall.loading} currentUser={undefined} />
      }
      event={<ToolCallText toolCall={toolCall.toolCall} complete={Boolean(toolCall.toolResult)} />}
      eventColor="transparent"
      actions={<></>}
    />
  );
};

const ToolCallText: React.FC<{ toolCall: ToolCall; complete: boolean }> = ({
  toolCall,
  complete,
}) => {
  const toolNode = (
    <EuiTextColor className={bold} color="success">
      {toolCall.toolName}
    </EuiTextColor>
  );
  const argsNode = (
    <EuiTextColor className={italic} color="accent">
      {JSON.stringify(toolCall.args)}
    </EuiTextColor>
  );

  if (complete) {
    return (
      <EuiText size="s">
        <FormattedMessage
          id="xpack.workchatApp.chat.toolCall.calledToolLabel"
          defaultMessage="called tool {tool} with arguments {args}"
          values={{
            tool: toolNode,
            args: argsNode,
          }}
        />
      </EuiText>
    );
  } else {
    return (
      <EuiText size="s">
        <FormattedMessage
          id="xpack.workchatApp.chat.toolCall.callingToolLabel"
          defaultMessage="is calling tool {tool} with arguments {args}"
          values={{
            tool: toolNode,
            args: argsNode,
          }}
        />
      </EuiText>
    );
  }
};
