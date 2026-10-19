/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import {
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
} from '@kbn/agent-builder-server/tools';
import {
  ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID,
  ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID,
  ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS,
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';

describe('endpointForensicAnalysisSkill', () => {
  it('uses an allow-listed built-in skill id', () => {
    expect(isAllowedBuiltinSkill(ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID)).toBe(true);
  });

  it('binds Osquery live-query tools so they are available when the skill loads', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];

    for (const osqueryToolId of ENDPOINT_FORENSIC_OSQUERY_TOOL_IDS) {
      expect(registryTools).toContain(osqueryToolId);
    }

    expect(registryTools).toContain('osquery.run_live_query');
    expect(registryTools).toContain('osquery.get_live_query_results');
  });

  it('exposes ES|QL and index discovery platform registry tools only (read-only scope)', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];

    expect(registryTools).toContain(platformCoreTools.listIndices);
    expect(registryTools).toContain(platformCoreTools.getIndexMapping);
    expect(registryTools).toContain(platformCoreTools.generateEsql);
    expect(registryTools).toContain(platformCoreTools.executeEsql);
  });

  it('defines the telemetry discovery and IoC extraction inline tools', async () => {
    const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];
    expect(inlineTools.map(({ id }) => id)).toEqual([
      ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID,
      ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID,
    ]);
  });

  it('presents IoCs as a markdown table to the analyst and as structured categories otherwise', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '| Indicator type | Value | First seen | Source event |'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Answering with a structured output schema that has an indicators field'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('Do not also render the indicators');
  });

  it('extract_iocs reads file.hash.sha256 from file events into structured hash indicators', async () => {
    const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];
    const extractIocs = inlineTools.find(
      (tool) => tool.id === 'security.endpoint_forensic.extract_iocs'
    ) as { handler: (args: unknown, context: unknown) => Promise<unknown> };
    // A dropped payload: the file event has a hash but no process of its own.
    const esqlQuery = jest.fn().mockResolvedValue({
      columns: [{ name: 'file.hash.sha256' }, { name: '@timestamp' }],
      values: [['dropped-payload-hash', '2026-01-01T00:00:00Z']],
    });

    const response = (await extractIocs.handler(
      { hosts: ['host-a'] },
      { esClient: { asCurrentUser: { esql: { query: esqlQuery } } } }
    )) as { results: Array<{ data: { shas: Array<{ value: string }> } }> };

    expect(esqlQuery.mock.calls[0][0].query).toContain('file.hash.sha256');
    expect(response.results[0].data.shas).toEqual([
      { value: 'dropped-payload-hash', comment: 'Observed in file telemetry' },
    ]);
  });

  it('extract_iocs keeps uncorrelated network destinations out of IoCs', async () => {
    const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];
    const extractIocs = inlineTools.find(
      (tool) => tool.id === 'security.endpoint_forensic.extract_iocs'
    ) as { handler: (args: unknown, context: unknown) => Promise<unknown> };
    const esqlQuery = jest.fn().mockResolvedValue({
      columns: [{ name: 'destination.ip' }, { name: 'destination.domain' }, { name: '@timestamp' }],
      values: [
        ['10.0.0.5', null, '2026-01-01T00:00:00Z'],
        ['8.8.8.8', null, '2026-01-01T00:01:00Z'],
        [null, 'SRV-DC01', '2026-01-01T00:02:00Z'],
      ],
    });

    const response = (await extractIocs.handler(
      { hosts: ['host-a'] },
      { esClient: { asCurrentUser: { esql: { query: esqlQuery } } } }
    )) as {
      results: Array<{
        data: {
          ips?: Array<{ value: string }>;
          observed_network_destinations: string[];
          guidance: string;
        };
      }>;
    };
    const data = response.results[0].data;

    expect(data.ips).toBeUndefined();
    expect(data.observed_network_destinations).toEqual(['8.8.8.8', 'SRV-DC01']);
    expect(data.guidance).toContain('require attack correlation before adding them to ips');
  });

  it('routes conflicting antivirus / configuration issues to elastic-defend-configuration-troubleshooting', () => {
    expect(endpointForensicAnalysisSkill.description).toContain('antivirus');
    expect(endpointForensicAnalysisSkill.description).toContain(
      'elastic-defend-configuration-troubleshooting'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Conflicting or incompatible security software'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('antivirus');
    expect(endpointForensicAnalysisSkill.content).toContain('Naming a specific host does');
    expect(endpointForensicAnalysisSkill.content).toContain(
      'elastic-defend-configuration-troubleshooting'
    );
  });

  it('routes the installed-but-unenrolled state to the ES|QL path', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '**If Osquery IS installed but NO agents are enrolled**'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('agents_enrolled: false');
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Do **not** call `osquery.run_live_query` — it has no agent to run on.'
    );
  });

  it('distinguishes an inconclusive capability check from "no agents"', () => {
    expect(endpointForensicAnalysisSkill.content).toContain('`enrollment_status` is `unknown`');
    expect(endpointForensicAnalysisSkill.content).toContain('NOT the same as "no agents"');
  });

  it('scopes discover_telemetry to the ES|QL path only', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '**On the ES|QL / Defend telemetry path only**'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('it is ES|QL-only');
    // The unconditional "call it first" phrasing is what made Process §1 and
    // Phase 0 contradict each other; it must be gone.
    expect(endpointForensicAnalysisSkill.content).not.toMatch(
      /^Call `[^`]+` first with host names/m
    );
  });

  it('requires resolve_agent_ids before dispatching a live query', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '**Always** call `osquery.resolve_agent_ids` before `osquery.run_live_query`'
    );
  });

  it.each(['live-state instructions', 'read-only guardrail'])(
    'requires partial-result follow-up in the %s',
    (section) => {
      const content = endpointForensicAnalysisSkill.content;
      const instructions =
        section === 'live-state instructions'
          ? content.slice(content.indexOf('### 2b.'), content.indexOf('### 3.'))
          : content.slice(content.indexOf('## Tool Selection Guardrails'));

      expect(instructions).toMatch(/status: dispatched.*status: partial/);
      expect(instructions).toContain('osquery.get_live_query_results');
      expect(content).toContain('Do not treat rows from a partial response as complete');
    }
  );

  // github-actions review #4975398846: `osquery.*` tools are registered only
  // when the Osquery plugin's `agentBuilderTools` flag is on (default false), so
  // a skill that unconditionally mandates `osquery.check_integration` hands
  // default deployments an instruction they cannot execute — and an otherwise
  // valid ES|QL investigation can stall before reaching its fallback.
  it('routes to the ES|QL path when the osquery tools are not registered', () => {
    expect(endpointForensicAnalysisSkill.content).toContain(
      '**Availability gate (read this before any `osquery.*` step).**'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'If `osquery.check_integration` is not in your tool list, the entire Osquery path is unavailable'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Every rule below that names an `osquery.*` tool applies only when those tools are present.'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'only when the `osquery.*` tools are available and `check_integration` reports a capable stack'
    );
    // The unconditional "always call it" phrasing is what made the skill
    // unusable without the flag; it must not come back.
    expect(endpointForensicAnalysisSkill.content).not.toContain(
      '- **Always** call `osquery.check_integration` before using any other `osquery.*` tool.'
    );
  });

  describe(`${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID} handler`, () => {
    const catIndices = jest.fn();
    const context = {
      esClient: { asCurrentUser: { cat: { indices: catIndices } } },
    } as unknown as ToolHandlerContext;

    const getTool = async (): Promise<BuiltinSkillBoundedTool> => {
      const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];
      const tool = inlineTools.find(
        ({ id }) => id === ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID
      );
      if (tool?.type !== ToolType.builtin) {
        throw new Error(
          `${ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID} is not a builtin inline tool`
        );
      }
      return tool;
    };

    const runHandler = async (args: Record<string, unknown> = {}) => {
      const tool = await getTool();
      const toolReturn = await tool.handler(args, context);
      if (!isToolHandlerStandardReturn(toolReturn)) {
        throw new Error('discover_telemetry did not return a standard tool result');
      }
      expect(toolReturn.results).toHaveLength(1);
      expect(toolReturn.results[0].type).toBe(ToolResultType.other);
      return toolReturn.results[0].data as Record<string, unknown>;
    };

    beforeEach(() => {
      catIndices.mockReset();
    });

    it('returns the recommended Defend index patterns even when cat.indices fails', async () => {
      catIndices.mockRejectedValue(new Error('index_not_found_exception'));

      const data = await runHandler({ hosts: ['WKSTN-RECV01'] });

      expect(data.recommended_indices).toEqual([
        'logs-endpoint.events.process-*',
        'logs-endpoint.events.network-*',
        'logs-endpoint.events.file-*',
        'logs-endpoint.events.registry-*',
      ]);
      expect(data.available_indices).toEqual([]);
      expect(data.scoped_hosts).toEqual(['WKSTN-RECV01']);
      expect(data.time_window_hours).toBe(72);
    });

    it('lists available Defend indices from cat.indices', async () => {
      catIndices.mockResolvedValue([
        { index: 'logs-endpoint.events.process-default' },
        { index: undefined },
        { index: 'logs-endpoint.events.network-default' },
      ]);

      const data = await runHandler({ hosts: ['SRV-DC01'], time_window_hours: 24 });

      expect(catIndices).toHaveBeenCalledWith({
        index: 'logs-endpoint.events.*',
        format: 'json',
        h: 'index',
      });
      expect(data.available_indices).toEqual([
        'logs-endpoint.events.process-default',
        'logs-endpoint.events.network-default',
      ]);
      expect(data.scoped_hosts).toEqual(['SRV-DC01']);
      expect(data.time_window_hours).toBe(24);
    });
  });

  describe(`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID} handler`, () => {
    const getTool = async (): Promise<BuiltinSkillBoundedTool> => {
      const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];
      const tool = inlineTools.find(({ id }) => id === ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID);
      if (tool?.type !== ToolType.builtin) {
        throw new Error(`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID} is not a builtin inline tool`);
      }
      return tool;
    };

    // github-actions review #4958365269: an empty `hosts` array built an
    // `IN ()` ES|QL clause whose syntax error was swallowed, so a malformed call
    // reported "no indicators found" instead of failing.
    it('bounds hosts so an empty array cannot produce a false-negative', async () => {
      const tool = await getTool();
      const schema = (tool as unknown as { schema: z.ZodTypeAny }).schema;

      expect(schema.safeParse({ hosts: [] }).success).toBe(false);
      expect(
        schema.safeParse({ hosts: Array.from({ length: 51 }, (_, i) => `h${i}`) }).success
      ).toBe(false);
      expect(schema.safeParse({ hosts: ['WKSTN-RECV01'] }).success).toBe(true);
      expect(schema.safeParse({ hosts: ['a'.repeat(256)] }).success).toBe(false);
    });

    it('sorts by @timestamp ASC before LIMIT so the kept comment is the earliest occurrence', async () => {
      const tool = await getTool();
      const esqlQuery = jest.fn().mockResolvedValue({ columns: [], values: [] });

      await tool.handler({ hosts: ['WKSTN-RECV01'] }, {
        esClient: { asCurrentUser: { esql: { query: esqlQuery } } },
      } as unknown as ToolHandlerContext);

      expect(esqlQuery).toHaveBeenCalledTimes(1);
      const query = esqlQuery.mock.calls[0][0].query as string;
      expect(query).toMatch(/\| SORT @timestamp ASC \| LIMIT 500/);
      expect(query.indexOf('| SORT @timestamp ASC')).toBeLessThan(query.indexOf('| LIMIT 500'));
    });

    it('escapes host names so a quote cannot break out of the ES|QL filter', async () => {
      const tool = await getTool();
      const esqlQuery = jest.fn().mockResolvedValue({ columns: [], values: [] });

      await tool.handler({ hosts: ['host"name'] }, {
        esClient: { asCurrentUser: { esql: { query: esqlQuery } } },
      } as unknown as ToolHandlerContext);

      const query = esqlQuery.mock.calls[0][0].query as string;
      expect(query).toContain('"host\\"name"');
    });
  });
});
