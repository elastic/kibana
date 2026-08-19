/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelatedAlertsGraphOutput } from './types';

jest.mock('./graph_builder', () => ({
  buildRelatedAlertsGraph: jest.fn(),
}));

jest.mock('./time_window', () => ({
  parseTimeWindowToMs: jest.fn((v: string) => {
    const match = v.match(/^(\d+)([hmd])$/);
    if (!match) return 3600000;
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { h: 3600000, m: 60000, d: 86400000 };
    return Number(num) * (multipliers[unit] ?? 3600000);
  }),
}));

import {
  buildAlertEntityGraphInputSchema,
  buildAlertEntityGraphStepDefinition,
} from './build_alert_entity_graph_step';
import { buildRelatedAlertsGraph } from './graph_builder';
import { parseTimeWindowToMs } from './time_window';

const mockBuildGraph = buildRelatedAlertsGraph as jest.MockedFunction<
  typeof buildRelatedAlertsGraph
>;
const mockParseWindow = parseTimeWindowToMs as jest.MockedFunction<typeof parseTimeWindowToMs>;

const createMockContext = (input: Record<string, unknown>) => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
    getScopedEsClient: jest.fn().mockReturnValue({ search: jest.fn() }),
    renderInputTemplate: jest.fn(),
    getFakeRequest: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'security.buildAlertEntityGraph',
});

const GRAPH_RESULT: RelatedAlertsGraphOutput = {
  nodes: [{ id: 'alert-1' }, { id: 'alert-2' }],
  edges: [{ from: 'alert-1', to: 'alert-2', score: 3, label_scores: { host: 2, user: 1 } }],
  alerts: [
    {
      alert_id: 'alert-1',
      alert_index: '.alerts-default',
      timestamp: '2025-01-01T00:00:00Z',
      rule_name: 'Rule A',
      severity: 'high',
    },
    {
      alert_id: 'alert-2',
      alert_index: '.alerts-default',
      timestamp: '2025-01-01T01:00:00Z',
      rule_name: 'Rule B',
      severity: 'medium',
    },
  ],
  stats: {
    depth_reached: 2,
    nodes: 2,
    edges: 1,
    queries: 4,
    time_range: { gte: '2025-01-01T00:00:00Z', lte: '2025-01-01T02:00:00Z' },
  },
};

describe('buildAlertEntityGraph step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('input schema', () => {
    it('coerces numeric strings and applies defaults', () => {
      const parsed = buildAlertEntityGraphInputSchema.parse({
        alertId: 'abc',
        alertIndex: '.internal.alerts-security.alerts-default-000001',
        max_alerts: '20',
        page_size: '200',
      });

      expect(parsed.max_alerts).toBe(20);
      expect(parsed.page_size).toBe(200);
      expect(typeof parsed.max_terms_per_query).toBe('number');
      expect(typeof parsed.max_entities_per_field).toBe('number');
    });

    it('rejects NaN/Infinity so downstream queries cannot emit empty terms', () => {
      const badNaN = buildAlertEntityGraphInputSchema.safeParse({
        alertId: 'abc',
        alertIndex: '.internal.alerts-security.alerts-default-000001',
        max_terms_per_query: NaN,
      });
      expect(badNaN.success).toBe(false);

      const badInfinity = buildAlertEntityGraphInputSchema.safeParse({
        alertId: 'abc',
        alertIndex: '.internal.alerts-security.alerts-default-000001',
        page_size: Infinity,
      });
      expect(badInfinity.success).toBe(false);
    });

    it('applies default entity_fields when not provided', () => {
      const parsed = buildAlertEntityGraphInputSchema.parse({
        alertId: 'abc',
        alertIndex: '.alerts-idx',
      });
      expect(parsed.entity_fields).toEqual([
        { field: 'host.name' },
        { field: 'user.name' },
        { field: 'service.name' },
      ]);
    });

    it('applies all numeric defaults', () => {
      const parsed = buildAlertEntityGraphInputSchema.parse({
        alertId: 'abc',
        alertIndex: '.alerts-idx',
      });
      expect(parsed.max_depth).toBe(3);
      expect(parsed.max_alerts).toBe(300);
      expect(parsed.page_size).toBe(200);
      expect(parsed.max_terms_per_query).toBe(500);
      expect(parsed.max_entities_per_field).toBe(200);
      expect(parsed.min_entity_score).toBe(2);
      expect(parsed.include_seed).toBe(true);
      expect(parsed.seed_window).toBe('1h');
      expect(parsed.expand_window).toBe('1h');
    });
  });

  describe('handler', () => {
    it('passes parsed input to buildRelatedAlertsGraph and returns the result', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'alert-1',
        alertIndex: '.alerts-security.alerts-default',
      });
      const context = createMockContext(input);
      const result = await buildAlertEntityGraphStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      expect(result.output).toEqual(GRAPH_RESULT);
      expect(mockBuildGraph).toHaveBeenCalledTimes(1);

      const params = mockBuildGraph.mock.calls[0][0];
      expect(params.seed).toEqual({
        alertId: 'alert-1',
        alertIndex: '.alerts-security.alerts-default',
      });
      expect(params.entityFields).toEqual(['host.name', 'user.name', 'service.name']);
      expect(params.maxDepth).toBe(3);
      expect(params.maxAlerts).toBe(300);
      expect(params.pageSize).toBe(200);
      expect(params.includeSeed).toBe(true);
    });

    it('uses the concrete internal index when alertIndex starts with .internal', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'alert-1',
        alertIndex: '.internal.alerts-security.alerts-default-000001',
      });
      const context = createMockContext(input);
      await buildAlertEntityGraphStepDefinition.handler(context as never);

      const params = mockBuildGraph.mock.calls[0][0];
      expect(params.searchIndex).toBe('.internal.alerts-security.alerts-default-000001');
    });

    it('uses the public alias when alertIndex is not internal', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'alert-1',
        alertIndex: '.alerts-security.alerts-default',
      });
      const context = createMockContext(input);
      await buildAlertEntityGraphStepDefinition.handler(context as never);

      const params = mockBuildGraph.mock.calls[0][0];
      expect(params.searchIndex).toBe('.alerts-security.alerts-default');
    });

    it('passes the scoped ES client to buildRelatedAlertsGraph', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'a',
        alertIndex: '.idx',
      });
      const context = createMockContext(input);
      const expectedEsClient = context.contextManager.getScopedEsClient();
      await buildAlertEntityGraphStepDefinition.handler(context as never);

      expect(mockBuildGraph.mock.calls[0][0].esClient).toBe(expectedEsClient);
    });

    it('parses seed_window and expand_window through parseTimeWindowToMs', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'a',
        alertIndex: '.idx',
        seed_window: '24h',
        expand_window: '2h',
      });
      const context = createMockContext(input);
      await buildAlertEntityGraphStepDefinition.handler(context as never);

      expect(mockParseWindow).toHaveBeenCalledWith('24h');
      expect(mockParseWindow).toHaveBeenCalledWith('2h');

      const params = mockBuildGraph.mock.calls[0][0];
      expect(params.seedWindowMs).toBe(24 * 3600000);
      expect(params.expandWindowMs).toBe(2 * 3600000);
    });

    it('passes custom entity_fields and extracts field scores and aliases', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'a',
        alertIndex: '.idx',
        entity_fields: [
          { field: 'host.name', score: 3 },
          {
            field: 'source.ip',
            score: 2,
            aliases: [{ field: 'destination.ip', score: 1 }],
          },
        ],
      });
      const context = createMockContext(input);
      await buildAlertEntityGraphStepDefinition.handler(context as never);

      const params = mockBuildGraph.mock.calls[0][0];
      expect(params.entityFields).toContain('host.name');
      expect(params.entityFields).toContain('source.ip');
      expect(params.entityFields).toContain('destination.ip');
      expect(params.entityFieldScores).toEqual({ 'host.name': 3, 'source.ip': 2 });
      expect(params.entityFieldAliases).toEqual({
        'source.ip': [{ field: 'destination.ip', score: 1 }],
      });
    });

    it('passes ignore_entities and min_entity_score to buildRelatedAlertsGraph', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'a',
        alertIndex: '.idx',
        ignore_entities: [{ field: 'user.name', values: ['root', 'SYSTEM'] }],
        min_entity_score: 5,
      });
      const context = createMockContext(input);
      await buildAlertEntityGraphStepDefinition.handler(context as never);

      const params = mockBuildGraph.mock.calls[0][0];
      expect(params.ignoreEntities).toEqual([{ field: 'user.name', values: ['root', 'SYSTEM'] }]);
      expect(params.minEntityScore).toBe(5);
    });

    it('uses the correct space-aware index from context', async () => {
      mockBuildGraph.mockResolvedValue(GRAPH_RESULT);

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'a',
        alertIndex: '.alerts-security.alerts-custom-space',
      });
      const context = createMockContext(input);
      context.contextManager.getContext.mockReturnValue({
        workflow: { spaceId: 'custom-space' },
      });
      await buildAlertEntityGraphStepDefinition.handler(context as never);

      const params = mockBuildGraph.mock.calls[0][0];
      expect(params.searchIndex).toBe('.alerts-security.alerts-custom-space');
    });

    it('returns an error when buildRelatedAlertsGraph throws', async () => {
      mockBuildGraph.mockRejectedValue(new Error('graph build failed'));

      const input = buildAlertEntityGraphInputSchema.parse({
        alertId: 'a',
        alertIndex: '.idx',
      });
      const context = createMockContext(input);
      const result = await buildAlertEntityGraphStepDefinition.handler(context as never);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('graph build failed');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
