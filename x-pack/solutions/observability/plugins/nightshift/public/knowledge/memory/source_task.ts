/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const AGENT_BUILDER_APP_PATH = '/app/agent_builder';

/** The agent-scoped Agent Builder route, or the unscoped one when no agent id is known. */
export const getSourceTaskPath = (conversationId: string, agentId: string | undefined): string => {
  const conversation = encodeURIComponent(conversationId);
  if (agentId === undefined || agentId.length === 0) {
    return `${AGENT_BUILDER_APP_PATH}/conversations/${conversation}`;
  }
  return `${AGENT_BUILDER_APP_PATH}/agents/${encodeURIComponent(
    agentId
  )}/conversations/${conversation}`;
};
