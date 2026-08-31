/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

// TODO: update this when we have the correct "chatId"
// from the sub-investigation (action proposal item/conversation item)
export const useOpenInChat = (chatId: string): (() => void) => {
  const { services } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();

  return useCallback(() => {
    services.agentBuilder?.openChat({
      agentId: agentBuilderDefaultAgentId,
      sessionTag: chatId,
    });
  }, [services.agentBuilder, chatId]);
};
