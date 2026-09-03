/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

/**
 * Opens the Agent Builder conversation sidebar on an existing conversation.
 *
 * `conversationId` is accepted by Agent Builder's sidebar opener (Nightshift already
 * passes it) even though it is not yet on the public `OpenConversationSidebarOptions`
 * type. Passing it as `sessionTag` was a dead end — that is a localStorage bucket, not
 * a conversation restore key.
 */
export const useOpenInChat = (conversationId?: string): (() => void) => {
  const { services } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();

  return useCallback(() => {
    if (conversationId == null || conversationId.length === 0) {
      return;
    }

    services.agentBuilder?.openChat({
      conversationId,
    } as Parameters<NonNullable<AgentBuilderPluginStart['openChat']>>[0]);
  }, [conversationId, services.agentBuilder]);
};
