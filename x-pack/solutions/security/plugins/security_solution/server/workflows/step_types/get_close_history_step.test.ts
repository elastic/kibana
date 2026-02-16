/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCloseHistoryInputSchema,
  getCloseHistoryStepDefinition,
} from './get_close_history_step';

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
  stepType: 'security.getCloseHistory',
});

describe('getCloseHistory step', () => {
  describe('input schema', () => {
    it('accepts required ruleId and applies default time_range', () => {
      const parsed = getCloseHistoryInputSchema.parse({ ruleId: 'rule-1' });
      expect(parsed.ruleId).toBe('rule-1');
      expect(parsed.time_range).toBe('30d');
      expect(parsed.timestamp).toBeUndefined();
      expect(parsed.match_alert_entities).toBeUndefined();
    });

    it('rejects missing ruleId', () => {
      expect(getCloseHistoryInputSchema.safeParse({}).success).toBe(false);
    });

    it('rejects invalid match_alert_entities (missing alertIndex)', () => {
      const result = getCloseHistoryInputSchema.safeParse({
        ruleId: 'r1',
        match_alert_entities: { alertId: 'a1' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns closed alerts for the same rule when match_alert_entities is omitted', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'closed-1',
              _index: '.alerts-default',
              _source: {
                '@timestamp': '2025-01-10T00:00:00Z',
                'kibana.alert.rule.name': 'My Rule',
                'kibana.alert.severity': 'high',
                'kibana.alert.workflow_reason': 'resolved',
                'kibana.alert.workflow_tags': ['ops'],
                'kibana.alert.workflow_status_updated_at': '2025-01-10T01:00:00Z',
                'host.name': 'host-a',
              },
            },
            {
              _id: 'closed-2',
              _index: '.alerts-default',
              _source: {
                '@timestamp': '2025-01-09T00:00:00Z',
                'kibana.alert.workflow_reason': 'false_positive',
                'kibana.alert.workflow_tags': [],
              },
            },
          ],
        },
      });

      const input = getCloseHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getCloseHistoryStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      expect(result.output).toBeDefined();
      const { output } = result;
      expect(output!.rule_id).toBe('rule-1');
      expect(output!.match_entities).toBe(false);
      expect(output!.match_type).toBe('same rule');
      expect(output!.total_closed_alerts).toBe(2);
      expect(output!.false_positive_count).toBe(1);
      expect(output!.close_reasons_summary).toEqual({ resolved: 1, false_positive: 1 });
      expect(output!.closed_alerts).toHaveLength(2);
      expect(output!.closed_alerts[0].alert_id).toBe('closed-1');
      expect(output!.closed_alerts[0].close_reason).toBe('resolved');
      expect(output!.entity_info).toBeUndefined();

      // Verify only one search call (no entity lookup)
      expect(searchMock).toHaveBeenCalledTimes(1);
      const searchArgs = searchMock.mock.calls[0][0];
      expect(searchArgs.query.bool.must_not).toEqual([]);
    });

    it('counts false positives from workflow tags', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'c1',
              _index: '.idx',
              _source: {
                'kibana.alert.workflow_reason': 'some_reason',
                'kibana.alert.workflow_tags': ['FP', 'other'],
              },
            },
            {
              _id: 'c2',
              _index: '.idx',
              _source: {
                'kibana.alert.workflow_reason': 'other',
                'kibana.alert.workflow_tags': ['false-positive-confirmed'],
              },
            },
          ],
        },
      });

      const input = getCloseHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getCloseHistoryStepDefinition.handler(context as never);

      expect(result.output!.false_positive_count).toBe(2);
    });

    it('matches alert entities when match_alert_entities is provided', async () => {
      const searchMock = jest.fn();

      // First call: fetch the seed alert for entity info
      searchMock.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                'host.name': 'host-a',
                'user.name': 'alice',
              },
            },
          ],
        },
      });

      // Second call: fetch closed alerts matching entities
      searchMock.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'closed-x',
              _index: '.alerts',
              _source: {
                '@timestamp': '2025-01-10T00:00:00Z',
                'kibana.alert.workflow_reason': 'resolved',
                'kibana.alert.workflow_tags': [],
                'host.name': 'host-a',
                'user.name': 'alice',
              },
            },
          ],
        },
      });

      const input = getCloseHistoryInputSchema.parse({
        ruleId: 'rule-1',
        match_alert_entities: { alertId: 'alert-seed', alertIndex: '.alerts-seed-index' },
      });
      const context = createMockContext(input, searchMock);
      const result = await getCloseHistoryStepDefinition.handler(context as never);

      expect(result.output!.match_entities).toBe(true);
      expect(result.output!.match_type).toBe('same rule + entities');
      expect(result.output!.entity_info).toEqual({
        host_name: 'host-a',
        user_name: 'alice',
        service_name: undefined,
      });
      expect(result.output!.total_closed_alerts).toBe(1);

      // Verify entity lookup search
      expect(searchMock.mock.calls[0][0].index).toBe('.alerts-seed-index');

      // Verify must_not excludes the seed alert
      const closedSearchArgs = searchMock.mock.calls[1][0];
      expect(closedSearchArgs.query.bool.must_not).toEqual([{ term: { _id: 'alert-seed' } }]);
    });

    it('returns empty result when alert has no entity info', async () => {
      const searchMock = jest.fn();

      // Entity lookup returns alert with no entity fields
      searchMock.mockResolvedValueOnce({
        hits: { hits: [{ _source: {} }] },
      });

      const input = getCloseHistoryInputSchema.parse({
        ruleId: 'rule-1',
        match_alert_entities: { alertId: 'alert-1', alertIndex: '.idx' },
      });
      const context = createMockContext(input, searchMock);
      const result = await getCloseHistoryStepDefinition.handler(context as never);

      expect(result.output!.total_closed_alerts).toBe(0);
      expect(result.output!.message).toContain('No entity information found');
      // Only one search call (entity lookup), no closed-alerts search
      expect(searchMock).toHaveBeenCalledTimes(1);
    });

    it('uses custom timestamp for the time range anchor', async () => {
      const searchMock = jest.fn().mockResolvedValue({ hits: { hits: [] } });

      const input = getCloseHistoryInputSchema.parse({
        ruleId: 'rule-1',
        timestamp: '2025-06-01T12:00:00Z',
        time_range: '7d',
      });
      const context = createMockContext(input, searchMock);
      await getCloseHistoryStepDefinition.handler(context as never);

      const searchArgs = searchMock.mock.calls[0][0];
      const rangeFilter = searchArgs.query.bool.must.find(
        (f: Record<string, unknown>) => 'range' in f
      );
      expect(rangeFilter.range['@timestamp'].gte).toBe('2025-06-01T12:00:00Z||-7d');
      expect(rangeFilter.range['@timestamp'].lte).toBe('2025-06-01T12:00:00Z');
    });

    it('returns an error when ES search throws', async () => {
      const searchMock = jest.fn().mockRejectedValue(new Error('ES unavailable'));
      const input = getCloseHistoryInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getCloseHistoryStepDefinition.handler(context as never);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('ES unavailable');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
