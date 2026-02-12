/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { mlExecutor } from './ml';
import { getCompleteRuleMock, getMlRuleParams } from '../../rule_schema/mocks';
import { findMlSignals } from './find_ml_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import { mlPluginServerMock } from '@kbn/ml-plugin/server/mocks';
import type { MachineLearningRuleParams } from '../../rule_schema';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

jest.mock('./find_ml_signals');
jest.mock('./bulk_create_ml_signals');

describe('ml_executor', () => {
  let mockScheduledNotificationResponseAction: jest.Mock;
  let jobsSummaryMock: jest.Mock;
  let forceStartDatafeedsMock: jest.Mock;
  let stopDatafeedsMock: jest.Mock;
  let mlMock: ReturnType<typeof mlPluginServerMock.createSetupContract>;
  let ruleServices: PersistenceExecutorOptionsMock;

  const params = getMlRuleParams();
  const mlCompleteRule = getCompleteRuleMock<MachineLearningRuleParams>(params);
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const sharedParams = getSharedParamsMock({ ruleParams: params, rewrites: { tuple } });
  const ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create> =
    ruleExecutionLogMock.forExecutors.create({
      ruleId: sharedParams.completeRule.alertId,
      ruleUuid: sharedParams.completeRule.ruleParams.ruleId,
      ruleName: sharedParams.completeRule.ruleConfig.name,
      ruleType: sharedParams.completeRule.ruleConfig.ruleTypeId,
    });
  sharedParams.ruleExecutionLogger = ruleExecutionLogger;

  beforeEach(() => {
    mockScheduledNotificationResponseAction = jest.fn();
    jobsSummaryMock = jest.fn();
    mlMock = mlPluginServerMock.createSetupContract();
    mlMock.jobServiceProvider.mockReturnValue({
      jobsSummary: jobsSummaryMock,
      // @ts-expect-error upgrade typescript v5.9.3
      forceStartDatafeeds: forceStartDatafeedsMock,
      // @ts-expect-error upgrade typescript v5.9.3
      stopDatafeeds: stopDatafeedsMock,
    });
    ruleServices = createPersistenceExecutorOptionsMock();
    (findMlSignals as jest.Mock).mockResolvedValue({
      anomalyResults: {
        _shards: {},
        hits: {
          hits: [],
        },
      },
    });
    (bulkCreateMlSignals as jest.Mock).mockResolvedValue({
      success: true,
      bulkCreateDuration: 21,
      createdItemsCount: 0,
      errors: [],
      createdItems: [],
    });
    jobsSummaryMock.mockResolvedValue([]);
  });

  it('should throw an error if ML plugin was not available', async () => {
    await expect(
      mlExecutor({
        sharedParams,
        ml: undefined,
        services: ruleServices,
        wrapSuppressedHits: jest.fn(),
        isAlertSuppressionActive: true,
        scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
      })
    ).rejects.toThrow('ML plugin unavailable during rule execution');
  });

  it('should record a partial failure if Machine learning job summary was null', async () => {
    jobsSummaryMock.mockResolvedValue([]);
    const { result } = await mlExecutor({
      sharedParams,
      ml: mlMock,
      services: ruleServices,
      wrapSuppressedHits: jest.fn(),
      isAlertSuppressionActive: true,
      scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
    });
    expect(ruleExecutionLogger.warn).toHaveBeenCalled();
    expect(ruleExecutionLogger.warn.mock.calls[0][0]).toContain(
      'Machine learning job(s) are not started'
    );
    expect(result.warningMessages.length).toEqual(1);
  });

  it('should record a partial failure if Machine learning job was not started', async () => {
    jobsSummaryMock.mockResolvedValue([
      {
        id: 'some_job_id',
        jobState: 'starting',
        datafeedState: 'started',
      },
    ]);

    const { result } = await mlExecutor({
      sharedParams,
      ml: mlMock,
      services: ruleServices,
      wrapSuppressedHits: jest.fn(),
      isAlertSuppressionActive: true,
      scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
    });
    expect(ruleExecutionLogger.warn).toHaveBeenCalled();
    expect(ruleExecutionLogger.warn.mock.calls[0][0]).toContain(
      'Machine learning job(s) are not started'
    );
    expect(result.warningMessages.length).toEqual(1);
  });

  it('should report job missing errors as user errors', async () => {
    (findMlSignals as jest.Mock).mockRejectedValue({
      message: 'my_test_job_name missing',
    });

    const { result } = await mlExecutor({
      sharedParams,
      ml: mlMock,
      services: ruleServices,
      wrapSuppressedHits: jest.fn(),
      isAlertSuppressionActive: true,
      scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
    });
    // eventually tagged as a user error in the rule wrapper
    expect(result.userError).toBeFalsy();
    expect(result.success).toEqual(false);
    expect(result.errors).toEqual(['my_test_job_name missing']);
  });

  it('returns some timing information as part of the result', async () => {
    // ensure our mock corresponds to the job that the rule uses
    jobsSummaryMock.mockResolvedValue(
      mlCompleteRule.ruleParams.machineLearningJobId.map((jobId) => ({
        id: jobId,
        jobState: 'opened',
        datafeedState: 'started',
      }))
    );

    const { result } = await mlExecutor({
      sharedParams,
      ml: mlMock,
      services: ruleServices,
      wrapSuppressedHits: jest.fn(),
      isAlertSuppressionActive: true,
      scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
    });

    expect(result).toEqual(
      expect.objectContaining({
        bulkCreateTimes: expect.arrayContaining([expect.any(Number)]),
      })
    );
  });
  it('should call scheduleNotificationResponseActionsService', async () => {
    const { result } = await mlExecutor({
      sharedParams,
      ml: mlMock,
      services: ruleServices,
      wrapSuppressedHits: jest.fn(),
      isAlertSuppressionActive: true,
      scheduleNotificationResponseActionsService: mockScheduledNotificationResponseAction,
    });
    expect(mockScheduledNotificationResponseAction).toBeCalledWith({
      signals: result.createdSignals,
      signalsCount: result.createdSignalsCount,
      responseActions: mlCompleteRule.ruleParams.responseActions,
    });
  });
});
