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
import { manageExceptionsTool, SECURITY_MANAGE_EXCEPTIONS_TOOL_ID } from './manage_exceptions_tool';

describe('manageExceptionsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const mockRulesClient = {
    get: jest.fn(),
  };

  const tool = manageExceptionsTool(mockCore, mockLogger);

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
    it('validates a valid find operation', () => {
      const result = tool.schema.safeParse({
        operation: 'find',
        rule_id: 'rule-123',
      });
      expect(result.success).toBe(true);
    });

    it('validates a valid create operation', () => {
      const result = tool.schema.safeParse({
        operation: 'create',
        rule_id: 'rule-123',
        exception_name: 'Allow known process',
        entries: [
          { field: 'process.name', operator: 'included', type: 'match', value: 'svchost.exe' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('validates a valid find_overlaps operation', () => {
      const result = tool.schema.safeParse({
        operation: 'find_overlaps',
        rule_id: 'rule-123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing operation', () => {
      const result = tool.schema.safeParse({
        rule_id: 'rule-123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid operation', () => {
      const result = tool.schema.safeParse({
        operation: 'delete',
        rule_id: 'rule-123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing rule_id', () => {
      const result = tool.schema.safeParse({
        operation: 'find',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional search_term for find', () => {
      const result = tool.schema.safeParse({
        operation: 'find',
        rule_id: 'rule-123',
        search_term: 'svchost',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional exception_description for create', () => {
      const result = tool.schema.safeParse({
        operation: 'create',
        rule_id: 'rule-123',
        exception_name: 'Test',
        exception_description: 'A test exception',
        entries: [
          { field: 'process.name', operator: 'included', type: 'match', value: 'test.exe' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_MANAGE_EXCEPTIONS_TOOL_ID);
    });
  });

  describe('handler', () => {
    const mockRule = {
      name: 'Brute Force Detection',
      params: {
        exceptionsList: [
          { id: 'list-1', list_id: 'endpoint_list', namespace_type: 'single', type: 'detection' },
        ],
      },
    };

    describe('find operation', () => {
      it('searches exceptions index with rule_id filter and returns results', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'exc-1',
                _source: {
                  'exception-list': {
                    name: 'Allow svchost',
                    description: 'Known good process',
                    entries: [{ field: 'process.name', value: 'svchost.exe' }],
                    created_at: '2025-01-01T00:00:00Z',
                  },
                },
              },
            ],
          },
        } as never);

        const result = await tool.handler(
          { operation: 'find', rule_id: 'rule-123' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockRulesClient.get).toHaveBeenCalledWith({ id: 'rule-123' });
        expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
          index: '.kibana-exceptions-list-*',
          query: {
            bool: {
              must: [{ term: { 'exception-list.list_id': 'endpoint_list' } }],
            },
          },
          size: 100,
        });
        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: 1,
                exceptions: [
                  {
                    id: 'exc-1',
                    name: 'Allow svchost',
                    description: 'Known good process',
                    entries: [{ field: 'process.name', value: 'svchost.exe' }],
                    created_at: '2025-01-01T00:00:00Z',
                  },
                ],
                message: 'Found 1 exception(s) for rule "Brute Force Detection".',
              },
            },
          ],
        });
      });

      it('includes search_term as multi_match when provided', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { hits: [] },
        } as never);

        await tool.handler(
          { operation: 'find', rule_id: 'rule-123', search_term: 'svchost' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
          index: '.kibana-exceptions-list-*',
          query: {
            bool: {
              must: [
                { term: { 'exception-list.list_id': 'endpoint_list' } },
                {
                  multi_match: {
                    query: 'svchost',
                    fields: ['exception-list.name', 'exception-list.description'],
                  },
                },
              ],
            },
          },
          size: 100,
        });
      });

      it('returns empty results when rule has no exception lists', async () => {
        mockRulesClient.get.mockResolvedValue({
          name: 'No Exceptions Rule',
          params: { exceptionsList: [] },
        });

        const result = await tool.handler(
          { operation: 'find', rule_id: 'rule-456' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: 'No exception lists found for rule "No Exceptions Rule".',
                exceptions: [],
              },
            },
          ],
        });
      });
    });

    describe('create operation', () => {
      it('returns prepared exception payload', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);

        const result = await tool.handler(
          {
            operation: 'create',
            rule_id: 'rule-123',
            exception_name: 'Allow known updater',
            exception_description: 'Approved software updater',
            entries: [
              { field: 'process.name', operator: 'included', type: 'match', value: 'updater.exe' },
              {
                field: 'process.parent.name',
                operator: 'included',
                type: 'match',
                value: 'services.exe',
              },
            ],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'Exception "Allow known updater" with 2 condition(s) prepared for rule "Brute Force Detection". To apply, use the Kibana API: POST /api/detection_engine/rules/rule-123/exceptions with the items payload.',
                prepared_exception: {
                  name: 'Allow known updater',
                  description: 'Approved software updater',
                  type: 'simple',
                  entries: [
                    {
                      field: 'process.name',
                      operator: 'included',
                      type: 'match',
                      value: 'updater.exe',
                    },
                    {
                      field: 'process.parent.name',
                      operator: 'included',
                      type: 'match',
                      value: 'services.exe',
                    },
                  ],
                  rule_name: 'Brute Force Detection',
                  rule_id: 'rule-123',
                },
              },
            },
          ],
        });
      });

      it('defaults description to empty string when not provided', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);

        const result = await tool.handler(
          {
            operation: 'create',
            rule_id: 'rule-123',
            exception_name: 'Quick exception',
            entries: [
              { field: 'host.name', operator: 'included', type: 'match', value: 'dev-server' },
            ],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { results } = result as {
          results: Array<{ type: string; data: Record<string, unknown> }>;
        };
        const prepared = results[0].data.prepared_exception as Record<string, unknown>;
        expect(prepared.description).toBe('');
      });

      it('returns error when exception_name is missing', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);

        const result = await tool.handler(
          {
            operation: 'create',
            rule_id: 'rule-123',
            entries: [
              { field: 'process.name', operator: 'included', type: 'match', value: 'test.exe' },
            ],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'exception_name and entries are required to create an exception.',
              },
            },
          ],
        });
      });

      it('returns error when entries are missing', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);

        const result = await tool.handler(
          {
            operation: 'create',
            rule_id: 'rule-123',
            exception_name: 'Test exception',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'exception_name and entries are required to create an exception.',
              },
            },
          ],
        });
      });

      it('omits value from entry when not provided (exists type)', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);

        const result = await tool.handler(
          {
            operation: 'create',
            rule_id: 'rule-123',
            exception_name: 'Field exists check',
            entries: [{ field: 'process.code_signature', operator: 'included', type: 'exists' }],
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { results } = result as {
          results: Array<{ type: string; data: Record<string, unknown> }>;
        };
        const prepared = results[0].data.prepared_exception as Record<string, unknown>;
        const preparedEntries = prepared.entries as Array<Record<string, unknown>>;
        expect(preparedEntries[0]).toEqual({
          field: 'process.code_signature',
          operator: 'included',
          type: 'exists',
        });
        expect(preparedEntries[0]).not.toHaveProperty('value');
      });
    });

    describe('find_overlaps operation', () => {
      it('identifies overlapping exception conditions', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'exc-1',
                _source: {
                  'exception-list': {
                    name: 'Exception A',
                    entries: [
                      { field: 'process.name', value: 'cmd.exe' },
                      { field: 'host.os', value: 'windows' },
                    ],
                  },
                },
              },
              {
                _id: 'exc-2',
                _source: {
                  'exception-list': {
                    name: 'Exception B',
                    entries: [
                      { field: 'process.name', value: 'cmd.exe' },
                      { field: 'user.name', value: 'admin' },
                    ],
                  },
                },
              },
            ],
          },
        } as never);

        const result = await tool.handler(
          { operation: 'find_overlaps', rule_id: 'rule-123' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                total_exceptions: 2,
                overlaps_found: 1,
                overlaps: [
                  {
                    exception_a: 'Exception A',
                    exception_b: 'Exception B',
                    shared_fields: ['process.name="cmd.exe"'],
                  },
                ],
                message: 'Found 1 overlapping exception pair(s) among 2 exceptions.',
              },
            },
          ],
        });
      });

      it('reports no overlaps when exceptions are independent', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'exc-1',
                _source: {
                  'exception-list': {
                    name: 'Exception A',
                    entries: [{ field: 'process.name', value: 'cmd.exe' }],
                  },
                },
              },
              {
                _id: 'exc-2',
                _source: {
                  'exception-list': {
                    name: 'Exception B',
                    entries: [{ field: 'host.name', value: 'server-1' }],
                  },
                },
              },
            ],
          },
        } as never);

        const result = await tool.handler(
          { operation: 'find_overlaps', rule_id: 'rule-123' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                total_exceptions: 2,
                overlaps_found: 0,
                overlaps: [],
                message: 'No overlapping exceptions found among 2 exceptions.',
              },
            },
          ],
        });
      });

      it('returns empty when rule has no exception lists', async () => {
        mockRulesClient.get.mockResolvedValue({
          name: 'Clean Rule',
          params: { exceptionsList: [] },
        });

        const result = await tool.handler(
          { operation: 'find_overlaps', rule_id: 'rule-789' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: 'No exception lists found for rule "Clean Rule".',
                exceptions: [],
              },
            },
          ],
        });
      });
    });

    describe('error handling', () => {
      it('handles rulesClient.get failure gracefully', async () => {
        mockRulesClient.get.mockRejectedValue(new Error('Rule not found'));

        const result = await tool.handler(
          { operation: 'find', rule_id: 'nonexistent' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Error managing exceptions: Rule not found',
              },
            },
          ],
        });
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('handles ES search failure gracefully', async () => {
        mockRulesClient.get.mockResolvedValue(mockRule);
        mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('index_not_found_exception'));

        const result = await tool.handler(
          { operation: 'find', rule_id: 'rule-123' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Error managing exceptions: index_not_found_exception',
              },
            },
          ],
        });
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });
});
