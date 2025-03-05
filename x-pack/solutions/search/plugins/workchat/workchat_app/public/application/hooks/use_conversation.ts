/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { useAbortableAsync, AbortableAsyncState } from '@kbn/react-hooks';
import type { Conversation } from '../../../common/conversations';
import { getMessages } from '../../../common/utils/conversation';
import { useChat } from './use_chat';
import { useWorkChatServices } from './use_workchat_service';

export const useConversation = ({
  agentId,
  conversationId: initialConversationId,
}: {
  agentId: string;
  conversationId: string | undefined;
}) => {
  const { conversationService } = useWorkChatServices();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const { messages, send, setMessages } = useChat({ agentId, conversationId });

  useAbortableAsync(async () => {
    if (conversationId) {
      const conversation = await conversationService.get(conversationId);
      setMessages(getMessages(conversation.events));
    }
  }, [initialConversationId, conversationService]);

  return { messages, send };
};
