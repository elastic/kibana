/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import type { WorkflowExecutionsTracking } from '../types';
import { writeAlertRetrievalSucceededEvent } from '.';

const mockGetDurationNanoseconds = jest.fn();
const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED: 'alert-retrieval-succeeded',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

jest.mock('../../../lib/persistence', () => ({
  getDurationNanoseconds: (...args: unknown[]) => mockGetDurationNanoseconds(...args),
}));

describe('writeAlertRetrievalSucceededEvent', () => {
  const defaultProps = {
    alertsContextCount: 7,
    authenticatedUser: {
      authentication_provider: { name: 'basic', type: 'basic' },
      elastic_cloud_user: false,
      username: 'test-user',
    } as AuthenticatedUser,
    connectorId: 'connector-1',
    endTime: new Date('2024-01-01T00:00:01.000Z'),
    eventLogger: { logEvent: jest.fn() } as unknown as IEventLogger,
    eventLogIndex: '.kibana-event-log-test',
    executionUuid: 'exec-1',
    logger: { error: jest.fn() } as unknown as Logger,
    spaceId: 'default',
    startTime: new Date('2024-01-01T00:00:00.000Z'),
    workflowExecutions: {
      alertRetrieval: [{ workflowId: 'w1', workflowRunId: 'r1' }],
      generation: null,
      validation: null,
    } as WorkflowExecutionsTracking,
    workflowId: 'w1',
    workflowRunId: 'r1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDurationNanoseconds.mockReturnValue(123);
  });

  it('writes the succeeded event', async () => {
    await writeAlertRetrievalSucceededEvent(defaultProps);

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'alert-retrieval-succeeded',
        alertsContextCount: 7,
        duration: 123,
        executionUuid: 'exec-1',
        message: 'Attack discovery alert retrieval exec-1 succeeded',
        outcome: 'success',
      })
    );
  });

  it('logs an error when event writing fails', async () => {
    mockWriteAttackDiscoveryEvent.mockRejectedValueOnce(new Error('fail'));

    await writeAlertRetrievalSucceededEvent(defaultProps);

    expect(defaultProps.logger.error).toHaveBeenCalledWith(
      'Failed to write alert-retrieval-succeeded event: fail'
    );
  });
});
