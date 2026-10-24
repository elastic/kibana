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
  RUM_UX_TOOL_IDS,
} from '../../common/rum_agent';
import { rumAnalystToolSelection } from './agent';
import { installRumAnalystAgent } from './install';

describe('installRumAnalystAgent', () => {
  it('ensures the RUM Analyst with RUM tools and skills enabled', async () => {
    const agentBuilder = {
      agents: { ensure: jest.fn() },
    } as unknown as AgentBuilderPluginStart;

    await installRumAnalystAgent({ agentBuilder, spaceId: 'default' });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'default',
      agent: {
        id: RUM_ANALYST_AGENT_ID,
        type: RUM_ANALYST_AGENT_TYPE_ID,
        name: 'RUM Analyst',
        description: expect.any(String),
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

    const toolIds = rumAnalystToolSelection[0].tool_ids;
    expect(toolIds).toEqual([
      RUM_UX_TOOL_IDS.getOverview,
      RUM_UX_TOOL_IDS.findSessions,
      RUM_UX_TOOL_IDS.getErrors,
      RUM_UX_TOOL_IDS.getPages,
      RUM_UX_TOOL_IDS.getReport,
      'platform.core.execute_esql',
    ]);
  });
});
