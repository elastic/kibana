/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiCommentList, EuiPanel } from '@elastic/eui';
import { useConversation } from '../hooks/use_conversation';
import { ChatInputForm } from './chat_input_form';
import { ChatMessage } from './chat_message';

interface ChatProps {
  conversationId?: string;
}

export const Chat: React.FC<ChatProps> = ({ conversationId }) => {
  const { send, messages } = useConversation({
    conversationId,
    agentId: 'default',
  });

  const onSubmit = useCallback(
    (message: string) => {
      send(message);
    },
    [send]
  );

  return (
    <>
      <EuiFlexItem grow css={{ overflow: 'auto' }}>
        <EuiPanel hasBorder={false} hasShadow={false}>
          <EuiCommentList>
            {messages.map((message) => {
              return <ChatMessage message={message} />;
            })}
          </EuiCommentList>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChatInputForm disabled={false} loading={false} onSubmit={onSubmit} />
      </EuiFlexItem>
    </>
  );
};
