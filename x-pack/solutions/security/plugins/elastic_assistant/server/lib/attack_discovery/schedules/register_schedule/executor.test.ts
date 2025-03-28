/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { AlertsClientError, RuleExecutorOptions } from '@kbn/alerting-plugin/server';

import { attackDiscoveryScheduleExecutor } from './executor';

describe('attackDiscoveryScheduleExecutor', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return execution state', async () => {
    const results = await attackDiscoveryScheduleExecutor({
      logger: mockLogger,
      options: { services: { alertsClient: {} } } as RuleExecutorOptions,
    });

    expect(results).toEqual({ state: {} });
  });

  it('should throw `AlertsClientError` error if actions client is not available', async () => {
    const attackDiscoveryScheduleExecutorPromise = attackDiscoveryScheduleExecutor({
      logger: mockLogger,
      options: { services: {} } as RuleExecutorOptions,
    });

    await expect(attackDiscoveryScheduleExecutorPromise).rejects.toBeInstanceOf(AlertsClientError);
  });
});
