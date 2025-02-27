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
import { getThresholdRuleParams } from '../../rule_schema/mocks';
import { sampleEmptyAggsSearchResults } from '../__mocks__/es_results';
import { getThresholdTermsHash } from './utils';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import type { ExperimentalFeatures } from '../../../../../common';
import { getSharedParamsMock } from '../__mocks__/shared_params';

jest.mock('../utils/get_filter', () => ({ getFilter: jest.fn() }));

describe('threshold_executor', () => {
  let alertServices: RuleExecutorServicesMock;

  let mockScheduledNotificationResponseAction: jest.Mock;
  const params = getThresholdRuleParams();
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const licensing = licensingMock.createSetup();

  const sharedParams = getSharedParamsMock({
    ruleParams: params,
    rewrites: {
      tuple,
      bulkCreate: jest.fn().mockImplementation((hits) => ({
        errors: [],
        success: true,
        bulkCreateDuration: '0',
        createdItemsCount: 0,
        createdItems: [],
      })),
    },
  });
  const ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create> =
    ruleExecutionLogMock.forExecutors.create({
      ruleId: sharedParams.completeRule.alertId,
      ruleUuid: sharedParams.completeRule.ruleParams.ruleId,
      ruleName: sharedParams.completeRule.ruleConfig.name,
      ruleType: sharedParams.completeRule.ruleConfig.ruleTypeId,
    });
  sharedParams.ruleExecutionLogger = ruleExecutionLogger;
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
    mockScheduledNotificationResponseAction = jest.fn();
  });

  describe('thresholdExecutor', () => {
    it('should clean up any signal history that has fallen outside the window when state is initialized', async () => {
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
        sharedParams,
        services: alertServices,
        state,
        startedAt: new Date(),
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
        sharedParams: {
          ...sharedParams,
          unprocessedExceptions: [getExceptionListItemSchemaMock()],
        },
        services: alertServices,
        state,
        startedAt: new Date(),
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
      const state = {
        initialized: true,
        signalHistory: {},
      };
      const result = await thresholdExecutor({
        sharedParams,
        services: alertServices,
        state,
        startedAt: new Date(),
        licensing,
        experimentalFeatures: {} as ExperimentalFeatures,
        scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
      });
      expect(mockScheduledNotificationResponseAction).toBeCalledWith({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: sharedParams.completeRule.ruleParams.responseActions,
      });
    });
  });
});
