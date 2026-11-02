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

const baseFor = async (
  type: AgentTypeDefinition,
  spaceId = 'default'
): Promise<AgentBaseConfiguration> => {
  if (typeof type.baseConfiguration !== 'function') {
    throw new Error('expected a per-space base configuration');
  }
  return type.baseConfiguration({ request: httpServerMock.createKibanaRequest(), spaceId });
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

  it('carries a standalone sandbox prompt and no Elastic tools', async () => {
    const base = await baseFor(
      getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: true, ...ALL_PLUGINS })
    );

    expect(base).toMatchObject({
      enable_elastic_capabilities: false,
      skill_ids: [],
      workflow_ids: ['system-nightshift-sandbox-materialize-workspace-bound-default'],
      post_execution_workflow_ids: ['system-nightshift-agent-optimize-bound-default'],
    });
    expect(base.tools?.[0]?.tool_ids).toEqual([
      ...INVESTIGATION_TOOL_IDS,
      PROPOSALS_CREATE_TOOL_ID,
      ...SANDBOX_TOOL_IDS,
    ]);
    expect(base.tools?.[0]?.tool_ids).not.toContain(platformCoreTools.executeEsql);
    // Its own prompt, not the significant-events one: it documents the sandbox query path.
    expect(base.instructions).toContain('/workspace/.connector-docs/elastic.md');
    expect(base.instructions).not.toContain('platform_core_execute_esql');
    expect(base.instructions).not.toContain('/workspace/decision-trees/monitors.md');
    expect(base.instructions).toContain('<alert_data>');
    expect(base.instructions).toContain('Affected entity');
    expect(base.instructions).not.toContain('inputs.context.alerts');
    expect(base.instructions).toContain('`- <slug> (id <id>): FROM <view_name>`');
    expect(base.instructions).toContain('FROM <view_name> | KEEP <prefix>* | LIMIT 0');
    expect(base.instructions).toContain('see <knowledge_cortex>');
    expect(base.instructions).toContain('/workspace/cortex/README.md');
    expect(base.instructions).not.toContain('{{cortex_load_step}}');
    expect(base.instructions).not.toContain('{{knowledge_cortex_section}}');
  });

  it('adds Semantic Memory context and workflows when memory is enabled', async () => {
    const base = await baseFor(
      getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: false,
        memoryEnabled: true,
        ...ALL_PLUGINS,
      })
    );

    expect(base.workflow_ids).toEqual([
      'system-nightshift-sandbox-materialize-workspace-bound-default',
    ]);
    expect(base.post_execution_workflow_ids).toEqual([
      'system-nightshift-agent-optimize-bound-default',
    ]);
    expect(base.instructions).toContain('/workspace/memories/.index.json');
    expect(base.instructions).not.toContain('{{semantic_memory_load_step}}');
  });

  it('hydrates and reinforces decision trees through the combined workflows', async () => {
    const base = await baseFor(
      getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        decisionTreesEnabled: true,
        ...ALL_PLUGINS,
      })
    );

    // One pre-hook, not two: decision trees hydrate as a third parallel branch of the
    // combined materialize workflow, which already carries the sandbox_id they need.
    expect(base.workflow_ids).toEqual([
      'system-nightshift-sandbox-materialize-workspace-bound-default',
    ]);
    // One post-hook, not two: reinforcement is the tail phase of the combined optimize
    // workflow. Listing both would reinforce every round twice.
    expect(base.post_execution_workflow_ids).toEqual([
      'system-nightshift-agent-optimize-bound-default',
    ]);
    expect(base.instructions).toContain('/workspace/decision-trees/monitors.md');
    expect(base.instructions).not.toContain('{{decision_trees_load_step}}');
    expect(base.instructions).not.toContain('{{decision_trees_section}}');
  });

  it('drops both cortex workflows when cortex is disabled', async () => {
    const base = await baseFor(
      getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: false, ...ALL_PLUGINS })
    );

    expect(base.workflow_ids).toBeUndefined();
    expect(base.post_execution_workflow_ids).toBeUndefined();
    expect(base.instructions).not.toContain('/workspace/cortex/');
    expect(base.instructions).not.toContain('<knowledge_cortex>');
    expect(base.instructions).not.toContain('{{cortex_load_step}}');
    expect(base.instructions).not.toContain('{{knowledge_cortex_section}}');
  });

  it('drops the pre-execution workflow when cortex is on but the sandbox is not configured', async () => {
    const base = await baseFor(
      getInvestigationAgentType({ sandboxEnabled: false, cortexEnabled: true, ...ALL_PLUGINS })
    );

    expect(base.workflow_ids).toBeUndefined();
    expect(base.post_execution_workflow_ids).toEqual([
      'system-nightshift-agent-optimize-bound-default',
    ]);
    expect(base.tools?.[0]?.tool_ids).toEqual([
      ...INVESTIGATION_TOOL_IDS,
      PROPOSALS_CREATE_TOOL_ID,
    ]);
  });

  it('allow-lists the telemetry connector when one is configured', async () => {
    const base = await baseFor(
      getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        telemetryConnectorId: 'elasticsearch-telemetry',
        ...ALL_PLUGINS,
      })
    );

    expect(base.connector_ids).toEqual(['elasticsearch-telemetry']);
  });

  it('offers the investigation and proposal tools only when their plugins are enabled', async () => {
    const base = await baseFor(
      getInvestigationAgentType({
        sandboxEnabled: false,
        cortexEnabled: false,
        investigationToolsEnabled: false,
        proposalsEnabled: false,
      })
    );

    expect(base.tools?.[0]?.tool_ids).toEqual([]);
  });

  it('instructs the agent to record its findings with the investigation tools', async () => {
    const { instructions } = await baseFor(
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
    expect(instructions).toContain('"category": "todo"');
    expect(instructions).toContain('**Check before you finish.**');
    expect(instructions).not.toContain('blind_spots');
    expect(instructions).not.toMatch(/\d0-(critical|high|medium|low)/);
  });

  it("runs its hooks through the space's bound hook entry points and keeps its telemetry connectors", async () => {
    const base = await baseFor(
      getInvestigationAgentType({
        sandboxEnabled: true,
        cortexEnabled: true,
        ...ALL_PLUGINS,
        telemetryConfig: {
          telemetry_connector_id: 'legacy',
          telemetry_targets: {
            c0: { connector_id: 'c0-telemetry' },
            orca: { connector_id: 'orca-telemetry' },
          },
        },
      }),
      'sa-a'
    );

    expect(base.connector_ids).toEqual(['legacy', 'c0-telemetry', 'orca-telemetry']);
    expect(base.workflow_ids).toEqual([
      'system-nightshift-sandbox-materialize-workspace-bound-sa-a',
    ]);
    expect(base.post_execution_workflow_ids).toEqual([
      'system-nightshift-agent-optimize-bound-sa-a',
    ]);
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

    const baseWithoutCustomContext = async (): Promise<AgentBaseConfiguration> =>
      baseFor(
        getInvestigationAgentType({ sandboxEnabled: true, cortexEnabled: true, ...ALL_PLUGINS }),
        ctx.spaceId
      );

    it("appends the space's custom context to the instructions on every resolve", async () => {
      const getCustomContextInstructions = jest.fn().mockResolvedValue(CUSTOM_CONTEXT);

      const base = await resolveBase(getCustomContextInstructions);

      const plain = await baseWithoutCustomContext();
      expect(getCustomContextInstructions).toHaveBeenCalledWith(ctx);
      expect(base.instructions).toBe(`${plain.instructions?.trimEnd()}\n\n${CUSTOM_CONTEXT}\n`);
      expect(base.tools).toEqual(plain.tools);
    });

    it('keeps the base instructions when the space has no custom context', async () => {
      const base = await resolveBase(jest.fn().mockResolvedValue(''));

      expect(base.instructions).toBe((await baseWithoutCustomContext()).instructions);
    });

    it('keeps the base instructions and logs a warning when custom context cannot be read', async () => {
      const logger = loggerMock.create();

      const base = await resolveBase(jest.fn().mockRejectedValue(new Error('boom')), logger);

      expect(base.instructions).toBe((await baseWithoutCustomContext()).instructions);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to load custom context for space "space-a": boom'
      );
    });
  });
});

it('allows configured telemetry connectors on the single investigator type', async () => {
  const base = await baseFor(
    getInvestigationAgentType({
      sandboxEnabled: true,
      cortexEnabled: false,
      ...ALL_PLUGINS,
      telemetryConfig: {
        telemetry_connector_id: 'legacy',
        telemetry_targets: {
          c0: { connector_id: 'customer0' },
          orca: { connector_id: 'orca' },
          alias: { connector_id: 'orca' },
        },
      },
    })
  );
  expect(base.connector_ids).toEqual(['legacy', 'customer0', 'orca']);
});
