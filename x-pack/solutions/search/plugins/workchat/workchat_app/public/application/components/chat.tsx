/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { css } from '@emotion/css';
import { EuiFlexItem, EuiPanel, useEuiTheme, euiScrollBarStyles } from '@elastic/eui';
import { ConversationCreatedEventPayload } from '../../../common/chat_events';
import { useConversation } from '../hooks/use_conversation';
import { useStickToBottom } from '../hooks/use_stick_to_bottom';
import { ChatInputForm } from './chat_input_form';
import { ChatConversation } from './chat_conversation';

interface ChatProps {
  conversationId: string | undefined;
  onConversationUpdate: (changes: ConversationCreatedEventPayload) => void;
}

const fullHeightClassName = css`
  height: 100%;
`;

const panelClassName = css`
  min-height: 100%;
`;

const scrollContainerClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

export const Chat: React.FC<ChatProps> = ({ conversationId, onConversationUpdate }) => {
  const { sendMessage, conversationEvents } = useConversation({
    conversationId,
    agentId: 'default',
    onConversationUpdate,
  });

  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { setStickToBottom } = useStickToBottom({
    defaultState: true,
    scrollContainer: scrollContainerRef.current,
  });

  useEffect(() => {
    setStickToBottom(true);
  }, [conversationId, setStickToBottom]);

  const onSubmit = useCallback(
    (message: string) => {
      setStickToBottom(true);
      sendMessage(message);
    },
    [sendMessage, setStickToBottom]
  );

  return (
    <>
      <EuiFlexItem grow className={scrollContainerClassName(scrollBarStyles)}>
        <div ref={scrollContainerRef} className={fullHeightClassName}>
          <EuiPanel hasBorder={false} hasShadow={false} className={panelClassName}>
            <ChatConversation conversationEvents={conversationEvents} />
          </EuiPanel>
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChatInputForm disabled={false} loading={false} onSubmit={onSubmit} />
      </EuiFlexItem>
    </>
  );
};
