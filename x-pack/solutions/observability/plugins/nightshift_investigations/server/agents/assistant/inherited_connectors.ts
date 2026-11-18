/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { isAgentNotFoundError, isAgentUnavailableError } from '@kbn/agent-builder-common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../../common';

/**
 * Reads the connectors users assigned to the investigation agent of the request's space.
 */
export const getInvestigatorConnectorIds = async ({
  agentBuilder,
  request,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  request: KibanaRequest;
}): Promise<string[]> => {
  if (!agentBuilder) return [];
  try {
    const registry = await agentBuilder.agents.getRegistry({ request });
    const investigator = await registry.get(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    return investigator.configuration.connector_ids ?? [];
  } catch (error) {
    if (isAgentNotFoundError(error) || isAgentUnavailableError(error)) return [];
    throw error;
  }
};
