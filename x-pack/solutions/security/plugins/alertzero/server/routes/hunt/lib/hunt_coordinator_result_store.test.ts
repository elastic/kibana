/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import {
  createAttachmentAlreadyExistsError,
  createAttachmentNotFoundError,
  createConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import {
  HUNT_COORDINATOR_RESULT_ATTACHMENT_DESCRIPTION,
  writeRunning,
  writeTerminal,
} from './hunt_coordinator_result_store';

const makeClient = () =>
  ({
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<Pick<AttachmentPublicClient, 'create' | 'update'>>);

const target = (client: ReturnType<typeof makeClient>) => ({
  client: client as unknown as AttachmentPublicClient,
  conversationId: 'conv-1',
  attachmentId: 'hunt-coordinator-result-run-1',
});

const running = (client: ReturnType<typeof makeClient>) => ({
  ...target(client),
  logger: loggingSystemMock.createLogger(),
});

const failedEnvelope = {
  run_id: 'run-1',
  report_id: 'report-1',
  state: 'failed' as const,
  error: { message: 'Hunt coordinator failed' },
};

describe('writeRunning', () => {
  it('creates a hidden, readonly placeholder in the running state under the given id', async () => {
    const client = makeClient();

    await writeRunning({ ...running(client), runId: 'run-1', reportId: 'report-1' });

    expect(client.create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      id: 'hunt-coordinator-result-run-1',
      type: 'security.hunt_coordinator_result',
      data: { run_id: 'run-1', report_id: 'report-1', state: 'running' },
      description: HUNT_COORDINATOR_RESULT_ATTACHMENT_DESCRIPTION,
      hidden: true,
      readonly: true,
    });
    expect(client.update).not.toHaveBeenCalled();
  });

  it('leaves report_id off the placeholder for an ad hoc run', async () => {
    const client = makeClient();

    await writeRunning({ ...running(client), runId: 'run-1' });

    expect(client.create.mock.calls[0][0].data).toEqual({ run_id: 'run-1', state: 'running' });
  });

  it('refreshes an existing attachment to running, and warns that a start is being repeated', async () => {
    const client = makeClient();
    const logger = loggingSystemMock.createLogger();
    client.create.mockRejectedValue(
      createAttachmentAlreadyExistsError({ attachmentId: 'hunt-coordinator-result-run-1' })
    );

    await writeRunning({ ...target(client), logger, runId: 'run-1', reportId: 'report-1' });

    expect(client.update).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'hunt-coordinator-result-run-1',
      data: { run_id: 'run-1', report_id: 'report-1', state: 'running' },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'hunt-coordinator-result-run-1 already existed and was reset to running'
      )
    );
  });

  it('does not warn when the placeholder is created fresh', async () => {
    const client = makeClient();
    const logger = loggingSystemMock.createLogger();

    await writeRunning({ ...target(client), logger, runId: 'run-1' });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('rethrows any other create failure for the route to map', async () => {
    const client = makeClient();
    client.create.mockRejectedValue(new Error('conversation unavailable'));

    await expect(writeRunning({ ...running(client), runId: 'run-1' })).rejects.toThrow(
      'conversation unavailable'
    );
    expect(client.update).not.toHaveBeenCalled();
  });

  it('rethrows when the refresh of an existing attachment fails', async () => {
    const client = makeClient();
    client.create.mockRejectedValue(
      createAttachmentAlreadyExistsError({ attachmentId: 'hunt-coordinator-result-run-1' })
    );
    client.update.mockRejectedValue(new Error('Cannot update deleted attachment'));

    await expect(writeRunning({ ...running(client), runId: 'run-1' })).rejects.toThrow(
      'Cannot update deleted attachment'
    );
  });
});

describe('writeTerminal', () => {
  it('updates the placeholder with the terminal envelope', async () => {
    const client = makeClient();

    await writeTerminal({ ...target(client), envelope: failedEnvelope });

    expect(client.update).toHaveBeenCalledTimes(1);
    expect(client.update).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'hunt-coordinator-result-run-1',
      data: failedEnvelope,
    });
  });

  it('retries once when a concurrent writer on the Investigation conflicts with the update', async () => {
    const client = makeClient();
    client.update
      .mockRejectedValueOnce(createConversationWriteConflictError({ conversationId: 'conv-1' }))
      .mockResolvedValueOnce({} as never);

    await writeTerminal({ ...target(client), envelope: failedEnvelope });

    expect(client.update).toHaveBeenCalledTimes(2);
    expect(client.update.mock.calls[1][0].data).toEqual(failedEnvelope);
  });

  it('rethrows when the retry conflicts again', async () => {
    const client = makeClient();
    client.update.mockRejectedValue(
      createConversationWriteConflictError({ conversationId: 'conv-1' })
    );

    await expect(writeTerminal({ ...target(client), envelope: failedEnvelope })).rejects.toThrow(
      'modified concurrently'
    );
    expect(client.update).toHaveBeenCalledTimes(2);
  });

  it('does not retry a failure that is not a conflict', async () => {
    const client = makeClient();
    client.update.mockRejectedValue(
      createAttachmentNotFoundError({ attachmentId: 'hunt-coordinator-result-run-1' })
    );

    await expect(writeTerminal({ ...target(client), envelope: failedEnvelope })).rejects.toThrow(
      'not found'
    );
    expect(client.update).toHaveBeenCalledTimes(1);
  });
});
