/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createToolHandlerContext, createToolTestMocks } from '../../__mocks__/test_helpers';
import { createInvestigateRuleSkill } from './investigate_rule_skill';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../../tools';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';

const mockRulesClient = {
  get: jest.fn(),
};

const mockGetStartServices = jest.fn().mockResolvedValue([
  {},
  { alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue(mockRulesClient) } },
  {},
]);

const investigateRuleSkill = createInvestigateRuleSkill({
  getStartServices: mockGetStartServices as never,
  logger: loggingSystemMock.createLogger(),
});

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
    });

    it('returns the expected inline tools', async () => {
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(2);
      expect(inlineTools![0].id).toBe('investigate-rule.resolve_rule_attachment');
      expect(inlineTools![1].id).toBe('investigate-rule.get_rule_alerts');
    });
  });

  // ── resolve_rule_attachment ─────────────────────────────────────────────────

  describe('resolve_rule_attachment inline tool', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();
    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      tool = inlineTools![0] as BuiltinSkillBoundedTool;
    });

    interface AttachmentResultData {
      message?: string;
      attachmentId?: string;
      version?: number;
    }

    const makeCtx = () => createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

    const mockRuleObject = (ruleData: Record<string, unknown>) => {
      mockRulesClient.get.mockResolvedValueOnce(ruleData);
    };

    it('creates an attachment and returns its ID on happy path', async () => {
      const ctx = makeCtx();
      mockRuleObject({
        id: 'rule-uuid-1',
        name: 'My Detection Rule',
        enabled: true,
        tags: ['MITRE'],
        schedule: { interval: '5m' },
        params: {
          rule_id: 'my-static-rule-id',
          type: 'query',
          language: 'kuery',
          query: 'event.category: process',
          index: ['logs-endpoint.events.*'],
          from: 'now-6m',
        },
      });
      (ctx.attachments.get as jest.Mock).mockReturnValueOnce(undefined);
      (ctx.attachments.add as jest.Mock).mockResolvedValueOnce({
        id: 'rule-investigate-rule-uuid-1',
        current_version: 1,
        type: 'security.rule',
        versions: [],
        active: true,
      });

      const result = (await tool.handler(
        { rule_id: 'rule-uuid-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = result.results[0].data as AttachmentResultData;
      expect(data.attachmentId).toBe('rule-investigate-rule-uuid-1');
      expect(data.version).toBe(1);
      expect(data.message).toContain('My Detection Rule');
      expect(ctx.attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rule-investigate-rule-uuid-1',
          type: 'security.rule',
          data: expect.objectContaining({ origin: 'rule-uuid-1' }),
        })
      );
    });

    it('returns existing attachment ID when already resolved', async () => {
      const ctx = makeCtx();
      (ctx.attachments.get as jest.Mock).mockReturnValueOnce({
        id: 'rule-investigate-rule-uuid-1',
        version: 2,
        type: 'security.rule',
        data: {},
      });

      const result = (await tool.handler(
        { rule_id: 'rule-uuid-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = result.results[0].data as AttachmentResultData;
      expect(data.attachmentId).toBe('rule-investigate-rule-uuid-1');
      expect(data.version).toBe(2);
      expect(ctx.attachments.add).not.toHaveBeenCalled();
      expect(mockRulesClient.get).not.toHaveBeenCalled();
    });

    it('returns graceful message when rule is not found', async () => {
      const ctx = makeCtx();
      (ctx.attachments.get as jest.Mock).mockReturnValueOnce(undefined);
      mockRulesClient.get.mockRejectedValueOnce({ output: { statusCode: 404 } });

      const result = (await tool.handler(
        { rule_id: 'missing-id' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0].data as AttachmentResultData).message).toContain('not found');
    });

    it('returns error result when rulesClient throws unexpectedly', async () => {
      const ctx = makeCtx();
      (ctx.attachments.get as jest.Mock).mockReturnValueOnce(undefined);
      mockRulesClient.get.mockRejectedValueOnce(new Error('Rules service unavailable'));

      const result = (await tool.handler({ rule_id: 'rule-1' }, ctx)) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0].data as { message: string }).message).toContain('unavailable');
    });
  });

  // ── get_rule_alerts ─────────────────────────────────────────────────────────

  describe('get_rule_alerts inline tool', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();
    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await investigateRuleSkill.getInlineTools?.();
      tool = inlineTools![1] as BuiltinSkillBoundedTool;
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
      workflow_reasons?: Array<{ reason: string; count: number }>;
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
          workflow_reasons: { buckets: [] },
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

    it('returns alerts, top_entities, and workflow_reasons on happy path', async () => {
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
          workflow_reasons: {
            buckets: [
              { key: 'false_positive', doc_count: 3 },
              { key: 'benign_positive', doc_count: 1 },
            ],
          },
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
      expect(data.workflow_reasons).toEqual([
        { reason: 'false_positive', count: 3 },
        { reason: 'benign_positive', count: 1 },
      ]);
    });

    it('returns empty workflow_reasons when no alerts have been dispositioned', async () => {
      mockAlertsSearch(
        [{ _id: 'alert-1', _source: { '@timestamp': '2024-01-01T00:00:00Z' } }],
        1
      );

      const result = await callHandler({ rule_id: 'rule-1' });
      const data = result.results[0].data as AlertResultData;

      expect(data.workflow_reasons).toEqual([]);
    });

    it('includes workflow_reasons in the ES aggregation request', async () => {
      mockAlertsSearch([]);
      await callHandler({ rule_id: 'rule-1' });

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: expect.objectContaining({
            workflow_reasons: { terms: { field: 'kibana.alert.workflow_reason', size: 10 } },
          }),
        })
      );
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

});
