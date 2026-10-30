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
  ASSISTANT_AGENT_DESCRIPTION,
  ASSISTANT_AGENT_NAME,
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
  NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
} from '../agents/assistant';

/** Ensures the Nightshift assistant agent; hidden from the Agent Builder agent picker but callable by id. */
export const installAssistantAgent = async ({
  agentBuilder,
  spaceId,
  availability,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
  availability: AgentAvailabilityConfig;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    availability,
    hidden: true,
    agent: {
      id: NIGHTSHIFT_ASSISTANT_AGENT_ID,
      type: NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
      name: ASSISTANT_AGENT_NAME,
      description: ASSISTANT_AGENT_DESCRIPTION,
      labels: ['observability', 'nightshift', 'sandbox'],
      avatar_symbol: 'NA',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    },
  });
};
