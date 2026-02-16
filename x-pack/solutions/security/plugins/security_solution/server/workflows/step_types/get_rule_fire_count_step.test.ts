/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRuleFireCountInputSchema,
  getRuleFireCountStepDefinition,
} from './get_rule_fire_count_step';

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
  stepType: 'security.getRuleFireCount',
});

describe('getRuleFireCount step', () => {
  describe('input schema', () => {
    it('accepts required ruleId and applies default time_window', () => {
      const parsed = getRuleFireCountInputSchema.parse({ ruleId: 'rule-1' });
      expect(parsed.ruleId).toBe('rule-1');
      expect(parsed.time_window).toBe('1h');
      expect(parsed.timestamp).toBeUndefined();
    });

    it('rejects missing ruleId', () => {
      expect(getRuleFireCountInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns the total fire count from hits.total', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 42, relation: 'eq' } },
      });

      const input = getRuleFireCountInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleFireCountStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      expect(result.output!.rule_id).toBe('rule-1');
      expect(result.output!.count).toBe(42);
      expect(result.output!.time_window).toBe('1h');
      expect(result.output!.message).toBe('Rule rule-1 fired 42 times in the ±1h window.');
    });

    it('handles numeric hits.total', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: 7 },
      });

      const input = getRuleFireCountInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleFireCountStepDefinition.handler(context as never);

      expect(result.output!.count).toBe(7);
    });

    it('builds a symmetric time window around a custom timestamp', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 0 } },
      });

      const input = getRuleFireCountInputSchema.parse({
        ruleId: 'rule-1',
        timestamp: '2025-06-01T12:00:00Z',
        time_window: '24h',
      });
      const context = createMockContext(input, searchMock);
      await getRuleFireCountStepDefinition.handler(context as never);

      const filter = searchMock.mock.calls[0][0].query.bool.filter;
      const rangeFilter = filter.find((f: Record<string, unknown>) => 'range' in f);
      expect(rangeFilter.range['@timestamp'].gte).toBe('2025-06-01T12:00:00Z||-24h');
      expect(rangeFilter.range['@timestamp'].lte).toBe('2025-06-01T12:00:00Z||+24h');
    });

    it('uses now-based symmetric window when no timestamp is provided', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 0 } },
      });

      const input = getRuleFireCountInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      await getRuleFireCountStepDefinition.handler(context as never);

      const filter = searchMock.mock.calls[0][0].query.bool.filter;
      const rangeFilter = filter.find((f: Record<string, unknown>) => 'range' in f);
      expect(rangeFilter.range['@timestamp'].gte).toBe('now-1h');
      expect(rangeFilter.range['@timestamp'].lte).toBe('now+1h');
    });

    it('singular message when count is 1', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: { total: { value: 1 } },
      });

      const input = getRuleFireCountInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleFireCountStepDefinition.handler(context as never);

      expect(result.output!.message).toBe('Rule rule-1 fired 1 time in the ±1h window.');
    });

    it('returns an error when ES search throws', async () => {
      const searchMock = jest.fn().mockRejectedValue(new Error('index_not_found'));
      const input = getRuleFireCountInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleFireCountStepDefinition.handler(context as never);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('index_not_found');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
