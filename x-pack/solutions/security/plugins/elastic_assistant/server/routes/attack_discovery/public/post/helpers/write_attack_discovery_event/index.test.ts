/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';

import { writeAttackDiscoveryEvent } from '.';
import type { AttackDiscoveryDataClient } from '../../../../../../lib/attack_discovery/persistence';
import { mockAuthenticatedUser } from '../../../../../../__mocks__/mock_authenticated_user';
import { attackDiscoveryDataClientMock } from '../../../../../../__mocks__/data_clients.mock';

describe('writeAttackDiscoveryEvent', () => {
  const mockEventLogger = {
    logEvent: jest.fn(),
  } as {
    logEvent: jest.Mock;
  } as unknown as IEventLogger;
  const mockDataClient =
    attackDiscoveryDataClientMock.create() as unknown as AttackDiscoveryDataClient;
  const defaultProps: Parameters<typeof writeAttackDiscoveryEvent>[0] = {
    action: 'generation-started',
    alertsContextCount: 2,
    authenticatedUser: mockAuthenticatedUser,
    connectorId: 'test-connector',
    dataClient: mockDataClient,
    duration: 12345,
    end: new Date('2024-01-01T00:00:00Z'),
    eventLogger: mockEventLogger,
    eventLogIndex: 'event-log-index',
    executionUuid: 'uuid-123',
    loadingMessage: 'loading',
    message: 'test message',
    newAlerts: 1,
    outcome: 'success',
    reason: 'test reason',
    spaceId: 'default',
    start: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs the attack discovery event', async () => {
    await writeAttackDiscoveryEvent({ ...defaultProps });

    expect(mockEventLogger.logEvent).toHaveBeenCalled();
  });

  it('refreshes the index', async () => {
    await writeAttackDiscoveryEvent({ ...defaultProps });

    expect(mockDataClient.refreshEventLogIndex).toHaveBeenCalledWith('event-log-index');
  });

  it('trims reason to 1024 chars', async () => {
    const longReason = 'a'.repeat(2000);

    await writeAttackDiscoveryEvent({ ...defaultProps, reason: longReason });
    const eventArg = (mockEventLogger.logEvent as jest.Mock).mock.calls[0][0];

    expect(eventArg.event.reason.length).toBe(1024);
  });

  it('omits alert_counts if alertsContextCount and newAlerts are undefined', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultProps,
      alertsContextCount: undefined,
      newAlerts: undefined,
    });
    const eventArg = (mockEventLogger.logEvent as jest.Mock).mock.calls[0][0];

    expect(eventArg.kibana.alert.rule.execution.metrics).toBeUndefined();
  });

  it('logs event with event outcome success', async () => {
    await writeAttackDiscoveryEvent({ ...defaultProps, outcome: 'success', reason: undefined });
    const eventArg = (mockEventLogger.logEvent as jest.Mock).mock.calls[0][0];

    expect(eventArg.event.outcome).toBe('success');
  });

  it('logs event with event.outcome failure', async () => {
    await writeAttackDiscoveryEvent({ ...defaultProps, outcome: 'failure', reason: 'fail reason' });
    const eventArg = (mockEventLogger.logEvent as jest.Mock).mock.calls[0][0];

    expect(eventArg.event.outcome).toBe('failure');
  });

  it('logs event with the reason for the failure', async () => {
    await writeAttackDiscoveryEvent({ ...defaultProps, outcome: 'failure', reason: 'fail reason' });
    const eventArg = (mockEventLogger.logEvent as jest.Mock).mock.calls[0][0];

    expect(eventArg.event.reason).toBe('fail reason');
  });
});
