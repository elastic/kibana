/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { ExecutionStatus } from '@kbn/workflows';
import { soleReviewChild } from './workflow_task';

const RUN_STARTED_AT = Date.parse('2026-10-29T16:54:17.000Z');

/** Executions-list responses served in order; the last one repeats. */
const listFetch = (pages: Array<Array<{ id: string; status: string; startedAt?: string }>>) => {
  let call = 0;
  const fetch = jest.fn(async () => {
    const results = pages[Math.min(call, pages.length - 1)];
    call += 1;
    return { results, total: results.length };
  });
  return fetch as unknown as HttpHandler & jest.Mock;
};

describe('soleReviewChild', () => {
  // `run_review` is workflow.executeAsync: the child is persisted `pending` (no startedAt)
  // while the worker runs, and is only picked up after the worker has completed.
  it('counts a pending child that has no startedAt yet', async () => {
    const fetch = listFetch([[{ id: 'review-1', status: 'pending' }]]);

    const child = await soleReviewChild({
      fetch,
      workflowExecutionId: 'worker-1',
      workerStatus: ExecutionStatus.COMPLETED,
      workerOutput: { reviews_requested: 1 },
      startedAt: RUN_STARTED_AT,
      pollIntervalMs: 1,
    });

    expect(child?.id).toBe('review-1');
  });

  it('waits for a child that appears after the worker settled', async () => {
    const fetch = listFetch([
      [],
      [],
      [{ id: 'review-1', status: 'running', startedAt: '2026-10-29T16:54:19.435Z' }],
    ]);

    const child = await soleReviewChild({
      fetch,
      workflowExecutionId: 'worker-1',
      workerStatus: ExecutionStatus.COMPLETED,
      workerOutput: { reviews_requested: 1 },
      startedAt: RUN_STARTED_AT,
      pollIntervalMs: 1,
    });

    expect(child?.id).toBe('review-1');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('still ignores reviews that started before this run', async () => {
    const fetch = listFetch([
      [{ id: 'stale', status: 'cancelled', startedAt: '2026-10-29T16:50:00.000Z' }],
    ]);

    await expect(
      soleReviewChild({
        fetch,
        workflowExecutionId: 'worker-1',
        workerStatus: ExecutionStatus.COMPLETED,
        workerOutput: { reviews_requested: 0 },
        startedAt: RUN_STARTED_AT,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow(/opened no review children/);
  });

  it('fails without waiting when the worker reported zero requested reviews', async () => {
    const fetch = listFetch([[]]);

    await expect(
      soleReviewChild({
        fetch,
        workflowExecutionId: 'worker-1',
        workerStatus: ExecutionStatus.COMPLETED,
        workerOutput: { reviews_requested: 0 },
        startedAt: RUN_STARTED_AT,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow(/opened no review children/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns undefined while the worker is still running', async () => {
    const fetch = listFetch([[]]);

    const child = await soleReviewChild({
      fetch,
      workflowExecutionId: 'worker-1',
      workerStatus: ExecutionStatus.RUNNING,
      startedAt: RUN_STARTED_AT,
      pollIntervalMs: 1,
    });

    expect(child).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
