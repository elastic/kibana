/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import type { WorkflowExecutionsTracking } from '../types';
import { writeAlertRetrievalStartedEvent } from '.';

const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED: 'alert-retrieval-started',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

describe('writeAlertRetrievalStartedEvent', () => {
  const defaultProps = {
    authenticatedUser: {
      authentication_provider: { name: 'basic', type: 'basic' },
      elastic_cloud_user: false,
      username: 'test-user',
    } as AuthenticatedUser,
    connectorId: 'connector-1',
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
  });

  it('writes the started event', async () => {
    await writeAlertRetrievalStartedEvent(defaultProps);

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'alert-retrieval-started',
        connectorId: 'connector-1',
        executionUuid: 'exec-1',
        message: 'Attack discovery alert retrieval exec-1 started',
      })
    );
  });

  it('logs an error when event writing fails', async () => {
    mockWriteAttackDiscoveryEvent.mockRejectedValueOnce(new Error('fail'));

    await writeAlertRetrievalStartedEvent(defaultProps);

    expect(defaultProps.logger.error).toHaveBeenCalledWith(
      'Failed to write alert-retrieval-started event: fail'
    );
  });
});
