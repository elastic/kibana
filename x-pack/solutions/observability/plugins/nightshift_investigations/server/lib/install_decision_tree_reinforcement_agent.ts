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
  DECISION_TREE_REINFORCEMENT_AGENT_DESCRIPTION,
  DECISION_TREE_REINFORCEMENT_AGENT_NAME,
  NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
  NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID,
} from '../agents/decision_tree_reinforcement';

export const installDecisionTreeReinforcementAgent = async ({
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
      id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
      type: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID,
      name: DECISION_TREE_REINFORCEMENT_AGENT_NAME,
      description: DECISION_TREE_REINFORCEMENT_AGENT_DESCRIPTION,
      labels: ['observability', 'significant-events', 'investigation', 'decision-tree'],
      avatar_symbol: 'DT',
      // Private so Agent Builder users cannot converse with this mutating agent
      // and skip the post-execution prepare/eligibility step. The reinforce
      // workflow still runs it via `ai.agent` after `ensure`.
      access_control: { access_mode: AgentAccessControlMode.Private },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    },
  });
};
