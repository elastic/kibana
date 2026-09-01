/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTZERO_THIN_AGENT_ID } from '@kbn/pnd-common';
import {
  createAgentRequest,
  ALERTZERO_THIN_AGENT_AVATAR_SYMBOL,
  ALERTZERO_THIN_AGENT_DESCRIPTION,
  ALERTZERO_THIN_AGENT_LABELS,
  ALERTZERO_THIN_AGENT_NAME,
  ALERTZERO_THIN_AGENT_TYPE_ID,
  agentType,
  registerAgentType,
} from './agent';
import { ensureAgent } from './ensure_agent';

describe('thin agent', () => {
  it('defines a stable shared agent id typed to the Alert Zero thin agent type', () => {
    const agent = createAgentRequest();

    expect(agent).toEqual({
      id: ALERTZERO_THIN_AGENT_ID,
      type: ALERTZERO_THIN_AGENT_TYPE_ID,
      name: ALERTZERO_THIN_AGENT_NAME,
      description: ALERTZERO_THIN_AGENT_DESCRIPTION,
      labels: [...ALERTZERO_THIN_AGENT_LABELS],
      avatar_symbol: ALERTZERO_THIN_AGENT_AVATAR_SYMBOL,
      access_control: { access_mode: AgentAccessControlMode.Shared },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
        enable_elastic_capabilities: false,
      },
    });
    expect(agent.id).toBe('alertzero-thin-agent');
    expect(agent.type).toBe('security.alertzero-type');
  });

  it('registers a managed type with an empty skill floor and elastic capabilities off', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerAgentType(agentBuilder);

    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(agentType);
    expect(agentType).toMatchObject({
      id: ALERTZERO_THIN_AGENT_TYPE_ID,
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
