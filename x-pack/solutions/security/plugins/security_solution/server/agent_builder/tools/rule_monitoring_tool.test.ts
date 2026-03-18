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
import { ruleMonitoringTool, SECURITY_RULE_MONITORING_TOOL_ID } from './rule_monitoring_tool';

describe('ruleMonitoringTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const tool = ruleMonitoringTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('validates with rule_id for single-rule health', () => {
      const result = tool.schema.safeParse({ rule_id: 'abc-123' });
      expect(result.success).toBe(true);
    });

    it('validates without rule_id for space-level health', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('validates with optional time_range', () => {
      const result = tool.schema.safeParse({ time_range: '7d' });
      expect(result.success).toBe(true);
    });

    it('validates with all fields', () => {
      const result = tool.schema.safeParse({
        rule_id: 'abc-123',
        time_range: '1h',
        include_errors: false,
        include_metrics: false,
        page: 2,
        per_page: 50,
      });
      expect(result.success).toBe(true);
    });

    it('applies default values', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.time_range).toBe('24h');
        expect(result.data.include_errors).toBe(true);
        expect(result.data.include_metrics).toBe(true);
        expect(result.data.page).toBe(1);
        expect(result.data.per_page).toBe(20);
      }
    });

    it('rejects per_page below minimum', () => {
      const result = tool.schema.safeParse({ per_page: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects per_page above maximum', () => {
      const result = tool.schema.safeParse({ per_page: 101 });
      expect(result.success).toBe(false);
    });

    it('rejects page below minimum', () => {
      const result = tool.schema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects non-string rule_id', () => {
      const result = tool.schema.safeParse({ rule_id: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_RULE_MONITORING_TOOL_ID);
    });
  });

  describe('handler', () => {
    describe('rule_health (specific rule)', () => {
      it('returns execution stats for a specific rule', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            total: 3,
            hits: [
              {
                _source: {
                  '@timestamp': '2025-01-01T12:00:00Z',
                  event: { outcome: 'success', duration: 500_000_000 },
                  message: 'rule executed',
                  kibana: {
                    alerting: { summary: { new: { count: 2 } } },
                  },
                },
              },
              {
                _source: {
                  '@timestamp': '2025-01-01T11:00:00Z',
                  event: { outcome: 'success', duration: 300_000_000 },
                  message: 'rule executed',
                  kibana: {
                    alerting: { summary: { new: { count: 0 } } },
                  },
                },
              },
            ],
          },
        } as never);

        const result = await tool.handler(
          {
            rule_id: 'rule-123',
            time_range: '24h',
            include_errors: true,
            include_metrics: true,
            page: 1,
            per_page: 20,
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
          expect.objectContaining({
            index: '.kibana-event-log-*',
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.arrayContaining([{ term: { 'rule.id': 'rule-123' } }]),
              }),
            }),
          })
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: expect.objectContaining({
                rule_id: 'rule-123',
                time_range: '24h',
                total_executions: 3,
                error_count: 0,
                errors: [],
                metrics: expect.objectContaining({
                  avg_duration_ms: 400,
                  total_alerts_generated: 2,
                }),
                message: expect.stringContaining('Rule is healthy'),
              }),
            },
          ],
        });
      });

      it('reports errors when rule has failures', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            total: 2,
            hits: [
              {
                _source: {
                  '@timestamp': '2025-01-01T12:00:00Z',
                  event: { outcome: 'failure', duration: 100_000_000 },
                  message: 'Circuit breaker triggered',
                  kibana: { alerting: { summary: { new: { count: 0 } } } },
                },
              },
              {
                _source: {
                  '@timestamp': '2025-01-01T11:00:00Z',
                  event: { outcome: 'success', duration: 200_000_000 },
                  message: 'rule executed',
                  kibana: { alerting: { summary: { new: { count: 1 } } } },
                },
              },
            ],
          },
        } as never);

        const result = await tool.handler(
          {
            rule_id: 'rule-fail',
            time_range: '24h',
            include_errors: true,
            include_metrics: true,
            page: 1,
            per_page: 20,
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: expect.objectContaining({
                rule_id: 'rule-fail',
                error_count: 1,
                errors: [
                  expect.objectContaining({
                    timestamp: '2025-01-01T12:00:00Z',
                    message: 'Circuit breaker triggered',
                    status: 'failure',
                  }),
                ],
                message: expect.stringContaining('1 error(s)'),
              }),
            },
          ],
        });
      });

      it('excludes errors when include_errors is false', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            total: 1,
            hits: [
              {
                _source: {
                  '@timestamp': '2025-01-01T12:00:00Z',
                  event: { outcome: 'success', duration: 100_000_000 },
                  message: 'ok',
                  kibana: { alerting: { summary: { new: { count: 0 } } } },
                },
              },
            ],
          },
        } as never);

        const result = await tool.handler(
          {
            rule_id: 'rule-1',
            time_range: '24h',
            include_errors: false,
            include_metrics: true,
            page: 1,
            per_page: 20,
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { results } = result as {
          results: Array<{ type: string; data: Record<string, unknown> }>;
        };
        expect(results[0].data).not.toHaveProperty('errors');
        expect(results[0].data).not.toHaveProperty('error_count');
        expect(results[0].data).toHaveProperty('metrics');
      });

      it('excludes metrics when include_metrics is false', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: {
            total: 1,
            hits: [
              {
                _source: {
                  '@timestamp': '2025-01-01T12:00:00Z',
                  event: { outcome: 'success', duration: 100_000_000 },
                  message: 'ok',
                  kibana: { alerting: { summary: { new: { count: 0 } } } },
                },
              },
            ],
          },
        } as never);

        const result = await tool.handler(
          {
            rule_id: 'rule-1',
            time_range: '24h',
            include_errors: true,
            include_metrics: false,
            page: 1,
            per_page: 20,
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        const { results } = result as {
          results: Array<{ type: string; data: Record<string, unknown> }>;
        };
        expect(results[0].data).not.toHaveProperty('metrics');
        expect(results[0].data).toHaveProperty('errors');
      });

      it('handles empty results', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { total: 0, hits: [] },
        } as never);

        const result = await tool.handler(
          {
            rule_id: 'rule-empty',
            time_range: '24h',
            include_errors: true,
            include_metrics: true,
            page: 1,
            per_page: 20,
          },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: expect.objectContaining({
                rule_id: 'rule-empty',
                total_executions: 0,
                error_count: 0,
                errors: [],
                metrics: expect.objectContaining({
                  avg_duration_ms: 0,
                  total_alerts_generated: 0,
                }),
                message: expect.stringContaining('Rule is healthy'),
              }),
            },
          ],
        });
      });
    });

    describe('space_health (all rules)', () => {
      it('returns aggregate stats for the space', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { total: 0, hits: [] },
          aggregations: {
            total_rules: { value: 15 },
            error_count: { rule_count: { value: 2 } },
          },
        } as never);

        const result = await tool.handler(
          { time_range: '24h', include_errors: true, include_metrics: true, page: 1, per_page: 20 },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
          expect.objectContaining({
            index: '.kibana-event-log-*',
            size: 0,
            aggs: expect.objectContaining({
              total_rules: { cardinality: { field: 'rule.id' } },
            }),
          })
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                scope: 'space',
                time_range: '24h',
                has_errors: true,
                total_rules_executed: 15,
                rules_with_errors: 2,
                message: expect.stringContaining('2 rule(s) had errors'),
              },
            },
          ],
        });
      });

      it('returns healthy message when no errors', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { total: 0, hits: [] },
          aggregations: {
            total_rules: { value: 10 },
            error_count: { rule_count: { value: 0 } },
          },
        } as never);

        const result = await tool.handler(
          { time_range: '7d', include_errors: true, include_metrics: true, page: 1, per_page: 20 },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: {
                scope: 'space',
                time_range: '7d',
                has_errors: false,
                total_rules_executed: 10,
                rules_with_errors: 0,
                message: expect.stringContaining('Detection engine is healthy'),
              },
            },
          ],
        });
      });

      it('handles missing aggregations gracefully', async () => {
        mockEsClient.asCurrentUser.search.mockResolvedValue({
          hits: { total: 0, hits: [] },
          aggregations: undefined,
        } as never);

        const result = await tool.handler(
          { time_range: '24h', include_errors: true, include_metrics: true, page: 1, per_page: 20 },
          createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
        );

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: expect.objectContaining({
                scope: 'space',
                total_rules_executed: 0,
                rules_with_errors: 0,
                has_errors: false,
              }),
            },
          ],
        });
      });
    });

    it('returns error for invalid time_range format', async () => {
      const result = await tool.handler(
        {
          time_range: 'invalid',
          include_errors: true,
          include_metrics: true,
          page: 1,
          per_page: 20,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Invalid time_range format: invalid. Use e.g. "24h", "7d".',
            },
          },
        ],
      });
    });

    it('handles ES search errors gracefully', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('index_not_found_exception'));

      const result = await tool.handler(
        {
          rule_id: 'rule-123',
          time_range: '24h',
          include_errors: true,
          include_metrics: true,
          page: 1,
          per_page: 20,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Error checking rule health: index_not_found_exception',
            },
          },
        ],
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
