/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
  NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID,
} from '../agents/decision_tree_reinforcement';
import { installDecisionTreeReinforcementAgent } from './install_decision_tree_reinforcement_agent';

describe('installDecisionTreeReinforcementAgent', () => {
  it('ensures a private persisted agent so users cannot converse with it directly', async () => {
    const agentBuilder = agentBuilderMocks.createStart();
    const availability = { cacheMode: 'space' as const, handler: jest.fn() };

    await installDecisionTreeReinforcementAgent({
      agentBuilder,
      spaceId: 'space-1',
      availability,
    });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'space-1',
      availability,
      agent: expect.objectContaining({
        id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
        type: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID,
        access_control: { access_mode: AgentAccessControlMode.Private },
      }),
    });
  });
});
