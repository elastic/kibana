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
});
