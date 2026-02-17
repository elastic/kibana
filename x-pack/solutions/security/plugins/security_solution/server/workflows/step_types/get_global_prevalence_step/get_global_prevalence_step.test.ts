/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGlobalPrevalenceInputSchema,
  getGlobalPrevalenceStepDefinition,
} from './get_global_prevalence_step';

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
  stepType: 'security.getRuleGlobalPrevalence',
});

const createAggResponse = (
  totalAlerts: number,
  uniqueHosts: number,
  uniqueUsers: number,
  hostsBuckets: Array<{ key: string; alert_count: { value: number } }>
) => ({
  hits: { hits: [] },
  aggregations: {
    total_alerts: { value: totalAlerts },
    unique_hosts: { value: uniqueHosts },
    unique_users: { value: uniqueUsers },
    hosts_breakdown: { buckets: hostsBuckets },
  },
});

describe('getGlobalPrevalence step', () => {
  describe('input schema', () => {
    it('accepts required ruleId and applies default time_range', () => {
      const parsed = getGlobalPrevalenceInputSchema.parse({ ruleId: 'rule-1' });
      expect(parsed.ruleId).toBe('rule-1');
      expect(parsed.time_range).toBe('24h');
    });

    it('rejects missing ruleId', () => {
      expect(getGlobalPrevalenceInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns low prevalence when unique hosts < 5', async () => {
      const searchMock = jest.fn().mockResolvedValue(
        createAggResponse(10, 2, 3, [
          { key: 'host-a', alert_count: { value: 7 } },
          { key: 'host-b', alert_count: { value: 3 } },
        ])
      );

      const input = getGlobalPrevalenceInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getGlobalPrevalenceStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      expect(result.output!.prevalence_level).toBe('low');
      expect(result.output!.total_alerts).toBe(10);
      expect(result.output!.unique_hosts).toBe(2);
      expect(result.output!.unique_users).toBe(3);
      expect(result.output!.top_hosts).toEqual([
        { host_name: 'host-a', alert_count: 7 },
        { host_name: 'host-b', alert_count: 3 },
      ]);
      expect(result.output!.message).toContain('Low prevalence');
    });

    it('returns medium prevalence when unique hosts >= 5 and < 20', async () => {
      const searchMock = jest.fn().mockResolvedValue(createAggResponse(50, 10, 8, []));

      const input = getGlobalPrevalenceInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getGlobalPrevalenceStepDefinition.handler(context as never);

      expect(result.output!.prevalence_level).toBe('medium');
      expect(result.output!.message).toContain('Medium prevalence');
    });

    it('returns high prevalence when unique hosts >= 20 and < 50', async () => {
      const searchMock = jest.fn().mockResolvedValue(createAggResponse(200, 30, 25, []));

      const input = getGlobalPrevalenceInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getGlobalPrevalenceStepDefinition.handler(context as never);

      expect(result.output!.prevalence_level).toBe('high');
      expect(result.output!.message).toContain('High prevalence');
    });

    it('returns very_high prevalence when unique hosts >= 50', async () => {
      const searchMock = jest.fn().mockResolvedValue(createAggResponse(500, 75, 60, []));

      const input = getGlobalPrevalenceInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getGlobalPrevalenceStepDefinition.handler(context as never);

      expect(result.output!.prevalence_level).toBe('very_high');
      expect(result.output!.message).toContain('Very high prevalence');
    });

    it('uses custom timestamp for the time range anchor', async () => {
      const searchMock = jest.fn().mockResolvedValue(createAggResponse(0, 0, 0, []));

      const input = getGlobalPrevalenceInputSchema.parse({
        ruleId: 'rule-1',
        timestamp: '2025-06-01T12:00:00Z',
        time_range: '7d',
      });
      const context = createMockContext(input, searchMock);
      await getGlobalPrevalenceStepDefinition.handler(context as never);

      const filter = searchMock.mock.calls[0][0].query.bool.filter;
      const rangeFilter = filter.find((f: Record<string, unknown>) => 'range' in f);
      expect(rangeFilter.range['@timestamp'].gte).toBe('2025-06-01T12:00:00Z||-7d');
      expect(rangeFilter.range['@timestamp'].lte).toBe('2025-06-01T12:00:00Z||+7d');
    });

    it('handles missing aggregations gracefully', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { hits: [] },
        aggregations: undefined,
      });

      const input = getGlobalPrevalenceInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getGlobalPrevalenceStepDefinition.handler(context as never);

      expect(result.output!.total_alerts).toBe(0);
      expect(result.output!.unique_hosts).toBe(0);
      expect(result.output!.prevalence_level).toBe('low');
    });

    it('returns an error when ES search throws', async () => {
      const searchMock = jest.fn().mockRejectedValue(new Error('timeout'));
      const input = getGlobalPrevalenceInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getGlobalPrevalenceStepDefinition.handler(context as never);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('timeout');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
