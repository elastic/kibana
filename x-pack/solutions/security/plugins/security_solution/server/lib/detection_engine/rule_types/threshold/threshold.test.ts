/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { thresholdExecutor } from './threshold';
import { getThresholdRuleParams } from '../../rule_schema/mocks';
import { sampleEmptyAggsSearchResults } from '../__mocks__/es_results';
import { getThresholdTermsHash } from './utils';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

jest.mock('../utils/get_filter', () => ({ getFilter: jest.fn() }));

describe('threshold_executor', () => {
  let ruleServices: PersistenceExecutorOptionsMock;

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
    ruleServices = createPersistenceExecutorOptionsMock();
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
      ...sampleEmptyAggsSearchResults(),
      aggregations: {
        thresholdTerms: { buckets: [] },
      },
    });
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
        services: ruleServices,
        state,
        startedAt: new Date(),
        licensing,
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
        services: ruleServices,
        state,
        startedAt: new Date(),
        licensing,
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
        services: ruleServices,
        state,
        startedAt: new Date(),
        licensing,
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
