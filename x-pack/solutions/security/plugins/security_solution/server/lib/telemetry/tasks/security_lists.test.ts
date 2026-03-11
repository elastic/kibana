/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetrySecurityListTaskConfig } from './security_lists';
import {
  createMockTelemetryEventsSender,
  createMockTelemetryReceiver,
  createMockTaskMetrics,
} from '../__mocks__';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

describe('security list telemetry task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('security list telemetry task should fetch security list data', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetrySecurityListTaskConfig = createTelemetrySecurityListTaskConfig(1);
    const mockTaskMetrics = createMockTaskMetrics();

    await telemetrySecurityListTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.fetchTrustedApplications).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchEndpointList).toHaveBeenCalledWith(
      ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
    );
    expect(mockTelemetryReceiver.fetchEndpointList).toHaveBeenCalledWith(
      ENDPOINT_ARTIFACT_LISTS.eventFilters.id
    );
    expect(mockTelemetryReceiver.fetchValueListMetaData).toHaveBeenCalled();
  });
});
