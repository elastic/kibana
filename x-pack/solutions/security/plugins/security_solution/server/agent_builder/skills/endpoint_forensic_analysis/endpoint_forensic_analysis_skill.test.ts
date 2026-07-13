/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType, ToolResultType, platformCoreTools } from '@kbn/agent-builder-common';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../../__mocks__/test_helpers';
import {
  ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID,
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  listSearchSources: jest.fn(),
}));

const mockListSearchSources = listSearchSources as jest.MockedFunction<typeof listSearchSources>;

interface DiscoverTelemetryData {
  recommended_indices: string[];
  available_indices: string[];
  scoped_hosts: string[];
  time_window_hours: number;
  guidance: string;
  resolution_warnings?: string[];
}

const getDiscoverData = (result: ToolHandlerStandardReturn): DiscoverTelemetryData =>
  result.results[0].data as unknown as DiscoverTelemetryData;

describe('endpointForensicAnalysisSkill', () => {
  it('uses an allow-listed built-in skill id', () => {
    expect(isAllowedBuiltinSkill(ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID)).toBe(true);
  });

  it('exposes ES|QL platform registry tools only (read-only scope)', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];
    expect(registryTools).toEqual([
      platformCoreTools.getIndexMapping,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
    ]);
  });

  it('exposes one inline discover_telemetry tool', async () => {
    const inlineTools = await endpointForensicAnalysisSkill.getInlineTools?.();
    expect(inlineTools).toHaveLength(1);
    expect(inlineTools![0].id).toBe(ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID);
  });

  describe('discover_telemetry inline tool handler', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();
    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await endpointForensicAnalysisSkill.getInlineTools?.();
      tool = inlineTools![0] as BuiltinSkillBoundedTool;
    });

    const callHandler = async (params: { hosts?: string[]; time_window_hours?: number }) =>
      tool.handler(
        params,
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      ) as Promise<ToolHandlerStandardReturn>;

    it('returns recommended indices, scoped hosts, and resolved sources via listSearchSources', async () => {
      mockListSearchSources.mockResolvedValue({
        data_streams: [
          {
            type: EsResourceType.dataStream,
            name: 'logs-endpoint.events.process-default',
            indices: ['.ds-logs-endpoint.events.process-default-001'],
            timestamp_field: '@timestamp',
          },
        ],
        indices: [{ type: EsResourceType.index, name: 'logs-endpoint.events.network-default' }],
        aliases: [],
        datasets: [],
        warnings: [],
      });

      const result = await callHandler({
        hosts: ['WKSTN-RECV01'],
        time_window_hours: 24,
      });

      expect(mockListSearchSources).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: 'logs-endpoint.events.*',
          perTypeLimit: 50,
          esClient: mockEsClient.asCurrentUser,
        })
      );
      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = getDiscoverData(result);
      expect(data.scoped_hosts).toEqual(['WKSTN-RECV01']);
      expect(data.time_window_hours).toBe(24);
      expect(data.available_indices).toEqual([
        'logs-endpoint.events.process-default',
        'logs-endpoint.events.network-default',
      ]);
      expect(data.recommended_indices).toEqual(
        expect.arrayContaining([
          'logs-endpoint.events.process-*',
          'logs-endpoint.events.registry-*',
        ])
      );
      expect(data.guidance).toContain('platform.core.generate_esql');
    });

    it('returns empty available_indices when listSearchSources throws', async () => {
      mockListSearchSources.mockRejectedValue(new Error('resolve unavailable'));

      const result = await callHandler({ hosts: ['SRV-DC01'] });
      const data = getDiscoverData(result);

      expect(data.available_indices).toEqual([]);
      expect(data.scoped_hosts).toEqual(['SRV-DC01']);
      expect(data.time_window_hours).toBe(72);
    });
  });
});
