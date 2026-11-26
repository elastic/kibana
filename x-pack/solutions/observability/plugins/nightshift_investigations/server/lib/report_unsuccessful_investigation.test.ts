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

const report = (execution: { status: ExecutionStatus; error?: { message: string } }) => {
  const client = {
    getUnsuccessfulRun: jest.fn().mockResolvedValue({
      execution: { id: 'exec-1', ...execution },
      investigationId: 'inv-1',
    }),
    ensureForFailure: jest.fn().mockResolvedValue('inv-1'),
    isLatestInvestigationRun: jest.fn().mockResolvedValue(false),
  };
  return reportUnsuccessfulInvestigation(
    { getInvestigationsClient: () => client, getTriggerEmitter: jest.fn() } as never,
    {
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      executionId: 'exec-1',
      kibanaUrl: 'https://kibana.test',
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
    }
  );
};

describe('reportUnsuccessfulInvestigation', () => {
  beforeEach(() => sendNotifications.mockReset().mockResolvedValue({} as never));

  it('tells a cancelled run apart from a failure, whatever error it carries', async () => {
    await report({
      status: ExecutionStatus.CANCELLED,
      error: { message: 'Sub-workflow execution cancelled: Cancelled by user' },
    });
    expect(sendNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ phase: 'failed', reason: 'Investigation was stopped' })
    );
  });

  it('reports the error of a failed run', async () => {
    await report({ status: ExecutionStatus.FAILED, error: { message: 'Step failed' } });
    expect(sendNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ phase: 'failed', reason: 'Step failed' })
    );
  });
});
