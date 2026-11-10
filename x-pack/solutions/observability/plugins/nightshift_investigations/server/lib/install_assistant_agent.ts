/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  ASSISTANT_AGENT_DESCRIPTION,
  ASSISTANT_AGENT_NAME,
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
  NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
} from '../agents/assistant';
import { assertNightshiftSpace } from './assert_nightshift_space';

/**
 * Ensures the Nightshift assistant agent, the Nightshift agent users pick in the Agent Builder UI.
 *
 * Only in the default space: Nightshift does not run elsewhere, so its agent must not show up in
 * another space's Agent Builder.
 *
 * Availability and picker visibility are declared once per process in the plugin's setup, so this
 * only writes the agent document.
 */
export const installAssistantAgent = async ({
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
