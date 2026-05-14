/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../../__mocks__/test_helpers';
import { investigateRuleSkill } from './investigate_rule_skill';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../../tools';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';

interface ExecutionRecord {
  timestamp: string;
  status: string;
  duration_ms: number | null;
  gap_duration_s: number | null;
  error_message?: string;
}

interface ResultData {
  message?: string;
  executions?: ExecutionRecord[];
  total?: number;
}

const getData = (result: ToolHandlerStandardReturn, idx = 0): ResultData =>
  result.results[idx].data as unknown as ResultData;

describe('investigateRuleSkill', () => {
  describe('skill definition', () => {
    it('has correct id and name', () => {
      expect(investigateRuleSkill.id).toBe('investigate-rule');
      expect(investigateRuleSkill.name).toBe('investigate-rule');
    });

    it('has correct basePath', () => {
      expect(investigateRuleSkill.basePath).toBe('skills/security/rules');
    });

    it('has a non-empty description', () => {
      expect(investigateRuleSkill.description).toBeTruthy();
      expect(investigateRuleSkill.description.length).toBeGreaterThan(0);
    });

    it('has non-empty content', () => {
      expect(investigateRuleSkill.content).toBeTruthy();
      expect(investigateRuleSkill.content.length).toBeGreaterThan(0);
    });

    it('returns the expected registry tool IDs', () => {
      const tools = investigateRuleSkill.getRegistryTools?.();
      expect(tools).toBeDefined();
      expect(tools).toContain(SECURITY_ALERTS_TOOL_ID);
      expect(tools).toContain(SECURITY_LABS_SEARCH_TOOL_ID);
      expect(tools).toContain(SECURITY_ENTITY_RISK_SCORE_TOOL_ID);
      expect(tools).toContain(platformCoreTools.generateEsql);
    });

    it('returns one inline tool', async () => {
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(5);
      expect(inlineTools![0].id).toBe('investigate-rule.get_rule_execution_logs');
      expect(inlineTools![1].id).toBe('investigate-rule.get_rule_details');
      expect(inlineTools![2].id).toBe('investigate-rule.classify_execution_failure');
      expect(inlineTools![3].id).toBe('investigate-rule.get_rule_alerts');
      expect(inlineTools![4].id).toBe('investigate-rule.get_rule_execution_metrics');
    });
  });

  describe('get_rule_execution_logs inline tool', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();

    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      tool = inlineTools![0] as BuiltinSkillBoundedTool;
    });

    const callHandler = async (
      params: { rule_id: string; time_window_hours?: number },
      spaceId = 'default'
    ) => {
      return tool.handler(
        params,
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId })
      ) as Promise<ToolHandlerStandardReturn>;
    };

    const mockSearchResponse = (
      hits: Array<{ _source: Record<string, unknown> }> = [],
      total = hits.length
    ) => {
      mockEsClient.asInternalUser.search.mockResponseOnce({
        hits: {
          hits,
          total: { value: total, relation: 'eq' },
        },
      } as ReturnType<typeof mockEsClient.asInternalUser.search> extends Promise<infer R> ? R : never);
    };

    const makeEventLogHit = (overrides: Record<string, unknown> = {}) => ({
      _source: {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        event: {
          start: '2024-01-01T00:00:00.000Z',
          duration: 2_000_000_000, // 2 seconds in ns
          action: 'execute',
        },
        'kibana.alerting.outcome': 'success',
        kibana: {
          alerting: { outcome: 'success' },
          alert: {
            rule: {
              execution: {
                metrics: {
                  execution_gap_duration_s: 0,
                },
              },
            },
          },
        },
        ...overrides,
      },
    });

    it('returns empty result when no executions found', async () => {
      mockSearchResponse([]);

      const result = await callHandler({ rule_id: 'rule-123' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(getData(result).message).toContain('No execution records found');
      expect(getData(result).executions).toEqual([]);
      expect(getData(result).total).toBe(0);
    });

    it('returns execution records on happy path', async () => {
      mockSearchResponse([makeEventLogHit()]);

      const result = await callHandler({ rule_id: 'rule-123' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(getData(result).executions).toHaveLength(1);
      expect(getData(result).total).toBe(1);

      const exec = getData(result).executions![0];
      expect(exec.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(exec.status).toBe('succeeded');
      expect(exec.duration_ms).toBe(2000);
      expect(exec.gap_duration_s).toBe(0);
      expect(exec.error_message).toBeUndefined();
    });

    it('maps alerting outcome "failure" to status "failed"', async () => {
      mockSearchResponse([
        makeEventLogHit({
          'kibana.alerting.outcome': 'failure',
          kibana: {
            alerting: { outcome: 'failure' },
            alert: { rule: { execution: { metrics: {} } } },
          },
          error: { message: 'index_not_found_exception' },
        }),
      ]);

      const result = await callHandler({ rule_id: 'rule-123' });

      const exec = getData(result).executions![0];
      expect(exec.status).toBe('failed');
      expect(exec.error_message).toBe('index_not_found_exception');
    });

    it('maps alerting outcome "warning" to status "partial failure"', async () => {
      mockSearchResponse([
        makeEventLogHit({
          'kibana.alerting.outcome': 'warning',
          kibana: {
            alerting: { outcome: 'warning' },
            alert: { rule: { execution: { metrics: {} } } },
          },
          message: 'No matching indices found',
        }),
      ]);

      const result = await callHandler({ rule_id: 'rule-123' });

      const exec = getData(result).executions![0];
      expect(exec.status).toBe('partial failure');
      expect(exec.error_message).toBe('No matching indices found');
    });

    it('includes gap_duration_s when present', async () => {
      mockSearchResponse([
        makeEventLogHit({
          kibana: {
            alerting: { outcome: 'success' },
            alert: { rule: { execution: { metrics: { execution_gap_duration_s: 300 } } } },
          },
        }),
      ]);

      const result = await callHandler({ rule_id: 'rule-123' });

      const exec = getData(result).executions![0];
      expect(exec.gap_duration_s).toBe(300);
    });

    it('queries the event log with the correct rule ID and time window', async () => {
      mockSearchResponse([]);

      await callHandler({ rule_id: 'rule-abc', time_window_hours: 48 });

      expect(mockEsClient.asInternalUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.kibana-event-log-*',
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                { term: { 'event.provider': 'alerting' } },
                { terms: { 'event.action': ['execute', 'execute-backfill'] } },
                { range: { '@timestamp': { gte: 'now-48h' } } },
                {
                  nested: {
                    path: 'kibana.saved_objects',
                    query: {
                      bool: {
                        filter: [
                          { term: { 'kibana.saved_objects.type': 'alert' } },
                          { term: { 'kibana.saved_objects.id': 'rule-abc' } },
                        ],
                      },
                    },
                  },
                },
              ]),
            }),
          }),
          sort: [{ '@timestamp': 'desc' }],
          size: 100,
        })
      );
    });

    it('filters by space ID', async () => {
      mockSearchResponse([]);

      await callHandler({ rule_id: 'rule-abc' }, 'my-space');

      expect(mockEsClient.asInternalUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { 'kibana.space_ids': 'my-space' } }]),
            }),
          }),
        })
      );
    });

    it('returns error result when ES throws', async () => {
      mockEsClient.asInternalUser.search.mockRejectedValueOnce(new Error('ES connection refused'));

      const result = await callHandler({ rule_id: 'rule-123' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(getData(result).message).toContain('ES connection refused');
    });

    it('returns multiple execution records sorted by the ES response order', async () => {
      mockSearchResponse([
        makeEventLogHit({ event: { start: '2024-01-03T00:00:00.000Z', duration: 1_000_000_000 } }),
        makeEventLogHit({ event: { start: '2024-01-02T00:00:00.000Z', duration: 500_000_000 } }),
        makeEventLogHit({ event: { start: '2024-01-01T00:00:00.000Z', duration: 2_000_000_000 } }),
      ]);

      const result = await callHandler({ rule_id: 'rule-123' });

      const executions = getData(result).executions!;
      expect(executions).toHaveLength(3);
      expect(executions[0].timestamp).toBe('2024-01-03T00:00:00.000Z');
      expect(executions[0].duration_ms).toBe(1000);
      expect(executions[1].duration_ms).toBe(500);
      expect(executions[2].duration_ms).toBe(2000);
    });

    it('includes message in result summary', async () => {
      mockSearchResponse([makeEventLogHit()], 42);

      const result = await callHandler({ rule_id: 'rule-123' });

      expect(getData(result).message).toContain('rule-123');
      expect(getData(result).message).toContain('42 total');
    });
  });

  // ── get_rule_details ────────────────────────────────────────────────────────

  describe('get_rule_details inline tool', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();
    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      tool = inlineTools![1] as BuiltinSkillBoundedTool;
    });

    interface RuleResultData {
      message?: string;
      rule?: Record<string, unknown>;
    }

    const callHandler = (params: { rule_id: string }, spaceId = 'default') =>
      tool.handler(
        params,
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId })
      ) as Promise<ToolHandlerStandardReturn>;

    const mockSavedObject = (attrs: Record<string, unknown>) => {
      const ctx = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (ctx.savedObjectsClient.get as jest.Mock).mockResolvedValueOnce({
        id: 'rule-uuid-1',
        type: 'alert',
        attributes: attrs,
        references: [],
      });
    };

    it('returns rule details on happy path', async () => {
      const ctx = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (ctx.savedObjectsClient.get as jest.Mock).mockResolvedValueOnce({
        id: 'rule-uuid-1',
        type: 'alert',
        attributes: {
          name: 'My Detection Rule',
          enabled: true,
          tags: ['MITRE', 'Custom'],
          schedule: { interval: '5m' },
          params: {
            rule_id: 'my-static-rule-id',
            type: 'query',
            language: 'kuery',
            query: 'event.category: process',
            index: ['logs-endpoint.events.*'],
            from: 'now-6m',
            description: 'Detects suspicious processes',
            severity: 'high',
            risk_score: 73,
            threat: [{ tactic: { id: 'TA0002' } }],
          },
        },
        references: [],
      });

      const result = (await tool.handler(
        { rule_id: 'rule-uuid-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = result.results[0].data as RuleResultData;
      expect(data.message).toContain('rule-uuid-1');
      expect(data.rule?.name).toBe('My Detection Rule');
      expect(data.rule?.type).toBe('query');
      expect(data.rule?.enabled).toBe(true);
      expect(data.rule?.tags).toEqual(['MITRE', 'Custom']);
      expect(data.rule?.interval).toBe('5m');
    });

    it('returns graceful message when rule is not found', async () => {
      const ctx = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (ctx.savedObjectsClient.get as jest.Mock).mockRejectedValueOnce({
        output: { statusCode: 404 },
      });

      const result = (await tool.handler(
        { rule_id: 'missing-id' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0].data as RuleResultData).message).toContain('not found');
    });

    it('returns error result when savedObjectsClient throws unexpectedly', async () => {
      const ctx = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (ctx.savedObjectsClient.get as jest.Mock).mockRejectedValueOnce(
        new Error('Saved objects service unavailable')
      );

      const result = (await tool.handler({ rule_id: 'rule-1' }, ctx)) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0].data as { message: string }).message).toContain('unavailable');
    });

    void mockSavedObject; // suppress unused warning
  });

  // ── classify_execution_failure ──────────────────────────────────────────────

  describe('classify_execution_failure inline tool', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();
    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      tool = inlineTools![2] as BuiltinSkillBoundedTool;
    });

    interface ClassificationData {
      error_class: string;
      confidence: string;
      explanation: string;
    }

    const callHandler = (params: { error_message: string; rule_type?: string }) =>
      tool.handler(
        params,
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      ) as Promise<ToolHandlerStandardReturn>;

    it('classifies index_not_found correctly', async () => {
      const result = await callHandler({ error_message: 'index_not_found_exception' });
      const data = result.results[0].data as ClassificationData;
      expect(data.error_class).toBe('index_not_found');
      expect(data.confidence).toBe('high');
    });

    it('classifies query_timeout correctly', async () => {
      const result = await callHandler({ error_message: 'Request timed out' });
      const data = result.results[0].data as ClassificationData;
      expect(data.error_class).toBe('query_timeout');
    });

    it('classifies permission_denied correctly', async () => {
      const result = await callHandler({ error_message: 'security_exception: not authorized' });
      const data = result.results[0].data as ClassificationData;
      expect(data.error_class).toBe('permission_denied');
    });

    it('classifies circuit_breaker correctly', async () => {
      const result = await callHandler({
        error_message: 'CircuitBreakingException: Data too large',
      });
      const data = result.results[0].data as ClassificationData;
      expect(data.error_class).toBe('circuit_breaker');
    });

    it('returns unknown for unrecognized messages', async () => {
      const result = await callHandler({ error_message: 'something mysterious happened' });
      const data = result.results[0].data as ClassificationData;
      expect(data.error_class).toBe('unknown');
      expect(data.confidence).toBe('low');
    });

    it('returns unknown with explanation for empty message', async () => {
      const result = await callHandler({ error_message: '' });
      const data = result.results[0].data as ClassificationData;
      expect(data.error_class).toBe('unknown');
      expect(data.explanation).toContain('Empty');
    });

    it('always returns other (not error) result type', async () => {
      const result = await callHandler({ error_message: 'anything' });
      expect(result.results[0].type).toBe(ToolResultType.other);
    });

    it('accepts optional rule_type without changing classification', async () => {
      const withType = await callHandler({
        error_message: 'index_not_found_exception',
        rule_type: 'siem.queryRule',
      });
      const withoutType = await callHandler({ error_message: 'index_not_found_exception' });
      expect((withType.results[0].data as ClassificationData).error_class).toBe(
        (withoutType.results[0].data as ClassificationData).error_class
      );
    });
  });

  // ── get_rule_alerts ─────────────────────────────────────────────────────────

  describe('get_rule_alerts inline tool', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();
    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      tool = inlineTools![3] as BuiltinSkillBoundedTool;
    });

    interface AlertResultData {
      message?: string;
      total_count?: number;
      alerts?: unknown[];
      top_entities?: {
        hosts: Array<{ value: string; count: number }>;
        users: Array<{ value: string; count: number }>;
        source_ips: Array<{ value: string; count: number }>;
      };
    }

    const callHandler = (
      params: { rule_id: string; time_window_hours?: number; size?: number },
      spaceId = 'default'
    ) =>
      tool.handler(
        params,
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId })
      ) as Promise<ToolHandlerStandardReturn>;

    const mockAlertsSearch = (
      hits: Array<{ _id: string; _source: Record<string, unknown> }> = [],
      total = hits.length,
      aggs: Record<string, unknown> = {}
    ) => {
      mockEsClient.asCurrentUser.search.mockResponseOnce({
        hits: { hits, total: { value: total, relation: 'eq' } },
        aggregations: {
          top_hosts: { buckets: [] },
          top_users: { buckets: [] },
          top_source_ips: { buckets: [] },
          ...aggs,
        },
      } as ReturnType<typeof mockEsClient.asCurrentUser.search> extends Promise<infer R> ? R : never);
    };

    it('returns empty result with zero total when no alerts found', async () => {
      mockAlertsSearch([]);
      const result = await callHandler({ rule_id: 'rule-1' });
      const data = result.results[0].data as AlertResultData;
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(data.total_count).toBe(0);
      expect(data.alerts).toHaveLength(0);
      expect(data.message).toContain('No alerts');
    });

    it('returns alerts and top_entities on happy path', async () => {
      mockAlertsSearch(
        [
          {
            _id: 'alert-1',
            _source: { '@timestamp': '2024-01-01T00:00:00Z', 'host.name': 'host-a' },
          },
        ],
        5,
        {
          top_hosts: {
            buckets: [
              { key: 'host-a', doc_count: 4 },
              { key: 'host-b', doc_count: 1 },
            ],
          },
          top_users: { buckets: [{ key: 'admin', doc_count: 3 }] },
          top_source_ips: { buckets: [{ key: '10.0.0.1', doc_count: 2 }] },
        }
      );

      const result = await callHandler({ rule_id: 'rule-1', time_window_hours: 48 });
      const data = result.results[0].data as AlertResultData;

      expect(data.total_count).toBe(5);
      expect(data.alerts).toHaveLength(1);
      expect(data.top_entities?.hosts).toEqual([
        { value: 'host-a', count: 4 },
        { value: 'host-b', count: 1 },
      ]);
      expect(data.top_entities?.users).toEqual([{ value: 'admin', count: 3 }]);
      expect(data.top_entities?.source_ips).toEqual([{ value: '10.0.0.1', count: 2 }]);
    });

    it('queries the alerts index scoped to the space', async () => {
      mockAlertsSearch([]);
      await callHandler({ rule_id: 'rule-1' }, 'my-space');

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${DEFAULT_ALERTS_INDEX}-my-space`,
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { 'kibana.alert.rule.uuid': 'rule-1' } }]),
            }),
          }),
        })
      );
    });

    it('includes time window in the query', async () => {
      mockAlertsSearch([]);
      await callHandler({ rule_id: 'rule-1', time_window_hours: 72 });

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ range: { '@timestamp': { gte: 'now-72h' } } }]),
            }),
          }),
        })
      );
    });

    it('returns error result when ES throws', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValueOnce(new Error('cluster unavailable'));
      const result = await callHandler({ rule_id: 'rule-1' });
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0].data as { message: string }).message).toContain('unavailable');
    });
  });

  // ── get_rule_execution_metrics ──────────────────────────────────────────────

  describe('get_rule_execution_metrics inline tool', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();
    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      tool = inlineTools![4] as BuiltinSkillBoundedTool;
    });

    interface MetricsData {
      message?: string;
      avg_duration_ms: number | null;
      p95_duration_ms: number | null;
      max_duration_ms: number | null;
      total_search_hits: number;
      execution_count: number;
      gap_count: number;
    }

    const callHandler = (
      params: { rule_id: string; time_window_hours?: number },
      spaceId = 'default'
    ) =>
      tool.handler(
        params,
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId })
      ) as Promise<ToolHandlerStandardReturn>;

    const mockMetricsSearch = (aggs: Record<string, unknown> = {}) => {
      mockEsClient.asInternalUser.search.mockResponseOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
        aggregations: {
          execution_count: { value: 0 },
          duration_stats: { avg: null, max: null, count: 0 },
          duration_p95: { values: { '95.0': null } },
          total_search_hits: { value: 0 },
          gap_count: { doc_count: 0 },
          ...aggs,
        },
      } as ReturnType<typeof mockEsClient.asInternalUser.search> extends Promise<infer R> ? R : never);
    };

    it('returns zero-execution message when no data', async () => {
      mockMetricsSearch();
      const result = await callHandler({ rule_id: 'rule-1' });
      const data = result.results[0].data as MetricsData;
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(data.execution_count).toBe(0);
      expect(data.message).toContain('No execution data');
    });

    it('returns computed metrics on happy path', async () => {
      mockMetricsSearch({
        execution_count: { value: 10 },
        duration_stats: {
          avg: 2_000_000_000,
          max: 5_000_000_000,
          count: 10,
        },
        duration_p95: { values: { '95.0': 4_500_000_000 } },
        total_search_hits: { value: 15000 },
        gap_count: { doc_count: 2 },
      });

      const result = await callHandler({ rule_id: 'rule-1' });
      const data = result.results[0].data as MetricsData;

      expect(data.execution_count).toBe(10);
      expect(data.avg_duration_ms).toBe(2000);
      expect(data.p95_duration_ms).toBe(4500);
      expect(data.max_duration_ms).toBe(5000);
      expect(data.total_search_hits).toBe(15000);
      expect(data.gap_count).toBe(2);
    });

    it('includes execution_count and gap_count in message', async () => {
      mockMetricsSearch({
        execution_count: { value: 24 },
        duration_stats: { avg: 1_000_000_000, max: 2_000_000_000, count: 24 },
        duration_p95: { values: { '95.0': 1_500_000_000 } },
        total_search_hits: { value: 0 },
        gap_count: { doc_count: 3 },
      });

      const result = await callHandler({ rule_id: 'rule-1' });
      const data = result.results[0].data as MetricsData;
      expect(data.message).toContain('24 run');
      expect(data.message).toContain('3 gap');
    });

    it('queries the event log index', async () => {
      mockMetricsSearch({ execution_count: { value: 5 } });
      await callHandler({ rule_id: 'rule-abc', time_window_hours: 48 });

      expect(mockEsClient.asInternalUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.kibana-event-log-*',
          size: 0,
        })
      );
    });

    it('returns error result when ES throws', async () => {
      mockEsClient.asInternalUser.search.mockRejectedValueOnce(new Error('aggregation failed'));
      const result = await callHandler({ rule_id: 'rule-1' });
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0].data as { message: string }).message).toContain(
        'aggregation failed'
      );
    });
  });
});
