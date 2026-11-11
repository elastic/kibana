/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus } from '@kbn/workflows';
import { HUNT_WORKER_WORKFLOW_ID } from './constants';
import { HuntWatchClient } from './hunt_watch_client';

const SPACE_ID = 'default';
const WORKER_PATH = `/s/${SPACE_ID}/api/workflows/workflow/${HUNT_WORKER_WORKFLOW_ID}-${SPACE_ID}`;
const NEW_EXECUTION_ID = 'new-run';

interface Call {
  method: string;
  path: string;
}

/**
 * `slotHolders` is the sequence of answers the executions list returns, one per call; the last
 * one repeats. `stepCount` is how many step executions the triggered run ends with.
 */
const buildMockFetch = ({
  slotHolders,
  stepCount = 1,
}: {
  slotHolders: string[][];
  stepCount?: number;
}) => {
  const calls: Call[] = [];
  let listCall = 0;
  const fetch = jest.fn(async (path: string, options: { method?: string } = {}) => {
    const method = options.method ?? 'GET';
    calls.push({ method, path });
    if (method === 'GET' && path === `${WORKER_PATH}/executions`) {
      const ids = slotHolders[Math.min(listCall++, slotHolders.length - 1)];
      return { results: ids.map((id) => ({ id })), page: 1, size: 100, total: ids.length };
    }
    if (method === 'POST' && path.endsWith('/cancel')) return {};
    if (method === 'POST' && path === `${WORKER_PATH}/run`) {
      return { workflowExecutionId: NEW_EXECUTION_ID };
    }
    if (
      method === 'GET' &&
      path === `/s/${SPACE_ID}/api/workflows/executions/${NEW_EXECUTION_ID}`
    ) {
      return {
        id: NEW_EXECUTION_ID,
        status: ExecutionStatus.COMPLETED,
        stepExecutions: Array.from({ length: stepCount }, (_, i) => ({ id: `step-${i}` })),
      };
    }
    throw new Error(`unexpected ${method} ${path}`);
  });
  return { fetch: fetch as unknown as HttpHandler, calls };
};

const log = new ToolingLog();
const run = (client: HuntWatchClient) =>
  client.run({ spaceId: SPACE_ID, reportIds: ['r1'], pollIntervalMs: 0, slotWaitMs: 1_000 });

describe('HuntWatchClient.run', () => {
  it('cancels an execution still holding the Worker slot before triggering', async () => {
    const { fetch, calls } = buildMockFetch({ slotHolders: [['stale-run'], ['stale-run'], []] });

    const result = await run(new HuntWatchClient(fetch, log));

    expect(result.workflowExecutionId).toBe(NEW_EXECUTION_ID);
    const cancelIndex = calls.findIndex(
      (c) => c.path === `/s/${SPACE_ID}/api/workflows/executions/stale-run/cancel`
    );
    const triggerIndex = calls.findIndex((c) => c.path === `${WORKER_PATH}/run`);
    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(triggerIndex).toBeGreaterThan(cancelIndex);
    // Cancelled once, then only waited on.
    expect(calls.filter((c) => c.path.endsWith('/cancel'))).toHaveLength(1);
  });

  it('triggers straight away when no execution holds the slot', async () => {
    const { fetch, calls } = buildMockFetch({ slotHolders: [[]] });

    await run(new HuntWatchClient(fetch, log));

    expect(calls.some((c) => c.path.endsWith('/cancel'))).toBe(false);
    expect(calls.filter((c) => c.path === `${WORKER_PATH}/run`)).toHaveLength(1);
  });

  it('throws without triggering when the slot never frees', async () => {
    const { fetch, calls } = buildMockFetch({ slotHolders: [['stuck-run']] });

    await expect(
      new HuntWatchClient(fetch, log).run({
        spaceId: SPACE_ID,
        reportIds: ['r1'],
        pollIntervalMs: 0,
        slotWaitMs: 0,
      })
    ).rejects.toThrow(/still hold the Worker's concurrency slot/);
    expect(calls.some((c) => c.path === `${WORKER_PATH}/run`)).toBe(false);
  });

  it('still rejects a run that ends with no step executions', async () => {
    const { fetch } = buildMockFetch({ slotHolders: [[]], stepCount: 0 });

    await expect(run(new HuntWatchClient(fetch, log))).rejects.toThrow(/no step executions/);
  });
});
