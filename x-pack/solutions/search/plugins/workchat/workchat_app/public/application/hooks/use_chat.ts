/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo } from 'react';
import type { ConversationCreatedEvent } from '../../../common/chat_events';
import type { ConversationEvent } from '../../../common/conversations';
import { assistantMessageEvent, userMessageEvent } from '../../../common/utils/conversation';
import { useWorkChatServices } from './use_workchat_service';

interface UseChatProps {
  conversationId: string | undefined;
  agentId: string;
  onConversationUpdate: (changes: ConversationCreatedEvent['conversation']) => void;
}

export const useChat = ({ conversationId, agentId, onConversationUpdate }: UseChatProps) => {
  const { chatService } = useWorkChatServices();
  const [conversationEvents, setConversationEvents] = useState<ConversationEvent[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');

  const sendMessage = useCallback(
    async (nextMessage: string) => {
      setConversationEvents((prevEvents) => [...prevEvents, userMessageEvent(nextMessage)]);

      let concatenatedChunks = '';
      const events$ = await chatService.converse({ nextMessage, conversationId, agentId });

      events$.subscribe({
        next: (event) => {
          if (event.type === 'message_chunk') {
            concatenatedChunks += event.text_chunk;
            setPendingMessage(concatenatedChunks);
          }

          if (event.type === 'conversation_created') {
            onConversationUpdate(event.conversation);
          }
        },
        complete: () => {
          setConversationEvents((prevEvents) => [
            ...prevEvents,
            assistantMessageEvent(concatenatedChunks),
          ]);
          setPendingMessage('');
        },
      });
    },
    [chatService, agentId, conversationId, onConversationUpdate]
  );

  const setConversationEventsExternal = useCallback((newEvents: ConversationEvent[]) => {
    setConversationEvents(newEvents);
    setPendingMessage('');
  }, []);

  const allEvents = useMemo(() => {
    return [...conversationEvents].concat(
      pendingMessage ? [assistantMessageEvent(pendingMessage)] : []
    );
  }, [conversationEvents, pendingMessage]);

  return {
    sendMessage,
    conversationEvents: allEvents,
    setConversationEvents: setConversationEventsExternal,
  };
};
