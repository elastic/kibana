/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import {
  GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID,
  createGetInstalledRulesMitreCoverageTool,
} from './get_installed_rules_mitre_coverage_tool';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';

jest.mock('../../../lib/detection_engine/rule_management/logic/search/find_rules', () => ({
  findRules: jest.fn(),
}));

const mockFindRules = jest.mocked(findRules);

const makeTacticBucket = (id: string, name: string, count: number) => ({
  key: id,
  doc_count: count,
  name: { buckets: [{ key: name }] },
});

const makeTechniqueBucket = (
  id: string,
  name: string,
  count: number,
  subtechniques: Array<{ id: string; name: string; count: number }> = []
) => ({
  key: id,
  doc_count: count,
  name: { buckets: [{ key: name }] },
  subtechniques: {
    buckets: subtechniques.map((s) => ({
      key: s.id,
      doc_count: s.count,
      name: { buckets: [{ key: s.name }] },
    })),
  },
});

const createMockDeps = () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);

  const mockRulesClientInstance = {};
  const alertingPlugin = {
    getRulesClientWithRequest: jest.fn().mockResolvedValue(mockRulesClientInstance),
  };

  mockCore.getStartServices.mockResolvedValue([
    mockCoreStart,
    { alerting: alertingPlugin },
    {},
  ] as never);

  return { getStartServices: mockCore.getStartServices, mockLogger, mockRequest };
};

describe('createGetInstalledRulesMitreCoverageTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tool definition', () => {
    it('has the correct id and type', () => {
      const { getStartServices, mockLogger } = createMockDeps();
      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });

      expect(tool.id).toBe(GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID);
      expect(tool.type).toBe(ToolType.builtin);
    });

    it('has the correct tool id constant', () => {
      expect(GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID).toBe(
        'security.get_installed_rules_mitre_coverage'
      );
    });
  });

  describe('handler — happy path', () => {
    it('returns full coverage data with tactics, techniques, and subtechniques', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockResolvedValue({
        total: 100,
        page: 1,
        perPage: 0,
        data: [],
        aggregations: {
          by_tactic: {
            buckets: [
              makeTacticBucket('TA0001', 'Initial Access', 25),
              makeTacticBucket('TA0002', 'Execution', 15),
            ],
          },
          by_technique: {
            buckets: [
              makeTechniqueBucket('T1059', 'Command and Scripting Interpreter', 8, [
                { id: 'T1059.001', name: 'PowerShell', count: 5 },
                { id: 'T1059.003', name: 'Windows Command Shell', count: 2 },
              ]),
              makeTechniqueBucket('T1055', 'Process Injection', 3),
            ],
          },
          with_mitre_mapping: { doc_count: 80 },
        },
      } as never);

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      const result = await tool.handler({}, context);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual({
          total_installed_rules: 100,
          total_with_mitre_mapping: 80,
          tactics: [
            { id: 'TA0001', name: 'Initial Access', count: 25 },
            { id: 'TA0002', name: 'Execution', count: 15 },
          ],
          techniques: [
            {
              id: 'T1059',
              name: 'Command and Scripting Interpreter',
              count: 8,
              subtechniques: [
                { id: 'T1059.001', name: 'PowerShell', count: 5 },
                { id: 'T1059.003', name: 'Windows Command Shell', count: 2 },
              ],
            },
            {
              id: 'T1055',
              name: 'Process Injection',
              count: 3,
            },
          ],
        });
      }
    });

    it('omits subtechniques field entirely when a technique has none covered', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockResolvedValue({
        total: 10,
        page: 1,
        perPage: 0,
        data: [],
        aggregations: {
          by_tactic: { buckets: [] },
          by_technique: {
            buckets: [makeTechniqueBucket('T1055', 'Process Injection', 3)],
          },
          with_mitre_mapping: { doc_count: 10 },
        },
      } as never);

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      const result = await tool.handler({}, context);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        const technique = (
          result.results[0].data as { techniques: Array<{ subtechniques?: unknown }> }
        ).techniques[0];
        expect('subtechniques' in technique).toBe(false);
      }
    });

    it('uses the id as name fallback when name sub-agg has no buckets', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockResolvedValue({
        total: 5,
        page: 1,
        perPage: 0,
        data: [],
        aggregations: {
          by_tactic: {
            buckets: [{ key: 'TA0001', doc_count: 5, name: { buckets: [] } }],
          },
          by_technique: { buckets: [] },
          with_mitre_mapping: { doc_count: 5 },
        },
      } as never);

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      const result = await tool.handler({}, context);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        expect(
          (result.results[0].data as { tactics: Array<{ name: string }> }).tactics[0].name
        ).toBe('TA0001');
      }
    });

    it('passes perPage=0 and correct aggregation fields to findRules', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockResolvedValue({
        total: 0,
        page: 1,
        perPage: 0,
        data: [],
        aggregations: {
          by_tactic: { buckets: [] },
          by_technique: { buckets: [] },
          with_mitre_mapping: { doc_count: 0 },
        },
      } as never);

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      await tool.handler({}, context);

      expect(mockFindRules).toHaveBeenCalledWith(
        expect.objectContaining({
          perPage: 0,
          aggregations: expect.objectContaining({
            by_tactic: expect.objectContaining({
              terms: expect.objectContaining({ field: 'alert.attributes.params.threat.tactic.id' }),
            }),
            by_technique: expect.objectContaining({
              terms: expect.objectContaining({
                field: 'alert.attributes.params.threat.technique.id',
              }),
            }),
            with_mitre_mapping: expect.objectContaining({
              filter: expect.objectContaining({
                exists: { field: 'alert.attributes.params.threat.tactic.id' },
              }),
            }),
          }),
        })
      );
    });
  });

  describe('handler — no rules installed', () => {
    it('returns zero counts and empty arrays when no rules are installed', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockResolvedValue({
        total: 0,
        page: 1,
        perPage: 0,
        data: [],
        aggregations: {
          by_tactic: { buckets: [] },
          by_technique: { buckets: [] },
          with_mitre_mapping: { doc_count: 0 },
        },
      } as never);

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      const result = await tool.handler({}, context);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual({
          total_installed_rules: 0,
          total_with_mitre_mapping: 0,
          tactics: [],
          techniques: [],
        });
      }
    });
  });

  describe('handler — missing aggregations', () => {
    it('returns zero/empty values when aggregations are absent from findRules result', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockResolvedValue({
        total: 10,
        page: 1,
        perPage: 0,
        data: [],
      } as never);

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      const result = await tool.handler({}, context);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toEqual({
          total_installed_rules: 10,
          total_with_mitre_mapping: 0,
          tactics: [],
          techniques: [],
        });
      }
    });
  });

  describe('handler — error path', () => {
    it('returns ToolResultType.error and logs when findRules throws', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockRejectedValue(new Error('ES cluster unavailable'));

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      const result = await tool.handler({}, context);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0].data as { message: string }).message).toContain(
          'ES cluster unavailable'
        );
      }
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('ES cluster unavailable')
      );
    });

    it('handles non-Error thrown values in the error message', async () => {
      const { getStartServices, mockLogger, mockRequest } = createMockDeps();
      mockFindRules.mockRejectedValue('string error');

      const tool = createGetInstalledRulesMitreCoverageTool({
        getStartServices,
        logger: mockLogger,
      });
      const context = createToolHandlerContext(mockRequest, {} as never, mockLogger);
      const result = await tool.handler({}, context);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.error);
        expect((result.results[0].data as { message: string }).message).toContain('string error');
      }
    });
  });
});
