/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useAbortableAsync, AbortableAsyncState } from '@kbn/react-hooks';
import type { Conversation } from '../../../common/conversations';
import type { ConversationCreatedEventPayload } from '../../../common/chat_events';
import { getMessages } from '../../../common/utils/conversation';
import { useChat } from './use_chat';
import { useWorkChatServices } from './use_workchat_service';

export const useConversation = ({
  agentId,
  conversationId,
  onConversationUpdate,
}: {
  agentId: string;
  conversationId: string | undefined;
  onConversationUpdate: (update: ConversationCreatedEventPayload) => void;
}) => {
  const { conversationService } = useWorkChatServices();
  // const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  // useEffect(() => {
  //   setConversationId(initialConversationId);
  // }, [initialConversationId]);

  const onConversationUpdateInternal = useCallback(
    (update: ConversationCreatedEventPayload) => {
      onConversationUpdate(update);
    },
    [onConversationUpdate]
  );

  const { messages, send, setMessages } = useChat({
    agentId,
    conversationId,
    onConversationUpdate: onConversationUpdateInternal,
  });

  useAbortableAsync(async () => {
    // TODO: better init / state management
    if (conversationId) {
      const conversation = await conversationService.get(conversationId);
      setMessages(getMessages(conversation.events));
    } else {
      setMessages([]);
    }
  }, [conversationId, conversationService]);

  return { messages, send };
};
