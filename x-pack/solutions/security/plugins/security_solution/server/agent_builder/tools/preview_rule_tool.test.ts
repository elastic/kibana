/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { previewRuleTool, SECURITY_PREVIEW_RULE_TOOL_ID } from './preview_rule_tool';

describe('previewRuleTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const tool = previewRuleTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    const baseInput = {
      rule_type: 'query' as const,
      query: 'process.name: "cmd.exe"',
      index_patterns: ['logs-endpoint.events.*'],
    };

    it('validates a valid ES|QL query', () => {
      const result = tool.schema.safeParse({
        rule_type: 'esql',
        query: 'FROM logs-* | WHERE process.name == "cmd.exe" | LIMIT 10',
        index_patterns: ['logs-*'],
      });
      expect(result.success).toBe(true);
    });

    it('validates a valid EQL query', () => {
      const result = tool.schema.safeParse({
        rule_type: 'eql',
        query: 'process where process.name == "cmd.exe"',
        index_patterns: ['logs-endpoint.events.*'],
      });
      expect(result.success).toBe(true);
    });

    it('validates a valid KQL query', () => {
      const result = tool.schema.safeParse(baseInput);
      expect(result.success).toBe(true);
    });

    it('validates a valid threshold query with threshold_field and threshold_value', () => {
      const result = tool.schema.safeParse({
        ...baseInput,
        rule_type: 'threshold',
        threshold_field: 'source.ip',
        threshold_value: 10,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing rule_type', () => {
      const result = tool.schema.safeParse({
        query: 'process.name: "cmd.exe"',
        index_patterns: ['logs-*'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing query', () => {
      const result = tool.schema.safeParse({
        rule_type: 'query',
        index_patterns: ['logs-*'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing index_patterns', () => {
      const result = tool.schema.safeParse({
        rule_type: 'query',
        query: 'process.name: "cmd.exe"',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid rule_type', () => {
      const result = tool.schema.safeParse({
        ...baseInput,
        rule_type: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional time_range', () => {
      const result = tool.schema.safeParse({
        ...baseInput,
        time_range: '24h',
      });
      expect(result.success).toBe(true);
    });

    it('defaults time_range to 1h when not provided', () => {
      const result = tool.schema.safeParse(baseInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.time_range).toBe('1h');
      }
    });

    it('accepts optional language', () => {
      const result = tool.schema.safeParse({
        ...baseInput,
        language: 'lucene',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid language', () => {
      const result = tool.schema.safeParse({
        ...baseInput,
        language: 'sql',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_PREVIEW_RULE_TOOL_ID);
    });
  });

  describe('handler', () => {
    const baseInput = {
      rule_type: 'query' as const,
      query: 'process.name: "cmd.exe"',
      index_patterns: ['logs-endpoint.events.*'],
      time_range: '1h',
      invocation_count: 1,
    };

    describe('ES|QL queries', () => {
      it('calls esClient.asCurrentUser.esql.query and returns columns/values', async () => {
        mockEsClient.asCurrentUser.esql.query.mockResolvedValue({
          columns: [{ name: 'process.name', type: 'keyword' }],
          values: [['cmd.exe'], ['powershell.exe']],
        } as never);

        const result = await tool.handler(
          {
            ...baseInput,
            rule_type: 'esql',
            query: 'FROM logs-* | WHERE process.name == "cmd.exe" | LIMIT 10',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
          query: 'FROM logs-* | WHERE process.name == "cmd.exe" | LIMIT 10',
          format: 'json',
        });
        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                match_count: 2,
                columns: ['process.name'],
                sample_results: [['cmd.exe'], ['powershell.exe']],
                message: 'ES|QL query returned 2 result(s).',
              },
            },
          ],
        });
      });

      it('handles empty ES|QL results', async () => {
        mockEsClient.asCurrentUser.esql.query.mockResolvedValue({
          columns: [{ name: 'process.name', type: 'keyword' }],
          values: [],
        } as never);

        const result = await tool.handler(
          { ...baseInput, rule_type: 'esql', query: 'FROM logs-* | LIMIT 0' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                match_count: 0,
                columns: ['process.name'],
                sample_results: [],
                message: 'ES|QL query returned 0 result(s).',
              },
            },
          ],
        });
      });
    });

    describe('EQL queries', () => {
      it('calls esClient.asCurrentUser.eql.search and returns hits', async () => {
        mockEsClient.asCurrentUser.eql.search.mockResolvedValue({
          hits: {
            events: [
              { _id: '1', _source: { process: { name: 'cmd.exe' } } },
              { _id: '2', _source: { process: { name: 'powershell.exe' } } },
            ],
            sequences: [],
          },
        } as never);

        const result = await tool.handler(
          {
            ...baseInput,
            rule_type: 'eql',
            query: 'process where process.name == "cmd.exe"',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.eql.search).toHaveBeenCalledWith({
          index: 'logs-endpoint.events.*',
          query: 'process where process.name == "cmd.exe"',
          size: 10,
          filter: {
            range: { '@timestamp': { gte: 'now-1h', lte: 'now' } },
          },
        });
        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                match_count: 2,
                sample_results: [
                  { process: { name: 'cmd.exe' } },
                  { process: { name: 'powershell.exe' } },
                ],
                message: 'EQL query matched 2 event(s) in the last 1h.',
              },
            },
          ],
        });
      });

      it('handles EQL sequences', async () => {
        const sequences = [{ join_keys: ['host-1'], events: [] }];
        mockEsClient.asCurrentUser.eql.search.mockResolvedValue({
          hits: {
            sequences,
          },
        } as never);

        const result = await tool.handler(
          {
            ...baseInput,
            rule_type: 'eql',
            query: 'sequence [process where true] [file where true]',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                match_count: 1,
                sample_results: [{ join_keys: ['host-1'], events: [] }],
                message: 'EQL query matched 1 event(s) in the last 1h.',
              },
            },
          ],
        });
      });
    });

    describe('KQL queries', () => {
      it('calls esClient.asCurrentUser.search with query_string and returns hits', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            total: { value: 3, relation: 'eq' },
            hits: [
              { _id: 'doc-1', _source: { process: { name: 'cmd.exe' } } },
              { _id: 'doc-2', _source: { process: { name: 'cmd.exe' } } },
            ],
          },
        } as never);

        const result = await tool.handler(
          baseInput,
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
          index: 'logs-endpoint.events.*',
          size: 10,
          query: {
            bool: {
              must: [
                { query_string: { query: 'process.name: "cmd.exe"', default_operator: 'AND' } },
                { range: { '@timestamp': { gte: 'now-1h', lte: 'now' } } },
              ],
            },
          },
        });
        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                match_count: 3,
                sample_results: [
                  { _id: 'doc-1', process: { name: 'cmd.exe' } },
                  { _id: 'doc-2', process: { name: 'cmd.exe' } },
                ],
                message: 'Query matched 3 document(s) in the last 1h.',
              },
            },
          ],
        });
      });

      it('handles numeric total in search response', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            total: 5,
            hits: [],
          },
        } as never);

        const result = await tool.handler(
          baseInput,
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                match_count: 5,
                sample_results: [],
                message: 'Query matched 5 document(s) in the last 1h.',
              },
            },
          ],
        });
      });
    });

    describe('threshold queries', () => {
      it('calls esClient.asCurrentUser.search with aggregation and returns groups above threshold', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { total: { value: 100 }, hits: [] },
          aggregations: {
            threshold_groups: {
              buckets: [
                { key: '10.0.0.1', doc_count: 50 },
                { key: '10.0.0.2', doc_count: 15 },
                { key: '10.0.0.3', doc_count: 3 },
              ],
            },
          },
        } as never);

        const result = await tool.handler(
          {
            ...baseInput,
            rule_type: 'threshold',
            threshold_field: 'source.ip',
            threshold_value: 10,
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({
          index: 'logs-endpoint.events.*',
          size: 0,
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    query: 'process.name: "cmd.exe"',
                    default_operator: 'AND',
                  },
                },
                { range: { '@timestamp': { gte: 'now-1h', lte: 'now' } } },
              ],
            },
          },
          aggs: {
            threshold_groups: {
              terms: { field: 'source.ip', size: 20 },
            },
          },
        });
        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                threshold_field: 'source.ip',
                threshold_value: 10,
                total_groups: 3,
                triggering_groups: 2,
                top_groups: [
                  { key: '10.0.0.1', count: 50 },
                  { key: '10.0.0.2', count: 15 },
                ],
                message: 'Threshold query: 2 of 3 group(s) exceed threshold of 10 in the last 1h.',
              },
            },
          ],
        });
      });

      it('defaults threshold_value to 1 when not provided', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { total: { value: 10 }, hits: [] },
          aggregations: {
            threshold_groups: {
              buckets: [{ key: '10.0.0.1', doc_count: 5 }],
            },
          },
        } as never);

        const result = await tool.handler(
          {
            ...baseInput,
            rule_type: 'threshold',
            threshold_field: 'source.ip',
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                threshold_field: 'source.ip',
                threshold_value: 1,
                total_groups: 1,
                triggering_groups: 1,
                top_groups: [{ key: '10.0.0.1', count: 5 }],
                message: 'Threshold query: 1 of 1 group(s) exceed threshold of 1 in the last 1h.',
              },
            },
          ],
        });
      });
    });

    describe('error handling', () => {
      it('returns error result when ES query fails', async () => {
        mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('index_not_found'));

        const result = await tool.handler(
          baseInput,
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Error previewing rule: index_not_found',
              },
            },
          ],
        });
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('returns error result when EQL search fails', async () => {
        mockEsClient.asCurrentUser.eql.search.mockRejectedValue(new Error('eql_syntax_error'));

        const result = await tool.handler(
          { ...baseInput, rule_type: 'eql', query: 'invalid eql' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Error previewing rule: eql_syntax_error',
              },
            },
          ],
        });
      });

      it('returns error result when ES|QL query fails', async () => {
        mockEsClient.asCurrentUser.esql.query.mockRejectedValue(new Error('esql_parse_error'));

        const result = await tool.handler(
          { ...baseInput, rule_type: 'esql', query: 'INVALID ESQL' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Error previewing rule: esql_parse_error',
              },
            },
          ],
        });
      });
    });

    describe('language resolution', () => {
      it('resolves language to eql for eql rule_type when not specified', async () => {
        mockEsClient.asCurrentUser.eql.search.mockResolvedValue({
          hits: { events: [], sequences: [] },
        } as never);

        await tool.handler(
          { ...baseInput, rule_type: 'eql', query: 'process where true' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.eql.search).toHaveBeenCalled();
      });

      it('resolves language to esql for esql rule_type when not specified', async () => {
        mockEsClient.asCurrentUser.esql.query.mockResolvedValue({
          columns: [],
          values: [],
        } as never);

        await tool.handler(
          { ...baseInput, rule_type: 'esql', query: 'FROM logs-*' },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.esql.query).toHaveBeenCalled();
      });

      it('resolves language to kuery for query rule_type when not specified', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { total: { value: 0 }, hits: [] },
        } as never);

        await tool.handler(
          baseInput,
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.search).toHaveBeenCalled();
      });
    });
  });
});
