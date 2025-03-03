/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo } from 'react';
import type { ChatEvent } from '../../../common/chat_events';
import type { Message } from '../../../common/messages';
import { useWorkChatServices } from './use_workchat_service';

export const useChat = () => {
  const { chatService } = useWorkChatServices();
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');

  const send = useCallback(
    async (message: string) => {
      setMessages((prevMessages) => [...prevMessages, { type: 'user', content: message }]);

      const events$ = await chatService.callAgent({ message });

      let chunks = '';

      events$.subscribe({
        next: (event) => {
          setEvents((prevEvents) => [...prevEvents, event]);

          if (event.type === 'message_chunk') {
            chunks += event.text_chunk;
            setPendingMessage(chunks);
          }
        },
        complete: () => {
          setMessages((previous) => [...previous, { type: 'assistant', content: chunks }]);
          setPendingMessage('');
        },
      });
    },
    [chatService]
  );

  const allMessages: Message[] = useMemo(() => {
    return [...messages].concat(
      pendingMessage ? [{ type: 'assistant', content: pendingMessage }] : []
    );
  }, [messages, pendingMessage]);

  return {
    send,
    events,
    messages: allMessages,
  };
};
