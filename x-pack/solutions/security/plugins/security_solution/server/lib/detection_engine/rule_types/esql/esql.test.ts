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
import { getIsAlertSuppressionActive } from '../utils/get_is_alert_suppression_active';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { getMvExpandFields } from '@kbn/securitysolution-utils';
import { SERVER_APP_ID } from '../../../../../common/constants';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));
jest.mock('../utils/get_is_alert_suppression_active', () => ({
  ...jest.requireActual('../utils/get_is_alert_suppression_active'),
  getIsAlertSuppressionActive: jest.fn(),
}));
jest.mock('@kbn/securitysolution-utils', () => ({
  ...jest.requireActual('@kbn/securitysolution-utils'),
  getMvExpandFields: jest.fn().mockReturnValue([]),
}));

const getDataTierFilterMock = getDataTierFilter as jest.Mock;
const getIsAlertSuppressionActiveMock = getIsAlertSuppressionActive as jest.Mock;

describe('esqlExecutor', () => {
  let ruleServices: PersistenceExecutorOptionsMock;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEsqlRuleParams();
  const mockScheduleNotificationResponseActionsService = jest.fn();
  const licensing = licensingMock.createSetup();

  let mockedArguments: Parameters<typeof esqlExecutor>[0];

  const sharedParams = getSharedParamsMock({ ruleParams: params });

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('errors', () => {
    it('should return result with user error equal true when request fails with data verification exception', async () => {
      ruleServices.scopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
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
      ruleServices.scopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
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
        excludedDocuments: Array.from({ length: 100001 }, (_, i) => ({
          id: `doc${i + 1}`,
          timestamp: `2025-04-28T10:00:00Z`,
        })),
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
      expect(
        ruleServices.scopedClusterClient.asCurrentUser.transport.request
      ).not.toHaveBeenCalled();
    });

    it('should include documents ids from state in ES|QL request', async () => {
      mockedArguments.state = {
        excludedDocuments: [
          { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
          { id: 'doc2', timestamp: '2025-04-28T11:00:00Z' },
        ],
      };
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      await esqlExecutor(mockedArguments);
      const transportRequestArgs =
        ruleServices.scopedClusterClient.asCurrentUser.transport.request.mock.calls[0][0];

      expect(transportRequestArgs).toHaveProperty('body.filter.bool.must_not.ids.values', [
        'doc1',
        'doc2',
      ]);
    });

    it('should include documents ids from state in ES|QL request when query has mv_expand', async () => {
      mockedArguments.state = {
        excludedDocuments: [
          { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
          { id: 'doc2', timestamp: '2025-04-28T11:00:00Z' },
        ],
      };
      (getMvExpandFields as jest.Mock).mockReturnValue(['agent.name']);
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      await esqlExecutor(mockedArguments);
      const transportRequestArgs =
        ruleServices.scopedClusterClient.asCurrentUser.transport.request.mock.calls[0][0];

      expect(transportRequestArgs).not.toHaveProperty('body.filter.bool.must_not.ids.values');
    });
  });

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

  describe('reserved metadata columns', () => {
    const mockEsqlResult = (columns: Array<{ name: string; type: string }>, values: string[][]) => {
      (
        ruleServices.scopedClusterClient.asCurrentUser.transport.request as unknown as jest.Mock
      ).mockResolvedValue({ id: 'QUERY-ID', is_running: false, columns, values });
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
    };

    it('should not copy reserved metadata columns into the alerts and should add a warning', async () => {
      mockEsqlResult(
        [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: '_source' },
          { name: '_ignored', type: 'keyword' },
          { name: 'host.name', type: 'keyword' },
        ],
        [['doc-1', '{"host":{"name":"host-1"}}', 'host.name', 'host-1']]
      );

      const result = await esqlExecutor(mockedArguments);

      const [alertDocument] = ruleServices.alertWithPersistence.mock.calls[0][0];
      expect(alertDocument._source).not.toHaveProperty('_source');
      expect(alertDocument._source).not.toHaveProperty('_ignored');
      expect(alertDocument._source).toMatchObject({ 'host.name': 'host-1' });
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.createdSignalsCount).toBe(1);
      expect(result.warningMessages).toEqual([
        expect.stringContaining('metadata column(s) _source, _ignored'),
      ]);
    });

    it('should not add a warning when the query does not return reserved metadata columns', async () => {
      mockEsqlResult(
        [
          { name: '_id', type: 'keyword' },
          { name: 'host.name', type: 'keyword' },
        ],
        [['doc-1', 'host-1']]
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result.warningMessages).toEqual([]);
      expect(result.success).toBe(true);
    });

    it('should create one alert per row when the expanded field is a reserved metadata column', async () => {
      mockedArguments.sharedParams = getSharedParamsMock({
        ruleParams: getEsqlRuleParams({
          query: 'from auditbeat* metadata _id, _ignored | mv_expand _ignored',
        }),
      });
      (getMvExpandFields as jest.Mock).mockReturnValue(['_ignored']);
      mockEsqlResult(
        [
          { name: '_id', type: 'keyword' },
          { name: '_ignored', type: 'keyword' },
        ],
        [
          ['doc-1', 'host.name'],
          ['doc-1', 'agent.name'],
        ]
      );

      await esqlExecutor(mockedArguments);

      const alertDocuments = ruleServices.alertWithPersistence.mock.calls[0][0];
      expect(alertDocuments).toHaveLength(2);
      alertDocuments.forEach((alertDocument) =>
        expect(alertDocument._source).not.toHaveProperty('_ignored')
      );
    });

    it('should not store reserved metadata columns in alerts created without suppression for events missing a suppression field', async () => {
      getIsAlertSuppressionActiveMock.mockResolvedValueOnce(true);
      mockedArguments.sharedParams = getSharedParamsMock({
        ruleParams: getEsqlRuleParams({
          alertSuppression: { groupBy: ['host.name'], missingFieldsStrategy: 'doNotSuppress' },
        }),
      });
      mockEsqlResult(
        [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: '_source' },
          { name: 'agent.name', type: 'keyword' },
        ],
        [['doc-1', '{"agent":{"name":"test-1"}}', 'test-1']]
      );

      const result = await esqlExecutor(mockedArguments);

      // only the suppression branch of the executor logs the number of suppressed alerts
      expect(mockedArguments.sharedParams.ruleExecutionLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Alerts suppressed')
      );
      const [alertDocument] = ruleServices.alertWithPersistence.mock.calls[0][0];
      expect(alertDocument._source).not.toHaveProperty('_source');
      expect(alertDocument._source).toMatchObject({ 'agent.name': 'test-1' });
      expect(result.warningMessages).toEqual([
        expect.stringContaining('metadata column(s) _source'),
      ]);
    });

    describe('when the search needs more than one iteration', () => {
      const firstPage = {
        id: 'QUERY-ID',
        is_running: false,
        columns: [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: '_source' },
        ],
        values: [
          ['doc-1', '{"a":1}'],
          ['doc-2', '{"a":2}'],
        ],
      };

      // the executor also deletes the async query after each request, which goes through the same transport
      const mockSearchPages = (pages: Array<Record<string, unknown> | Error>) => {
        const remainingPages = [...pages];
        (
          ruleServices.scopedClusterClient.asCurrentUser.transport.request as unknown as jest.Mock
        ).mockImplementation(async ({ method }: { method: string }) => {
          if (method === 'DELETE') {
            return {};
          }
          const page = remainingPages.shift();
          if (page instanceof Error) {
            throw page;
          }
          return page;
        });
      };

      beforeEach(() => {
        // a page with maxSignals + 1 rows makes the executor request another one
        mockedArguments.sharedParams = getSharedParamsMock({
          ruleParams: getEsqlRuleParams({ maxSignals: 1 }),
        });
        ruleServices.scopedClusterClient.asCurrentUser.search.mockResponse(emptySearchResponse);
        ruleServices.alertWithPersistence.mockResolvedValue({
          createdAlerts: [],
          errors: {},
          alertsWereTruncated: false,
        });
      });

      it('should add a single warning with the columns removed in all iterations', async () => {
        mockSearchPages([
          firstPage,
          {
            id: 'QUERY-ID-2',
            is_running: false,
            columns: [
              { name: '_id', type: 'keyword' },
              { name: '_ignored', type: 'keyword' },
            ],
            values: [['doc-3', 'host.name']],
          },
        ]);

        const result = await esqlExecutor(mockedArguments);

        expect(result.warningMessages).toEqual([
          expect.stringContaining('metadata column(s) _source, _ignored'),
        ]);
      });

      it('should keep the warning when a later iteration fails', async () => {
        mockSearchPages([firstPage, new Error('Error while performing ES|QL search: boom')]);

        const result = await esqlExecutor(mockedArguments);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual([expect.stringContaining('boom')]);
        expect(result.warningMessages).toEqual([
          expect.stringContaining('metadata column(s) _source'),
        ]);
      });
    });
  });
});
