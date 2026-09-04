/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  RUM_ANALYST_AGENT_ID,
  RUM_ANALYST_AGENT_TYPE_ID,
  RUM_ANALYST_SKILL_IDS,
} from '../../common/rum_agent';
import { rumAnalystAgentType, rumAnalystToolSelection } from './agent';

export const installRumAnalystAgent = async ({
  agentBuilder,
  spaceId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    agent: {
      id: RUM_ANALYST_AGENT_ID,
      type: RUM_ANALYST_AGENT_TYPE_ID,
      name: 'RUM Analyst',
      description: rumAnalystAgentType.description,
      labels: ['observability', 'rum', 'ux'],
      avatar_symbol: 'RUM',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: rumAnalystToolSelection,
        skill_ids: [...RUM_ANALYST_SKILL_IDS],
        connector_ids: [],
        enable_elastic_capabilities: false,
      },
    },
  });
};
