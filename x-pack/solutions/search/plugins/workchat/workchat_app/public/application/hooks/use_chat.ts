/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationCreatedEvent } from '../../../common/chat_events';
import type { ChatError } from '../../../common/errors';
import type { ConversationEvent } from '../../../common/conversations';
import { assistantMessageEvent, userMessageEvent } from '../../../common/utils/conversation';
import { useWorkChatServices } from './use_workchat_service';
import { useKibana } from './use_kibana';

interface UseChatProps {
  conversationId: string | undefined;
  agentId: string;
  connectorId?: string;
  onConversationUpdate: (changes: ConversationCreatedEvent['conversation']) => void;
  onError?: (error: ChatError) => void;
}

export type ChatStatus = 'ready' | 'loading' | 'error';

export const useChat = ({
  conversationId,
  agentId,
  connectorId,
  onConversationUpdate,
  onError,
}: UseChatProps) => {
  const { chatService } = useWorkChatServices();
  const {
    services: { notifications },
  } = useKibana();
  const [conversationEvents, setConversationEvents] = useState<ConversationEvent[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [status, setStatus] = useState<ChatStatus>('ready');

  const sendMessage = useCallback(
    (nextMessage: string) => {
      if (status === 'loading') {
        return;
      }
      setStatus('loading');
      setConversationEvents((prevEvents) => [...prevEvents, userMessageEvent(nextMessage)]);

      const events$ = chatService.converse({
        nextMessage,
        conversationId,
        agentId,
        connectorId,
      });

      let concatenatedChunks = '';

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
          setStatus('ready');
        },
        error: (err) => {
          setPendingMessage('');
          setStatus('error');
          onError?.(err);

          notifications.toasts.addError(err, {
            title: i18n.translate('xpack.workchatApp.chat.chatError.title', {
              defaultMessage: 'Error loading chat response',
            }),
            toastMessage: `${err.code} - ${err.message}`,
          });
        },
      });
    },
    [
      chatService,
      notifications,
      status,
      agentId,
      conversationId,
      connectorId,
      onConversationUpdate,
      onError,
    ]
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
    status,
    sendMessage,
    conversationEvents: allEvents,
    setConversationEvents: setConversationEventsExternal,
  };
};
