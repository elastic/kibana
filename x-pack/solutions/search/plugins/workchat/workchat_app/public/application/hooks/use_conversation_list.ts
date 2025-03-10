/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import type { Conversation } from '../../../common/conversations';
import { useWorkChatServices } from './use_workchat_service';

export const useConversationList = () => {
  const { conversationService } = useWorkChatServices();
  const [isLoading, setLoading] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);

    const nextConversations = await conversationService.list();

    setConversations(nextConversations);
    setLoading(false);
  }, [conversationService]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    conversations,
    isLoading,
    refresh,
  };
};
