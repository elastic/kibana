/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Query keys for react-query
 */
export const queryKeys = {
  conversations: {
    all: ['conversations'] as const,
    byAgent: (agentId: string) => ['conversations', 'list', { agentId }],
    byId: (conversationId: string) => ['conversations', conversationId],
  },
  agents: {
    all: ['agents'] as const,
    list: ['agents', 'list'] as const,
    details: (agentId: string) => ['agents', { id: agentId }],
  },
  connectors: {
    all: ['connectors'] as const,
    list: ['connectors', 'list'] as const,
  },
  integrations: {
    all: ['integrations'] as const,
    list: ['integrations', 'list'] as const,
  },
  users: {
    current: ['users', 'current'] as const,
  },
};
