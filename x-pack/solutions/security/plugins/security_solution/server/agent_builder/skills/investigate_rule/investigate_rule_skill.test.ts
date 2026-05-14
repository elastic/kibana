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
      expect(inlineTools).toHaveLength(1);
      expect(inlineTools![0].id).toBe('investigate-rule.get_rule_execution_logs');
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
});
