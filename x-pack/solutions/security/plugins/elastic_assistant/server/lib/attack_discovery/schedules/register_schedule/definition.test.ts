/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { analyticsServiceMock } from '@kbn/core/server/mocks';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';

import { getAttackDiscoveryScheduleType } from '.';
import { ATTACK_DISCOVERY_ALERTS_AAD_CONFIG } from '../constants';
import { TaskPriority } from '@kbn/task-manager-plugin/server';

describe('getAttackDiscoveryScheduleType', () => {
  const mockLogger = loggerMock.create();
  const mockTelemetry = analyticsServiceMock.createAnalyticsServiceSetup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return schedule type definition', async () => {
    const scheduleType = getAttackDiscoveryScheduleType({
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    expect(scheduleType).toEqual({
      id: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
      name: 'Attack Discovery Schedule',
      ruleTaskTimeout: '10m',
      actionGroups: [{ id: 'default', name: 'Default' }],
      defaultActionGroupId: 'default',
      category: 'securitySolution',
      producer: 'siem',
      solution: 'security',
      priority: TaskPriority.NormalLongRunning,
      schemas: {
        params: { type: 'zod', schema: AttackDiscoveryScheduleParams },
      },
      actionVariables: {
        context: [{ name: 'server', description: 'the server' }],
      },
      minimumLicenseRequired: 'basic',
      isExportable: false,
      autoRecoverAlerts: false,
      alerts: ATTACK_DISCOVERY_ALERTS_AAD_CONFIG,
      executor: expect.anything(),
      validate: expect.anything(),
    });
  });
});
