/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import { getInvestigationAgentId } from '../../common/telemetry_targets';
import {
  INVESTIGATION_AGENT_DESCRIPTION,
  INVESTIGATION_AGENT_NAME,
  NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
} from '../agents/investigation';

export const installInvestigationAgent = async ({
  agentBuilder,
  spaceId,
  availability,
  telemetryTarget,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
  availability: AgentAvailabilityConfig;
  telemetryTarget?: string;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    availability,
    // Unlike the other Nightshift agents, users chat with the investigator directly.
    hidden: false,
    agent: {
      id: getInvestigationAgentId(telemetryTarget),
      type: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
      name: telemetryTarget
        ? `${INVESTIGATION_AGENT_NAME} (${telemetryTarget})`
        : INVESTIGATION_AGENT_NAME,
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
