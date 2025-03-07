/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { ConversationEventChanges } from '../../../common/chat_events';
import { useChat } from './use_chat';
import { useWorkChatServices } from './use_workchat_service';

export const useConversation = ({
  agentId,
  conversationId,
  onConversationUpdate,
}: {
  agentId: string;
  conversationId: string | undefined;
  onConversationUpdate: (update: ConversationEventChanges) => void;
}) => {
  const { conversationService } = useWorkChatServices();

  const onConversationUpdateInternal = useCallback(
    (update: ConversationEventChanges) => {
      onConversationUpdate(update);
    },
    [onConversationUpdate]
  );

  const {
    conversationEvents,
    setConversationEvents,
    sendMessage,
    status: chatStatus,
  } = useChat({
    agentId,
    conversationId,
    onConversationUpdate: onConversationUpdateInternal,
  });

  useAbortableAsync(async () => {
    // TODO: better conv state management - only has events atm
    if (conversationId) {
      const conversation = await conversationService.get(conversationId);
      setConversationEvents(conversation.events);
    } else {
      setConversationEvents([]);
    }
  }, [conversationId, conversationService]);

  return { conversationEvents, chatStatus, sendMessage };
};
