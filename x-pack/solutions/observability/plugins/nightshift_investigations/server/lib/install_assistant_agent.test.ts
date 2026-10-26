/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
  NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
} from '../agents/assistant';
import { installAssistantAgent } from './install_assistant_agent';

describe('installAssistantAgent', () => {
  it('ensures a typed agent in the requested space, hidden from the agent picker', async () => {
    const agentBuilder = agentBuilderMocks.createStart();
    const availability = { cacheMode: 'space' as const, handler: jest.fn() };

    await installAssistantAgent({ agentBuilder, spaceId: 'space-1', availability });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'space-1',
      availability,
      hidden: true,
      agent: {
        id: NIGHTSHIFT_ASSISTANT_AGENT_ID,
        type: NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
        name: 'Nightshift Assistant',
        description: expect.any(String),
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
  });
});
