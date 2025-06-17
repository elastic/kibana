/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { createScheduleExecutionSummary } from './create_schedule_execution_summary';
import { getInternalAttackDiscoveryScheduleMock } from '../../../../__mocks__/attack_discovery_schedules.mock';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-types';

const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  name: 'Test Bedrock',
  provider: OpenAiProviderType.OpenAi,
};
const basicAttackDiscoveryScheduleMock = {
  name: 'Test Schedule',
  schedule: {
    interval: '10m',
  },
  params: {
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: mockApiConfig,
    end: 'now',
    size: 25,
    start: 'now-24h',
  },
  enabled: true,
  actions: [],
};

describe('createScheduleExecutionSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not return execution summary if internal status is set to `pending`', async () => {
    const now = new Date();
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock, {
      executionStatus: {
        status: 'pending',
        lastExecutionDate: now,
      },
    });
    const execution = createScheduleExecutionSummary(internalRule);

    expect(execution).toBeUndefined();
  });

  it('should return status of the schedule execution', async () => {
    const now = new Date();
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock, {
      executionStatus: {
        status: 'ok',
        lastExecutionDate: now,
        lastDuration: 22,
      },
    });
    const execution = createScheduleExecutionSummary(internalRule);

    expect(execution?.status).toEqual('ok');
  });

  it('should return data of the schedule execution', async () => {
    const now = new Date();
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock, {
      executionStatus: {
        status: 'ok',
        lastExecutionDate: now,
        lastDuration: 22,
      },
    });
    const execution = createScheduleExecutionSummary(internalRule);

    expect(execution?.date).toEqual(now.toISOString());
  });

  it('should return duration of the schedule execution', async () => {
    const now = new Date();
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock, {
      executionStatus: {
        status: 'ok',
        lastExecutionDate: now,
        lastDuration: 22,
      },
    });
    const execution = createScheduleExecutionSummary(internalRule);

    expect(execution?.duration).toEqual(22);
  });

  it('should return empty message if neither error nor warning are specified', async () => {
    const now = new Date();
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock, {
      executionStatus: {
        status: 'ok',
        lastExecutionDate: now,
        lastDuration: 22,
      },
    });
    const execution = createScheduleExecutionSummary(internalRule);

    expect(execution?.message).toEqual('');
  });

  it('should return error message if specified', async () => {
    const now = new Date();
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock, {
      executionStatus: {
        status: 'error',
        lastExecutionDate: now,
        lastDuration: 22,
        error: {
          reason: RuleExecutionStatusErrorReasons.Execute,
          message: 'Test Error Message',
        },
      },
    });
    const execution = createScheduleExecutionSummary(internalRule);

    expect(execution?.message).toEqual('Test Error Message');
  });

  it('should return warning message if specified', async () => {
    const now = new Date();
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock, {
      executionStatus: {
        status: 'error',
        lastExecutionDate: now,
        lastDuration: 22,
        warning: {
          reason: RuleExecutionStatusWarningReasons.MAX_ALERTS,
          message: 'Test Warning Message',
        },
      },
    });
    const execution = createScheduleExecutionSummary(internalRule);

    expect(execution?.message).toEqual('Test Warning Message');
  });
});
