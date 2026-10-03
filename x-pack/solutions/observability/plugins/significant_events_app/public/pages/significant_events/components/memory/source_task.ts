/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const AGENT_BUILDER_APP_PATH = '/app/agent_builder';

/**
 * The Agent Builder route for one conversation, relative to Kibana's root.
 *
 * The canonical route is agent-scoped (`/agents/:agentId/conversations/:id`), so it
 * needs both ids. A memory written before `agent_id` was persisted only has the
 * conversation, which still resolves through the legacy unscoped route — which is
 * what `event_investigations.tsx` in this app already links to.
 *
 * Both ids are percent-encoded: they are opaque ids, and one containing a slash
 * would otherwise address a different route.
 */
export const getSourceTaskPath = (conversationId: string, agentId: string | undefined): string => {
  const conversation = encodeURIComponent(conversationId);
  if (agentId === undefined || agentId.length === 0) {
    return `${AGENT_BUILDER_APP_PATH}/conversations/${conversation}`;
  }
  return `${AGENT_BUILDER_APP_PATH}/agents/${encodeURIComponent(
    agentId
  )}/conversations/${conversation}`;
};
