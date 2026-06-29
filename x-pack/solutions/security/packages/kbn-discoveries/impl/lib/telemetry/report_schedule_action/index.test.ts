/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT } from '../event_based_telemetry';
import { reportScheduleAction } from '.';

const mockAnalytics = coreMock.createSetup().analytics;
const mockLogger = loggingSystemMock.createLogger();

describe('reportScheduleAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports event with action, has_actions, and interval for create', () => {
    reportScheduleAction({
      action: 'create',
      analytics: mockAnalytics,
      hasActions: true,
      interval: '24h',
      logger: mockLogger,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT.eventType,
      {
        action: 'create',
        has_actions: true,
        interval: '24h',
      }
    );
  });

  it('reports event without has_actions and interval for enable', () => {
    reportScheduleAction({
      action: 'enable',
      analytics: mockAnalytics,
      logger: mockLogger,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT.eventType,
      {
        action: 'enable',
        has_actions: undefined,
        interval: undefined,
      }
    );
  });

  it('reports event for disable', () => {
    reportScheduleAction({
      action: 'disable',
      analytics: mockAnalytics,
      logger: mockLogger,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT.eventType,
      {
        action: 'disable',
        has_actions: undefined,
        interval: undefined,
      }
    );
  });

  it('reports event for delete', () => {
    reportScheduleAction({
      action: 'delete',
      analytics: mockAnalytics,
      logger: mockLogger,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT.eventType,
      {
        action: 'delete',
        has_actions: undefined,
        interval: undefined,
      }
    );
  });

  it('reports event with has_actions=false and interval for update', () => {
    reportScheduleAction({
      action: 'update',
      analytics: mockAnalytics,
      hasActions: false,
      interval: '1h',
      logger: mockLogger,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT.eventType,
      {
        action: 'update',
        has_actions: false,
        interval: '1h',
      }
    );
  });

  it('logs debug message when reportEvent throws', () => {
    mockAnalytics.reportEvent.mockImplementationOnce(() => {
      throw new Error('analytics failure');
    });

    reportScheduleAction({
      action: 'create',
      analytics: mockAnalytics,
      logger: mockLogger,
    });

    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
