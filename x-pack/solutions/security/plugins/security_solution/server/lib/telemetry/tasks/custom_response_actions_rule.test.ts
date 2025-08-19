/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryCustomResponseActionRulesTaskConfig } from './custom_response_actions_rule';
import {
  createMockTelemetryEventsSender,
  createMockTelemetryReceiver,
  createMockTaskMetrics,
} from '../__mocks__';

describe('security response actions rule task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('security response actions rule task should fetch response actions rules data', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetryCustomResponseActionsRulesTaskConfig =
      createTelemetryCustomResponseActionRulesTaskConfig(1);
    const mockTaskMetrics = createMockTaskMetrics();

    await telemetryCustomResponseActionsRulesTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.fetchResponseActionsRules).toHaveBeenCalled();
  });
});
