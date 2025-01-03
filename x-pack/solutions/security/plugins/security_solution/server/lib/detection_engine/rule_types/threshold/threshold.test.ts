/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { thresholdExecutor } from './threshold';
import { getThresholdRuleParams, getCompleteRuleMock } from '../../rule_schema/mocks';
import { sampleEmptyAggsSearchResults } from '../__mocks__/es_results';
import { getThresholdTermsHash } from './utils';
import type { ThresholdRuleParams } from '../../rule_schema';
import { createRuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import type { RunOpts } from '../types';
import type { ExperimentalFeatures } from '../../../../../common';

jest.mock('../utils/get_filter', () => ({ getFilter: jest.fn() }));

describe('threshold_executor', () => {
  let alertServices: RuleExecutorServicesMock;
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;
  let mockScheduledNotificationResponseAction: jest.Mock;
  const version = '8.0.0';
  const params = getThresholdRuleParams();
  const thresholdCompleteRule = getCompleteRuleMock<ThresholdRuleParams>(params);
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const licensing = licensingMock.createSetup();

  beforeEach(() => {
    alertServices = alertsMock.createRuleExecutorServices();
    alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        ...sampleEmptyAggsSearchResults(),
        aggregations: {
          thresholdTerms: { buckets: [] },
        },
      })
    );
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create({
      ruleId: thresholdCompleteRule.alertId,
      ruleUuid: thresholdCompleteRule.ruleParams.ruleId,
      ruleName: thresholdCompleteRule.ruleConfig.name,
      ruleType: thresholdCompleteRule.ruleConfig.ruleTypeId,
    });
    mockScheduledNotificationResponseAction = jest.fn();
  });

  describe('thresholdExecutor', () => {
    it('should clean up any signal history that has fallen outside the window when state is initialized', async () => {
      const ruleDataClientMock = createRuleDataClientMock();
      const terms1 = [
        {
          field: 'host.name',
          value: 'elastic-pc-1',
        },
      ];
      const signalHistoryRecord1 = {
        terms: terms1,
        lastSignalTimestamp: tuple.from.valueOf() - 60 * 1000,
      };
      const terms2 = [
        {
          field: 'host.name',
          value: 'elastic-pc-2',
        },
      ];
      const signalHistoryRecord2 = {
        terms: terms2,
        lastSignalTimestamp: tuple.from.valueOf() + 60 * 1000,
      };
      const state = {
        initialized: true,
        signalHistory: {
          [`${getThresholdTermsHash(terms1)}`]: signalHistoryRecord1,
          [`${getThresholdTermsHash(terms2)}`]: signalHistoryRecord2,
        },
      };
      const response = await thresholdExecutor({
        completeRule: thresholdCompleteRule,
        tuple,
        services: alertServices,
        state,
        version,
        ruleExecutionLogger,
        startedAt: new Date(),
        bulkCreate: jest.fn().mockImplementation((hits) => ({
          errors: [],
          success: true,
          bulkCreateDuration: '0',
          createdItemsCount: 0,
          createdItems: [],
        })),
        wrapHits: jest.fn(),
        ruleDataClient: ruleDataClientMock,
        runtimeMappings: {},
        inputIndex: ['auditbeat-*'],
        primaryTimestamp: TIMESTAMP,
        aggregatableTimestampField: TIMESTAMP,
        exceptionFilter: undefined,
        unprocessedExceptions: [],
        spaceId: 'default',
        runOpts: {} as RunOpts<ThresholdRuleParams>,
        licensing,
        experimentalFeatures: {} as ExperimentalFeatures,
        scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
      });
      expect(response.state).toEqual({
        initialized: true,
        signalHistory: {
          [`${getThresholdTermsHash(terms2)}`]: signalHistoryRecord2,
        },
      });
    });

    it('should log a warning if unprocessedExceptions is not empty', async () => {
      const ruleDataClientMock = createRuleDataClientMock();
      const terms1 = [
        {
          field: 'host.name',
          value: 'elastic-pc-1',
        },
      ];
      const signalHistoryRecord1 = {
        terms: terms1,
        lastSignalTimestamp: tuple.from.valueOf() - 60 * 1000,
      };
      const terms2 = [
        {
          field: 'host.name',
          value: 'elastic-pc-2',
        },
      ];
      const signalHistoryRecord2 = {
        terms: terms2,
        lastSignalTimestamp: tuple.from.valueOf() + 60 * 1000,
      };
      const state = {
        initialized: true,
        signalHistory: {
          [`${getThresholdTermsHash(terms1)}`]: signalHistoryRecord1,
          [`${getThresholdTermsHash(terms2)}`]: signalHistoryRecord2,
        },
      };
      const result = await thresholdExecutor({
        completeRule: thresholdCompleteRule,
        tuple,
        services: alertServices,
        state,
        version,
        ruleExecutionLogger,
        startedAt: new Date(),
        bulkCreate: jest.fn().mockImplementation((hits) => ({
          errors: [],
          success: true,
          bulkCreateDuration: '0',
          createdItemsCount: 0,
          createdItems: [],
        })),
        wrapHits: jest.fn(),
        ruleDataClient: ruleDataClientMock,
        runtimeMappings: {},
        inputIndex: ['auditbeat-*'],
        primaryTimestamp: TIMESTAMP,
        aggregatableTimestampField: TIMESTAMP,
        exceptionFilter: undefined,
        unprocessedExceptions: [getExceptionListItemSchemaMock()],
        spaceId: 'default',
        runOpts: {} as RunOpts<ThresholdRuleParams>,
        licensing,
        experimentalFeatures: {} as ExperimentalFeatures,
        scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
      });
      expect(result.warningMessages).toEqual([
        `The following exceptions won't be applied to rule execution: ${
          getExceptionListItemSchemaMock().name
        }`,
      ]);
    });
    it('should call scheduleNotificationResponseActionsService', async () => {
      const ruleDataClientMock = createRuleDataClientMock();
      const state = {
        initialized: true,
        signalHistory: {},
      };
      const result = await thresholdExecutor({
        completeRule: thresholdCompleteRule,
        tuple,
        services: alertServices,
        state,
        version,
        ruleExecutionLogger,
        startedAt: new Date(),
        bulkCreate: jest.fn().mockImplementation((hits) => ({
          errors: [],
          success: true,
          bulkCreateDuration: '0',
          createdItemsCount: 0,
          createdItems: [],
        })),
        wrapHits: jest.fn(),
        ruleDataClient: ruleDataClientMock,
        runtimeMappings: {},
        inputIndex: ['auditbeat-*'],
        primaryTimestamp: TIMESTAMP,
        aggregatableTimestampField: TIMESTAMP,
        exceptionFilter: undefined,
        unprocessedExceptions: [getExceptionListItemSchemaMock()],
        spaceId: 'default',
        runOpts: {} as RunOpts<ThresholdRuleParams>,
        licensing,
        experimentalFeatures: {} as ExperimentalFeatures,
        scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
      });
      expect(mockScheduledNotificationResponseAction).toBeCalledWith({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: thresholdCompleteRule.ruleParams.responseActions,
      });
    });
  });
});
