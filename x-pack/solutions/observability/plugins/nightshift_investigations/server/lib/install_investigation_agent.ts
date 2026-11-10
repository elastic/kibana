/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  INVESTIGATION_AGENT_DESCRIPTION,
  INVESTIGATION_AGENT_NAME,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
} from '../agents/investigation';
import { assertNightshiftSpace } from './assert_nightshift_space';

/**
 * Ensures the Nightshift investigation agent in the default space, the only space Nightshift runs
 * in; installing it anywhere else would show Nightshift in a space that cannot use it.
 *
 * Availability and picker visibility are declared once per process in the plugin's setup, so this
 * only writes the agent document.
 */
export const installInvestigationAgent = async ({
  agentBuilder,
  spaceId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
}): Promise<void> => {
  assertNightshiftSpace(spaceId);
  await agentBuilder.agents.ensure({
    spaceId,
    agent: {
      id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      type: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
      name: INVESTIGATION_AGENT_NAME,
      description: INVESTIGATION_AGENT_DESCRIPTION,
      labels: ['observability', 'significant-events', 'investigation', 'wiki', 'sandbox'],
      avatar_symbol: 'NI',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
      },
    },
  });
};
