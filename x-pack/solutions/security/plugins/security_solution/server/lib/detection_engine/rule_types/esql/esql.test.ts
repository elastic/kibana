/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import moment from 'moment';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import { getEsqlRuleParams } from '../../rule_schema/mocks';
import { esqlExecutor } from './esql';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { getMvExpandFields } from '@kbn/securitysolution-utils';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ENABLE_ESQL_RULE_COMPUTED_FIELD_EXCEPTIONS_SETTING } from '../../../../../common/constants';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));
jest.mock('./utils/validate_esql_query', () => ({
  validateEsqlQuery: jest.fn().mockResolvedValue(true),
}));
jest.mock('@kbn/lists-plugin/server/services/exception_lists', () => ({
  ...jest.requireActual('@kbn/lists-plugin/server/services/exception_lists'),
  buildExceptionFilter: jest.fn(),
}));
jest.mock('@kbn/securitysolution-utils', () => ({
  ...jest.requireActual('@kbn/securitysolution-utils'),
  getMvExpandFields: jest.fn().mockReturnValue([]),
}));

const getDataTierFilterMock = getDataTierFilter as jest.Mock;

describe('esqlExecutor', () => {
  let ruleServices: PersistenceExecutorOptionsMock;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEsqlRuleParams();
  const mockScheduleNotificationResponseActionsService = jest.fn();
  let licensing: ReturnType<typeof licensingMock.createSetup>;

  let mockedArguments: Parameters<typeof esqlExecutor>[0];

  const sharedParams = getSharedParamsMock({ ruleParams: params });

  beforeEach(() => {
    jest.clearAllMocks();
    licensing = licensingMock.createSetup();
    ruleServices = createPersistenceExecutorOptionsMock();
    getDataTierFilterMock.mockResolvedValue([]);

    mockedArguments = {
      sharedParams,
      services: ruleServices,
      licensing,
      scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      state: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('errors', () => {
    it('should return result with user error equal true when request fails with data verification exception', async () => {
      (
        ruleServices.scopedClusterClient.asCurrentUser.esql.asyncQuery as unknown as jest.Mock
      ).mockRejectedValue(
        new KbnServerError(
          'verification_exception: Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
          400,
          {
            error: {
              root_cause: [
                {
                  type: 'verification_exception',
                  reason:
                    'Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
                },
              ],
              type: 'verification_exception',
              reason:
                'Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
            },
          }
        )
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result).toHaveProperty('userError', true);
      expect(result).toHaveProperty('errors', [
        'verification_exception: Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
      ]);
    });

    it('should return result without user error when request fails with non-categorized error', async () => {
      (
        ruleServices.scopedClusterClient.asCurrentUser.esql.asyncQuery as unknown as jest.Mock
      ).mockRejectedValue(
        new KbnServerError('Unknown Error', 500, {
          error: {
            root_cause: [
              {
                type: 'unknown',
                reason: 'Unknown Error',
              },
            ],
            type: 'unknown',
            reason: 'Unknown Error',
          },
        })
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result).not.toHaveProperty('userError');
      expect(result).toHaveProperty('errors', ['Unknown Error']);
    });
  });

  describe('rule state', () => {
    it('should add a warning message when excluded documents exceed 100,000', async () => {
      mockedArguments.state = {
        excludedDocuments: {
          test_index_1: Array.from({ length: 50000 }, (_, i) => ({
            id: `doc${i + 1}`,
            timestamp: `2025-04-28T10:00:00Z`,
          })),
          test_index_2: Array.from({ length: 50001 }, (_, i) => ({
            id: `doc${i + 1}`,
            timestamp: `2025-04-28T10:00:00Z`,
          })),
        },
      };
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      const result = await esqlExecutor(mockedArguments);

      expect(result.warningMessages).toContain(
        'Excluded documents exceeded the limit of 100000, some alerts might not have been created. Consider reducing the lookback time for the rule.'
      );
      expect(ruleServices.scopedClusterClient.asCurrentUser.esql.asyncQuery).not.toHaveBeenCalled();
    });

    it('should include documents ids from state in ES|QL request', async () => {
      mockedArguments.state = {
        excludedDocuments: {
          test_index_1: [
            { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
            { id: 'doc2', timestamp: '2025-04-28T11:00:00Z' },
          ],
        },
      };
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      await esqlExecutor(mockedArguments);
      const asyncQueryMock = ruleServices.scopedClusterClient.asCurrentUser.esql
        .asyncQuery as unknown as jest.Mock;
      const asyncQueryArgs = asyncQueryMock.mock.calls[0][0];

      expect(asyncQueryArgs).toHaveProperty('filter.bool.must_not.0.bool.filter.0.ids.values', [
        'doc1',
        'doc2',
      ]);
      expect(asyncQueryArgs).toHaveProperty(
        'filter.bool.must_not.0.bool.filter.1.term._index',
        'test_index_1'
      );
    });

    it('should include documents ids from state in ES|QL request when query has mv_expand', async () => {
      mockedArguments.state = {
        excludedDocuments: {
          test_index_1: [
            { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
            { id: 'doc2', timestamp: '2025-04-28T11:00:00Z' },
          ],
        },
        lastQuery: params.query,
      };
      (getMvExpandFields as jest.Mock).mockReturnValue(['agent.name']);
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      await esqlExecutor(mockedArguments);
      const asyncQueryMock = ruleServices.scopedClusterClient.asCurrentUser.esql
        .asyncQuery as unknown as jest.Mock;
      const asyncQueryArgs = asyncQueryMock.mock.calls[0][0];

      expect(asyncQueryArgs).toHaveProperty('filter.bool.must_not.0.bool.filter.0.ids.values', [
        'doc1',
        'doc2',
      ]);
    });

    it('should store lastQuery in returned state', async () => {
      const result = await esqlExecutor(mockedArguments);

      expect(result.state).toHaveProperty('lastQuery', params.query);
    });
  });

  describe('exceptions at the end of the query', () => {
    const exceptionItem = (id: string, field: string, value: string) =>
      getExceptionListItemSchemaMock({
        item_id: id,
        name: id,
        entries: [{ field, operator: 'included', type: 'match', value }] as EntriesArray,
      });
    const computedItem = exceptionItem('computed', 'risk', 'low');
    const sourceItem = exceptionItem('source', 'host.name', 'dc-01');

    const asyncQueryMock = () =>
      ruleServices.scopedClusterClient.asCurrentUser.esql.asyncQuery as unknown as jest.Mock;

    beforeEach(() => {
      const client = ruleServices.scopedClusterClient.asCurrentUser;
      (client.fieldCaps as unknown as jest.Mock).mockResolvedValue({
        indices: [],
        fields: { 'host.name': { keyword: {} }, host: { object: {} } },
      });
      (client.esql.query as unknown as jest.Mock).mockResolvedValue({
        columns: [{ name: 'risk', type: 'keyword' }],
        values: [],
      });
    });

    const setSetting = (enabled: boolean) => {
      (ruleServices.uiSettingsClient.get as jest.Mock).mockImplementation(async (key: string) =>
        key === ENABLE_ESQL_RULE_COMPUTED_FIELD_EXCEPTIONS_SETTING ? enabled : undefined
      );
    };

    const withExceptions = (enabled: boolean) => {
      setSetting(enabled);
      mockedArguments.sharedParams = {
        ...sharedParams,
        allExceptionItems: [sourceItem, computedItem],
      };
    };

    it('does not look at the exceptions when the setting is off', async () => {
      withExceptions(false);

      await esqlExecutor(mockedArguments);

      const client = ruleServices.scopedClusterClient.asCurrentUser;
      expect(client.fieldCaps).not.toHaveBeenCalled();
      expect(client.esql.query).not.toHaveBeenCalled();
      expect(asyncQueryMock().mock.calls[0][0].query).not.toContain('WHERE NOT');
    });

    it('appends the exceptions on computed columns to the query, before the limit', async () => {
      withExceptions(true);
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });

      await esqlExecutor(mockedArguments);

      expect(asyncQueryMock().mock.calls[0][0].query).toMatch(
        /\n\| WHERE NOT \(MV_CONTAINS\(risk, "low"\)\) \| limit \d+$/
      );
    });

    describe('expiry', () => {
      // The execution started at 10:03 and its time range ends at 09:58 (a rule with `to: now-5m`, or a manual run)
      const startedAt = new Date('2026-10-14T10:03:00.000Z');
      const itemExpiringAt = (id: string, field: string, expireTime: string) => ({
        ...exceptionItem(id, field, 'low'),
        expire_time: expireTime,
      });

      beforeEach(() => {
        setSetting(true);
        (buildExceptionFilter as jest.Mock).mockResolvedValue({
          filter: undefined,
          unprocessedExceptions: [],
        });
      });

      const run = (items: ReturnType<typeof itemExpiringAt>[]) => {
        mockedArguments.sharedParams = {
          ...sharedParams,
          tuple: { ...sharedParams.tuple, to: moment('2026-10-14T09:58:00.000Z') },
          startedAt,
          allExceptionItems: [sourceItem, ...items],
        };
        return esqlExecutor(mockedArguments);
      };

      it('drops an item that expired before the execution started, although it expires after the end of the time range', async () => {
        await run([itemExpiringAt('computed', 'risk', '2026-10-14T10:00:00.000Z')]);

        expect(asyncQueryMock().mock.calls[0][0].query).not.toContain('WHERE NOT');
      });

      it('applies an item that expires after the execution started', async () => {
        await run([itemExpiringAt('computed', 'risk', '2026-10-14T10:05:00.000Z')]);

        expect(asyncQueryMock().mock.calls[0][0].query).toContain('WHERE NOT');
      });

      it('builds the DSL filter with the start of the execution, as the common wrapper does', async () => {
        await run([itemExpiringAt('computed', 'risk', '2026-10-14T10:05:00.000Z')]);

        expect(buildExceptionFilter).toHaveBeenCalledWith(expect.objectContaining({ startedAt }));
      });
    });

    it('asks _field_caps with the time range and without the exceptions, and the probe with the exceptions', async () => {
      setSetting(true);
      mockedArguments.sharedParams = {
        ...sharedParams,
        allExceptionItems: [sourceItem, computedItem],
        exceptionFilter: {
          meta: { alias: null, negate: true, disabled: false },
          query: { match_phrase: { 'host.name': 'dc-01' } },
        },
      };
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });

      await esqlExecutor(mockedArguments);

      const client = ruleServices.scopedClusterClient.asCurrentUser;
      const fieldCapsFilter = JSON.stringify(
        (client.fieldCaps as unknown as jest.Mock).mock.calls[0][0].index_filter
      );
      const probeFilter = JSON.stringify(
        (client.esql.query as unknown as jest.Mock).mock.calls[0][0].filter
      );
      expect(fieldCapsFilter).toContain('@timestamp');
      expect(fieldCapsFilter).not.toContain('dc-01');
      expect(probeFilter).toContain('dc-01');
    });

    it('builds the DSL filter only from the exceptions that stay in the DSL', async () => {
      withExceptions(true);
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });

      await esqlExecutor(mockedArguments);

      expect(buildExceptionFilter).toHaveBeenCalledWith(
        expect.objectContaining({ lists: [sourceItem], excludeExceptions: true })
      );
    });

    it('fails the rule, without running the query, when the exceptions cannot be inspected', async () => {
      withExceptions(true);
      (
        ruleServices.scopedClusterClient.asCurrentUser.fieldCaps as unknown as jest.Mock
      ).mockRejectedValue(new Error('no access'));

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        'The rule did not run because the fields of its exceptions could not be inspected to apply them: no access',
      ]);
      expect(result.userError).toBeUndefined();
      expect(result.createdSignalsCount).toBe(0);
      expect(asyncQueryMock()).not.toHaveBeenCalled();
      expect(buildExceptionFilter).not.toHaveBeenCalled();
    });

    it('keeps the user error classification of the failed request', async () => {
      withExceptions(true);
      (
        ruleServices.scopedClusterClient.asCurrentUser.fieldCaps as unknown as jest.Mock
      ).mockRejectedValue(
        new Error('security_exception: action [indices:data/read/field_caps] is unauthorized')
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.userError).toBe(true);
    });

    it('does not inspect anything, and does not fail, when the setting is off', async () => {
      withExceptions(false);
      (
        ruleServices.scopedClusterClient.asCurrentUser.fieldCaps as unknown as jest.Mock
      ).mockRejectedValue(new Error('no access'));

      const result = await esqlExecutor(mockedArguments);

      expect(ruleServices.scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
      expect(result.errors.join(' ')).not.toContain('could not be inspected');
      expect(asyncQueryMock()).toHaveBeenCalled();
    });

    it('does not add a warning to the rule for an exception that cannot be applied', async () => {
      setSetting(true);
      mockedArguments.sharedParams = {
        ...sharedParams,
        allExceptionItems: [
          sourceItem,
          getExceptionListItemSchemaMock({
            item_id: 'ghost',
            name: 'ghost',
            entries: [
              { field: 'risk', operator: 'included', type: 'match', value: 'low' },
              { field: 'ghost.field', operator: 'included', type: 'match', value: 'x' },
            ] as EntriesArray,
          }),
        ],
      };
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });

      const result = await esqlExecutor(mockedArguments);

      expect(result.warningMessages).toEqual([]);
      expect(sharedParams.ruleExecutionLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('"code":"field_not_found"')
      );
    });
    it('traces the whole request, as it always did, when the setting is off', async () => {
      withExceptions(false);

      await esqlExecutor(mockedArguments);

      const trace = (sharedParams.ruleExecutionLogger.trace as jest.Mock).mock.calls
        .map(([message]) => message as string)
        .find((message) => message.startsWith('ES|QL query to execute'));
      expect(trace).toMatch(/^ES\|QL query to execute\n\{"query":/);
    });

    it('traces the whole request when the setting is on and no exception was added to the query', async () => {
      setSetting(true);
      mockedArguments.sharedParams = { ...sharedParams, allExceptionItems: [sourceItem] };

      await esqlExecutor(mockedArguments);

      const trace = (sharedParams.ruleExecutionLogger.trace as jest.Mock).mock.calls
        .map(([message]) => message as string)
        .find((message) => message.startsWith('ES|QL query to execute'));
      expect(trace).toMatch(/^ES\|QL query to execute\n\{"query":/);
    });

    it('sends the data tier filter and the exception filter with the probe, as the real request does', async () => {
      getDataTierFilterMock.mockResolvedValue([
        { meta: { negate: true }, query: { terms: { _tier: ['data_cold'] } } },
      ]);
      setSetting(true);
      mockedArguments.sharedParams = {
        ...sharedParams,
        exceptionFilter: {
          meta: { alias: null, disabled: false, negate: true },
          query: { bool: { should: [{ match_phrase: { 'host.name': 'marker-value' } }] } },
        },
        allExceptionItems: [sourceItem, computedItem],
      };
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });

      await esqlExecutor(mockedArguments);

      const [{ filter }] = (ruleServices.scopedClusterClient.asCurrentUser.esql.query as jest.Mock)
        .mock.calls[0];
      expect(JSON.stringify(filter)).toContain('data_cold');
      expect(JSON.stringify(filter)).toContain('marker-value');
    });

    it('traces only the final query when exceptions are applied at the end of the query', async () => {
      withExceptions(true);
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });

      await esqlExecutor(mockedArguments);

      const trace = (sharedParams.ruleExecutionLogger.trace as jest.Mock).mock.calls
        .map(([message]) => message as string)
        .find((message) => message.startsWith('ES|QL query to execute'));
      expect(trace).toMatch(
        /^ES\|QL query to execute\nfrom .*\n\| WHERE NOT \(MV_CONTAINS\(risk, "low"\)\)/is
      );
      expect(trace).not.toContain('{"query"');
    });

    it('sends the filter of the request with the probe of the output columns', async () => {
      withExceptions(true);
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });

      await esqlExecutor(mockedArguments);

      expect(ruleServices.scopedClusterClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: expect.stringMatching(/\n\| LIMIT 0$/),
        filter: {
          bool: {
            filter: expect.arrayContaining([expect.objectContaining({ range: expect.anything() })]),
          },
        },
      });
    });

    it('does not read the setting when the rule has no exceptions', async () => {
      setSetting(true);
      mockedArguments.sharedParams = { ...sharedParams, allExceptionItems: [] };

      await esqlExecutor(mockedArguments);

      expect(ruleServices.uiSettingsClient.get).not.toHaveBeenCalledWith(
        ENABLE_ESQL_RULE_COMPUTED_FIELD_EXCEPTIONS_SETTING
      );
      expect(ruleServices.scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
    });

    it('does not apply an expired exception item', async () => {
      setSetting(true);
      const expired = getExceptionListItemSchemaMock({
        item_id: 'expired',
        name: 'expired',
        entries: [
          { field: 'risk', operator: 'included', type: 'match', value: 'low' },
        ] as EntriesArray,
        expire_time: '2020-01-01T00:00:00.000Z',
      });
      mockedArguments.sharedParams = { ...sharedParams, allExceptionItems: [expired] };

      await esqlExecutor(mockedArguments);

      expect(asyncQueryMock().mock.calls[0][0].query).not.toContain('WHERE NOT');
      expect(ruleServices.scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
    });

    it('fails the rule as a user error, without running the query, when an exception has a value that cannot be written for its column', async () => {
      const client = ruleServices.scopedClusterClient.asCurrentUser;
      (client.esql.query as unknown as jest.Mock).mockResolvedValue({
        columns: [{ name: 'src_ip', type: 'ip' }],
        values: [],
      });
      setSetting(true);
      mockedArguments.sharedParams = {
        ...sharedParams,
        allExceptionItems: [exceptionItem('bogus-ip', 'src_ip', 'bogus')],
      };

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.userError).toBe(true);
      expect(result.errors).toEqual([
        expect.stringContaining(
          'The rule did not run because exception items have a value that cannot be used for the type of the field: "bogus-ip"'
        ),
      ]);
      expect(result.createdSignalsCount).toBe(0);
      expect(asyncQueryMock()).not.toHaveBeenCalled();
    });

    it('explains that the exceptions count when Elasticsearch rejects the query for having too many clauses', async () => {
      withExceptions(true);
      (buildExceptionFilter as jest.Mock).mockResolvedValue({
        filter: undefined,
        unprocessedExceptions: [],
      });
      asyncQueryMock().mockRejectedValue(
        new Error(
          'failed to create query: Query contains too many nested clauses; maxClauseCount is set to 4468'
        )
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.userError).toBe(true);
      expect(result.errors).toEqual([
        expect.stringContaining(
          'Elasticsearch rejected the query for having too many clauses (failed to create query: Query contains too many nested clauses; maxClauseCount is set to 4468). The conditions of the rule query and the exceptions on columns that rename or copy a source field are counted together.'
        ),
      ]);
    });

    it('leaves the error of Elasticsearch as it is when no exception was added to the query', async () => {
      withExceptions(false);
      asyncQueryMock().mockRejectedValue(
        new Error('failed to create query: Query contains too many nested clauses')
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result.errors).toEqual([
        'failed to create query: Query contains too many nested clauses',
      ]);
      expect(result.userError).not.toBe(true);
    });

    it('fails the rule as a user error, without running the query, and names the limit when the exceptions do not fit in the query', async () => {
      const client = ruleServices.scopedClusterClient.asCurrentUser;
      (client.esql.query as unknown as jest.Mock).mockResolvedValue({
        columns: [{ name: 'risk', type: 'keyword' }],
        values: [],
      });
      setSetting(true);
      const heavy = (id: string) =>
        getExceptionListItemSchemaMock({
          item_id: id,
          name: id,
          entries: [
            {
              field: 'risk',
              operator: 'included',
              type: 'match_any',
              value: Array.from({ length: 5 }, (_, i) => `v${i}`),
            },
            ...Array.from({ length: 205 }, (_, i) => ({
              field: 'risk',
              operator: 'included',
              type: 'match',
              value: `w${i}`,
            })),
          ] as EntriesArray,
        });
      mockedArguments.sharedParams = {
        ...sharedParams,
        allExceptionItems: [heavy('too-many-comparisons')],
      };

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.userError).toBe(true);
      expect(result.errors).toEqual([
        expect.stringContaining(
          'The rule did not run because its exceptions do not fit in the query: the exceptions on the columns of the query need 206 comparisons, and at most 200 are allowed'
        ),
      ]);
      expect(asyncQueryMock()).not.toHaveBeenCalled();
    });
  });

  it('should handle scheduleNotificationResponseActionsService call', async () => {
    (
      ruleServices.scopedClusterClient.asCurrentUser.esql.asyncQuery as unknown as jest.Mock
    ).mockResolvedValue({
      id: 'QUERY-ID',
      is_running: false,
      columns: [],
      values: [],
    });

    const result = await esqlExecutor(mockedArguments);

    expect(mockScheduleNotificationResponseActionsService).toHaveBeenCalledWith({
      signals: result.createdSignals,
      signalsCount: result.createdSignalsCount,
      responseActions: params.responseActions,
    });
  });
});
