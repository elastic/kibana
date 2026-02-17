/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAlertHistoryInputSchema,
  getAlertHistoryStepDefinition,
} from './get_alert_history_step';

const createMockContext = (input: Record<string, unknown>, searchMock: jest.Mock) => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
    getScopedEsClient: jest.fn().mockReturnValue({ search: searchMock }),
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
  stepType: 'security.getAlertHistory',
});

describe('getAlertHistory step', () => {
  describe('input schema', () => {
    it('accepts required ruleId and applies default time_range', () => {
      const parsed = getAlertHistoryInputSchema.parse({ ruleId: 'rule-1' });
      expect(parsed.ruleId).toBe('rule-1');
      expect(parsed.time_range).toBe('7d');
    });

    it('rejects missing ruleId', () => {
      expect(getAlertHistoryInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns history buckets and total count', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 5, relation: 'eq' } },
        aggregations: {
          alerts_over_time: {
            buckets: [
              { key: 1704067200000, key_as_string: '2025-01-01T00:00:00.000Z', doc_count: 2 },
              { key: 1704070800000, key_as_string: '2025-01-01T01:00:00.000Z', doc_count: 0 },
              { key: 1704074400000, key_as_string: '2025-01-01T02:00:00.000Z', doc_count: 3 },
            ],
          },
          total_alerts: { value: 5 },
        },
      });

      const input = getAlertHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getAlertHistoryStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      expect(result.output!.rule_id).toBe('rule-1');
      expect(result.output!.time_range).toBe('7d');
      expect(result.output!.total_alerts).toBe(5);
      expect(result.output!.history).toEqual([
        { timestamp: '2025-01-01T00:00:00.000Z', count: 2 },
        { timestamp: '2025-01-01T01:00:00.000Z', count: 0 },
        { timestamp: '2025-01-01T02:00:00.000Z', count: 3 },
      ]);
      expect(result.output!.message).toBe('Rule rule-1 fired 5 times in the last 7d.');
    });

    it('handles numeric hits.total (older ES response format)', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: 3 },
        aggregations: {
          alerts_over_time: { buckets: [] },
          total_alerts: { value: 3 },
        },
      });

      const input = getAlertHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getAlertHistoryStepDefinition.handler(context as never);

      expect(result.output!.total_alerts).toBe(3);
    });

    it('falls back to ISO string when key_as_string is missing', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 1 } },
        aggregations: {
          alerts_over_time: {
            buckets: [{ key: 1704067200000, doc_count: 1 }],
          },
        },
      });

      const input = getAlertHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getAlertHistoryStepDefinition.handler(context as never);

      expect(result.output!.history[0].timestamp).toBe(new Date(1704067200000).toISOString());
    });

    it('singular message when total is 1', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 1 } },
        aggregations: {
          alerts_over_time: { buckets: [] },
        },
      });

      const input = getAlertHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getAlertHistoryStepDefinition.handler(context as never);

      expect(result.output!.message).toBe('Rule rule-1 fired 1 time in the last 7d.');
    });

    it('builds the correct query with custom time_range', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 0 } },
        aggregations: { alerts_over_time: { buckets: [] } },
      });

      const input = getAlertHistoryInputSchema.parse({
        ruleId: 'rule-1',
        time_range: '24h',
      });
      const context = createMockContext(input, searchMock);
      await getAlertHistoryStepDefinition.handler(context as never);

      const searchArgs = searchMock.mock.calls[0][0];
      const filter = searchArgs.query.bool.filter;
      const rangeFilter = filter.find((f: Record<string, unknown>) => 'range' in f);
      expect(rangeFilter.range['@timestamp'].gte).toBe('now-24h');
      expect(rangeFilter.range['@timestamp'].lte).toBe('now');
    });

    it('returns an error when ES search throws', async () => {
      const searchMock = jest.fn().mockRejectedValue(new Error('shard failure'));
      const input = getAlertHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getAlertHistoryStepDefinition.handler(context as never);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('shard failure');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
