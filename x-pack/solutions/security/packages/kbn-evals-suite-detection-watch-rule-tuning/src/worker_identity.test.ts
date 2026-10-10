/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { RULE_TUNING_WORKER_ID, bindRuleTuningWorker } from './worker_identity';
import { drainBindTick, findDispatchedSweepId, startWorkerSweep } from './workflow_task';

const WORKFLOW_ID = `${RULE_TUNING_WORKER_ID}-default`;

/**
 * Minimal stand-in for the stack: the workers route, the service-account directory and the
 * installed workflow document. `honorsBinding: false` models the defect this suite guards
 * against — a PATCH that is accepted but never renders `run_as` into the workflow.
 */
const stackFetch = ({
  honorsBinding,
  enabled = false,
}: {
  honorsBinding: boolean;
  enabled?: boolean;
}) => {
  const worker = {
    id: RULE_TUNING_WORKER_ID,
    enabled,
    workflowId: WORKFLOW_ID as string | null,
    settingsRevision: 3 as number | null,
    settings: {} as { serviceAccountId?: string },
  };
  let runAs: string | undefined;
  const calls: Array<{
    method: string;
    url: string;
    body?: { name?: string; enabled?: boolean; settings?: { serviceAccountId?: string } };
  }> = [];

  const fetch = jest.fn(async (url: string, options: { method?: string; body?: string } = {}) => {
    const method = options.method ?? 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ method, url, body });
    if (url === '/internal/security/service_account') {
      return method === 'GET'
        ? { serviceAccounts: [] }
        : { id: 'sa-1', name: body.name, enabled: true, assumable: true };
    }
    if (url.startsWith('/api/security/role/')) return {};
    if (url === '/internal/alertzero/workers' && method === 'GET') return { workers: [worker] };
    if (url === `/internal/alertzero/workers/${RULE_TUNING_WORKER_ID}` && method === 'PATCH') {
      worker.enabled = body.enabled;
      worker.settings = { serviceAccountId: body.settings.serviceAccountId };
      if (honorsBinding) runAs = body.settings.serviceAccountId;
      return {};
    }
    if (url === `/api/workflows/workflow/${WORKFLOW_ID}`) {
      return { definition: { settings: runAs ? { run_as: runAs } : {} } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  return { fetch: fetch as unknown as HttpHandler, calls };
};

describe('bindRuleTuningWorker', () => {
  it('creates the service account, binds it through the workers route and returns the workflow id', async () => {
    const { fetch, calls } = stackFetch({ honorsBinding: true });

    await expect(bindRuleTuningWorker(fetch)).resolves.toEqual({
      workflowId: WORKFLOW_ID,
      enabledByBind: true,
    });

    const patch = calls.find(({ method }) => method === 'PATCH');
    expect(patch?.body).toMatchObject({
      enabled: true,
      settingsRevision: 3,
      settings: { serviceAccountId: 'sa-1', extras: { fpCountThreshold: 2 } },
    });
  });

  it('reports the bind as not enabling when the worker was already enabled', async () => {
    const { fetch } = stackFetch({ honorsBinding: true, enabled: true });

    await expect(bindRuleTuningWorker(fetch)).resolves.toEqual({
      workflowId: WORKFLOW_ID,
      enabledByBind: false,
    });
  });

  it('throws when the installed worker has no settings.run_as after the bind', async () => {
    const { fetch } = stackFetch({ honorsBinding: false });

    await expect(bindRuleTuningWorker(fetch)).rejects.toThrow(/no matching settings\.run_as/);
  });
});

describe('drainBindTick', () => {
  const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;
  const LIST_URL = `/api/workflows/workflow/${WORKFLOW_ID}/executions`;
  const SINCE = Date.parse('2026-10-10T10:00:00.000Z');
  const AFTER = '2026-10-10T10:00:05.000Z';
  const BEFORE = '2026-10-10T09:00:00.000Z';

  /**
   * `listed` is what the worker's execution history returns for the all-statuses poll. The
   * non-terminal poll behind `cancelStaleExecutions` reports one active execution per
   * workflow until it is cancelled.
   */
  const executionsFetch = (listed: Array<{ triggeredBy: string; startedAt: string }>) => {
    const active = new Map<string, number>([[WORKFLOW_ID, 1]]);
    const cancelled: string[] = [];
    const fetch = jest.fn(
      async (url: string, options: { method?: string; query?: { statuses: string[] } } = {}) => {
        const cancel = /\/api\/workflows\/workflow\/(.+)\/executions\/cancel$/.exec(url);
        if (cancel) {
          cancelled.push(cancel[1]);
          active.set(cancel[1], 0);
          return {};
        }
        if (url === LIST_URL && options.query?.statuses.includes('completed')) {
          return { results: listed };
        }
        const list = /\/api\/workflows\/workflow\/(.+)\/executions$/.exec(url);
        if (list) return { results: Array(active.get(list[1]) ?? 0).fill({}) };
        throw new Error(`unexpected ${options.method ?? 'GET'} ${url}`);
      }
    );
    return { fetch: fetch as unknown as HttpHandler, cancelled };
  };

  const drain = (fetch: HttpHandler) =>
    drainBindTick({
      fetch,
      log,
      workerWorkflowId: WORKFLOW_ID,
      pollIntervalMs: 1,
      since: SINCE,
      timeoutMs: 20,
    });

  it('cancels the scheduled tick the bind fired, along with what it started', async () => {
    const { fetch, cancelled } = executionsFetch([{ triggeredBy: 'scheduled', startedAt: AFTER }]);

    await drain(fetch);

    expect(cancelled).toContain(WORKFLOW_ID);
  });

  it('fails closed when no scheduled tick ever shows up', async () => {
    const { fetch, cancelled } = executionsFetch([]);

    await expect(drain(fetch)).rejects.toThrow(/fired no scheduled tick/);
    expect(cancelled).toEqual([]);
  });

  it('ignores manual executions of the worker', async () => {
    const { fetch } = executionsFetch([{ triggeredBy: 'manual', startedAt: AFTER }]);

    await expect(drain(fetch)).rejects.toThrow(/fired no scheduled tick/);
  });

  it('ignores a scheduled execution left over from before the bind', async () => {
    const { fetch } = executionsFetch([{ triggeredBy: 'scheduled', startedAt: BEFORE }]);

    await expect(drain(fetch)).rejects.toThrow(/fired no scheduled tick/);
  });
});

describe('findDispatchedSweepId', () => {
  const dispatcher = (steps: unknown[]) =>
    ({ stepExecutions: steps } as unknown as WorkflowExecutionDto);

  it('reads the execution id the bound worker emitted from run_rule_tuning', () => {
    expect(
      findDispatchedSweepId(
        dispatcher([{ stepId: 'run_rule_tuning', output: { executionId: 'sweep-1' } }])
      )
    ).toBe('sweep-1');
  });

  it('returns undefined until the dispatch step has run', () => {
    expect(findDispatchedSweepId(dispatcher([{ stepId: 'other' }]))).toBeUndefined();
    expect(findDispatchedSweepId(dispatcher([{ stepId: 'run_rule_tuning' }]))).toBeUndefined();
  });
});

describe('startWorkerSweep', () => {
  const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

  /** The bind routes come from `stackFetch`; the execution routes are modelled here. */
  const sweepStack = ({ enabled }: { enabled: boolean }) => {
    const stack = stackFetch({ honorsBinding: true, enabled });
    const events: string[] = [];
    const active = new Map<string, number>();
    const fetch = jest.fn(
      async (url: string, options: { method?: string; query?: { statuses: string[] } } = {}) => {
        const method = options.method ?? 'GET';
        if (url === `/api/workflows/workflow/${WORKFLOW_ID}/run`) {
          events.push('run');
          return { workflowExecutionId: 'dispatcher-1' };
        }
        if (url === '/api/workflows/executions/dispatcher-1') {
          return {
            status: 'running',
            stepExecutions: [{ stepId: 'run_rule_tuning', output: { executionId: 'sweep-1' } }],
          };
        }
        const cancel = /\/api\/workflows\/workflow\/(.+)\/executions\/cancel$/.exec(url);
        if (cancel) {
          events.push(`cancel:${cancel[1]}`);
          active.set(cancel[1], 0);
          return {};
        }
        const list = /\/api\/workflows\/workflow\/(.+)\/executions$/.exec(url);
        if (list) {
          if (options.query?.statuses.includes('completed')) {
            events.push('list-history');
            // The tick the enable fired, stamped after the bind began.
            return {
              results: [
                {
                  triggeredBy: 'scheduled',
                  startedAt: new Date(Date.now() + 1_000).toISOString(),
                },
              ],
            };
          }
          return { results: Array(active.get(list[1]) ?? 0).fill({}) };
        }
        if (method === 'PATCH') events.push('bind');
        return stack.fetch(url, options as never);
      }
    );
    active.set(WORKFLOW_ID, 1);
    return { fetch: fetch as unknown as HttpHandler, events };
  };

  it('drains the tick the enable fired before it runs the worker itself', async () => {
    const { fetch, events } = sweepStack({ enabled: false });

    await startWorkerSweep({ fetch, log, pollIntervalMs: 1 });

    expect(events.indexOf('bind')).toBeLessThan(events.indexOf(`cancel:${WORKFLOW_ID}`));
    expect(events.indexOf(`cancel:${WORKFLOW_ID}`)).toBeLessThan(events.indexOf('run'));
  });

  it('does not wait for a tick when the worker was already enabled', async () => {
    const { fetch, events } = sweepStack({ enabled: true });

    await startWorkerSweep({ fetch, log, pollIntervalMs: 1 });

    expect(events).not.toContain('list-history');
    expect(events).toContain('run');
  });
});
