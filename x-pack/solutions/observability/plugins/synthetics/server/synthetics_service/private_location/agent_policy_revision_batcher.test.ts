/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AGENT_POLICY_REVISION_BATCH_WINDOW_MS,
  AGENT_POLICY_REVISION_RETRY_DELAY_MS,
  AgentPolicyRevisionBatcher,
} from './agent_policy_revision_batcher';

describe('AgentPolicyRevisionBatcher', () => {
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

    const requests = Array.from({ length: 20 }, () => batcher.schedule(['policy-1']));

    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await Promise.all(requests);

    expect(bumpRevision).toHaveBeenCalledTimes(1);
    expect(bumpRevision).toHaveBeenCalledWith('policy-1');
  });

  it('keeps separate policies in separate batches', async () => {
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });

    const request = batcher.schedule(['policy-1', 'policy-1', 'policy-2']);

    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await request;

    expect(bumpRevision).toHaveBeenCalledTimes(2);
    expect(bumpRevision).toHaveBeenCalledWith('policy-1');
    expect(bumpRevision).toHaveBeenCalledWith('policy-2');
  });

  it('coalesces independent callers of the same policy into one bump', async () => {
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });

    // Batches key on policyId alone, so writes reaching the same agent policy
    // from different spaces share one bump. The bump carries no caller state —
    // PackagePolicyService resolves the space from the agent policy itself.
    const requests = [batcher.schedule(['policy-1']), batcher.schedule(['policy-1'])];

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

    const firstRequest = batcher.schedule(['policy-1']);
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    expect(bumpRevision).toHaveBeenCalledTimes(1);

    const secondRequest = batcher.schedule(['policy-1']);
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
    const request = batcher.schedule(['policy-1']);

    await jest.advanceTimersByTimeAsync(
      AGENT_POLICY_REVISION_BATCH_WINDOW_MS + AGENT_POLICY_REVISION_RETRY_DELAY_MS
    );
    await request;

    expect(bumpRevision).toHaveBeenCalledTimes(2);
  });

  describe('flushPending', () => {
    it('bumps a pending batch without waiting out the debounce window', async () => {
      const bumpRevision = jest.fn().mockResolvedValue(undefined);
      const batcher = new AgentPolicyRevisionBatcher({
        logger: loggerMock.create(),
        bumpRevision,
        random: () => 0,
      });

      const request = batcher.schedule(['policy-1']);
      // Nothing has fired yet: without a flush this bump would be lost on stop.
      expect(bumpRevision).not.toHaveBeenCalled();

      await batcher.flushPending();
      await request;

      expect(bumpRevision).toHaveBeenCalledTimes(1);
      expect(bumpRevision).toHaveBeenCalledWith('policy-1');
    });

    it('drains a follow-up batch queued while the first bump was running', async () => {
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

      const firstRequest = batcher.schedule(['policy-1']);
      await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
      expect(bumpRevision).toHaveBeenCalledTimes(1);

      // Arrives mid-bump, so it is queued behind the running batch.
      const secondRequest = batcher.schedule(['policy-1']);
      finishFirstBump();

      const drained = batcher.flushPending();
      await jest.runOnlyPendingTimersAsync();
      await drained;
      await Promise.all([firstRequest, secondRequest]);

      expect(bumpRevision).toHaveBeenCalledTimes(2);
    });

    it('keeps draining other policies when one batch fails', async () => {
      const bumpRevision = jest
        .fn()
        .mockImplementation(async (policyId: string) =>
          policyId === 'policy-1' ? Promise.reject(new Error('deployment failed')) : undefined
        );
      const batcher = new AgentPolicyRevisionBatcher({
        logger: loggerMock.create(),
        bumpRevision,
        random: () => 0,
      });

      const failing = batcher.schedule(['policy-1']);
      const rejection = expect(failing).rejects.toThrow('deployment failed');
      const succeeding = batcher.schedule(['policy-2']);

      await batcher.flushPending();
      await rejection;
      await succeeding;

      expect(bumpRevision).toHaveBeenCalledWith('policy-2');
    });

    it('is a no-op when nothing is pending', async () => {
      const bumpRevision = jest.fn().mockResolvedValue(undefined);
      const batcher = new AgentPolicyRevisionBatcher({
        logger: loggerMock.create(),
        bumpRevision,
        random: () => 0,
      });

      await batcher.flushPending();

      expect(bumpRevision).not.toHaveBeenCalled();
    });
  });

  it('does not retry non-conflict errors', async () => {
    const bumpRevision = jest.fn().mockRejectedValue(new Error('deployment failed'));
    const batcher = new AgentPolicyRevisionBatcher({
      logger: loggerMock.create(),
      bumpRevision,
      random: () => 0,
    });
    const request = batcher.schedule(['policy-1']);
    const rejection = expect(request).rejects.toThrow('deployment failed');

    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await rejection;

    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });
});
