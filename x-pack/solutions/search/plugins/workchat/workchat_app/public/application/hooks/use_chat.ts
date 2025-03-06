/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo } from 'react';
import type { ChatEvent, ConversationCreatedEvent } from '../../../common/chat_events';
import type { Message } from '../../../common/messages';
import { useWorkChatServices } from './use_workchat_service';

interface UseChatProps {
  conversationId: string | undefined;
  agentId: string;
  onConversationUpdate: (changes: ConversationCreatedEvent['conversation']) => void;
}

export const useChat = ({ conversationId, agentId, onConversationUpdate }: UseChatProps) => {
  const { chatService } = useWorkChatServices();
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');

  const send = useCallback(
    async (nextMessage: string) => {
      setMessages((prevMessages) => [...prevMessages, { type: 'user', content: nextMessage }]);

      let chunks = '';
      const events$ = await chatService.converse({ nextMessage, conversationId, agentId });

      events$.subscribe({
        next: (event) => {
          setEvents((prevEvents) => [...prevEvents, event]);

          if (event.type === 'message_chunk') {
            chunks += event.text_chunk;
            setPendingMessage(chunks);
          }

          if (event.type === 'conversation_created') {
            onConversationUpdate(event.conversation);
          }
        },
        complete: () => {
          setMessages((previous) => [...previous, { type: 'assistant', content: chunks }]);
          setPendingMessage('');
        },
      });
    },
    [chatService, agentId, conversationId, onConversationUpdate]
  );

  const setMessagesExternal = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    setPendingMessage('');
  }, []);

  const allMessages: Message[] = useMemo(() => {
    return [...messages].concat(
      pendingMessage ? [{ type: 'assistant', content: pendingMessage }] : []
    );
  }, [messages, pendingMessage]);

  return {
    send,
    events,
    messages: allMessages,
    setMessages: setMessagesExternal,
  };
};
