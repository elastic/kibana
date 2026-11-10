/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
} from '../agents/investigation';
import { installInvestigationAgent } from './install_investigation_agent';

describe('installInvestigationAgent', () => {
  it('ensures a system-owned persisted typed agent in the default space', async () => {
    const agentBuilder = agentBuilderMocks.createStart();

    await installInvestigationAgent({ agentBuilder, spaceId: 'default' });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'default',
      agent: {
        id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
        type: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
        name: 'Nightshift Investigator',
        description: expect.any(String),
        labels: ['observability', 'significant-events', 'investigation', 'wiki', 'sandbox'],
        avatar_symbol: 'NI',
        access_control: { access_mode: AgentAccessControlMode.Public },
        configuration: {
          tools: [],
          skill_ids: [],
        },
      },
    });
  });
  it('refuses to install the investigator in another space', async () => {
    const agentBuilder = agentBuilderMocks.createStart();

    await expect(installInvestigationAgent({ agentBuilder, spaceId: 'marketing' })).rejects.toThrow(
      /only available in the "default" space/
    );
    expect(agentBuilder.agents.ensure).not.toHaveBeenCalled();
  });
});
