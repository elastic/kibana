/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { AttackDiscoveryWorkerClient, usingClient } from './worker_client';

const log = { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;

const clientReturning = (execution: Record<string, unknown>) =>
  new AttackDiscoveryWorkerClient(
    jest.fn(async (path: string) =>
      path.includes('/workflow/') ? { workflowExecutionId: 'run-1' } : execution
    ) as unknown as HttpHandler,
    log
  );

describe('AttackDiscoveryWorkerClient timeouts', () => {
  it('reports the wait when an execution does not settle in time', async () => {
    const client = clientReturning({ id: 'run-1', status: 'running', stepExecutions: [] });
    const polled = await client.poll({ spaceId: 's', executionId: 'run-1', maxWaitMs: 0 });
    expect(polled.timedOutAfterMs).toBe(0);
    expect(polled.execution.status).toBe('running');
  });

  it('does not flag a settled execution as timed out', async () => {
    const client = clientReturning({ id: 'run-1', status: 'completed', stepExecutions: [] });
    const polled = await client.poll({ spaceId: 's', executionId: 'run-1', maxWaitMs: 0 });
    expect(polled.timedOutAfterMs).toBeUndefined();
  });

  it('returns a zero-step runner execution instead of throwing', async () => {
    const client = clientReturning({ id: 'run-1', status: 'failed', stepExecutions: [] });
    const polled = await client.run({ spaceId: 's', inputs: {} as never, maxWaitMs: 0 });
    expect(polled.execution.stepExecutions).toHaveLength(0);
  });
});

describe('usingClient', () => {
  it('cancels pending executions after a normal run', async () => {
    const cancelPending = jest.fn(async () => undefined);
    await usingClient({ cancelPending }, async () => undefined);
    expect(cancelPending).toHaveBeenCalledTimes(1);
  });

  it('cancels pending executions when the body throws, and rethrows', async () => {
    const cancelPending = jest.fn(async () => undefined);
    await expect(
      usingClient({ cancelPending }, async () => {
        throw new Error('spec failed');
      })
    ).rejects.toThrow('spec failed');
    expect(cancelPending).toHaveBeenCalledTimes(1);
  });
});
