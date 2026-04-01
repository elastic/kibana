/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-types';

import { createScheduleExecutionSummary } from './create_schedule_execution_summary';
import { getInternalAttackDiscoveryScheduleMock } from '../__mocks__/attack_discovery_schedules.mock';

const basicAttackDiscoveryScheduleMock = {
  name: 'Test Schedule',
  schedule: { interval: '10m' },
  params: {
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: {
      connectorId: 'connector-id',
      actionTypeId: '.bedrock',
      model: 'model',
      name: 'Test Bedrock',
    },
    end: 'now',
    size: 25,
    start: 'now-24h',
  },
  enabled: true,
  actions: [],
};

describe('createScheduleExecutionSummary', () => {
  it('returns undefined if internal status is set to `pending`', () => {
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

  it('returns status of the schedule execution', () => {
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

  it('returns date of the schedule execution', () => {
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

  it('returns duration of the schedule execution', () => {
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

  it('returns empty message if neither error nor warning are specified', () => {
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

  it('returns error message if specified', () => {
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

  it('returns warning message if specified', () => {
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
