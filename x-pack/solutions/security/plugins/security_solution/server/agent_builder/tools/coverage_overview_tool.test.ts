/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { coreMock } from '@kbn/core/server/mocks';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { coverageOverviewTool, SECURITY_COVERAGE_OVERVIEW_TOOL_ID } from './coverage_overview_tool';

describe('coverageOverviewTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const mockRulesClient = {
    find: jest.fn(),
  };

  const tool = coverageOverviewTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);

    const coreStart = coreMock.createStart();
    Object.assign(coreStart.elasticsearch.client, {
      asInternalUser: mockEsClient.asInternalUser,
      asCurrentUser: mockEsClient.asCurrentUser,
    });
    mockCore.getStartServices.mockResolvedValue([
      coreStart,
      { alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue(mockRulesClient) } },
      {},
    ]);
  });

  describe('schema', () => {
    it('validates empty object (all fields optional)', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('validates with search_term', () => {
      const result = tool.schema.safeParse({ search_term: 'credential access' });
      expect(result.success).toBe(true);
    });

    it('validates with activity filter', () => {
      const result = tool.schema.safeParse({ activity: ['enabled'] });
      expect(result.success).toBe(true);
    });

    it('validates with source filter', () => {
      const result = tool.schema.safeParse({ source: ['prebuilt', 'custom'] });
      expect(result.success).toBe(true);
    });

    it('validates with all fields provided', () => {
      const result = tool.schema.safeParse({
        search_term: 'lateral movement',
        activity: ['enabled', 'disabled'],
        source: ['custom'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid activity value', () => {
      const result = tool.schema.safeParse({ activity: ['active'] });
      expect(result.success).toBe(false);
    });

    it('rejects invalid source value', () => {
      const result = tool.schema.safeParse({ source: ['builtin'] });
      expect(result.success).toBe(false);
    });

    it('rejects non-string search_term', () => {
      const result = tool.schema.safeParse({ search_term: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_COVERAGE_OVERVIEW_TOOL_ID);
    });
  });

  describe('handler', () => {
    it('computes coverage from rules with MITRE threat mappings', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 2,
        data: [
          {
            id: 'rule-1',
            name: 'Brute Force Detection',
            enabled: true,
            params: {
              threat: [
                {
                  tactic: { id: 'TA0006' },
                  technique: [{ id: 'T1110', subtechnique: [{ id: 'T1110.001' }] }],
                },
              ],
            },
          },
          {
            id: 'rule-2',
            name: 'Lateral Movement via RDP',
            enabled: true,
            params: {
              threat: [
                {
                  tactic: { id: 'TA0008' },
                  technique: [{ id: 'T1021' }],
                },
              ],
            },
          },
        ],
      });

      const result = await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              total_rules: 2,
              enabled_rules: 2,
              disabled_rules: 0,
              covered_techniques: 5,
              unmapped_rules: 0,
              coverage: expect.arrayContaining([
                expect.objectContaining({ technique_id: 'TA0006', rule_count: 1 }),
                expect.objectContaining({ technique_id: 'T1110', rule_count: 1 }),
                expect.objectContaining({ technique_id: 'T1110.001', rule_count: 1 }),
                expect.objectContaining({ technique_id: 'TA0008', rule_count: 1 }),
                expect.objectContaining({ technique_id: 'T1021', rule_count: 1 }),
              ]),
              unmapped_rule_names: [],
              message: expect.stringContaining('5 MITRE techniques covered by 2 rules'),
            },
          },
        ],
      });
    });

    it('identifies unmapped rules', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 1,
        data: [
          {
            id: 'rule-unmapped',
            name: 'Custom Alert',
            enabled: true,
            params: {},
          },
        ],
      });

      const result = await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              total_rules: 1,
              unmapped_rules: 1,
              unmapped_rule_names: ['Custom Alert'],
              covered_techniques: 0,
              coverage: [],
            }),
          },
        ],
      });
    });

    it('filters by activity', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 2,
        data: [
          {
            id: 'rule-1',
            name: 'Enabled Rule',
            enabled: true,
            params: {
              threat: [{ tactic: { id: 'TA0001' } }],
            },
          },
          {
            id: 'rule-2',
            name: 'Disabled Rule',
            enabled: false,
            params: {
              threat: [{ tactic: { id: 'TA0002' } }],
            },
          },
        ],
      });

      const result = await tool.handler(
        { activity: ['enabled'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              total_rules: 1,
              enabled_rules: 1,
              disabled_rules: 0,
              covered_techniques: 1,
            }),
          },
        ],
      });
    });

    it('filters by source', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 2,
        data: [
          {
            id: 'rule-prebuilt',
            name: 'Prebuilt Rule',
            enabled: true,
            params: {
              immutable: true,
              threat: [{ tactic: { id: 'TA0001' } }],
            },
          },
          {
            id: 'rule-custom',
            name: 'Custom Rule',
            enabled: true,
            params: {
              immutable: false,
              threat: [{ tactic: { id: 'TA0002' } }],
            },
          },
        ],
      });

      const result = await tool.handler(
        { source: ['custom'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              total_rules: 1,
              covered_techniques: 1,
              coverage: [expect.objectContaining({ technique_id: 'TA0002', rule_count: 1 })],
            }),
          },
        ],
      });
    });

    it('filters by search_term matching rule name', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 2,
        data: [
          {
            id: 'rule-1',
            name: 'Brute Force Attack',
            enabled: true,
            params: {
              threat: [{ tactic: { id: 'TA0006' } }],
            },
          },
          {
            id: 'rule-2',
            name: 'Malware Detection',
            enabled: true,
            params: {
              threat: [{ tactic: { id: 'TA0002' } }],
            },
          },
        ],
      });

      const result = await tool.handler(
        { search_term: 'brute' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              total_rules: 1,
              coverage: [expect.objectContaining({ technique_id: 'TA0006', rule_count: 1 })],
            }),
          },
        ],
      });
    });

    it('filters by search_term matching index pattern', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 2,
        data: [
          {
            id: 'rule-1',
            name: 'Endpoint Rule',
            enabled: true,
            params: {
              index: ['logs-endpoint.events.*'],
              threat: [{ tactic: { id: 'TA0001' } }],
            },
          },
          {
            id: 'rule-2',
            name: 'Network Rule',
            enabled: true,
            params: {
              index: ['packetbeat-*'],
              threat: [{ tactic: { id: 'TA0002' } }],
            },
          },
        ],
      });

      const result = await tool.handler(
        { search_term: 'endpoint' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              total_rules: 1,
              coverage: [expect.objectContaining({ technique_id: 'TA0001', rule_count: 1 })],
            }),
          },
        ],
      });
    });

    it('handles pagination across multiple pages', async () => {
      mockRulesClient.find
        .mockResolvedValueOnce({
          total: 2,
          data: [
            {
              id: 'rule-1',
              name: 'Rule A',
              enabled: true,
              params: { threat: [{ tactic: { id: 'TA0001' } }] },
            },
          ],
        })
        .mockResolvedValueOnce({
          total: 2,
          data: [
            {
              id: 'rule-2',
              name: 'Rule B',
              enabled: false,
              params: { threat: [{ tactic: { id: 'TA0002' } }] },
            },
          ],
        });

      const result = await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.find).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: expect.objectContaining({
              total_rules: 2,
              enabled_rules: 1,
              disabled_rules: 1,
              covered_techniques: 2,
            }),
          },
        ],
      });
    });

    it('returns empty coverage when no rules exist', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 0,
        data: [],
      });

      const result = await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              total_rules: 0,
              enabled_rules: 0,
              disabled_rules: 0,
              covered_techniques: 0,
              unmapped_rules: 0,
              coverage: [],
              unmapped_rule_names: [],
              message:
                'Coverage analysis complete: 0 MITRE techniques covered by 0 rules (0 enabled). 0 rules are not mapped to any MITRE technique.',
            },
          },
        ],
      });
    });

    it('handles errors gracefully', async () => {
      mockRulesClient.find.mockRejectedValue(new Error('Rules fetch failed'));

      const result = await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Error fetching coverage overview: Rules fetch failed',
            },
          },
        ],
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
