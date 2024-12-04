/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../types';

/**
 * Constructs a file ID for a given agent.
 * @param action
 * @param agentId
 */
export const getFileDownloadId = (action: ActionDetails, agentId?: string): string => {
  const { id: actionId, agents, agentType } = action;

  if (agentId && !agents.includes(agentId)) {
    throw new Error(`Action [${actionId}] was not sent to agent id [${agentId}]`);
  }

  // If not an Endpoint agent type, then return the agent id. Agent ID will be used as the
  // file identifier for non-endpoint agents
  if (agentType !== 'endpoint') {
    return agentId ?? agents[0];
  }

  return `${actionId}.${agentId ?? agents[0]}`;
};
