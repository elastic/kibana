/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type {
  AgentBaseConfiguration,
  AgentConfigContext,
  AgentTypeDefinition,
} from '@kbn/agent-builder-server/agents';
import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { NightshiftAgentTypeOptions } from '../investigation';
import { getInvestigationAgentType } from '../investigation';
import {
  ASSISTANT_AGENT_NAME,
  ASSISTANT_INSTRUCTIONS,
  NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
  getAssistantAgentType,
  registerAssistantAgentType,
} from '.';

const options: NightshiftAgentTypeOptions = {
  sandboxEnabled: true,
  cortexEnabled: true,
  memoryEnabled: true,
  investigationToolsEnabled: true,
  proposalsEnabled: true,
  telemetryConnectorId: 'telemetry',
};

const staticConfiguration = (definition: AgentTypeDefinition): AgentBaseConfiguration => {
  const { baseConfiguration } = definition;
  if (typeof baseConfiguration === 'function') throw new Error('Expected a static configuration');
  return baseConfiguration;
};

describe('Nightshift assistant agent type', () => {
  it('registers the assistant type', () => {
    const registerType = jest.fn();
    registerAssistantAgentType(
      { agents: { registerType } } as unknown as AgentBuilderPluginSetup,
      options
    );

    expect(registerType).toHaveBeenCalledWith(
      expect.objectContaining({
        id: NIGHTSHIFT_ASSISTANT_AGENT_TYPE_ID,
        name: ASSISTANT_AGENT_NAME,
      })
    );
  });

  it('shares the investigator configuration except for its instructions', () => {
    const { instructions, ...assistant } = staticConfiguration(getAssistantAgentType(options));
    const { instructions: investigatorInstructions, ...investigator } = staticConfiguration(
      getInvestigationAgentType({ ...options, decisionTreesEnabled: true })
    );

    expect(instructions).toBe(ASSISTANT_INSTRUCTIONS);
    expect(instructions).not.toBe(investigatorInstructions);
    expect(assistant).toEqual(investigator);
    expect(assistant).toMatchObject({
      connector_ids: ['telemetry'],
      workflow_ids: [NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID],
      post_execution_workflow_ids: [NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID],
    });
  });

  it('points to the workspace files instead of embedding their guidance', () => {
    for (const path of [
      '/workspace/connectors.md',
      '/workspace/elastic.md',
      '/workspace/cortex/INDEX.md',
      '/workspace/memories/.index.json',
    ]) {
      expect(ASSISTANT_INSTRUCTIONS).toContain(path);
    }
    expect(ASSISTANT_INSTRUCTIONS).not.toContain('decision-trees');
  });

  it('appends the space custom context like the investigator', async () => {
    const { baseConfiguration } = getAssistantAgentType({
      ...options,
      getCustomContextInstructions: async () => 'Team context.',
    });
    if (typeof baseConfiguration !== 'function') throw new Error('Expected a resolver');

    const { instructions } = await baseConfiguration({ spaceId: 'default' } as AgentConfigContext);

    expect(instructions).toBe(`${ASSISTANT_INSTRUCTIONS.trimEnd()}\n\nTeam context.\n`);
  });
});
