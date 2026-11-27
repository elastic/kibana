/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { sendInvestigationNotificationsForExecution } from './notifications/send_investigation_notifications';
import { reportUnsuccessfulInvestigation } from './report_unsuccessful_investigation';

jest.mock('./notifications/send_investigation_notifications', () => ({
  sendInvestigationNotificationsForExecution: jest.fn(),
}));
const sendNotifications = jest.mocked(sendInvestigationNotificationsForExecution);

interface Execution {
  id: string;
  status: ExecutionStatus;
  error?: { type: string; message: string };
}

const report = async (execution: Execution, cause: Execution) => {
  const client = {
    getUnsuccessfulRun: jest.fn().mockResolvedValue({ execution, investigationId: 'inv-1', cause }),
    ensureForFailure: jest.fn().mockResolvedValue('inv-1'),
    isLatestInvestigationRun: jest.fn().mockResolvedValue(false),
  };
  await reportUnsuccessfulInvestigation(
    { getInvestigationsClient: () => client, getTriggerEmitter: jest.fn() } as never,
    {
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      executionId: 'parent-1',
      kibanaUrl: 'https://kibana.test',
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
    }
  );
  return client;
};

const timedOutParent = {
  id: 'parent-1',
  status: ExecutionStatus.FAILED,
  error: {
    type: 'TimeoutError',
    message: 'Step execution exceeded the configured timeout of 10s.',
  },
};
const cancelledChild = {
  id: 'child-1',
  status: ExecutionStatus.CANCELLED,
  error: { type: 'CancellationError', message: 'Cancelled by user' },
};
const failedChild = {
  id: 'child-1',
  status: ExecutionStatus.FAILED,
  error: { type: 'Error', message: 'Step failed' },
};

describe('reportUnsuccessfulInvestigation', () => {
  beforeEach(() => sendNotifications.mockReset().mockResolvedValue({} as never));

  it.each([
    [
      'the entry point timeout that cancelled the investigation',
      cancelledChild,
      timedOutParent,
      'Step execution exceeded the configured timeout of 10s.',
    ],
    [
      'a stopped investigation, whatever error it carries',
      cancelledChild,
      cancelledChild,
      'Investigation was stopped',
    ],
    ['the error of a failed investigation', failedChild, failedChild, 'Step failed'],
  ])('reports %s under the investigation run', async (_, execution, cause, reason) => {
    const client = await report(execution, cause);
    expect(client.ensureForFailure).toHaveBeenCalledWith('inv-1', 'child-1', reason);
    expect(sendNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ executionId: 'child-1' }),
      expect.objectContaining({ phase: 'failed', reason })
    );
  });
});
