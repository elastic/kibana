/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import moment from 'moment';
import { of } from 'rxjs';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import { getEsqlRuleParams } from '../../rule_schema/mocks';
import { esqlExecutor } from './esql';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { getMvExpandFields } from '@kbn/securitysolution-utils';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));
jest.mock('../utils/bulk_create_suppressed_alerts_in_memory', () => ({
  bulkCreateSuppressedAlertsInMemory: jest.fn(),
}));
jest.mock('./fetch_source_documents', () => ({ fetchSourceDocuments: jest.fn() }));
jest.mock('./utils/validate_esql_query', () => ({
  validateEsqlQuery: jest.fn().mockResolvedValue(true),
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
    const columnItem = (id: string, field: string, value: string, columnType = 'keyword') => ({
      ...getExceptionListItemSchemaMock({
        item_id: id,
        name: id,
        entries: [
          { field, operator: 'included', type: 'match', value, column_type: columnType },
        ] as EntriesArray,
      }),
      applies_to: 'esql_output_columns' as const,
    });
    const computedItem = columnItem('computed', 'risk', 'low');

    const asyncQueryMock = () =>
      ruleServices.scopedClusterClient.asCurrentUser.esql.asyncQuery as unknown as jest.Mock;
    const probeMock = () =>
      ruleServices.scopedClusterClient.asCurrentUser.esql.query as unknown as jest.Mock;

    beforeEach(() => {
      probeMock().mockResolvedValue({
        columns: [{ name: 'risk', type: 'keyword' }],
        values: [],
      });
    });

    const withExceptions = () => {
      mockedArguments.sharedParams = {
        ...sharedParams,
        outputColumnExceptionItems: [computedItem],
      };
    };

    it('appends the exceptions on the output columns to the query, before the limit', async () => {
      withExceptions();

      await esqlExecutor(mockedArguments);

      expect(asyncQueryMock().mock.calls[0][0].query).toMatch(
        /\n\| WHERE NOT \(MV_CONTAINS\(risk, "low"\)\) \| limit \d+$/
      );
    });

    it('does not read the fields of the source indices, because the items say what they apply to', async () => {
      withExceptions();

      await esqlExecutor(mockedArguments);

      expect(ruleServices.scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
    });

    describe('with alert suppression', () => {
      const alertSuppression = {
        groupBy: ['host.name'],
        missingFieldsStrategy: 'suppress' as const,
      };
      const rows = [
        ['id-1', 'web-1', 'high'],
        ['id-2', 'web-1', 'high'],
        ['id-3', 'web-2', 'high'],
      ];

      beforeEach(async () => {
        const { fetchSourceDocuments } = jest.requireMock('./fetch_source_documents');
        fetchSourceDocuments.mockResolvedValue({});
        (bulkCreateSuppressedAlertsInMemory as jest.Mock).mockResolvedValue({
          createdItemsCount: 2,
          suppressedItemsCount: 1,
          alertsWereTruncated: false,
        });
        // the rows that Elasticsearch returns are the rows that no exception excluded
        asyncQueryMock().mockResolvedValue({
          id: 'QUERY-ID',
          is_running: false,
          columns: [
            { name: '_id', type: 'keyword' },
            { name: 'host.name', type: 'keyword' },
            { name: 'risk', type: 'keyword' },
          ],
          values: rows,
        });
        mockedArguments.licensing = {
          ...licensing,
          license$: of(
            licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } })
          ),
        };
      });

      const withSuppression = () => {
        withExceptions();
        mockedArguments.sharedParams = {
          ...mockedArguments.sharedParams,
          completeRule: {
            ...sharedParams.completeRule,
            ruleParams: { ...params, alertSuppression },
          },
        };
      };

      it('applies the exceptions at the end of the query and gives the suppression the rows that remain', async () => {
        withSuppression();

        const result = await esqlExecutor(mockedArguments);

        expect(result.success).toBe(true);
        expect(asyncQueryMock().mock.calls[0][0].query).toMatch(
          /\n\| WHERE NOT \(MV_CONTAINS\(risk, "low"\)\) \| limit \d+$/
        );
        expect(bulkCreateSuppressedAlertsInMemory).toHaveBeenCalledTimes(1);
        const { enrichedEvents, alertSuppression: suppression } = (
          bulkCreateSuppressedAlertsInMemory as jest.Mock
        ).mock.calls[0][0];
        expect(suppression).toEqual(alertSuppression);
        expect(enrichedEvents.map(({ _id }: { _id: string }) => _id)).toEqual([
          'id-1',
          'id-2',
          'id-3',
        ]);
      });

      it('fails the rule before the query runs when an exception has a value that cannot be written, as it does without suppression', async () => {
        withSuppression();
        mockedArguments.sharedParams = {
          ...mockedArguments.sharedParams,
          outputColumnExceptionItems: [columnItem('computed', 'risk', 'low', 'integer')],
        };
        probeMock().mockResolvedValue({ columns: [{ name: 'risk', type: 'integer' }], values: [] });

        const result = await esqlExecutor(mockedArguments);

        expect(result.success).toBe(false);
        expect(result.userError).toBe(true);
        expect(asyncQueryMock()).not.toHaveBeenCalled();
        expect(bulkCreateSuppressedAlertsInMemory).not.toHaveBeenCalled();
      });
    });

    describe('expiry', () => {
      // The execution started at 10:03 and its time range ends at 09:58 (a rule with `to: now-5m`, or a manual run)
      const startedAt = new Date('2026-10-14T10:03:00.000Z');
      const itemExpiringAt = (id: string, field: string, expireTime: string) => ({
        ...columnItem(id, field, 'low'),
        expire_time: expireTime,
      });

      const run = (items: Array<ReturnType<typeof itemExpiringAt>>) => {
        mockedArguments.sharedParams = {
          ...sharedParams,
          tuple: { ...sharedParams.tuple, to: moment('2026-10-14T09:58:00.000Z') },
          startedAt,
          outputColumnExceptionItems: items,
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
    });

    it('warns on the rule that it creates no alerts when an exception is true for every row, and writes a stage that keeps no row', async () => {
      probeMock().mockResolvedValue({ columns: [{ name: 'risk', type: 'keyword' }], values: [] });
      mockedArguments.sharedParams = {
        ...sharedParams,
        outputColumnExceptionItems: [
          {
            ...getExceptionListItemSchemaMock({
              item_id: 'only-exclusive',
              name: 'only-exclusive',
              entries: [
                {
                  field: 'ghost',
                  operator: 'excluded',
                  type: 'match',
                  value: 'x',
                  column_type: 'keyword',
                },
              ] as EntriesArray,
            }),
            applies_to: 'esql_output_columns' as const,
          },
        ],
      };

      const result = await esqlExecutor(mockedArguments);

      expect(asyncQueryMock().mock.calls[0][0].query).toMatch(/\n\| WHERE false \| limit \d+$/);
      expect(result.warningMessages).toEqual([
        expect.stringContaining(
          'The rule creates no alerts because exceptions exclude every row: "only-exclusive"'
        ),
      ]);
    });

    it('fails the rule, without running the query, when the output columns cannot be read', async () => {
      withExceptions();
      probeMock().mockRejectedValue(new Error('no access'));

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        'The rule did not run because the output columns of its query could not be read to apply its exceptions on them: no access',
      ]);
      expect(result.userError).toBeUndefined();
      expect(result.createdSignalsCount).toBe(0);
      expect(asyncQueryMock()).not.toHaveBeenCalled();
    });

    it('keeps the user error classification of the failed request', async () => {
      withExceptions();
      probeMock().mockRejectedValue(
        new Error('security_exception: action [indices:data/read/field_caps] is unauthorized')
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.userError).toBe(true);
    });

    it('does not add a warning to the rule for an exception on a column that the query does not output', async () => {
      mockedArguments.sharedParams = {
        ...sharedParams,
        outputColumnExceptionItems: [
          {
            ...getExceptionListItemSchemaMock({
              item_id: 'ghost',
              name: 'ghost',
              entries: [
                {
                  field: 'risk',
                  operator: 'included',
                  type: 'match',
                  value: 'low',
                  column_type: 'keyword',
                },
                {
                  field: 'ghost.field',
                  operator: 'included',
                  type: 'match',
                  value: 'x',
                  column_type: 'keyword',
                },
              ] as EntriesArray,
            }),
            applies_to: 'esql_output_columns' as const,
          },
        ],
      };

      const result = await esqlExecutor(mockedArguments);

      expect(result.warningMessages).toEqual([]);
      expect(asyncQueryMock().mock.calls[0][0].query).not.toContain('WHERE NOT');
      expect(sharedParams.ruleExecutionLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('"code":"field_not_found"')
      );
    });

    it('fails the rule as a user error, without running the query, when the query outputs a column with another type than the item declares', async () => {
      probeMock().mockResolvedValue({ columns: [{ name: 'risk', type: 'long' }], values: [] });
      withExceptions();

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.userError).toBe(true);
      expect(result.errors).toEqual([
        expect.stringContaining(
          `"computed" (list "${computedItem.list_id}", item "computed") declares the column "risk" as keyword, and the query outputs it as long`
        ),
      ]);
      expect(result.createdSignalsCount).toBe(0);
      expect(asyncQueryMock()).not.toHaveBeenCalled();
    });

    it('traces the whole request when no exception was added to the query', async () => {
      mockedArguments.sharedParams = { ...sharedParams, outputColumnExceptionItems: [] };

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
      mockedArguments.sharedParams = {
        ...sharedParams,
        exceptionFilter: {
          meta: { alias: null, disabled: false, negate: true },
          query: { bool: { should: [{ match_phrase: { 'host.name': 'marker-value' } }] } },
        },
        outputColumnExceptionItems: [computedItem],
      };

      await esqlExecutor(mockedArguments);

      const [{ filter }] = probeMock().mock.calls[0];
      expect(JSON.stringify(filter)).toContain('data_cold');
      expect(JSON.stringify(filter)).toContain('marker-value');
    });

    it('traces the whole request, with the final query in it, when exceptions are applied at the end of the query', async () => {
      withExceptions();

      await esqlExecutor(mockedArguments);

      const trace = (sharedParams.ruleExecutionLogger.trace as jest.Mock).mock.calls
        .map(([message]) => message as string)
        .find((message) => message.startsWith('ES|QL query to execute'));
      const request = JSON.parse(trace?.replace(/^ES\|QL query to execute\n/, '') ?? '');
      expect(request.query).toMatch(/\n\| WHERE NOT \(MV_CONTAINS\(risk, "low"\)\)/);
      expect(request).toHaveProperty('filter');
    });

    it('sends the filter of the request with the probe of the output columns', async () => {
      withExceptions();

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

    it.each([
      ['has no exceptions on the output columns', []],
      [
        'has only an expired exception on the output columns',
        [{ ...columnItem('expired', 'risk', 'low'), expire_time: '2020-01-01T00:00:00.000Z' }],
      ],
    ])('does not read the output columns when the rule %s', async (_, items) => {
      mockedArguments.sharedParams = { ...sharedParams, outputColumnExceptionItems: items };

      await esqlExecutor(mockedArguments);

      expect(probeMock()).not.toHaveBeenCalled();
      expect(asyncQueryMock().mock.calls[0][0].query).not.toContain('WHERE NOT');
    });

    it('fails the rule as a user error, without running the query, when an exception has a value that cannot be written for its column', async () => {
      probeMock().mockResolvedValue({ columns: [{ name: 'src_ip', type: 'ip' }], values: [] });
      mockedArguments.sharedParams = {
        ...sharedParams,
        outputColumnExceptionItems: [columnItem('bogus-ip', 'src_ip', 'bogus', 'ip')],
      };

      const result = await esqlExecutor(mockedArguments);

      expect(result.success).toBe(false);
      expect(result.userError).toBe(true);
      expect(result.errors).toEqual([
        expect.stringContaining(
          'The rule did not run because exception items have a value or a column type that cannot be used at the end of the query: "bogus-ip"'
        ),
      ]);
      expect(result.createdSignalsCount).toBe(0);
      expect(asyncQueryMock()).not.toHaveBeenCalled();
    });

    it('explains that the exceptions count when Elasticsearch rejects the query for having too many clauses', async () => {
      withExceptions();
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
          'Elasticsearch rejected the query for having too many clauses (failed to create query: Query contains too many nested clauses; maxClauseCount is set to 4468). The WHERE expressions of the rule query and the exceptions on the output columns are counted together.'
        ),
      ]);
    });

    it('leaves the error of Elasticsearch as it is when no exception was added to the query', async () => {
      mockedArguments.sharedParams = { ...sharedParams, outputColumnExceptionItems: [] };
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
      const heavy = (id: string) => ({
        ...getExceptionListItemSchemaMock({
          item_id: id,
          name: id,
          entries: [
            {
              field: 'risk',
              operator: 'included',
              type: 'match_any',
              value: Array.from({ length: 5 }, (_, i) => `v${i}`),
              column_type: 'keyword',
            },
            ...Array.from({ length: 205 }, (_, i) => ({
              field: 'risk',
              operator: 'included',
              type: 'match',
              value: `w${i}`,
              column_type: 'keyword',
            })),
          ] as EntriesArray,
        }),
        applies_to: 'esql_output_columns' as const,
      });
      mockedArguments.sharedParams = {
        ...sharedParams,
        outputColumnExceptionItems: [heavy('too-many-comparisons')],
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
