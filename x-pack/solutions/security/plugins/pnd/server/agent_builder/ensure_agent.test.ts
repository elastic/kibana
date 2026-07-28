/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { PND_THIN_AGENT_ID } from '@kbn/pnd-common';
import {
  createAgentRequest,
  PND_THIN_AGENT_AVATAR_SYMBOL,
  PND_THIN_AGENT_DESCRIPTION,
  PND_THIN_AGENT_LABELS,
  PND_THIN_AGENT_NAME,
  PND_THIN_AGENT_TYPE_ID,
  agentType,
  registerAgentType,
} from './agent';
import { ensureAgent } from './ensure_agent';

describe('thin agent', () => {
  it('defines a stable shared agent id typed to the PND thin agent type', () => {
    const agent = createAgentRequest();

    expect(agent).toEqual({
      id: PND_THIN_AGENT_ID,
      type: PND_THIN_AGENT_TYPE_ID,
      name: PND_THIN_AGENT_NAME,
      description: PND_THIN_AGENT_DESCRIPTION,
      labels: [...PND_THIN_AGENT_LABELS],
      avatar_symbol: PND_THIN_AGENT_AVATAR_SYMBOL,
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
        enable_elastic_capabilities: false,
      },
    });
    expect(agent.id).toBe('pnd-thin-agent');
    expect(agent.type).toBe('security.pnd-thin-type');
  });

  it('registers a managed type with an empty skill floor and elastic capabilities off', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerAgentType(agentBuilder);

    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(agentType);
    expect(agentType).toMatchObject({
      id: PND_THIN_AGENT_TYPE_ID,
      baseConfiguration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
        enable_elastic_capabilities: false,
      },
    });
  });
});

describe('ensureAgent', () => {
  it('calls agents.ensure for the requested space with the thin agent payload', async () => {
    const agentBuilder = agentBuilderMocks.createStart();

    await ensureAgent({ agentBuilder, spaceId: 'space-1' });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'space-1',
      agent: createAgentRequest(),
    });
  });
});
