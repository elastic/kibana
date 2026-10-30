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
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  getNightshiftBoundHookWorkflowId,
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

const configurationFor = async (
  definition: AgentTypeDefinition,
  spaceId = 'default'
): Promise<AgentBaseConfiguration> => {
  const { baseConfiguration } = definition;
  if (typeof baseConfiguration !== 'function')
    throw new Error('Expected a per-space configuration');
  return baseConfiguration({ request: httpServerMock.createKibanaRequest(), spaceId });
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

  it('shares the investigator configuration except for its instructions', async () => {
    const { instructions, ...assistant } = await configurationFor(getAssistantAgentType(options));
    const { instructions: investigatorInstructions, ...investigator } = await configurationFor(
      getInvestigationAgentType({ ...options, decisionTreesEnabled: true })
    );

    expect(instructions).toBe(ASSISTANT_INSTRUCTIONS);
    expect(instructions).not.toBe(investigatorInstructions);
    expect(assistant).toEqual(investigator);
    expect(assistant).toMatchObject({
      connector_ids: ['telemetry'],
      workflow_ids: [
        getNightshiftBoundHookWorkflowId(
          NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
          'default'
        ),
      ],
      post_execution_workflow_ids: [
        getNightshiftBoundHookWorkflowId(NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID, 'default'),
      ],
    });
  });

  it('allows every configured telemetry target, like the investigator', async () => {
    const telemetryOptions: NightshiftAgentTypeOptions = {
      ...options,
      telemetryConnectorId: undefined,
      telemetryConfig: {
        telemetry_targets: { c0: { connector_id: 'c0' }, orca: { connector_id: 'orca' } },
      } as NightshiftAgentTypeOptions['telemetryConfig'],
    };

    const assistant = await configurationFor(getAssistantAgentType(telemetryOptions));
    const investigator = await configurationFor(getInvestigationAgentType(telemetryOptions));

    expect(assistant.connector_ids).toEqual(['c0', 'orca']);
    expect(assistant.connector_ids).toEqual(investigator.connector_ids);
  });

  it('allows the legacy telemetry connector alongside named targets', async () => {
    const telemetryOptions: NightshiftAgentTypeOptions = {
      ...options,
      telemetryConnectorId: 'legacy',
      telemetryConfig: {
        telemetry_connector_id: 'legacy',
        telemetry_targets: { c0: { connector_id: 'c0' }, orca: { connector_id: 'orca' } },
      } as NightshiftAgentTypeOptions['telemetryConfig'],
    };

    const assistant = await configurationFor(getAssistantAgentType(telemetryOptions));
    const investigator = await configurationFor(getInvestigationAgentType(telemetryOptions));

    expect(assistant.connector_ids).toEqual(['legacy', 'c0', 'orca']);
    expect(assistant.connector_ids).toEqual(investigator.connector_ids);
  });

  it('points to the workspace files instead of embedding their guidance', () => {
    for (const path of [
      '/workspace/connectors.md',
      '/workspace/.connector-docs/elastic.md',
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
