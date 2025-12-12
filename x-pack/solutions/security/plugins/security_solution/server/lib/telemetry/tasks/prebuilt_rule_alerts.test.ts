/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryPrebuiltRuleAlertsTaskConfig } from './prebuilt_rule_alerts';
import {
  createMockTelemetryEventsSender,
  createMockTelemetryReceiver,
  createMockTaskMetrics,
} from '../__mocks__';
import {
  prebuiltRuleAlertsResponse,
  prebuiltRuleAlertsEsql,
} from '../__mocks__/prebuilt_rule_alerts';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

const usageCountersServiceSetup = usageCountersServiceMock.createSetupContract();
const telemetryUsageCounter = usageCountersServiceSetup.createUsageCounter(
  'testTelemetryUsageCounter'
);

describe('security telemetry - detection rule alerts task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('detection rule alerts task should fetch recent alert data from elasticsearch', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    mockTelemetryEventsSender.getTelemetryUsageCluster = jest
      .fn()
      .mockReturnValue(telemetryUsageCounter);
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetryDetectionRuleAlertsTaskConfig = createTelemetryPrebuiltRuleAlertsTaskConfig(1);
    const mockTaskMetrics = createMockTaskMetrics();

    await telemetryDetectionRuleAlertsTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );
    expect(mockTelemetryReceiver.fetchDetectionRulesPackageVersion).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchPrebuiltRuleAlertsBatch).toHaveBeenCalled();
    expect(mockTelemetryEventsSender.sendOnDemand).toHaveBeenCalledTimes(
      prebuiltRuleAlertsResponse.events.length
    );
    expect(mockTaskMetrics.start).toHaveBeenCalled();
    expect(mockTaskMetrics.end).toHaveBeenCalled();
  });

  test('detection rule alerts task should send esql alerts unflattened', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    mockTelemetryEventsSender.getTelemetryUsageCluster = jest
      .fn()
      .mockReturnValue(telemetryUsageCounter);
    const spyOnSend = jest
      .spyOn(mockTelemetryEventsSender, 'sendOnDemand')
      .mockResolvedValue(undefined);
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    mockTelemetryReceiver.fetchPrebuiltRuleAlertsBatch = jest
      .fn()
      .mockImplementation(async function* () {
        yield prebuiltRuleAlertsEsql.response;
      });
    const telemetryDetectionRuleAlertsTaskConfig = createTelemetryPrebuiltRuleAlertsTaskConfig(1);
    const mockTaskMetrics = createMockTaskMetrics();

    await telemetryDetectionRuleAlertsTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );
    expect(mockTelemetryReceiver.fetchDetectionRulesPackageVersion).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchPrebuiltRuleAlertsBatch).toHaveBeenCalled();
    expect(spyOnSend).toHaveBeenCalled();
    const finalAlert = spyOnSend.mock.calls[0][1][0];
    expect(finalAlert).toEqual(prebuiltRuleAlertsEsql.expected);
    expect(mockTaskMetrics.start).toHaveBeenCalled();
    expect(mockTaskMetrics.end).toHaveBeenCalled();
  });
});
