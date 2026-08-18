/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AGENT_POLICY_REVISION_BATCH_WINDOW_MS,
  AGENT_POLICY_REVISION_RETRY_DELAY_MS,
  AgentPolicyRevisionBatcher,
} from './agent_policy_revision_batcher';

describe('AgentPolicyRevisionBatcher', () => {
  const client = {
    getCurrentNamespace: () => 'test-space',
  } as SavedObjectsClientContract;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('coalesces concurrent requests for one policy into one revision bump', async () => {
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });

    const requests = Array.from({ length: 20 }, () => batcher.schedule(client, ['policy-1']));

    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await Promise.all(requests);

    expect(bumpRevision).toHaveBeenCalledTimes(1);
    expect(bumpRevision).toHaveBeenCalledWith(client, 'policy-1');
  });

  it('keeps separate policies in separate batches', async () => {
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });

    const request = batcher.schedule(client, ['policy-1', 'policy-1', 'policy-2']);

    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await request;

    expect(bumpRevision).toHaveBeenCalledTimes(2);
    expect(bumpRevision).toHaveBeenCalledWith(client, 'policy-1');
    expect(bumpRevision).toHaveBeenCalledWith(client, 'policy-2');
  });

  it('coalesces a shared policy written through different spaces', async () => {
    const otherSpaceClient = {
      getCurrentNamespace: () => 'other-space',
    } as SavedObjectsClientContract;
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });

    const requests = [
      batcher.schedule(client, ['policy-1']),
      batcher.schedule(otherSpaceClient, ['policy-1']),
    ];

    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await Promise.all(requests);

    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });

  it('schedules a follow-up bump for writes that arrive while a bump is running', async () => {
    let finishFirstBump: () => void = () => {};
    const bumpRevision = jest
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finishFirstBump = resolve)))
      .mockResolvedValue(undefined);
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });

    const firstRequest = batcher.schedule(client, ['policy-1']);
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    expect(bumpRevision).toHaveBeenCalledTimes(1);

    const secondRequest = batcher.schedule(client, ['policy-1']);
    finishFirstBump();
    await firstRequest;
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await secondRequest;

    expect(bumpRevision).toHaveBeenCalledTimes(2);
  });

  it('retries version conflicts with bounded backoff', async () => {
    const bumpRevision = jest
      .fn()
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createConflictError('agent-policy', '1'))
      .mockResolvedValue(undefined);
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });
    const request = batcher.schedule(client, ['policy-1']);

    await jest.advanceTimersByTimeAsync(
      AGENT_POLICY_REVISION_BATCH_WINDOW_MS + AGENT_POLICY_REVISION_RETRY_DELAY_MS
    );
    await request;

    expect(bumpRevision).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-conflict errors', async () => {
    const bumpRevision = jest.fn().mockRejectedValue(new Error('deployment failed'));
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });
    const request = batcher.schedule(client, ['policy-1']);
    const rejection = expect(request).rejects.toThrow('deployment failed');

    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await rejection;

    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });
});
