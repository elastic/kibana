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
  INVESTIGATION_AGENT_DESCRIPTION,
  INVESTIGATION_AGENT_NAME,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
} from '../agents/investigation';

export const installInvestigationAgent = async ({
  agentBuilder,
  spaceId,
  availability,
  hidden,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
  availability: AgentAvailabilityConfig;
  /**
   * Agent Builder keeps one picker visibility per agent id for the whole process, and an omitted
   * value leaves it as is, so only the plugin start sets it.
   */
  hidden?: boolean;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    availability,
    hidden,
    agent: {
      id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      type: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
      name: INVESTIGATION_AGENT_NAME,
      description: INVESTIGATION_AGENT_DESCRIPTION,
      labels: ['observability', 'significant-events', 'investigation', 'cortex', 'sandbox'],
      avatar_symbol: 'NI',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    },
  });
};
