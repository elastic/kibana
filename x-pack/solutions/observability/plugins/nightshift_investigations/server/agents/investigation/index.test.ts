/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { PROPOSALS_CREATE_TOOL_ID } from '@kbn/proposals-common';
import type { AgentBaseConfiguration, AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import {
  getInvestigationAgentType,
  registerInvestigationAgentType,
  NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID,
} from '.';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';

const SANDBOX_TOOL_IDS = [
  SANDBOX_BASH_TOOL_ID,
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
];

const INVESTIGATION_TOOL_IDS = [
  'agentic_investigations.set_impact',
  'agentic_investigations.set_hypotheses',
];

const ALL_PLUGINS = { investigationToolsEnabled: true, proposalsEnabled: true } as const;

const staticBase = (type: AgentTypeDefinition): AgentBaseConfiguration => {
  if (typeof type.baseConfiguration === 'function') {
    throw new Error('expected a static base configuration');
  }
  return type.baseConfiguration;
};

describe('Nightshift investigation agent type', () => {
  it('registers under the Nightshift investigation type id', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerInvestigationAgentType(agentBuilder, {
      sandboxEnabled: false,
      cortexEnabled: false,
      ...ALL_PLUGINS,
    });

    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ id: NIGHTSHIFT_INVESTIGATION_AGENT_TYPE_ID })
    );
  });

  it('carries a standalone sandbox prompt and no Elastic tools', () => {
    const base = staticBase(
      getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: true, ...ALL_PLUGINS })
    );

    expect(base).toMatchObject({
      enable_elastic_capabilities: false,
      skill_ids: [],
      workflow_ids: ['system-nightshift-sandbox-materialize-workspace'],
      post_execution_workflow_ids: ['system-nightshift-agent-optimize'],
    });
    expect(base.tools?.[0]?.tool_ids).toEqual([
      ...INVESTIGATION_TOOL_IDS,
      PROPOSALS_CREATE_TOOL_ID,
      ...SANDBOX_TOOL_IDS,
    ]);
    expect(base.tools?.[0]?.tool_ids).not.toContain(platformCoreTools.executeEsql);
    // Its own prompt, not the significant-events one: it documents the sandbox query path.
    expect(base.instructions).toContain('/workspace/elastic.md');
    expect(base.instructions).not.toContain('platform_core_execute_esql');
    expect(base.instructions).not.toContain('/workspace/decision-trees/monitors.md');
    expect(base.instructions).toContain('<alert_data>');
    expect(base.instructions).toContain('Affected entity');
    expect(base.instructions).not.toContain('inputs.context.alerts');
    expect(base.instructions).toContain('FROM $.<stream-name>');
    expect(base.instructions).toContain('FROM <stream-name>, <stream-name>.*');
  });

  it('adds Semantic Memory context and workflows when memory is enabled', () => {
    const base = staticBase(
      getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: false,
        memoryEnabled: true,
        ...ALL_PLUGINS,
      })
    );

    expect(base.workflow_ids).toEqual(['system-nightshift-sandbox-materialize-workspace']);
    expect(base.post_execution_workflow_ids).toEqual(['system-nightshift-agent-optimize']);
    expect(base.instructions).toContain('/workspace/memories/.index.json');
    expect(base.instructions).not.toContain('{{semantic_memory_load_step}}');
  });

  it('hydrates and reinforces decision trees through the combined workflows', () => {
    const base = staticBase(
      getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        decisionTreesEnabled: true,
        ...ALL_PLUGINS,
      })
    );

    // One pre-hook, not two: decision trees hydrate as a third parallel branch of the
    // combined materialize workflow, which already carries the sandbox_id they need.
    expect(base.workflow_ids).toEqual(['system-nightshift-sandbox-materialize-workspace']);
    // One post-hook, not two: reinforcement is the tail phase of the combined optimize
    // workflow. Listing both would reinforce every round twice.
    expect(base.post_execution_workflow_ids).toEqual(['system-nightshift-agent-optimize']);
    expect(base.instructions).toContain('/workspace/decision-trees/monitors.md');
    expect(base.instructions).not.toContain('{{decision_trees_load_step}}');
    expect(base.instructions).not.toContain('{{decision_trees_section}}');
  });

  it('drops both cortex workflows when cortex is disabled', () => {
    const base = staticBase(
      getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: false, ...ALL_PLUGINS })
    );

    expect(base.workflow_ids).toBeUndefined();
    expect(base.post_execution_workflow_ids).toBeUndefined();
  });

  it('drops the pre-execution workflow when cortex is on but the sandbox is not configured', () => {
    const base = staticBase(
      getInvestigationAgentType({ sandboxEnabled: false, cortexEnabled: true, ...ALL_PLUGINS })
    );

    expect(base.workflow_ids).toBeUndefined();
    expect(base.post_execution_workflow_ids).toEqual(['system-nightshift-agent-optimize']);
    expect(base.tools?.[0]?.tool_ids).toEqual([
      ...INVESTIGATION_TOOL_IDS,
      PROPOSALS_CREATE_TOOL_ID,
    ]);
  });

  it('allow-lists the telemetry connector when one is configured', () => {
    const base = staticBase(
      getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        telemetryConnectorId: 'elasticsearch-telemetry',
        ...ALL_PLUGINS,
      })
    );

    expect(base.connector_ids).toEqual(['elasticsearch-telemetry']);
  });

  it('offers the investigation and proposal tools only when their plugins are enabled', () => {
    const base = staticBase(
      getInvestigationAgentType({
        sandboxEnabled: false,
        cortexEnabled: false,
        investigationToolsEnabled: false,
        proposalsEnabled: false,
      })
    );

    expect(base.tools?.[0]?.tool_ids).toEqual([]);
  });

  it('instructs the agent to record its findings with the investigation tools', () => {
    const { instructions } = staticBase(
      getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: true, ...ALL_PLUGINS })
    );

    for (const tool of [
      'set_conversation_metadata',
      'agentic_investigations.set_impact',
      'agentic_investigations.set_hypotheses',
      'proposals.create',
    ]) {
      expect(instructions).toContain(`\`${tool}\``);
    }
    expect(instructions).toContain('"origin": "nightshift"');
    expect(instructions).toContain('**Check before you finish.**');
    expect(instructions).not.toContain('blind_spots');
    expect(instructions).not.toMatch(/\d0-(critical|high|medium|low)/);
  });

  describe('custom context', () => {
    const ctx = { request: httpServerMock.createKibanaRequest(), spaceId: 'space-a' };
    const CUSTOM_CONTEXT =
      '**USER CONTEXT**\n<user_provided_context>\nRule out release regressions.\n</user_provided_context>';

    const resolveBase = async (
      getCustomContextInstructions: jest.Mock,
      logger = loggerMock.create()
    ): Promise<AgentBaseConfiguration> => {
      const type = getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        ...ALL_PLUGINS,
        getCustomContextInstructions,
        logger,
      });
      if (typeof type.baseConfiguration !== 'function') {
        throw new Error('expected a dynamic base configuration');
      }
      return type.baseConfiguration(ctx);
    };

    const staticInstructions = staticBase(
      getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: true, ...ALL_PLUGINS })
    ).instructions;

    it("appends the space's custom context to the instructions on every resolve", async () => {
      const getCustomContextInstructions = jest.fn().mockResolvedValue(CUSTOM_CONTEXT);

      const base = await resolveBase(getCustomContextInstructions);

      expect(getCustomContextInstructions).toHaveBeenCalledWith(ctx);
      expect(base.instructions).toBe(`${staticInstructions?.trimEnd()}\n\n${CUSTOM_CONTEXT}\n`);
      expect(base.tools).toEqual(
        staticBase(
          getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: true, ...ALL_PLUGINS })
        ).tools
      );
    });

    it('keeps the base instructions when the space has no custom context', async () => {
      const base = await resolveBase(jest.fn().mockResolvedValue(''));

      expect(base.instructions).toBe(staticInstructions);
    });

    it('keeps the base instructions and logs a warning when custom context cannot be read', async () => {
      const logger = loggerMock.create();

      const base = await resolveBase(jest.fn().mockRejectedValue(new Error('boom')), logger);

      expect(base.instructions).toBe(staticInstructions);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to load custom context for space "space-a": boom'
      );
    });
  });
});
