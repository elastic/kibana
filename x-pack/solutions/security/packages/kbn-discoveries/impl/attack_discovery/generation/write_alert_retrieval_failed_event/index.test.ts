/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import type { WorkflowExecutionsTracking } from '../types';
import { writeAlertRetrievalFailedEvent } from '.';

const mockGetDurationNanoseconds = jest.fn();
const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED: 'alert-retrieval-failed',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

jest.mock('../../../lib/persistence', () => ({
  getDurationNanoseconds: (...args: unknown[]) => mockGetDurationNanoseconds(...args),
}));

describe('writeAlertRetrievalFailedEvent', () => {
  const defaultProps = {
    authenticatedUser: {
      authentication_provider: { name: 'basic', type: 'basic' },
      elastic_cloud_user: false,
      username: 'test-user',
    } as AuthenticatedUser,
    connectorId: 'connector-1',
    endTime: new Date('2024-01-01T00:00:01.000Z'),
    errorMessage: 'bad thing',
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

  it('writes the failed event', async () => {
    await writeAlertRetrievalFailedEvent(defaultProps);

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'alert-retrieval-failed',
        duration: 123,
        executionUuid: 'exec-1',
        message: 'Attack discovery alert retrieval exec-1 failed',
        outcome: 'failure',
        reason: 'bad thing',
      })
    );
  });

  it('logs an error when event writing fails', async () => {
    mockWriteAttackDiscoveryEvent.mockRejectedValueOnce(new Error('fail'));

    await writeAlertRetrievalFailedEvent(defaultProps);

    expect(defaultProps.logger.error).toHaveBeenCalledWith(
      'Failed to write alert-retrieval-failed event: fail'
    );
  });

  it('passes errorCategory to writeAttackDiscoveryEvent when provided', async () => {
    await writeAlertRetrievalFailedEvent({
      ...defaultProps,
      errorCategory: 'workflow_deleted',
    });

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCategory: 'workflow_deleted',
      })
    );
  });

  it('passes failedWorkflowId to writeAttackDiscoveryEvent when provided', async () => {
    await writeAlertRetrievalFailedEvent({
      ...defaultProps,
      failedWorkflowId: 'wf-retrieval-001',
    });

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        failedWorkflowId: 'wf-retrieval-001',
      })
    );
  });

  it('does not include errorCategory or failedWorkflowId when not provided', async () => {
    await writeAlertRetrievalFailedEvent(defaultProps);

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.not.objectContaining({
        errorCategory: expect.anything(),
        failedWorkflowId: expect.anything(),
      })
    );
  });
});
