/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { runWatchWorkflow, WatchWorkflowTimeoutError } from './workflow_task';

/**
 * Minimal fake of the Playwright `fetch` fixture: only the two calls
 * `runWatchWorkflow` makes (`POST .../run`, `GET .../executions/<id>`) are
 * modelled. `statuses` is consumed one entry per poll, the last entry repeating.
 */
const fakeFetch = (statuses: ExecutionStatus[]) => {
  let polls = 0;
  const calls: string[] = [];
  const fetch = jest.fn(async (path: string) => {
    calls.push(path);
    if (path.endsWith('/run')) {
      return { workflowExecutionId: 'exec-1' };
    }
    const status = statuses[Math.min(polls, statuses.length - 1)];
    polls += 1;
    return { status };
  });
  return { fetch, calls, pollCount: () => polls };
};

const log = {
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
} as unknown as Parameters<typeof runWatchWorkflow>[0]['log'];

describe('runWatchWorkflow', () => {
  it('returns the terminal status once the execution finishes', async () => {
    const { fetch } = fakeFetch([ExecutionStatus.RUNNING, ExecutionStatus.COMPLETED]);

    const execution = await runWatchWorkflow({
      fetch: fetch as never,
      log,
      workflowId: 'system-security-watch-dark',
      inputs: {},
      maxWaitMs: 5_000,
      pollIntervalMs: 1,
    });

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution.executionId).toBe('exec-1');
  });

  it('throws WatchWorkflowTimeoutError when the deadline passes without a terminal status', async () => {
    // Regression: this used to log a warning and return the still-RUNNING
    // status, so a caller whose success predicate was `status !== FAILED`
    // scored a half-written chain as healthy.
    const { fetch, pollCount } = fakeFetch([ExecutionStatus.RUNNING]);

    await expect(
      runWatchWorkflow({
        fetch: fetch as never,
        log,
        workflowId: 'system-security-watch-dark',
        inputs: {},
        maxWaitMs: 25,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow(WatchWorkflowTimeoutError);

    expect(pollCount()).toBeGreaterThan(0);
  });

  it('carries the workflow id, execution id, last status and deadline on the error', async () => {
    const { fetch } = fakeFetch([ExecutionStatus.RUNNING]);

    let caught: unknown;
    try {
      await runWatchWorkflow({
        fetch: fetch as never,
        log,
        workflowId: 'system-security-watch-floor',
        inputs: {},
        maxWaitMs: 20,
        pollIntervalMs: 1,
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(WatchWorkflowTimeoutError);
    const error = caught as WatchWorkflowTimeoutError;
    expect(error.name).toBe('WatchWorkflowTimeoutError');
    expect(error.workflowId).toBe('system-security-watch-floor');
    expect(error.executionId).toBe('exec-1');
    expect(error.lastStatus).toBe(ExecutionStatus.RUNNING);
    expect(error.maxWaitMs).toBe(20);
    expect(error.message).toContain('did not reach a terminal status');
  });

  it('treats a paused (waiting) execution as non-terminal, not as a finished run', async () => {
    // `waiting` / `waiting_for_input` are pause states. The old "everything
    // except FAILED is fine" caller predicate scored them as healthy.
    const { fetch } = fakeFetch([ExecutionStatus.WAITING]);

    await expect(
      runWatchWorkflow({
        fetch: fetch as never,
        log,
        workflowId: 'system-security-watch-floor',
        inputs: {},
        maxWaitMs: 20,
        pollIntervalMs: 1,
      })
    ).rejects.toThrow(WatchWorkflowTimeoutError);
  });
});
