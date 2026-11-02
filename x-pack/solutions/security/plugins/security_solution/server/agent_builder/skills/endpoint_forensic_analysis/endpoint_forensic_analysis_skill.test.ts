/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';

describe('endpointForensicAnalysisSkill', () => {
  it('uses an allow-listed built-in skill id', () => {
    expect(isAllowedBuiltinSkill(ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID)).toBe(true);
  });

  it('exposes ES|QL and index discovery platform registry tools only (read-only scope)', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];
    expect(registryTools).toEqual([
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
    ]);
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
      expect(data.searched_window).toMatchObject({ anchor: 'lookback' });
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
      const searched = data.searched_window as { start: string; end: string; anchor: string };
      expect(searched.anchor).toBe('lookback');
      expect(Date.parse(searched.end) - Date.parse(searched.start)).toBe(24 * 60 * 60 * 1000);
    });

    // The worker hands the agent an incident window. The tool is what applies the margin and
    // hands back the exact range, so the agent never does date arithmetic itself.
    it('anchors on the incident window and tells the agent the exact range to query', async () => {
      catIndices.mockResolvedValue([]);

      const data = await runHandler({
        hosts: ['azep-bd79f31511'],
        start: '2026-10-16T10:00:00.000Z',
        end: '2026-10-16T11:30:00.000Z',
        margin_hours: 2,
      });

      expect(data.searched_window).toEqual({
        start: '2026-10-16T08:00:00.000Z',
        end: '2026-10-16T13:30:00.000Z',
        anchor: 'incident',
      });
      expect(data.guidance).toContain(
        '@timestamp >= TO_DATETIME("2026-10-16T08:00:00.000Z") AND @timestamp <= TO_DATETIME("2026-10-16T13:30:00.000Z")'
      );
      expect(data.guidance).toContain('Events outside it are history');
    });

    it('searches the padded window when the incident bounds are the same instant', async () => {
      catIndices.mockResolvedValue([]);

      const data = await runHandler({
        hosts: ['WKSTN-RECV01'],
        start: '2026-10-16T10:00:00.000Z',
        end: '2026-10-16T10:00:00.000Z',
        margin_hours: 2,
      });

      expect(data.searched_window).toEqual({
        start: '2026-10-16T08:00:00.000Z',
        end: '2026-10-16T12:00:00.000Z',
        anchor: 'incident',
      });
    });

    it('rejects a start without an end', async () => {
      const tool = await getTool();
      await expect(
        tool.handler({ hosts: ['h'], start: '2026-10-16T10:00:00.000Z' }, context)
      ).rejects.toThrow();
    });
  });

  it('tells the agent to anchor on the incident and keep history apart from it', () => {
    const { content } = endpointForensicAnalysisSkill;
    expect(content).toContain('## Incident window');
    expect(content).toContain("Pass the incident's `start` and `end`");
    expect(content).toContain('Do not do date arithmetic yourself');
    expect(content).toContain('Containment based on history needs a concrete tie to this incident');
    expect(content).toContain('Always state the window that was searched');
    expect(content).toContain('copy the `start` and `end` of the `searched_window`');
  });

  // Initial access often precedes the first alert by hours or days; an incident-anchored
  // window must not turn patient zero into "history".
  it('lets the agent trace initial access back past the incident window', () => {
    const { content } = endpointForensicAnalysisSkill;
    expect(content).toContain('or the initial access that led to it');
    expect(content).toContain('Evidence reached that way is this incident too');
    expect(content).toMatch(
      /follow\s+its parent chain, dropper, or delivering connection backwards/
    );
    expect(content).toContain('patient zero for this incident, not history');
  });
});
