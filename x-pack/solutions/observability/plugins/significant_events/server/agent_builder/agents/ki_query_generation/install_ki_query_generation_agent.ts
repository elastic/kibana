/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import {
  KI_QUERY_GENERATION_AGENT_ID,
  KI_QUERY_GENERATION_AGENT_TYPE_ID,
  kiQueryGenerationAgentType,
} from './ki_query_generation_agent';

export const installKIQueryGenerationAgent = async ({
  agentBuilder,
  spaceId,
  availability,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
  availability?: AgentAvailabilityConfig;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    availability,
    agent: {
      id: KI_QUERY_GENERATION_AGENT_ID,
      type: KI_QUERY_GENERATION_AGENT_TYPE_ID,
      name: 'KI Query Generation',
      description: kiQueryGenerationAgentType.description,
      labels: ['observability', 'streams', 'significant-events', 'ki-query-generation'],
      avatar_symbol: 'QG',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    },
  });
};
