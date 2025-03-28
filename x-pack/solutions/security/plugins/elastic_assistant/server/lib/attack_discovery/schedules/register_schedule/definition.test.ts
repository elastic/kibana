/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';

import { getAttackDiscoveryScheduleType } from '.';
import { ATTACK_DISCOVERY_ALERTS_AAD_CONFIG } from '../constants';

describe('getAttackDiscoveryScheduleType', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return schedule type definition', async () => {
    const scheduleType = getAttackDiscoveryScheduleType({ logger: mockLogger });

    expect(scheduleType).toEqual(
      expect.objectContaining({
        id: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
        name: 'Attack Discovery Schedule',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        category: 'securitySolution',
        producer: 'assistant',
        solution: 'security',
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
      })
    );
  });
});
