/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Parser } from '@elastic/esql';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { RulesAdapterV2, type RulesAdapterV2Params } from './v2_rules_adapter';
import {
  BulkCreateRulesError,
  STREAMS_RULE_STREAM_TAG_PREFIX,
  type SignificantEventsRuleDefinition,
} from './rules_management_client';
import {
  METRIC_SERIES_EVERY,
  METRIC_SERIES_LIMIT,
  METRIC_SERIES_LOOKBACK,
  METRIC_SERIES_RULE_TAG,
} from '../../../significant_events/rules/metric_series_contract';

function makeRulesClientMock() {
  return {
    createRule: jest.fn(),
    bulkCreateRules: jest.fn(),
    updateRule: jest.fn(),
    bulkDeleteRules: jest.fn(),
    ruleExists: jest.fn(),
    findRules: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 500 }),
    getTags: jest.fn().mockResolvedValue([]),
  };
}

function makeAdapter(
  mock: ReturnType<typeof makeRulesClientMock>,
  { isServerless }: Pick<RulesAdapterV2Params, 'isServerless'> = { isServerless: false }
) {
  return new RulesAdapterV2({ rulesClient: mock, isServerless });
}

function lastCreateCall(mock: ReturnType<typeof makeRulesClientMock>) {
  const call = mock.createRule.mock.calls[mock.createRule.mock.calls.length - 1][0];
  return call;
}

function lastUpdateCall(mock: ReturnType<typeof makeRulesClientMock>) {
  const call = mock.updateRule.mock.calls[mock.updateRule.mock.calls.length - 1][0];
  return call;
}

const createDefinition: SignificantEventsRuleDefinition = {
  name: 'High error rate (match count)',
  streamName: 'my-stream',
  timestampField: '@timestamp',
  esqlQuery: 'FROM logs-* | WHERE level == "error"',
  schedule: { interval: METRIC_SERIES_EVERY },
};

const updateDefinition: SignificantEventsRuleDefinition = {
  name: 'Updated title (match count)',
  streamName: 'my-stream',
  timestampField: '@timestamp',
  esqlQuery: 'FROM logs-* | WHERE level == "error"',
  schedule: { interval: METRIC_SERIES_EVERY },
};

function expectMetricSeriesBreach(query: string) {
  expect(query).toContain('STATS metric_value = COUNT(*)');
  expect(query).toContain('KEEP bucket, metric_value');
  expect(query).toContain('SORT bucket DESC');
  expect(query).toContain(`LIMIT ${METRIC_SERIES_LIMIT}`);
  expect(query).not.toContain('LIMIT 1000');
  expect(query).not.toContain('TO_LONG');
  expect(query).not.toContain('DATE_FORMAT');
}

describe('RulesAdapterV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('v2 body mapping', () => {
    it('maps createRule body to metric-series signal shape', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.createRule('rule-1', createDefinition);

      const data = lastCreateCall(mock).data as {
        kind: string;
        metadata: { name: string; tags: string[] };
        time_field: string;
        schedule: { every: string; lookback: string };
        grouping: { fields: string[] };
        query: { format: string; breach: { query: string } };
      };

      expect(data.kind).toBe('signal');
      expect(data.metadata).toEqual({
        name: 'High error rate (match count)',
        tags: ['sigevents:stream:my-stream', METRIC_SERIES_RULE_TAG],
      });
      expect(data.time_field).toBe('@timestamp');
      expect(data.schedule).toEqual({
        every: METRIC_SERIES_EVERY,
        lookback: METRIC_SERIES_LOOKBACK,
      });
      expect(data.grouping).toEqual({ fields: ['bucket'] });
      expect(data.query.format).toBe('standalone');
      expectMetricSeriesBreach(data.query.breach.query);
      expect(lastCreateCall(mock).options).toEqual({ id: 'rule-1' });
    });

    it('rejects STATS queries until rule-on-rule provisioning', async () => {
      const mock = makeRulesClientMock();
      const adapter = makeAdapter(mock);
      const statsQuery =
        'FROM logs-* | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | WHERE count > 0';

      await expect(
        adapter.createRule('rule-stats', {
          ...createDefinition,
          esqlQuery: statsQuery,
        })
      ).rejects.toThrow(/filter-only/);

      expect(mock.createRule).not.toHaveBeenCalled();
    });

    it('maps updateRule body to metric-series partial shape (no kind)', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.updateRule('rule-1', updateDefinition);

      const data = lastUpdateCall(mock).data as {
        metadata: { name: string; tags: string[] };
        schedule: { every: string; lookback: string };
        grouping: { fields: string[] };
        query: { breach: { query: string } };
      };

      expect(data.metadata.name).toBe('Updated title (match count)');
      expect(data.metadata.tags).toEqual(['sigevents:stream:my-stream', METRIC_SERIES_RULE_TAG]);
      expect(data.schedule).toEqual({
        every: METRIC_SERIES_EVERY,
        lookback: METRIC_SERIES_LOOKBACK,
      });
      expect(data.grouping).toEqual({ fields: ['bucket'] });
      expectMetricSeriesBreach(data.query.breach.query);
    });

    it('forwards timestampField as time_field and into the compiled BUCKET', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);
      await adapter.updateRule('rule-1', {
        ...updateDefinition,
        timestampField: 'event.ingested',
      });

      const data = lastUpdateCall(mock).data as {
        time_field: string;
        query: { breach: { query: string } };
      };
      expect(data.time_field).toBe('event.ingested');
      expect(data.query.breach.query).toContain('BUCKET(event.ingested, 1 minute)');
    });
  });

  describe('serverless project routing', () => {
    const SET_DIRECTIVE = `SET project_routing="${PROJECT_ROUTING_ALL}";`;

    it('omits the project routing directive on stateful', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock, { isServerless: false });
      await adapter.createRule('rule-1', createDefinition);

      expect(lastCreateCall(mock).data.query.breach.query).not.toContain('SET project_routing');
    });

    it('scopes the create breach query across all projects on serverless', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock, { isServerless: true });
      await adapter.createRule('rule-1', createDefinition);

      const query = lastCreateCall(mock).data.query.breach.query;
      expect(query.startsWith(SET_DIRECTIVE)).toBe(true);
      expectMetricSeriesBreach(query);
    });

    it('scopes the update breach query across all projects on serverless', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock, { isServerless: true });
      await adapter.updateRule('rule-1', updateDefinition);

      const query = lastUpdateCall(mock).data.query.breach.query;
      expect(query.startsWith(SET_DIRECTIVE)).toBe(true);
      expectMetricSeriesBreach(query);
    });

    it('emits a query Alerting v2 rule validation accepts', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock, { isServerless: true });
      await adapter.createRule('rule-1', createDefinition);

      expect(Parser.parseErrors(lastCreateCall(mock).data.query.breach.query)).toEqual([]);
    });
  });

  describe('createRule', () => {
    it('falls back to updateRule on 409 conflict', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockRejectedValueOnce(Boom.conflict('exists'));
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);

      await adapter.createRule('rule-1', createDefinition);

      expect(mock.createRule).toHaveBeenCalledTimes(1);
      expect(mock.updateRule).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-409 create errors', async () => {
      const mock = makeRulesClientMock();
      mock.createRule.mockRejectedValueOnce(Boom.badRequest('invalid'));
      const adapter = makeAdapter(mock);

      await expect(adapter.createRule('rule-1', createDefinition)).rejects.toMatchObject({
        output: { statusCode: 400 },
      });
    });
  });

  describe('bulkCreateRules', () => {
    it('creates enabled rules in one v2 request and returns createdIds', async () => {
      const mock = makeRulesClientMock();
      mock.bulkCreateRules.mockResolvedValue({ rules: [{ id: 'rule-1' }], errors: [] } as never);
      const adapter = makeAdapter(mock);

      const result = await adapter.bulkCreateRules([
        { id: 'rule-1', definition: createDefinition },
      ]);

      expect(result).toEqual({ createdIds: ['rule-1'] });
      expect(mock.bulkCreateRules).toHaveBeenCalledWith({
        rules: [
          expect.objectContaining({
            id: 'rule-1',
            enabled: true,
            kind: 'signal',
            metadata: {
              name: createDefinition.name,
              tags: ['sigevents:stream:my-stream', METRIC_SERIES_RULE_TAG],
            },
          }),
        ],
      });
    });

    it('updates conflicts with the matching definitions, limits fallback concurrency, and excludes them from createdIds', async () => {
      const mock = makeRulesClientMock();
      const rules = Array.from({ length: 11 }, (_, index) => ({
        id: `rule-${index}`,
        definition: { ...createDefinition, name: `Rule ${index}` },
      }));
      mock.bulkCreateRules.mockResolvedValue({
        rules: [],
        errors: rules.map(({ id }) => ({
          id,
          error: {
            code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS,
            message: 'already exists',
          },
        })),
      } as never);
      let activeUpdates = 0;
      let maxActiveUpdates = 0;
      mock.updateRule.mockImplementation(async () => {
        activeUpdates += 1;
        maxActiveUpdates = Math.max(maxActiveUpdates, activeUpdates);
        await Promise.resolve();
        activeUpdates -= 1;
        return {} as never;
      });
      const adapter = makeAdapter(mock);

      const result = await adapter.bulkCreateRules(rules);

      expect(result).toEqual({ createdIds: [] });
      expect(mock.updateRule).toHaveBeenCalledTimes(11);
      expect(maxActiveUpdates).toBe(10);
      expect(mock.updateRule).toHaveBeenCalledWith({
        id: 'rule-10',
        data: expect.objectContaining({
          metadata: expect.objectContaining({ name: 'Rule 10' }),
        }),
      });
    });

    it('skips conflict updates and throws when fatal errors are present', async () => {
      const mock = makeRulesClientMock();
      mock.bulkCreateRules.mockResolvedValue({
        rules: [{ id: 'rule-created' }],
        errors: [
          {
            id: 'rule-conflict',
            error: {
              code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS,
              message: 'already exists',
            },
          },
          {
            id: 'rule-failed',
            error: {
              code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR,
              message: 'storage unavailable',
            },
          },
        ],
      } as never);
      const adapter = makeAdapter(mock);

      const thrown = await adapter
        .bulkCreateRules([
          { id: 'rule-created', definition: createDefinition },
          { id: 'rule-conflict', definition: createDefinition },
          { id: 'rule-failed', definition: updateDefinition },
        ])
        .catch((error) => error);

      expect(thrown).toBeInstanceOf(BulkCreateRulesError);
      expect(thrown).toMatchObject({
        createdIds: ['rule-created'],
        conflictIds: ['rule-conflict'],
        failedIds: ['rule-failed'],
      });
      expect(thrown.cause).toHaveProperty(
        'message',
        expect.stringContaining('rule-failed [INTERNAL_SERVER_ERROR]: storage unavailable')
      );
      expect(mock.updateRule).not.toHaveBeenCalled();
    });

    it('preserves created and conflict ids when a conflict update fails', async () => {
      const mock = makeRulesClientMock();
      const updateError = Boom.serverUnavailable('update failed');
      mock.bulkCreateRules.mockResolvedValue({
        rules: [{ id: 'rule-created' }],
        errors: [
          {
            id: 'rule-1',
            error: {
              code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS,
              message: 'already exists',
            },
          },
        ],
      } as never);
      mock.updateRule.mockRejectedValue(updateError);
      const adapter = makeAdapter(mock);

      const thrown = await adapter
        .bulkCreateRules([
          { id: 'rule-created', definition: createDefinition },
          { id: 'rule-1', definition: createDefinition },
        ])
        .catch((error) => error);

      expect(thrown).toBeInstanceOf(BulkCreateRulesError);
      expect(thrown).toMatchObject({
        cause: updateError,
        createdIds: ['rule-created'],
        conflictIds: ['rule-1'],
        failedIds: ['rule-1'],
      });
    });

    it('does not recreate a conflicted rule deleted before its update', async () => {
      const mock = makeRulesClientMock();
      const updateError = Boom.notFound('deleted after conflict');
      mock.bulkCreateRules.mockResolvedValue({
        rules: [{ id: 'rule-created' }],
        errors: [
          {
            id: 'rule-conflict',
            error: {
              code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS,
              message: 'already exists',
            },
          },
        ],
      } as never);
      mock.updateRule.mockRejectedValue(updateError);
      const adapter = makeAdapter(mock);

      const thrown = await adapter
        .bulkCreateRules([
          { id: 'rule-created', definition: createDefinition },
          { id: 'rule-conflict', definition: createDefinition },
        ])
        .catch((error) => error);

      expect(thrown).toBeInstanceOf(BulkCreateRulesError);
      expect(thrown).toMatchObject({
        cause: updateError,
        createdIds: ['rule-created'],
        conflictIds: ['rule-conflict'],
        failedIds: ['rule-conflict'],
      });
      expect(mock.createRule).not.toHaveBeenCalled();
    });

    it('updates all known-existing rules after the bulk schedule preflight rejects them', async () => {
      const mock = makeRulesClientMock();
      const rules = Array.from({ length: 51 }, (_, index) => ({
        id: `rule-${index}`,
        definition: createDefinition,
      }));
      const requestError = Boom.badRequest('schedule limit exceeded', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
      mock.bulkCreateRules.mockRejectedValueOnce(requestError);
      mock.ruleExists.mockResolvedValue(true);
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);

      await expect(adapter.bulkCreateRules(rules)).resolves.toEqual({ createdIds: [] });

      expect(mock.bulkCreateRules).toHaveBeenCalledTimes(1);
      expect(mock.ruleExists).toHaveBeenCalledTimes(51);
      expect(mock.updateRule).toHaveBeenCalledTimes(51);
    });

    it('retries a rejected mixed batch with only net-new rules', async () => {
      const mock = makeRulesClientMock();
      const requestError = Boom.badRequest('schedule limit exceeded', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
      mock.bulkCreateRules
        .mockRejectedValueOnce(requestError)
        .mockResolvedValueOnce({ rules: [{ id: 'rule-new' }], errors: [] } as never);
      mock.ruleExists.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve(id === 'rule-existing')
      );
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);

      await expect(
        adapter.bulkCreateRules([
          { id: 'rule-existing', definition: updateDefinition },
          { id: 'rule-new', definition: createDefinition },
        ])
      ).resolves.toEqual({ createdIds: ['rule-new'] });

      expect(mock.bulkCreateRules).toHaveBeenCalledTimes(2);
      const retryRules = mock.bulkCreateRules.mock.calls[1][0].rules as Array<{ id: string }>;
      expect(retryRules.map(({ id }) => id)).toEqual(['rule-new']);
      expect(mock.updateRule).toHaveBeenCalledTimes(1);
      expect(mock.updateRule).toHaveBeenCalledWith({
        id: 'rule-existing',
        data: expect.objectContaining({
          metadata: expect.objectContaining({ name: updateDefinition.name }),
        }),
      });
    });

    it('still updates a retry-time conflict alongside a known-existing rule', async () => {
      const mock = makeRulesClientMock();
      const requestError = Boom.badRequest('schedule limit exceeded', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
      mock.bulkCreateRules.mockRejectedValueOnce(requestError).mockResolvedValueOnce({
        rules: [],
        errors: [
          {
            id: 'rule-raced',
            error: {
              code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS,
              message: 'already exists',
            },
          },
        ],
      } as never);
      mock.ruleExists.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve(id === 'rule-existing')
      );
      mock.updateRule.mockResolvedValue({} as never);
      const adapter = makeAdapter(mock);

      await expect(
        adapter.bulkCreateRules([
          { id: 'rule-existing', definition: updateDefinition },
          { id: 'rule-raced', definition: createDefinition },
        ])
      ).resolves.toEqual({ createdIds: [] });

      expect(mock.updateRule.mock.calls.map(([{ id }]) => id)).toEqual([
        'rule-existing',
        'rule-raced',
      ]);
    });

    it('preserves retry-created and known-conflict ids when the retry has a fatal error', async () => {
      const mock = makeRulesClientMock();
      const requestError = Boom.badRequest('schedule limit exceeded', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
      mock.bulkCreateRules.mockRejectedValueOnce(requestError).mockResolvedValueOnce({
        rules: [{ id: 'rule-created' }],
        errors: [
          {
            id: 'rule-failed',
            error: {
              code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR,
              message: 'storage unavailable',
            },
          },
        ],
      } as never);
      mock.ruleExists.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve(id === 'rule-existing')
      );
      const adapter = makeAdapter(mock);

      const thrown = await adapter
        .bulkCreateRules([
          { id: 'rule-existing', definition: updateDefinition },
          { id: 'rule-created', definition: createDefinition },
          { id: 'rule-failed', definition: createDefinition },
        ])
        .catch((error) => error);

      expect(thrown).toBeInstanceOf(BulkCreateRulesError);
      expect(thrown).toMatchObject({
        createdIds: ['rule-created'],
        conflictIds: ['rule-existing'],
        failedIds: ['rule-failed'],
      });
      expect(mock.updateRule).not.toHaveBeenCalled();
    });

    it('does not recreate a known-existing rule deleted before its fallback update', async () => {
      const mock = makeRulesClientMock();
      const requestError = Boom.badRequest('schedule limit exceeded', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
      const updateError = Boom.notFound('deleted after lookup');
      mock.bulkCreateRules
        .mockRejectedValueOnce(requestError)
        .mockResolvedValueOnce({ rules: [{ id: 'rule-created' }], errors: [] } as never);
      mock.ruleExists.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve(id === 'rule-existing')
      );
      mock.updateRule.mockRejectedValue(updateError);
      const adapter = makeAdapter(mock);

      const thrown = await adapter
        .bulkCreateRules([
          { id: 'rule-existing', definition: updateDefinition },
          { id: 'rule-created', definition: createDefinition },
        ])
        .catch((error) => error);

      expect(thrown).toBeInstanceOf(BulkCreateRulesError);
      expect(thrown).toMatchObject({
        cause: updateError,
        createdIds: ['rule-created'],
        conflictIds: ['rule-existing'],
        failedIds: ['rule-existing'],
      });
      expect(mock.createRule).not.toHaveBeenCalled();
    });

    it('classifies known conflicts separately when the net-new retry is still rejected', async () => {
      const mock = makeRulesClientMock();
      const requestError = Boom.badRequest('schedule limit exceeded', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
      mock.bulkCreateRules.mockRejectedValue(requestError);
      mock.ruleExists.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve(id === 'rule-existing')
      );
      const adapter = makeAdapter(mock);

      const thrown = await adapter
        .bulkCreateRules([
          { id: 'rule-existing', definition: updateDefinition },
          { id: 'rule-new', definition: createDefinition },
        ])
        .catch((error) => error);

      expect(thrown).toBeInstanceOf(BulkCreateRulesError);
      expect(thrown).toMatchObject({
        cause: requestError,
        createdIds: [],
        conflictIds: ['rule-existing'],
        failedIds: ['rule-new'],
      });
      expect(mock.bulkCreateRules).toHaveBeenCalledTimes(2);
      expect(mock.updateRule).not.toHaveBeenCalled();
    });

    it('rethrows a genuine net-new schedule limit failure unchanged', async () => {
      const mock = makeRulesClientMock();
      const requestError = Boom.badRequest('schedule limit exceeded', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
      mock.bulkCreateRules.mockRejectedValue(requestError);
      mock.ruleExists.mockResolvedValue(false);
      const adapter = makeAdapter(mock);

      await expect(
        adapter.bulkCreateRules([{ id: 'rule-1', definition: createDefinition }])
      ).rejects.toBe(requestError);
      expect(mock.bulkCreateRules).toHaveBeenCalledTimes(1);
      expect(mock.updateRule).not.toHaveBeenCalled();
    });

    it('propagates non-schedule whole-request failures without existence checks', async () => {
      const mock = makeRulesClientMock();
      const requestError = Boom.serverUnavailable('storage unavailable');
      mock.bulkCreateRules.mockRejectedValue(requestError);
      const adapter = makeAdapter(mock);

      await expect(
        adapter.bulkCreateRules([{ id: 'rule-1', definition: createDefinition }])
      ).rejects.toBe(requestError);
      expect(mock.ruleExists).not.toHaveBeenCalled();
      expect(mock.updateRule).not.toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    it('falls back to createRule on 404 not found', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockRejectedValueOnce(Boom.notFound('missing'));
      mock.createRule.mockResolvedValueOnce({} as never);
      const adapter = makeAdapter(mock);

      await adapter.updateRule('rule-1', updateDefinition);

      expect(mock.updateRule).toHaveBeenCalledTimes(1);
      expect(mock.createRule).toHaveBeenCalledTimes(1);
    });

    it('swallows 409 on create fallback after update 404', async () => {
      const mock = makeRulesClientMock();
      mock.updateRule.mockRejectedValueOnce(Boom.notFound('missing'));
      mock.createRule.mockRejectedValueOnce(Boom.conflict('race'));
      const adapter = makeAdapter(mock);

      await expect(adapter.updateRule('rule-1', updateDefinition)).resolves.toBeUndefined();
      expect(mock.createRule).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOwnedRuleIds', () => {
    it('returns an empty list when no rules match the stream tag', async () => {
      const mock = makeRulesClientMock();
      mock.findRules.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 500 });
      const adapter = makeAdapter(mock);

      await expect(adapter.findOwnedRuleIds('my-stream')).resolves.toEqual([]);
      expect(mock.findRules).toHaveBeenCalledWith({
        filter: 'metadata.tags: "sigevents:stream:my-stream"',
        perPage: 500,
        page: 1,
      });
    });

    it('pages until all owned rule ids are collected', async () => {
      const mock = makeRulesClientMock();
      mock.findRules
        .mockResolvedValueOnce({
          items: [{ id: 'r1' }, { id: 'r2' }],
          total: 3,
          page: 1,
          perPage: 500,
        })
        .mockResolvedValueOnce({
          items: [{ id: 'r3' }],
          total: 3,
          page: 2,
          perPage: 500,
        });
      const adapter = makeAdapter(mock);

      await expect(adapter.findOwnedRuleIds('my-stream')).resolves.toEqual(['r1', 'r2', 'r3']);
      expect(mock.findRules).toHaveBeenCalledTimes(2);
      expect(mock.findRules).toHaveBeenNthCalledWith(2, {
        filter: 'metadata.tags: "sigevents:stream:my-stream"',
        perPage: 500,
        page: 2,
      });
    });
  });

  describe('findExistingRuleIds', () => {
    it('returns only IDs that resolve to live rules', async () => {
      const mock = makeRulesClientMock();
      mock.ruleExists.mockImplementation(({ id }: { id: string }) =>
        Promise.resolve(id === 'live-rule')
      );
      const adapter = makeAdapter(mock);

      await expect(adapter.findExistingRuleIds(['deleted-rule', 'live-rule'])).resolves.toEqual([
        'live-rule',
      ]);
      expect(mock.ruleExists).toHaveBeenCalledTimes(2);
    });

    it('propagates lookup failures', async () => {
      const mock = makeRulesClientMock();
      mock.ruleExists.mockRejectedValueOnce(new Error('lookup failed'));
      const adapter = makeAdapter(mock);

      await expect(adapter.findExistingRuleIds(['rule-1'])).rejects.toThrow('lookup failed');
    });

    it('limits concurrent existence checks', async () => {
      const mock = makeRulesClientMock();
      let activeChecks = 0;
      let maxActiveChecks = 0;
      mock.ruleExists.mockImplementation(async () => {
        activeChecks += 1;
        maxActiveChecks = Math.max(maxActiveChecks, activeChecks);
        await Promise.resolve();
        activeChecks -= 1;
        return true;
      });
      const adapter = makeAdapter(mock);
      const ruleIds = Array.from({ length: 11 }, (_, index) => `rule-${index}`);

      await expect(adapter.findExistingRuleIds(ruleIds)).resolves.toEqual(ruleIds);
      expect(maxActiveChecks).toBe(10);
    });
  });

  describe('bulkDeleteRules', () => {
    it('no-ops for an empty id list', async () => {
      const mock = makeRulesClientMock();
      const adapter = makeAdapter(mock);
      await adapter.bulkDeleteRules([]);
      expect(mock.bulkDeleteRules).not.toHaveBeenCalled();
    });

    it('forwards ids to the rules client', async () => {
      const mock = makeRulesClientMock();
      mock.bulkDeleteRules.mockResolvedValue({ affected_count: 2, errors: [] });
      const adapter = makeAdapter(mock);

      await adapter.bulkDeleteRules(['a', 'b']);
      expect(mock.bulkDeleteRules).toHaveBeenCalledWith({ ids: ['a', 'b'] });
    });

    it('ignores RULE_NOT_FOUND errors', async () => {
      const mock = makeRulesClientMock();
      mock.bulkDeleteRules.mockResolvedValue({
        affected_count: 0,
        errors: [
          {
            id: 'missing',
            error: { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND, message: 'gone' },
          },
        ],
      });
      const adapter = makeAdapter(mock);
      await expect(adapter.bulkDeleteRules(['missing'])).resolves.toBeUndefined();
    });

    it('throws on non-not-found bulk errors', async () => {
      const mock = makeRulesClientMock();
      mock.bulkDeleteRules.mockResolvedValue({
        affected_count: 0,
        errors: [{ id: 'x', error: { code: 'other', message: 'boom' } }],
      });
      const adapter = makeAdapter(mock);
      await expect(adapter.bulkDeleteRules(['x'])).rejects.toThrow(/V2 bulk delete failed/);
    });
  });

  describe('findStreamNamesWithOwnedRules', () => {
    it('derives distinct stream names from ownership tags, ignoring unrelated tags', async () => {
      const mock = makeRulesClientMock();
      mock.getTags.mockResolvedValueOnce([
        'sigevents:stream:logs.nginx',
        'production',
        'sigevents:stream:logs.apache',
        'sigevents:stream:logs.nginx',
      ]);
      const adapter = makeAdapter(mock);

      const streamNames = await adapter.findStreamNamesWithOwnedRules();

      expect(new Set(streamNames)).toEqual(new Set(['logs.nginx', 'logs.apache']));
      expect(mock.getTags).toHaveBeenCalledWith({
        search: STREAMS_RULE_STREAM_TAG_PREFIX,
        kind: 'signal',
        size: 10000,
      });
    });
  });
});
