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
import { findRulesTool, SECURITY_FIND_RULES_TOOL_ID } from './find_rules_tool';

describe('findRulesTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const mockRulesClient = {
    find: jest.fn(),
    get: jest.fn(),
    enableRule: jest.fn(),
    disableRule: jest.fn(),
    create: jest.fn(),
  };

  const tool = findRulesTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);

    const coreStart = coreMock.createStart();
    mockCore.getStartServices.mockResolvedValue([
      coreStart,
      { alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue(mockRulesClient) } },
      {},
    ]);
  });

  describe('schema', () => {
    it('validates minimal input (empty object)', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('validates full input with all optional fields', () => {
      const validInput = {
        search_term: 'brute force',
        rule_type: 'eql',
        enabled: true,
        is_prebuilt: false,
        tags: ['attack.t1110'],
        per_page: 50,
        page: 2,
        sort_field: 'severity',
        sort_order: 'desc',
      };

      const result = tool.schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects invalid rule_type', () => {
      const result = tool.schema.safeParse({ rule_type: 'invalid_type' });
      expect(result.success).toBe(false);
    });

    it('rejects per_page below minimum', () => {
      const result = tool.schema.safeParse({ per_page: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects per_page above maximum', () => {
      const result = tool.schema.safeParse({ per_page: 101 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid sort_field', () => {
      const result = tool.schema.safeParse({ sort_field: 'nonexistent' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid sort_order', () => {
      const result = tool.schema.safeParse({ sort_order: 'up' });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_FIND_RULES_TOOL_ID);
    });
  });

  describe('handler', () => {
    it('returns paginated rules', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 2,
        page: 1,
        perPage: 20,
        data: [
          {
            id: 'rule-1',
            name: 'Brute Force Detection',
            enabled: true,
            tags: ['attack.t1110'],
            updatedAt: '2025-01-01T00:00:00Z',
            params: {
              ruleId: 'rule-id-1',
              type: 'eql',
              severity: 'high',
              riskScore: 73,
              description: 'Detects brute force login attempts',
              index: ['logs-*'],
              immutable: false,
            },
          },
          {
            id: 'rule-2',
            name: 'Malware Detection',
            enabled: false,
            tags: ['malware'],
            updatedAt: '2025-01-02T00:00:00Z',
            params: {
              ruleId: 'rule-id-2',
              type: 'query',
              severity: 'critical',
              riskScore: 99,
              description: 'Detects known malware signatures',
              index: ['filebeat-*'],
              immutable: true,
            },
          },
        ],
      });

      const result = await tool.handler(
        { per_page: 20, page: 1 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              total: 2,
              page: 1,
              per_page: 20,
              rules: [
                {
                  id: 'rule-1',
                  rule_id: 'rule-id-1',
                  name: 'Brute Force Detection',
                  type: 'eql',
                  enabled: true,
                  severity: 'high',
                  risk_score: 73,
                  tags: ['attack.t1110'],
                  description: 'Detects brute force login attempts',
                  updated_at: '2025-01-01T00:00:00Z',
                  index_patterns: ['logs-*'],
                  is_prebuilt: false,
                },
                {
                  id: 'rule-2',
                  rule_id: 'rule-id-2',
                  name: 'Malware Detection',
                  type: 'query',
                  enabled: false,
                  severity: 'critical',
                  risk_score: 99,
                  tags: ['malware'],
                  description: 'Detects known malware signatures',
                  updated_at: '2025-01-02T00:00:00Z',
                  index_patterns: ['filebeat-*'],
                  is_prebuilt: true,
                },
              ],
            },
          },
        ],
      });
    });

    it('builds KQL filter from params', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 0,
        page: 1,
        perPage: 20,
        data: [],
      });

      await tool.handler(
        {
          per_page: 20,
          page: 1,
          rule_type: 'eql',
          enabled: true,
          is_prebuilt: false,
          tags: ['attack.t1110', 'windows'],
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.find).toHaveBeenCalledWith({
        options: {
          filter:
            'alert.attributes.enabled: true AND alert.attributes.params.immutable: false AND alert.attributes.params.type: eql AND alert.attributes.tags: "attack.t1110" AND alert.attributes.tags: "windows"',
          search: undefined,
          searchFields: ['name', 'params.index'],
          page: 1,
          perPage: 20,
          sortField: 'updated_at',
          sortOrder: 'desc',
        },
      });
    });

    it('passes search_term to search field', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 0,
        page: 1,
        perPage: 20,
        data: [],
      });

      await tool.handler(
        { per_page: 20, page: 1, search_term: 'brute force' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.find).toHaveBeenCalledWith({
        options: expect.objectContaining({
          search: 'brute force',
        }),
      });
    });

    it('handles empty results', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 0,
        page: 1,
        perPage: 20,
        data: [],
      });

      const result = await tool.handler(
        { per_page: 20, page: 1 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              total: 0,
              page: 1,
              per_page: 20,
              rules: [],
            },
          },
        ],
      });
    });

    it('handles errors', async () => {
      mockRulesClient.find.mockRejectedValue(new Error('Rules search failed'));

      const result = await tool.handler(
        { per_page: 20, page: 1 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Error searching rules: Rules search failed',
            },
          },
        ],
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('uses custom pagination and sort params', async () => {
      mockRulesClient.find.mockResolvedValue({
        total: 0,
        page: 3,
        perPage: 50,
        data: [],
      });

      await tool.handler(
        { per_page: 50, page: 3, sort_field: 'name', sort_order: 'asc' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockRulesClient.find).toHaveBeenCalledWith({
        options: expect.objectContaining({
          page: 3,
          perPage: 50,
          sortField: 'name',
          sortOrder: 'asc',
        }),
      });
    });
  });
});
