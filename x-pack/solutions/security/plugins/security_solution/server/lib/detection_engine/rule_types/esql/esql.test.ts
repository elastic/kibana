/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import moment from 'moment';

import type { CommonAlertFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
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
import { SERVER_APP_ID } from '../../../../../common/constants';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));
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
    (getMvExpandFields as jest.Mock).mockReturnValue([]);

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

    it('should store lastQuery in returned state when query has mv_expand', async () => {
      (getMvExpandFields as jest.Mock).mockReturnValue(['agent.name']);

      const result = await esqlExecutor(mockedArguments);

      expect(result.state).toHaveProperty('lastQuery', params.query);
    });

    it('should not store lastQuery in returned state when query has no mv_expand', async () => {
      const result = await esqlExecutor(mockedArguments);

      expect(result.state.lastQuery).toBeUndefined();
    });
  });

  describe('shard failures', () => {
    const commonAlertFields: CommonAlertFieldsLatest = {
      [ALERT_RULE_PARAMETERS]: {},
      [ALERT_RULE_CATEGORY]: 'ES|QL Rule',
      [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
      [ALERT_RULE_EXECUTION_UUID]: '97e8f53a-4971-4935-bb54-9b8f86930cc7',
      [ALERT_RULE_NAME]: 'rule-name',
      [ALERT_RULE_PRODUCER]: 'siem',
      [ALERT_RULE_REVISION]: 0,
      [ALERT_RULE_TYPE_ID]: 'siem.esqlRule',
      [ALERT_RULE_UUID]: '2e051244-b3c6-4779-a241-e1b4f0beceb9',
      [SPACE_IDS]: ['default'],
      [ALERT_RULE_TAGS]: [],
      [TIMESTAMP]: '2020-04-20T21:27:45+0000',
    };
    const emptySearchResponse: estypes.SearchResponse = {
      took: 0,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: { hits: [] },
    };

    it('should add a warning and still create alerts when a non-aggregating query returns partial results', async () => {
      const shardFailure: estypes.EsqlEsqlShardFailure = {
        shard: 0,
        index: 'packetbeat-000001',
        reason: { type: 'script_exception', reason: 'runtime error' },
      };
      const asyncQueryMock = ruleServices.scopedClusterClient.asCurrentUser.esql
        .asyncQuery as unknown as jest.Mock;
      asyncQueryMock.mockResolvedValue({
        id: 'QUERY-ID',
        is_running: false,
        is_partial: true,
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['doc-1']],
        _clusters: { details: { '(local)': { failures: [shardFailure] } } },
      });
      ruleServices.scopedClusterClient.asCurrentUser.search.mockResponse(emptySearchResponse);
      ruleServices.alertWithPersistence.mockResolvedValue({
        createdAlerts: [
          {
            _id: 'alert-1',
            _index: '.internal.alerts-security.alerts-default-000001',
            ...commonAlertFields,
          },
        ],
        errors: {},
        alertsWereTruncated: false,
      });

      const result = await esqlExecutor(mockedArguments);

      expect(asyncQueryMock.mock.calls[0][0]).toHaveProperty('allow_partial_results', true);
      expect(result.warningMessages).toEqual([
        `The ES|QL event query was only executed on the available shards. The query failed to run successfully on the following shards: ${JSON.stringify(
          [shardFailure]
        )}`,
      ]);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      expect(ruleServices.alertWithPersistence).toHaveBeenCalledTimes(1);
      expect(ruleServices.alertWithPersistence.mock.calls[0][0]).toHaveLength(1);
      expect(result.createdSignalsCount).toBe(1);
    });

    it('should disallow partial results and fail the run for an aggregating query when ES rejects it', async () => {
      mockedArguments.sharedParams = getSharedParamsMock({
        ruleParams: getEsqlRuleParams({ query: 'from auditbeat* | stats count() by host.name' }),
      });
      const asyncQueryMock = ruleServices.scopedClusterClient.asCurrentUser.esql
        .asyncQuery as unknown as jest.Mock;
      asyncQueryMock.mockRejectedValue(
        new Error('Error while performing ES|QL search: script_exception')
      );

      const result = await esqlExecutor(mockedArguments);

      expect(asyncQueryMock.mock.calls[0][0]).toHaveProperty('allow_partial_results', false);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([expect.stringContaining('script_exception')]);
      expect(result.warningMessages).toEqual([]);
      expect(ruleServices.alertWithPersistence).not.toHaveBeenCalled();
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
