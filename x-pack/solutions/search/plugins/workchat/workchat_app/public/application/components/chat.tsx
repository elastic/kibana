/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import {
  EuiFlexItem,
  EuiCommentList,
  EuiPanel,
  useEuiTheme,
  euiScrollBarStyles,
} from '@elastic/eui';
import { ConversationCreatedEventPayload } from '../../../common/chat_events';
import { useConversation } from '../hooks/use_conversation';
import { ChatInputForm } from './chat_input_form';
import { ChatMessage } from './chat_message';

interface ChatProps {
  conversationId: string | undefined;
  onConversationUpdate: (changes: ConversationCreatedEventPayload) => void;
}

const fullHeightClassName = css`
  height: 100%;
`;

const scrollContainerClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

const isAtBottom = (parent: HTMLElement) =>
  parent.scrollTop + parent.clientHeight >= parent.scrollHeight;

export const Chat: React.FC<ChatProps> = ({ conversationId, onConversationUpdate }) => {
  const { send, messages } = useConversation({
    conversationId,
    agentId: 'default',
    onConversationUpdate,
  });

  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    const parent = scrollContainerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    const onScroll = () => {
      setStickToBottom(isAtBottom(parent!));
    };

    parent.addEventListener('scroll', onScroll);

    return () => {
      parent.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollContainerRef.current]);

  useEffect(() => {
    const parent = scrollContainerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    if (stickToBottom) {
      parent.scrollTop = parent.scrollHeight;
    }
  });

  const onSubmit = useCallback(
    (message: string) => {
      setStickToBottom(true);
      send(message);
    },
    [send]
  );

  return (
    <>
      <EuiFlexItem grow className={scrollContainerClassName(scrollBarStyles)}>
        <div ref={scrollContainerRef} className={fullHeightClassName}>
          <EuiPanel hasBorder={false} hasShadow={false}>
            <EuiCommentList>
              {messages.map((message) => {
                return <ChatMessage message={message} />;
              })}
            </EuiCommentList>
          </EuiPanel>
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChatInputForm disabled={false} loading={false} onSubmit={onSubmit} />
      </EuiFlexItem>
    </>
  );
};
